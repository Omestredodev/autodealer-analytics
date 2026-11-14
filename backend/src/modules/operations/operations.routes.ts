import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply } from 'fastify';
import type { PoolClient } from 'pg';
import { postgres } from '../../database/postgresql';
import { isUuid } from '../catalog/catalog.shared';
import { deliverAuditBatch, enqueueAudit } from './audit-outbox';

type Table = 'leads' | 'appointments' | 'sales';
type StatusSpec = {
  statuses: readonly string[];
  transitions: Record<string, readonly string[]>;
};

const SPECS: Record<Table, StatusSpec> = {
  leads: {
    statuses: ['NEW', 'IN_PROGRESS', 'CONVERTED', 'LOST'],
    transitions: {
      NEW: ['IN_PROGRESS', 'LOST'],
      IN_PROGRESS: ['CONVERTED', 'LOST'],
      CONVERTED: [],
      LOST: [],
    },
  },
  appointments: {
    statuses: ['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
    transitions: {
      SCHEDULED: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['COMPLETED', 'CANCELLED'],
      CANCELLED: [],
      COMPLETED: [],
    },
  },
  sales: {
    statuses: ['PENDING', 'COMPLETED', 'CANCELLED'],
    transitions: {
      PENDING: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    },
  },
};

type ItemRow = {
  id: string;
  status: string;
  vehicle_id?: string;
  sold_at?: Date | null;
  [key: string]: unknown;
};

type ListQuery = { page: number; limit: number; status?: string };

type ParseResult<T> = { value: T; error?: never } | { value?: never; error: string };

function parseList(input: unknown, table: Table): ParseResult<ListQuery> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Query inválida' };
  const query = input as Record<string, unknown>;
  if (Object.keys(query).some((key) => !['page', 'limit', 'status'].includes(key))) {
    return { error: 'Parâmetro desconhecido' };
  }
  function parseIntParam(key: string, fallback: number, max: number): number | null {
    const raw = query[key];
    if (raw === undefined) return fallback;
    if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw)) return null;
    const num = Number(raw);
    return Number.isSafeInteger(num) && num <= max ? num : null;
  }
  const page = parseIntParam('page', 1, 100_000);
  const limit = parseIntParam('limit', 20, 100);
  if (page === null || limit === null) return { error: 'page deve ser 1..100000 e limit 1..100' };
  const status = query.status;
  if (status !== undefined && (typeof status !== 'string' || !SPECS[table].statuses.includes(status))) {
    return { error: 'Status desconhecido' };
  }
  return { value: { page, limit, ...(typeof status === 'string' ? { status } : {}) } };
}

function parseStatusBody(input: unknown, table: Table): ParseResult<string> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Corpo JSON inválido' };
  const body = input as Record<string, unknown>;
  if (Object.keys(body).length !== 1 || typeof body.status !== 'string' || !SPECS[table].statuses.includes(body.status)) {
    return { error: `Informe somente { "status": "..." } com um status válido de ${table}` };
  }
  return { value: body.status };
}

async function readForUpdate(client: PoolClient, table: Table, id: string): Promise<ItemRow | undefined> {
  const result = await client.query<ItemRow>(`SELECT * FROM public.${table} WHERE id = $1 FOR UPDATE`, [id]);
  return result.rows[0];
}

async function applyStatusChange(
  table: Table,
  id: string,
  desired: string,
  reply: FastifyReply,
) {
  const client = await postgres.connect();
  let transaction = false;
  let item: ItemRow | undefined;
  const auditIds: string[] = [];
  const correlationId = randomUUID();
  try {
    await client.query('BEGIN');
    transaction = true;
    const current = await readForUpdate(client, table, id);
    if (!current) {
      await client.query('ROLLBACK');
      transaction = false;
      return reply.code(404).send({ error: 'NOT_FOUND' });
    }
    if (current.status === desired) {
      await client.query('ROLLBACK');
      transaction = false;
      return reply.send({ data: current, unchanged: true, audit: { status: 'not_required', eventIds: [] } });
    }
    if (!SPECS[table].transitions[current.status]?.includes(desired)) {
      await client.query('ROLLBACK');
      transaction = false;
      return reply.code(409).send({
        error: 'INVALID_TRANSITION',
        message: `Transição ${current.status} -> ${desired} não permitida`,
      });
    }

    if (table !== 'sales') {
      const result = await client.query<ItemRow>(
        `UPDATE public.${table} SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [id, desired],
      );
      item = result.rows[0];
      auditIds.push(await enqueueAudit(client, {
        eventType: table === 'leads' ? 'LEAD_STATUS_CHANGED' : 'APPOINTMENT_STATUS_CHANGED',
        entityType: table === 'leads' ? 'lead' : 'appointment',
        entityId: id,
        previousValues: { status: current.status },
        newValues: { status: desired },
        correlationId,
      }));
    } else {
      // Uma venda só pode ser concluída ou cancelada a partir de PENDING.
      if (desired === 'COMPLETED') {
        const vehicleId = current.vehicle_id;
        if (!vehicleId) throw new Error('Venda sem vehicle_id');
        const vehicleResult = await client.query<{ id: string; status: string }>(
          'SELECT id, status FROM public.vehicles WHERE id = $1 FOR UPDATE',
          [vehicleId],
        );
        const vehicle = vehicleResult.rows[0];
        if (!vehicle || !['AVAILABLE', 'RESERVED'].includes(vehicle.status)) {
          await client.query('ROLLBACK');
          transaction = false;
          return reply.code(409).send({ error: 'VEHICLE_UNAVAILABLE' });
        }
        const duplicateSale = await client.query(
          `SELECT 1 FROM public.sales
           WHERE vehicle_id = $1 AND status = 'COMPLETED' AND id <> $2 LIMIT 1`,
          [vehicleId, id],
        );
        if (duplicateSale.rowCount) {
          await client.query('ROLLBACK');
          transaction = false;
          return reply.code(409).send({ error: 'VEHICLE_ALREADY_SOLD' });
        }

        // A venda, o estoque, os anúncios e a outbox são atualizados
        // atomicamente na mesma transação do PostgreSQL.
        await client.query(
          `UPDATE public.vehicles SET status = 'SOLD', updated_at = NOW() WHERE id = $1`,
          [vehicleId],
        );
        auditIds.push(await enqueueAudit(client, {
          eventType: 'VEHICLE_STATUS_CHANGED', entityType: 'vehicle', entityId: vehicleId,
          previousValues: { status: vehicle.status },
          newValues: { status: 'SOLD' }, correlationId,
        }));

        const ads = await client.query<{ id: string; status: string }>(
          `SELECT id, status FROM public.advertisements
           WHERE vehicle_id = $1 AND status <> 'ENDED' FOR UPDATE`,
          [vehicleId],
        );
        if (ads.rows.length) {
          await client.query(
            `UPDATE public.advertisements
             SET status = 'ENDED', ended_at = NOW(), updated_at = NOW()
             WHERE vehicle_id = $1 AND status <> 'ENDED'`,
            [vehicleId],
          );
        }
        for (const ad of ads.rows) {
          auditIds.push(await enqueueAudit(client, {
            eventType: 'ADVERTISEMENT_ENDED', entityType: 'advertisement', entityId: ad.id,
            previousValues: { status: ad.status },
            newValues: { status: 'ENDED' }, correlationId,
          }));
        }
      }


      const result = await client.query<ItemRow>(
        `UPDATE public.sales
        SET status = $2::varchar,
            sold_at = CASE
              WHEN $2::varchar = 'COMPLETED' THEN NOW()
              ELSE NULL
            END,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
        [id, desired],
      );

      item = result.rows[0];
      auditIds.push(await enqueueAudit(client, {
        eventType: desired === 'COMPLETED' ? 'SALE_COMPLETED' : 'SALE_CANCELLED',
        entityType: 'sale', entityId: id,
        previousValues: { status: current.status, soldAt: current.sold_at ?? null },
        newValues: { status: desired, soldAt: item?.sold_at ?? null },
        correlationId,
      }));
    }

    await client.query('COMMIT');
    transaction = false;
  } catch (error) {
    if (transaction) await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  // Depois do COMMIT, falha do MongoDB não desfaz a alteração comercial.
  // O evento permanece na outbox e pode ser reenviado com replay-audit.ts.
  const audit = await deliverAuditBatch(auditIds);
  return reply.code(audit.pending ? 202 : 200).send({ data: item, audit, correlationId });
}

export async function operationsRoutes(app: FastifyInstance): Promise<void> {
  for (const table of ['leads', 'appointments', 'sales'] as const) {
    app.get(`/${table}`, async (request, reply) => {
      const parsed = parseList(request.query, table);
      if (!parsed.value) return reply.code(400).send({ error: 'INVALID_QUERY', message: parsed.error });
      const { page, limit, status } = parsed.value;
      const where = status ? 'WHERE status = $1' : '';
      const filters = status ? [status] : [];
      const [count, rows] = await Promise.all([
        postgres.query<{ total: number }>(
          `SELECT COUNT(*)::int AS total FROM public.${table} ${where}`, filters),
        postgres.query(
          `SELECT * FROM public.${table} ${where}
           ORDER BY created_at DESC, id DESC
           LIMIT $${filters.length + 1} OFFSET $${filters.length + 2}`,
          [...filters, limit, (page - 1) * limit],
        ),
      ]);
      const total = count.rows[0]?.total ?? 0;
      return {
        data: rows.rows,
        pagination: { page, limit, total, returned: rows.rows.length, totalPages: Math.ceil(total / limit) },
      };
    });

    app.get(`/${table}/:id`, async (request, reply) => {
      const id = (request.params as { id: string }).id;
      if (!isUuid(id)) return reply.code(400).send({ error: 'INVALID_ID' });
      const result = await postgres.query(`SELECT * FROM public.${table} WHERE id = $1`, [id]);
      if (!result.rows[0]) return reply.code(404).send({ error: 'NOT_FOUND' });
      return { data: result.rows[0] };
    });

    app.patch(`/${table}/:id/status`, async (request, reply) => {
      const id = (request.params as { id: string }).id;
      if (!isUuid(id)) return reply.code(400).send({ error: 'INVALID_ID' });
      const parsed = parseStatusBody(request.body, table);
      if (!parsed.value) return reply.code(400).send({ error: 'INVALID_BODY', message: parsed.error });
      return applyStatusChange(table, id, parsed.value, reply);
    });
  }
}
