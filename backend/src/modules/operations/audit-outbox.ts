import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { postgres } from '../../database/postgresql';
import { getMongoDatabase } from '../../database/mongodb';

type EntityType = 'lead' | 'appointment' | 'sale' | 'vehicle' | 'advertisement';
type AuditEventType =
  | 'LEAD_STATUS_CHANGED'
  | 'APPOINTMENT_STATUS_CHANGED'
  | 'SALE_COMPLETED'
  | 'SALE_CANCELLED'
  | 'VEHICLE_STATUS_CHANGED'
  | 'ADVERTISEMENT_ENDED';

export type AuditInput = {
  eventType: AuditEventType;
  entityType: EntityType;
  entityId: string;
  previousValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  correlationId: string;
};

type OutboxRow = {
  event_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  occurred_at: Date;
  previous_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  correlation_id: string;
  delivered_at: Date | null;
};

/** Deve ser chamado DENTRO da transação da alteração no PostgreSQL. */
export async function enqueueAudit(client: PoolClient, event: AuditInput): Promise<string> {
  const id = randomUUID();
  await client.query(
    `INSERT INTO public.audit_outbox (
        event_id, event_type, entity_type, entity_id,
        previous_values, new_values, correlation_id
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)`,
    [
      id, event.eventType, event.entityType, event.entityId,
      JSON.stringify(event.previousValues), JSON.stringify(event.newValues),
      event.correlationId,
    ],
  );
  return id;
}

/**
 * Envio idempotente ao MongoDB. Em caso de falha, o evento continua
 * pendente no PostgreSQL para ser reenviado pelo comando de replay.
 */
export async function deliverAuditEvent(eventId: string): Promise<boolean> {
  try {
    const result = await postgres.query<OutboxRow>(
      `SELECT event_id, event_type, entity_type, entity_id,
              occurred_at, previous_values, new_values, correlation_id, delivered_at
       FROM public.audit_outbox WHERE event_id = $1`,
      [eventId],
    );
    const row = result.rows[0];
    if (!row) return false;
    if (row.delivered_at) return true;

    const collection = (await getMongoDatabase()).collection('audit_events');
    const document = {
      eventId: row.event_id,
      eventType: row.event_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      occurredAt: row.occurred_at,
      previousValues: row.previous_values,
      newValues: row.new_values,
      correlationId: row.correlation_id,
    };

    try {
      await collection.insertOne(document);
    } catch (error: unknown) {
      // Se a gravação Mongo ocorreu, mas o PostgreSQL não recebeu a
      // confirmação, o retry encontra o mesmo evento pela chave única.
      if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 11000)) {
        throw error;
      }
      const existing = await collection.findOne({ eventId: row.event_id });
      if (!existing || existing.eventType !== row.event_type || existing.entityId !== row.entity_id || existing.correlationId !== row.correlation_id) {
        throw new Error('AUDIT_EVENT_CONFLICT');
      }
    }

    await postgres.query(
      `UPDATE public.audit_outbox
       SET delivered_at = NOW(), attempts = attempts + 1, last_error = NULL
       WHERE event_id = $1 AND delivered_at IS NULL`,
      [eventId],
    );
    return true;
  } catch (error: unknown) {
    // Não gravar URI, senha ou conteúdo de documentos em last_error.
    const errorCode = error instanceof Error ? error.name : 'DELIVERY_FAILED';
    try {
      await postgres.query(
        `UPDATE public.audit_outbox
         SET attempts = attempts + 1, last_error = LEFT($2, 100)
         WHERE event_id = $1 AND delivered_at IS NULL`,
        [eventId, errorCode],
      );
    } catch {
      // A indisponibilidade do PostgreSQL não elimina o evento da outbox.
    }
    return false;
  }
}

export async function deliverAuditBatch(eventIds: string[]): Promise<{
  status: 'delivered' | 'pending'; eventIds: string[]; pending: number;
}> {
  let pending = 0;
  for (const eventId of eventIds) {
    if (!(await deliverAuditEvent(eventId))) pending += 1;
  }
  return { status: pending === 0 ? 'delivered' : 'pending', eventIds, pending };
}
