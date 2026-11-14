import type { FastifyInstance } from 'fastify';
import type { Filter } from 'mongodb';
import { getMongoDatabase } from '../../database/mongodb';
import { isUuid } from '../catalog/catalog.shared';

/** O MongoDB guarda eventos administrativos já ocorridos; não altera o PostgreSQL. */
type AuditDocument = {
  eventId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  userId?: string | null;
  occurredAt: Date;
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  correlationId?: string | null;
};

const ENTITY_TYPES = new Set(['vehicle', 'advertisement', 'lead', 'appointment', 'sale']);
const EVENT_TYPES = new Set([
  'VEHICLE_CREATED', 'VEHICLE_UPDATED', 'VEHICLE_STATUS_CHANGED',
  'ADVERTISEMENT_CREATED', 'ADVERTISEMENT_UPDATED', 'ADVERTISEMENT_PUBLISHED',
  'ADVERTISEMENT_PAUSED', 'ADVERTISEMENT_ENDED', 'LEAD_STATUS_CHANGED',
  'APPOINTMENT_STATUS_CHANGED', 'SALE_COMPLETED', 'SALE_CANCELLED',
]);

function parseLimit(value: unknown): number | null {
  if (value === undefined) return 20;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 1 && n <= 100 ? n : null;
}

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  app.get('/audit-events', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    if (Object.keys(query).some((key) => !['entityType', 'entityId', 'eventType', 'limit'].includes(key))) {
      return reply.code(400).send({ error: 'INVALID_QUERY', message: 'Parâmetro não permitido' });
    }

    const limit = parseLimit(query.limit);
    if (limit === null) return reply.code(400).send({ error: 'INVALID_LIMIT' });

    const { entityType, entityId, eventType } = query;
    if (entityType !== undefined && (typeof entityType !== 'string' || !ENTITY_TYPES.has(entityType))) {
      return reply.code(400).send({ error: 'INVALID_ENTITY_TYPE' });
    }
    if (entityId !== undefined && (typeof entityId !== 'string' || !isUuid(entityId))) {
      return reply.code(400).send({ error: 'INVALID_ENTITY_ID' });
    }
    if (eventType !== undefined && (typeof eventType !== 'string' || !EVENT_TYPES.has(eventType))) {
      return reply.code(400).send({ error: 'INVALID_EVENT_TYPE' });
    }
    if ((entityId === undefined) !== (entityType === undefined)) {
      return reply.code(400).send({ error: 'INVALID_QUERY', message: 'entityType e entityId devem ser informados juntos' });
    }

    const filter: Filter<AuditDocument> = {};
    if (typeof entityType === 'string' && typeof entityId === 'string') {
      filter.entityType = entityType;
      filter.entityId = entityId;
    }
    if (typeof eventType === 'string') filter.eventType = eventType;

    const database = await getMongoDatabase();
    const data = await database.collection<AuditDocument>('audit_events')
      .find(filter, { projection: { _id: 0 } })
      .sort({ occurredAt: -1, eventId: -1 })
      .limit(limit).toArray();
    return { data, returned: data.length, limit };
  });
}
