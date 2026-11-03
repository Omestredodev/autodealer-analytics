/**
 * AutoDealer Analytics — Barramento de Integração Tri-Banco (PostgreSQL, MongoDB, Cassandra)
 * Conforme: docs/architecture/database-architecture.md e docs/database-models/data-contract.md (Seção 10)
 * 
 * Responsabilidades:
 * 1. Garantir que alterações no PostgreSQL emitam o evento de auditoria correspondente no MongoDB.
 * 2. Manter identificadores canônicos UUID nos 3 bancos.
 * 3. Enviar métricas de navegação/engajamento para o Cassandra.
 * 4. Controlar correlationId para rastreamento de ponta a ponta.
 */

import { mongoAudit } from '../db/mongo';
import { postgresCore } from '../db/postgres';
import { cassandraTelemetry } from '../db/cassandra';
import { AuditEventDocument, AuditEventType, EntityType, CassandraEventType } from '../types/events';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface DispatchAuditParams {
  eventType: AuditEventType;
  entityType: EntityType;
  entityId: string;
  userId?: string | null;
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  correlationId?: string | null;
}

class IntegrationBus {
  /**
   * Dispara um evento de auditoria padronizado para o MongoDB
   */
  public async emitAuditEvent(params: DispatchAuditParams): Promise<AuditEventDocument> {
    const eventDoc: AuditEventDocument = {
      eventId: generateUUID(),
      eventType: params.eventType,
      entityType: params.entityType,
      entityId: params.entityId,
      userId: params.userId || null,
      occurredAt: new Date(),
      previousValues: params.previousValues || null,
      newValues: params.newValues || null,
      correlationId: params.correlationId || null
    };

    const res = await mongoAudit.recordAuditEvent(eventDoc);
    console.log(`[IntegrationBus -> MongoDB] Evento ${params.eventType} gravado (${res.status}) para ${params.entityType}:${params.entityId}`);
    return eventDoc;
  }

  /**
   * Dispara um evento de telemetria/interação para o Apache Cassandra
   */
  public emitTelemetryEvent(eventType: CassandraEventType, payload: { vehicleId?: string; advertisementId?: string; userId?: string; correlationId?: string }) {
    const record = cassandraTelemetry.logActivity({
      event_type: eventType,
      vehicle_id: payload.vehicleId || null,
      advertisement_id: payload.advertisementId || null,
      user_id: payload.userId || null,
      correlation_id: payload.correlationId || null
    });
    console.log(`[IntegrationBus -> Cassandra] Atividade ${eventType} registrada (${record.event_id})`);
    return record;
  }

  /**
   * Diagnóstico geral de integração dos 3 bancos
   */
  public getSystemArchitectureStatus() {
    return {
      architecture: 'AutoDealer Analytics — Tri-Database System',
      databases: [
        postgresCore.getStatus(),
        mongoAudit.getStatus(),
        cassandraTelemetry.getStatus()
      ],
      timestamp: new Date().toISOString()
    };
  }
}

export const integrationBus = new IntegrationBus();
