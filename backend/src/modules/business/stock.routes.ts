import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { PoolClient } from 'pg';
import { postgres } from '../../database/postgresql';
import { isUuid } from '../catalog/catalog.shared';
import { deliverAuditBatch, enqueueAudit } from '../operations/audit-outbox';

type IdParams = { Params: { id: string } };
type VehicleRow = { id: string; status: string; make: string; model: string; model_year: number };
type AdRow = {
  id: string; vehicle_id: string; title: string; description: string | null;
  price: string; status: string; published_at: Date | null;
};

type PageQuery = { page: number; limit: number; search: string; status: string };
const VEHICLE_STATUSES = ['AVAILABLE', 'RESERVED', 'SOLD', 'INACTIVE'];
const AD_STATUSES = ['DRAFT', 'PUBLISHED', 'PAUSED', 'ENDED'];

function parseList(input: unknown, statuses: string[]): { query?: PageQuery; error?: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Query inválida' };
  const q = input as Record<string, unknown>;
  if (Object.keys(q).some(k => !['page', 'limit', 'search', 'status'].includes(k))) return { error: 'Parâmetro não permitido' };
  const parse = (key: string, fallback: number, max: number): number | null => {
    const raw = q[key];
    if (raw === undefined) return fallback;
    if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw)) return null;
    const n = Number(raw);
    return Number.isSafeInteger(n) && n <= max ? n : null;
  };
  const page = parse('page', 1, 100000), limit = parse('limit', 12, 50);
  if (page === null || limit === null) return { error: 'page deve ser 1..100000 e limit 1..50' };
  const search = q.search ?? '';
  const status = q.status ?? '';
  if (typeof search !== 'string' || search.length > 80 || typeof status !== 'string' || (status && !statuses.includes(status))) {
    return { error: 'Filtro de busca ou status inválido' };
  }
  return { query: { page, limit, search: search.trim(), status } };
}

function objectBody(input: unknown): Record<string, unknown> | null {
  return input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : null;
}
function allowedKeys(raw: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(raw).every(key => keys.includes(key));
}
function parsePrice(input: unknown): string | null {
  if (typeof input !== 'string' && typeof input !== 'number') return null;
  const value = String(input);
  return /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(value) && Number(value) > 0 ? value : null;
}
function parseTitle(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length >= 5 && value.trim().length <= 180 ? value.trim() : null;
}
function parseDescription(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length > 3000) return undefined;
  return value.trim();
}
function parseAdBody(input: unknown, creating: boolean): { body?: Record<string, unknown>; error?: string } {
  const raw = objectBody(input);
  if (!raw) return { error: 'Envie um objeto JSON' };
  const keys = ['title', 'description', 'price', ...(creating ? ['vehicleId', 'publish'] : ['status'])];
  if (!allowedKeys(raw, keys) || !Object.keys(raw).length) return { error: `Campos permitidos: ${keys.join(', ')}` };
  const clean: Record<string, unknown> = {};
  if (creating) {
    if (typeof raw.vehicleId !== 'string' || !isUuid(raw.vehicleId)) return { error: 'vehicleId deve ser UUID válido' };
    if (raw.publish !== undefined && typeof raw.publish !== 'boolean') return { error: 'publish deve ser booleano' };
    clean.vehicleId = raw.vehicleId;
    clean.publish = raw.publish === true;
  }
  if (raw.title !== undefined || creating) {
    const value = parseTitle(raw.title);
    if (!value) return { error: 'title deve conter de 5 a 180 caracteres' };
    clean.title = value;
  }
  if (raw.price !== undefined || creating) {
    const value = parsePrice(raw.price);
    if (!value) return { error: 'price deve ser positivo, com até 2 casas decimais' };
    clean.price = value;
  }
  if (raw.description !== undefined) {
    const value = parseDescription(raw.description);
    if (value === undefined) return { error: 'description deve ser texto de até 3000 caracteres ou null' };
    clean.description = value;
  } else if (creating) clean.description = null;
  if (!creating && raw.status !== undefined) {
    if (typeof raw.status !== 'string' || !AD_STATUSES.includes(raw.status)) return { error: 'status inválido' };
    clean.status = raw.status;
  }
  return { body: clean };
}
async function rollback(client: PoolClient): Promise<void> { await client.query('ROLLBACK'); }
async function lockVehicle(client: PoolClient, id: string): Promise<VehicleRow | null> {
  const r = await client.query<VehicleRow>('SELECT id, status, make, model, model_year FROM public.vehicles WHERE id=$1 FOR UPDATE', [id]);
  return r.rows[0] ?? null;
}
async function publishedExists(client: PoolClient, vehicleId: string, excludeId?: string): Promise<boolean> {
  const r = await client.query(
    `SELECT 1 FROM public.advertisements WHERE vehicle_id=$1 AND status='PUBLISHED' AND ($2::uuid IS NULL OR id<>$2::uuid) LIMIT 1`,
    [vehicleId, excludeId ?? null],
  );
  return r.rowCount !== null && r.rowCount > 0;
}
function isForeignKey(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'code' in error && error.code === '23503';
}
function pageMeta(query: PageQuery, total: number, count: number) {
  return { page: query.page, limit: query.limit, total, returned: count, totalPages: Math.max(1, Math.ceil(total / query.limit)) };
}

/** Rotas administrativas locais, registradas sob /crud/stock e protegidas por CRUD_DEMO_ENABLED. */
export async function stockRoutes(app: FastifyInstance): Promise<void> {
  app.get('/stock/vehicles', async (request, reply) => {
    const parsed = parseList(request.query, VEHICLE_STATUSES);
    if (!parsed.query) return reply.code(400).send({ error: 'INVALID_QUERY', message: parsed.error });
    const q = parsed.query;
    const filter = q.search ? `%${q.search.replace(/[\\%_]/g, '\\$&')}%` : null;
    const args = [filter, q.status || null];
    const where = `WHERE ($1::text IS NULL OR CONCAT_WS(' ',v.make,v.model,v.version,v.id::text) ILIKE $1)
                   AND ($2::text IS NULL OR v.status=$2)`;
    const [count, list] = await Promise.all([
      postgres.query<{ total: number }>(`SELECT COUNT(*)::int total FROM public.vehicles v ${where}`, args),
      postgres.query(`SELECT v.id,v.make,v.model,v.version,v.model_year,v.status,v.mileage,
          (SELECT COUNT(*)::int FROM public.advertisements a WHERE a.vehicle_id=v.id AND a.status IN ('PUBLISHED','PAUSED')) AS active_ads,
          (SELECT COUNT(*)::int FROM public.advertisements a WHERE a.vehicle_id=v.id AND a.status='PUBLISHED') AS published_ads
        FROM public.vehicles v ${where} ORDER BY v.created_at DESC,v.id DESC LIMIT $3 OFFSET $4`,
      [...args, q.limit, (q.page - 1) * q.limit]),
    ]);
    const total = count.rows[0]?.total ?? 0;
    return { data: list.rows, pagination: pageMeta(q, total, list.rows.length) };
  });

  app.get('/stock/advertisements', async (request, reply) => {
    const parsed = parseList(request.query, AD_STATUSES);
    if (!parsed.query) return reply.code(400).send({ error: 'INVALID_QUERY', message: parsed.error });
    const q = parsed.query;
    const filter = q.search ? `%${q.search.replace(/[\\%_]/g, '\\$&')}%` : null;
    const args = [filter, q.status || null];
    const from = `FROM public.advertisements a JOIN public.vehicles v ON v.id=a.vehicle_id`;
    const where = `WHERE ($1::text IS NULL OR CONCAT_WS(' ',a.title,v.make,v.model,a.id::text) ILIKE $1)
                   AND ($2::text IS NULL OR a.status=$2)`;
    const [count, list] = await Promise.all([
      postgres.query<{ total: number }>(`SELECT COUNT(*)::int total ${from} ${where}`, args),
      postgres.query(`SELECT a.id,a.vehicle_id,a.title,a.description,a.price::text AS price,a.status,a.published_at,a.is_featured AS featured,
          v.make,v.model,v.model_year,v.status AS vehicle_status
        ${from} ${where} ORDER BY a.created_at DESC,a.id DESC LIMIT $3 OFFSET $4`,
      [...args, q.limit, (q.page - 1) * q.limit]),
    ]);
    const total = count.rows[0]?.total ?? 0;
    return { data: list.rows, pagination: pageMeta(q, total, list.rows.length) };
  });

  app.post('/stock/advertisements', async (request, reply) => {
    const parsed = parseAdBody(request.body, true);
    if (!parsed.body) return reply.code(400).send({ error: 'INVALID_BODY', message: parsed.error });
    const b = parsed.body;
    const client = await postgres.connect();
    const eventIds: string[] = [];
    try {
      await client.query('BEGIN');
      const vehicle = await lockVehicle(client, b.vehicleId as string);
      if (!vehicle) { await rollback(client); return reply.code(404).send({ error: 'VEHICLE_NOT_FOUND' }); }
      if (vehicle.status !== 'AVAILABLE') {
        await rollback(client); return reply.code(409).send({ error: 'VEHICLE_NOT_AVAILABLE', message: 'Somente veículos AVAILABLE podem receber novos anúncios' });
      }
      if (b.publish === true && await publishedExists(client, vehicle.id)) {
        await rollback(client); return reply.code(409).send({ error: 'ACTIVE_AD_EXISTS', message: 'Já existe anúncio publicado para este veículo; crie um rascunho ou encerre o anterior' });
      }
      const status = b.publish === true ? 'PUBLISHED' : 'DRAFT';
      const result = await client.query<AdRow>(
        `INSERT INTO public.advertisements(vehicle_id,title,description,price,status,published_at)
         VALUES($1,$2,$3,$4::numeric,$5::varchar(20),CASE WHEN $5::varchar(20)='PUBLISHED' THEN NOW() ELSE NULL END)
         RETURNING id,vehicle_id,title,description,price::text AS price,status,published_at`,
        [vehicle.id, b.title, b.description, b.price, status],
      );
      const ad = result.rows[0];
      const correlationId = randomUUID();
      eventIds.push(await enqueueAudit(client, {
        eventType: 'ADVERTISEMENT_CREATED', entityType: 'advertisement', entityId: ad.id,
        previousValues: {}, newValues: { title: ad.title, price: ad.price, vehicleId: vehicle.id, status }, correlationId,
      }));
      if (status === 'PUBLISHED') {
        eventIds.push(await enqueueAudit(client, {
          eventType: 'ADVERTISEMENT_PUBLISHED', entityType: 'advertisement', entityId: ad.id,
          previousValues: { status: 'DRAFT' }, newValues: { status }, correlationId,
        }));
      }
      await client.query('COMMIT');
      const audit = await deliverAuditBatch(eventIds);
      return reply.code(201).send({ data: ad, audit });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { client.release(); }
  });

  app.patch<IdParams>('/stock/advertisements/:id', async (request, reply) => {
    const { id } = request.params;
    if (!isUuid(id)) return reply.code(400).send({ error: 'INVALID_ID' });
    const parsed = parseAdBody(request.body, false);
    if (!parsed.body) return reply.code(400).send({ error: 'INVALID_BODY', message: parsed.error });
    const b = parsed.body;
    const initial = await postgres.query<{ vehicle_id: string }>('SELECT vehicle_id FROM public.advertisements WHERE id=$1', [id]);
    if (!initial.rows[0]) return reply.code(404).send({ error: 'NOT_FOUND' });
    const client = await postgres.connect();
    const ids: string[] = [];
    try {
      await client.query('BEGIN');
      const vehicle = await lockVehicle(client, initial.rows[0].vehicle_id);
      if (!vehicle) { await rollback(client); return reply.code(404).send({ error: 'VEHICLE_NOT_FOUND' }); }
      const currentResult = await client.query<AdRow>(
        `SELECT id,vehicle_id,title,description,price::text AS price,status,published_at
         FROM public.advertisements WHERE id=$1 FOR UPDATE`, [id],
      );
      const current = currentResult.rows[0];
      if (!current) { await rollback(client); return reply.code(404).send({ error: 'NOT_FOUND' }); }
      if (current.status === 'ENDED') {
        await rollback(client); return reply.code(409).send({ error: 'FINAL_AD', message: 'Anúncios encerrados são históricos e não podem ser editados' });
      }
      const next = (b.status ?? current.status) as string;
      const transitions: Record<string, string[]> = {
        DRAFT: ['DRAFT','PUBLISHED','ENDED'],
        PUBLISHED: ['PUBLISHED','PAUSED','ENDED'],
        PAUSED: ['PAUSED','PUBLISHED','ENDED'],
      };
      if (!transitions[current.status]?.includes(next)) {
        await rollback(client); return reply.code(409).send({ error: 'INVALID_TRANSITION', message: `${current.status} -> ${next} não permitido` });
      }
      if (next === 'PUBLISHED' && current.status !== 'PUBLISHED') {
        if (vehicle.status !== 'AVAILABLE' || await publishedExists(client, vehicle.id, id)) {
          await rollback(client); return reply.code(409).send({ error: 'CANNOT_PUBLISH', message: 'Veículo indisponível ou já possui anúncio publicado' });
        }
      }
      const updated = await client.query<AdRow>(
        `UPDATE public.advertisements SET title=$2, description=$3, price=$4::numeric, status=$5::varchar(20),
            published_at=CASE WHEN $5::varchar(20)='PUBLISHED' AND status<>'PUBLISHED' THEN NOW() ELSE published_at END,
            ended_at=CASE WHEN $5::varchar(20)='ENDED' THEN NOW() ELSE ended_at END,
            updated_at=NOW() WHERE id=$1
         RETURNING id,vehicle_id,title,description,price::text AS price,status,published_at`,
        [id, b.title ?? current.title, b.description === undefined ? current.description : b.description,
          b.price ?? current.price, next],
      );
      const ad = updated.rows[0];
      const eventType = next !== current.status
        ? ({ PUBLISHED: 'ADVERTISEMENT_PUBLISHED', PAUSED: 'ADVERTISEMENT_PAUSED', ENDED: 'ADVERTISEMENT_ENDED' } as const)[next as 'PUBLISHED' | 'PAUSED' | 'ENDED']
        : 'ADVERTISEMENT_UPDATED';
      ids.push(await enqueueAudit(client, {
        eventType, entityType: 'advertisement', entityId: id,
        previousValues: { status: current.status, title: current.title, price: current.price },
        newValues: { status: ad.status, title: ad.title, price: ad.price }, correlationId: randomUUID(),
      }));
      await client.query('COMMIT');
      const audit = await deliverAuditBatch(ids);
      return { data: ad, audit };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { client.release(); }
  });

  /** Exclusão lógica: o anúncio some do catálogo, mas o histórico de vendas e leads permanece. */
  app.delete<IdParams>('/stock/advertisements/:id', async (request, reply) => {
    const { id } = request.params;
    if (!isUuid(id)) return reply.code(400).send({ error: 'INVALID_ID' });
    const initial = await postgres.query<{ vehicle_id: string }>('SELECT vehicle_id FROM public.advertisements WHERE id=$1', [id]);
    if (!initial.rows[0]) return reply.code(404).send({ error: 'NOT_FOUND' });
    const client = await postgres.connect();
    const ids: string[] = [];
    try {
      await client.query('BEGIN');
      await lockVehicle(client, initial.rows[0].vehicle_id);
      const result = await client.query<AdRow>(
        `SELECT id,vehicle_id,title,description,price::text AS price,status,published_at
         FROM public.advertisements WHERE id=$1 FOR UPDATE`, [id],
      );
      const ad = result.rows[0];
      if (!ad) { await rollback(client); return reply.code(404).send({ error: 'NOT_FOUND' }); }
      if (ad.status === 'ENDED') { await rollback(client); return reply.code(409).send({ error: 'ALREADY_ENDED', message: 'Anúncio já encerrado' }); }
      const changed = await client.query(
        `UPDATE public.advertisements SET status='ENDED',ended_at=NOW(),updated_at=NOW() WHERE id=$1 RETURNING id`, [id],
      );
      ids.push(await enqueueAudit(client, {
        eventType: 'ADVERTISEMENT_ENDED', entityType: 'advertisement', entityId: id,
        previousValues: { status: ad.status }, newValues: { status: 'ENDED', reason: 'REMOVED_FROM_CATALOG' }, correlationId: randomUUID(),
      }));
      await client.query('COMMIT');
      const audit = await deliverAuditBatch(ids);
      return reply.send({ data: { id: changed.rows[0].id, status: 'ENDED' }, deletion: 'logical', audit });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { client.release(); }
  });

  /** Retira o veículo do estoque ativo (INACTIVE), preservando referências históricas e auditoria. */
  app.delete<IdParams>('/stock/vehicles/:id', async (request, reply) => {
    const { id } = request.params;
    if (!isUuid(id)) return reply.code(400).send({ error: 'INVALID_ID' });
    const client = await postgres.connect();
    const ids: string[] = [];
    const correlationId = randomUUID();
    try {
      await client.query('BEGIN');
      const vehicle = await lockVehicle(client, id);
      if (!vehicle) { await rollback(client); return reply.code(404).send({ error: 'NOT_FOUND' }); }
      if (vehicle.status === 'INACTIVE') { await rollback(client); return reply.code(409).send({ error: 'ALREADY_INACTIVE' }); }
      const sale = await client.query(`SELECT 1 FROM public.sales WHERE vehicle_id=$1 AND status IN ('PENDING','COMPLETED') LIMIT 1`, [id]);
      if (vehicle.status === 'SOLD' || (sale.rowCount ?? 0) > 0) {
        await rollback(client); return reply.code(409).send({ error: 'VEHICLE_HAS_SALE', message: 'Veículo vinculado a venda pendente ou concluída: exclusão bloqueada' });
      }
      const appointments = await client.query(
        `SELECT 1 FROM public.appointments WHERE vehicle_id=$1 AND status IN ('SCHEDULED','CONFIRMED') LIMIT 1`, [id],
      );
      if ((appointments.rowCount ?? 0) > 0) {
        await rollback(client); return reply.code(409).send({ error: 'VEHICLE_HAS_APPOINTMENTS', message: 'Há agendamentos ativos para este veículo' });
      }
      const ads = await client.query<{ id: string; status: string }>(
        `SELECT id,status FROM public.advertisements WHERE vehicle_id=$1 AND status IN ('PUBLISHED','PAUSED','DRAFT') FOR UPDATE`, [id],
      );
      for (const ad of ads.rows) {
        await client.query(`UPDATE public.advertisements SET status='ENDED',ended_at=NOW(),updated_at=NOW() WHERE id=$1`, [ad.id]);
        ids.push(await enqueueAudit(client, {
          eventType: 'ADVERTISEMENT_ENDED', entityType: 'advertisement', entityId: ad.id,
          previousValues: { status: ad.status }, newValues: { status: 'ENDED', reason: 'VEHICLE_INACTIVATED' }, correlationId,
        }));
      }
      await client.query(`UPDATE public.vehicles SET status='INACTIVE',updated_at=NOW() WHERE id=$1`, [id]);
      ids.push(await enqueueAudit(client, {
        eventType: 'VEHICLE_STATUS_CHANGED', entityType: 'vehicle', entityId: id,
        previousValues: { status: vehicle.status }, newValues: { status: 'INACTIVE', reason: 'REMOVED_FROM_STOCK' }, correlationId,
      }));
      await client.query('COMMIT');
      const audit = await deliverAuditBatch(ids);
      return { data: { id, status: 'INACTIVE', adsEnded: ads.rows.length }, deletion: 'logical', audit };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (isForeignKey(error)) return reply.code(409).send({ error: 'VEHICLE_IN_USE' });
      throw error;
    } finally { client.release(); }
  });
}
