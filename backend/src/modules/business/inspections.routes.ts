import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { getMongoDatabase } from '../../database/mongodb';
import { postgres } from '../../database/postgresql';
import { isUuid } from '../catalog/catalog.shared';

type Condition = 'OK' | 'ATTENTION' | 'REPAIR';
type Checklist = { bodywork: Condition; mechanical: Condition; tires: Condition; documents: Condition };
type Inspection = {
  id: string; vehicleId: string; checklist: Checklist; notes: string;
  status: 'DRAFT' | 'APPROVED'; createdAt: Date; updatedAt: Date;
};
const CONDITIONS = new Set(['OK', 'ATTENTION', 'REPAIR']);
const FIELDS = ['bodywork', 'mechanical', 'tires', 'documents'] as const;
const INSPECTIONS = 'vehicle_inspections';

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw);
}
function onlyKeys(raw: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(raw).every(k => allowed.includes(k));
}
function checklist(raw: unknown): Checklist | null {
  if (!isRecord(raw) || !onlyKeys(raw, FIELDS) || FIELDS.some(k => !CONDITIONS.has(String(raw[k] ?? '')))) return null;
  return Object.fromEntries(FIELDS.map(k => [k, raw[k]])) as Checklist;
}
function notes(raw: unknown): raw is string {
  return typeof raw === 'string' && raw.length <= 3000;
}
function idValid(value: unknown): value is string { return typeof value === 'string' && isUuid(value); }

export async function inspectionsRoutes(app: FastifyInstance): Promise<void> {
  // Consulta geral do histórico (com paginação) ou histórico de um veículo específico.
  // Mantém compatibilidade com GET /crud/inspections?vehicleId=UUID&limit=30.
  app.get('/inspections', async (request, reply) => {
    const q = request.query as Record<string, unknown>;
    if (!onlyKeys(q, ['vehicleId', 'status', 'page', 'limit'])) {
      return reply.code(400).send({ error: 'INVALID_QUERY', message: 'Filtros aceitos: vehicleId, status, page e limit' });
    }
    if (q.vehicleId !== undefined && !idValid(q.vehicleId)) {
      return reply.code(400).send({ error: 'INVALID_VEHICLE_ID' });
    }
    if (q.status !== undefined && q.status !== 'DRAFT' && q.status !== 'APPROVED') {
      return reply.code(400).send({ error: 'INVALID_STATUS' });
    }
    const numberParam = (value: unknown, fallback: number, max: number): number | null => {
      if (value === undefined) return fallback;
      if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
      const n = Number(value);
      return Number.isSafeInteger(n) && n <= max ? n : null;
    };
    const limit = numberParam(q.limit, 30, 50);
    const page = numberParam(q.page, 1, 1000);
    if (limit === null || page === null) return reply.code(400).send({ error: 'INVALID_PAGINATION' });

    const filter: { vehicleId?: string; status?: 'DRAFT' | 'APPROVED' } = {};
    if (typeof q.vehicleId === 'string') filter.vehicleId = q.vehicleId;
    if (q.status === 'DRAFT' || q.status === 'APPROVED') filter.status = q.status;
    const db = await getMongoDatabase();
    const collection = db.collection<Inspection>(INSPECTIONS);
    const [data, total] = await Promise.all([
      collection.find(filter, { projection: { _id: 0 } })
        .sort({ createdAt: -1, id: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);

    // Enriquecimento: a vistoria continua armazenada no MongoDB, mas exibe
    // marca/modelo/ano do veículo que é a fonte de verdade no PostgreSQL.
    const ids = [...new Set(data.map(item => item.vehicleId))];
    const byVehicle = new Map<string, Record<string, unknown>>();
    if (ids.length) {
      const result = await postgres.query(
        'SELECT id, make, model, model_year, status FROM public.vehicles WHERE id = ANY($1::uuid[])',
        [ids],
      );
      for (const row of result.rows) byVehicle.set(String(row.id), row);
    }
    return {
      data: data.map(item => ({ ...item, vehicle: byVehicle.get(item.vehicleId) ?? null })),
      returned: data.length,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  });

  app.get<{ Params: { id: string } }>('/inspections/:id', async (request, reply) => {
    if (!idValid(request.params.id)) return reply.code(400).send({ error: 'INVALID_ID' });
    const db = await getMongoDatabase();
    const data = await db.collection<Inspection>(INSPECTIONS).findOne({ id: request.params.id }, { projection: { _id: 0 } });
    if (!data) return reply.code(404).send({ error: 'NOT_FOUND' });
    return { data };
  });

  app.post('/inspections', async (request, reply) => {
    if (!isRecord(request.body) || !onlyKeys(request.body, ['vehicleId', 'checklist', 'notes'])) return reply.code(400).send({ error: 'INVALID_BODY' });
    const { vehicleId, notes: observation, checklist: raw } = request.body;
    const checked = checklist(raw);
    if (!idValid(vehicleId) || !checked || !notes(observation ?? '')) return reply.code(400).send({ error: 'INVALID_BODY', message: 'Informe vehicleId, checklist completo e notes (até 3000 caracteres)' });
    const vehicle = await postgres.query('SELECT id FROM public.vehicles WHERE id = $1', [vehicleId]);
    if (!vehicle.rowCount) return reply.code(404).send({ error: 'VEHICLE_NOT_FOUND' });
    const now = new Date();
    const data: Inspection = { id: randomUUID(), vehicleId, checklist: checked, notes: String(observation ?? '').trim(), status: 'DRAFT', createdAt: now, updatedAt: now };
    const db = await getMongoDatabase();
    await db.collection<Inspection>(INSPECTIONS).insertOne(data);
    return reply.code(201).send({ data });
  });

  app.patch<{ Params: { id: string } }>('/inspections/:id', async (request, reply) => {
    if (!idValid(request.params.id)) return reply.code(400).send({ error: 'INVALID_ID' });
    if (!isRecord(request.body) || !Object.keys(request.body).length || !onlyKeys(request.body, ['checklist', 'notes', 'status'])) return reply.code(400).send({ error: 'INVALID_BODY' });
    const update: Partial<Pick<Inspection, 'checklist' | 'notes' | 'status' | 'updatedAt'>> = {};
    if ('checklist' in request.body) {
      const checked = checklist(request.body.checklist);
      if (!checked) return reply.code(400).send({ error: 'INVALID_CHECKLIST' });
      update.checklist = checked;
    }
    if ('notes' in request.body) {
      if (!notes(request.body.notes)) return reply.code(400).send({ error: 'INVALID_NOTES' });
      update.notes = request.body.notes.trim();
    }
    if ('status' in request.body) {
      if (request.body.status !== 'APPROVED') return reply.code(400).send({ error: 'INVALID_STATUS', message: 'Somente DRAFT → APPROVED' });
      update.status = 'APPROVED';
    }
    update.updatedAt = new Date();
    const db = await getMongoDatabase();
    const collection = db.collection<Inspection>(INSPECTIONS);
    const result = await collection.updateOne({ id: request.params.id, status: 'DRAFT' }, { $set: update });
    if (!result.matchedCount) {
      const exists = await collection.findOne({ id: request.params.id });
      return reply.code(exists ? 409 : 404).send({ error: exists ? 'INSPECTION_APPROVED' : 'NOT_FOUND', message: 'Vistoria aprovada não pode ser alterada' });
    }
    const data = await collection.findOne({ id: request.params.id }, { projection: { _id: 0 } });
    return { data };
  });

  app.delete<{ Params: { id: string } }>('/inspections/:id', async (request, reply) => {
    if (!idValid(request.params.id)) return reply.code(400).send({ error: 'INVALID_ID' });
    const db = await getMongoDatabase();
    const collection = db.collection<Inspection>(INSPECTIONS);
    const deleted = await collection.deleteOne({ id: request.params.id, status: 'DRAFT' });
    if (!deleted.deletedCount) {
      const exists = await collection.findOne({ id: request.params.id });
      return reply.code(exists ? 409 : 404).send({ error: exists ? 'INSPECTION_APPROVED' : 'NOT_FOUND', message: 'Somente rascunhos podem ser excluídos' });
    }
    return reply.code(204).send();
  });
}
