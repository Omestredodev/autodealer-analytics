import type { FastifyInstance } from 'fastify';
import { types } from 'cassandra-driver';
import { getCassandraClient } from '../../database/cassandra';
import { postgres } from '../../database/postgresql';
import { isUuid } from '../catalog/catalog.shared';

const EVENT_TYPES = new Set([
  'ADVERTISEMENT_VIEWED', 'ADVERTISEMENT_CLICKED', 'VEHICLE_SEARCHED',
  'VEHICLE_FAVORITED', 'VEHICLE_UNFAVORITED', 'LEAD_INTERACTION',
]);

const TABLES = {
  period: { table: 'events_by_period', partitionColumn: '' },
  type: { table: 'events_by_type', partitionColumn: 'event_type' },
  advertisement: { table: 'events_by_advertisement', partitionColumn: 'advertisement_id' },
  vehicle: { table: 'events_by_vehicle', partitionColumn: 'vehicle_id' },
  user: { table: 'events_by_user', partitionColumn: 'user_id' },
} as const;

type TableKind = keyof typeof TABLES;

type InputEvent = {
  eventId: string;
  occurredAt: string;
  eventType: string;
  vehicleId?: string;
  advertisementId?: string;
  userId?: string;
  correlationId?: string;
};

function validDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T00:00:00.000Z');
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === value;
}

function readPartition(query: unknown) {
  const q = (query ?? {}) as Record<string, unknown>;
  if (Object.keys(q).some((key) => !['day', 'shard', 'limit'].includes(key))) return null;
  if (!validDay(q.day)) return null;
  if (typeof q.shard !== 'string' || !/^[0-3]$/.test(q.shard)) return null;
  const limitRaw = q.limit === undefined ? '20' : q.limit;
  if (typeof limitRaw !== 'string' || !/^[1-9]\d*$/.test(limitRaw)) return null;
  const limit = Number(limitRaw);
  if (!Number.isSafeInteger(limit) || limit > 100) return null;
  return { day: q.day, shard: Number(q.shard), limit };
}

function serialiseRow(row: { get: (name: string) => unknown }) {
  const fields = ['event_id', 'event_type', 'occurred_at', 'event_day', 'shard',
    'advertisement_id', 'vehicle_id', 'user_id', 'correlation_id'];
  const output: Record<string, unknown> = {};
  for (const field of fields) {
    const value = row.get(field);
    if (value !== undefined && value !== null) {
      output[field] = value instanceof Date ? value.toISOString() :
        typeof value === 'object' && !Array.isArray(value) ? String(value) : value;
    } else {
      output[field] = null;
    }
  }
  return output;
}

async function listByPartition(
  kind: TableKind,
  query: unknown,
  value?: string,
) {
  const partition = readPartition(query);
  if (!partition) return { status: 400, response: { error: 'INVALID_QUERY', message: 'Informe day=AAAA-MM-DD, shard=0..3, limit=1..100' } };
  const table = TABLES[kind];
  let partitionId: unknown;
  if (kind === 'type') {
    if (!value || !EVENT_TYPES.has(value)) return { status: 400, response: { error: 'INVALID_EVENT_TYPE' } };
    partitionId = value;
  } else if (kind !== 'period') {
    if (!value || !isUuid(value)) return { status: 400, response: { error: 'INVALID_UUID' } };
    partitionId = types.Uuid.fromString(value);
  }
  const prefix = table.partitionColumn ? `${table.partitionColumn} = ? AND ` : '';
  const cql = `SELECT * FROM ${table.table} WHERE ${prefix}event_day = ? AND shard = ? LIMIT ?`;
  const params = [
    ...(table.partitionColumn ? [partitionId] : []),
    types.LocalDate.fromString(partition.day),
    partition.shard,
    partition.limit,
  ];
  const client = await getCassandraClient();
  const result = await client.execute(cql, params, { prepare: true });
  return {
    status: 200,
    response: {
      data: result.rows.map(serialiseRow),
      partition: { day: partition.day, shard: partition.shard, ...(value ? { value } : {}) },
      returned: result.rows.length,
    },
  };
}

function parseEvent(value: unknown): { data?: InputEvent; error?: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'JSON deve ser um objeto' };
  const raw = value as Record<string, unknown>;
  const allowed = ['eventId', 'occurredAt', 'eventType', 'vehicleId', 'advertisementId', 'userId', 'correlationId'];
  if (Object.keys(raw).some((key) => !allowed.includes(key))) return { error: 'Campo não permitido no evento' };
  if (typeof raw.eventId !== 'string' || !isUuid(raw.eventId)) return { error: 'eventId deve ser um UUID' };
  if (typeof raw.eventType !== 'string' || !EVENT_TYPES.has(raw.eventType)) return { error: 'eventType fora do catálogo de eventos' };
  if (typeof raw.occurredAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(raw.occurredAt)) {
    return { error: 'occurredAt deve estar em ISO 8601 UTC (terminado em Z)' };
  }
  const instant = new Date(raw.occurredAt);
  if (Number.isNaN(instant.getTime()) || instant.toISOString().slice(0, 10) !== raw.occurredAt.slice(0, 10)) {
    return { error: 'occurredAt inválido' };
  }
  for (const key of ['vehicleId', 'advertisementId', 'userId', 'correlationId'] as const) {
    if (raw[key] !== undefined && (typeof raw[key] !== 'string' || !isUuid(raw[key] as string))) {
      return { error: `${key} deve ser UUID ou omitido` };
    }
  }
  const data: InputEvent = {
    eventId: raw.eventId as string,
    occurredAt: raw.occurredAt as string,
    eventType: raw.eventType as string,
    ...(raw.vehicleId !== undefined ? { vehicleId: raw.vehicleId as string } : {}),
    ...(raw.advertisementId !== undefined ? { advertisementId: raw.advertisementId as string } : {}),
    ...(raw.userId !== undefined ? { userId: raw.userId as string } : {}),
    ...(raw.correlationId !== undefined ? { correlationId: raw.correlationId as string } : {}),
  };
  if (['ADVERTISEMENT_VIEWED', 'ADVERTISEMENT_CLICKED'].includes(data.eventType) && !data.advertisementId) {
    return { error: 'Visualizações e cliques exigem advertisementId' };
  }
  if (['VEHICLE_FAVORITED', 'VEHICLE_UNFAVORITED'].includes(data.eventType) && (!data.vehicleId || !data.userId)) {
    return { error: 'Favoritos exigem vehicleId e userId' };
  }
  return { data };
}

function uuid(value?: string): types.Uuid | null {
  return value ? types.Uuid.fromString(value) : null;
}

async function verifyEntities(event: InputEvent): Promise<{ ok: true; event: InputEvent } | { ok: false; message: string }> {
  let data = { ...event };
  if (data.advertisementId) {
    const result = await postgres.query<{ vehicle_id: string }>(`
      SELECT a.vehicle_id FROM public.advertisements a
      JOIN public.vehicles v ON v.id = a.vehicle_id
      WHERE a.id = $1 AND a.status = 'PUBLISHED' AND v.status = 'AVAILABLE'
      LIMIT 1`, [data.advertisementId]);
    if (!result.rows[0]) return { ok: false, message: 'Anúncio não encontrado ou indisponível no catálogo público' };
    const relatedVehicleId = result.rows[0].vehicle_id;
    if (data.vehicleId && data.vehicleId.toLowerCase() !== relatedVehicleId.toLowerCase()) {
      return { ok: false, message: 'vehicleId não pertence ao advertisementId' };
    }
    data = { ...data, vehicleId: relatedVehicleId };
  }
  if (data.vehicleId) {
    const result = await postgres.query('SELECT 1 FROM public.vehicles WHERE id = $1 LIMIT 1', [data.vehicleId]);
    if (!result.rowCount) return { ok: false, message: 'Veículo não encontrado no PostgreSQL' };
  }
  if (data.userId) {
    const result = await postgres.query('SELECT 1 FROM public.users WHERE id = $1 LIMIT 1', [data.userId]);
    if (!result.rowCount) return { ok: false, message: 'Usuário não encontrado no PostgreSQL' };
  }
  return { ok: true, event: data };
}

type InsertRow = {
  table: string;
  fields: string[];
  values: unknown[];
};

function insertsFor(event: InputEvent, instant: Date, day: types.LocalDate, shard: number): InsertRow[] {
  const eventId = uuid(event.eventId);
  const userId = uuid(event.userId);
  const vehicleId = uuid(event.vehicleId);
  const advertisementId = uuid(event.advertisementId);
  const correlationId = uuid(event.correlationId);
  const fields = ['event_day', 'shard', 'occurred_at', 'event_id', 'event_type',
    'vehicle_id', 'advertisement_id', 'user_id', 'correlation_id'];
  const values = [day, shard, instant, eventId, event.eventType,
    vehicleId, advertisementId, userId, correlationId];
  const result: InsertRow[] = [
    { table: 'events_by_period', fields, values },
    { table: 'events_by_type', fields, values },
  ];
  for (const [kind, partition] of [
    ['advertisement', advertisementId], ['vehicle', vehicleId], ['user', userId],
  ] as const) {
    if (!partition) continue;
    const column = TABLES[kind].partitionColumn;
    const remaining = fields.filter((field) => field !== column);
    result.push({
      table: TABLES[kind].table,
      fields: [column, ...remaining],
      values: [partition, ...remaining.map((field) => values[fields.indexOf(field)])],
    });
  }
  return result;
}

export async function activityRoutes(app: FastifyInstance): Promise<void> {
  app.get('/activity-events', async (request, reply) => {
    const result = await listByPartition('period', request.query);
    return reply.code(result.status).send(result.response);
  });

  const readers: Array<{ route: string; kind: TableKind; param: string }> = [
    { route: '/activity-events/by-type/:eventType', kind: 'type', param: 'eventType' },
    { route: '/activity-events/advertisement/:id', kind: 'advertisement', param: 'id' },
    { route: '/activity-events/vehicle/:id', kind: 'vehicle', param: 'id' },
    { route: '/activity-events/user/:id', kind: 'user', param: 'id' },
  ];
  for (const { route, kind, param } of readers) {
    app.get(route, async (request, reply) => {
      const params = request.params as Record<string, string>;
      const result = await listByPartition(kind, request.query, params[param]);
      return reply.code(result.status).send(result.response);
    });
  }

  /** POST local de demonstração: usa o mesmo eventId+occurredAt em reenvios para idempotência. */
  app.post('/activity-events', async (request, reply) => {
    const parsed = parseEvent(request.body);
    if (!parsed.data) return reply.code(400).send({ error: 'INVALID_EVENT', message: parsed.error });
    const verified = await verifyEntities(parsed.data);
    if (!verified.ok) return reply.code(404).send({ error: 'INVALID_REFERENCE', message: verified.message });
    const event = verified.event;
    const instant = new Date(event.occurredAt);
    const eventDay = instant.toISOString().slice(0, 10);
    const day = types.LocalDate.fromString(eventDay);
    // 4 shards para a demonstração, determinados pelo UUID do evento.
    const shard = parseInt(event.eventId.replace(/-/g, '').slice(0, 8), 16) % 4;
    const client = await getCassandraClient();
    const inserts = insertsFor(event, instant, day, shard);
    let completed = 0;
    try {
      // Inserções independentes: sem LOGGED BATCH cruzando partições.
      // Se falhar parcialmente, o cliente reenviará o MESMO ID e timestamp.
      for (const insert of inserts) {
        const placeholders = insert.fields.map(() => '?').join(', ');
        await client.execute(
          `INSERT INTO ${insert.table} (${insert.fields.join(', ')}) VALUES (${placeholders})`,
          insert.values,
          { prepare: true },
        );
        completed++;
      }
    } catch (error) {
      request.log.error({ err: error, eventId: event.eventId, completed }, 'Erro parcial na gravação Cassandra');
      return reply.code(503).send({
        error: 'CASSANDRA_WRITE_INCOMPLETE',
        eventId: event.eventId,
        occurredAt: event.occurredAt,
        message: 'Reenvie exatamente o mesmo evento para completar as tabelas pendentes',
      });
    }
    return reply.code(201).send({
      data: { eventId: event.eventId, eventType: event.eventType,
        occurredAt: instant.toISOString(), day: eventDay, shard,
        vehicleId: event.vehicleId ?? null,
        advertisementId: event.advertisementId ?? null, tablesWritten: inserts.map((x) => x.table) },
    });
  });
}
