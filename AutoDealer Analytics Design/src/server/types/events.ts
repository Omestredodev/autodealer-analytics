/**
 * AutoDealer Analytics — Tipos Oficiais de Eventos e Auditoria
 * Conforme catálogo oficial: docs/database-models/event-catalog.md e data-contract.md
 */

export type AuditEventType =
  | 'VEHICLE_CREATED'
  | 'VEHICLE_UPDATED'
  | 'VEHICLE_STATUS_CHANGED'
  | 'ADVERTISEMENT_CREATED'
  | 'ADVERTISEMENT_UPDATED'
  | 'ADVERTISEMENT_PUBLISHED'
  | 'ADVERTISEMENT_PAUSED'
  | 'ADVERTISEMENT_ENDED'
  | 'LEAD_STATUS_CHANGED'
  | 'APPOINTMENT_STATUS_CHANGED'
  | 'SALE_COMPLETED'
  | 'SALE_CANCELLED';

export type EntityType = 'vehicle' | 'advertisement' | 'lead' | 'appointment' | 'sale';

// Dicionário Oficial de Status (docs/database-models/status-dictionary.md)
export type VehicleStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'INACTIVE';
export type AdvertisementStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ENDED';
export type LeadStatus = 'NEW' | 'IN_PROGRESS' | 'CONVERTED' | 'LOST';
export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
export type SaleStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

/**
 * Contrato oficial de documento de auditoria para o MongoDB
 */
export interface AuditEventDocument {
  eventId: string; // UUID v4
  eventType: AuditEventType;
  userId?: string | null; // UUID v4
  entityType: EntityType;
  entityId: string; // UUID v4
  occurredAt: Date | string; // UTC ISO 8601 / BSON Date
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  correlationId?: string | null; // UUID v4
}

/**
 * Eventos de telemetria e navegação para o Cassandra
 * (docs/database-models/data-contract.md seção 9)
 */
export type CassandraEventType =
  | 'ADVERTISEMENT_VIEWED'
  | 'ADVERTISEMENT_CLICKED'
  | 'VEHICLE_SEARCHED'
  | 'VEHICLE_FAVORITED'
  | 'VEHICLE_UNFAVORITED'
  | 'LEAD_INTERACTION';

export interface CassandraTelemetryEvent {
  event_id: string; // UUID v4
  event_type: CassandraEventType;
  occurred_at: Date | string; // UTC ISO 8601
  vehicle_id?: string | null;
  advertisement_id?: string | null;
  user_id?: string | null;
  correlation_id?: string | null;
  metadata?: Record<string, unknown>;
}
