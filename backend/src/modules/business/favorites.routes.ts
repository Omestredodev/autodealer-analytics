import type { FastifyInstance } from 'fastify';
import { types } from 'cassandra-driver';
import { getCassandraClient } from '../../database/cassandra';
import { postgres } from '../../database/postgresql';
import { isUuid } from '../catalog/catalog.shared';

const TABLE = 'autodealer.favorites_by_user';
const LEVELS = new Set(['LOW', 'MEDIUM', 'HIGH']);
const uuid = (value: unknown): value is string => typeof value === 'string' && isUuid(value);
function objectOnly(value: unknown, names: readonly string[]): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).every(k => names.includes(k));
}
const fromRow = (row: { get: (field: string) => unknown }) => ({
  userId: String(row.get('user_id')),
  vehicleId: String(row.get('vehicle_id')),
  interestLevel: String(row.get('interest_level')),
  createdAt: row.get('created_at') instanceof Date ? (row.get('created_at') as Date).toISOString() : String(row.get('created_at')),
  updatedAt: row.get('updated_at') instanceof Date ? (row.get('updated_at') as Date).toISOString() : String(row.get('updated_at')),
});

export async function favoritesRoutes(app: FastifyInstance): Promise<void> {
  /** A aplicação não tem login: utiliza um usuário real de seed, apenas para demonstração local. */
  app.get('/demo-user', async (_request, reply) => {
    const result = await postgres.query("SELECT id, full_name FROM public.users WHERE is_active = TRUE ORDER BY created_at, id LIMIT 1");
    if (!result.rows[0]) return reply.code(404).send({ error: 'DEMO_USER_NOT_FOUND' });
    return { data: result.rows[0] };
  });

  app.get('/favorites', async (request, reply) => {
    const q = request.query as Record<string, unknown>;
    if (!objectOnly(q, ['userId']) || !uuid(q.userId)) return reply.code(400).send({ error: 'INVALID_QUERY', message: 'userId UUID obrigatório' });
    const client = await getCassandraClient();
    const result = await client.execute(`SELECT user_id, vehicle_id, interest_level, created_at, updated_at FROM ${TABLE} WHERE user_id = ? LIMIT 100`, [types.Uuid.fromString(q.userId)], { prepare: true });
    const data = result.rows.map(fromRow);
    if (data.length) {
      const vehicles = await postgres.query('SELECT id, make, model, model_year, status FROM public.vehicles WHERE id = ANY($1::uuid[])', [data.map(item => item.vehicleId)]);
      const byId = new Map<string, Record<string, unknown>>(vehicles.rows.map(row => [String(row.id), row]));
      return { data: data.map(item => ({ ...item, vehicle: byId.get(item.vehicleId) ?? null })), returned: data.length };
    }
    return { data, returned: 0 };
  });

  app.post('/favorites', async (request, reply) => {
    if (!objectOnly(request.body, ['userId', 'vehicleId', 'interestLevel'])) return reply.code(400).send({ error: 'INVALID_BODY' });
    const { userId, vehicleId, interestLevel } = request.body;
    if (!uuid(userId) || !uuid(vehicleId) || typeof interestLevel !== 'string' || !LEVELS.has(interestLevel)) {
      return reply.code(400).send({ error: 'INVALID_BODY', message: 'userId e vehicleId UUID; interestLevel LOW, MEDIUM ou HIGH' });
    }
    const [user, vehicle] = await Promise.all([
      postgres.query('SELECT 1 FROM public.users WHERE id = $1 AND is_active = TRUE', [userId]),
      postgres.query('SELECT 1 FROM public.vehicles WHERE id = $1', [vehicleId]),
    ]);
    if (!user.rowCount || !vehicle.rowCount) return reply.code(404).send({ error: 'INVALID_REFERENCE' });
    const now = new Date();
    const client = await getCassandraClient();
    const result = await client.execute(`INSERT INTO ${TABLE} (user_id, vehicle_id, interest_level, created_at, updated_at) VALUES (?, ?, ?, ?, ?) IF NOT EXISTS`,
      [types.Uuid.fromString(userId), types.Uuid.fromString(vehicleId), interestLevel, now, now], { prepare: true });
    if (result.first()?.get('[applied]') !== true) return reply.code(409).send({ error: 'ALREADY_FAVORITED' });
    return reply.code(201).send({ data: { userId, vehicleId, interestLevel, createdAt: now.toISOString(), updatedAt: now.toISOString() } });
  });

  app.patch<{ Params: { userId: string; vehicleId: string } }>('/favorites/:userId/:vehicleId', async (request, reply) => {
    const { userId, vehicleId } = request.params;
    if (!uuid(userId) || !uuid(vehicleId)) return reply.code(400).send({ error: 'INVALID_ID' });
    if (!objectOnly(request.body, ['interestLevel']) || Object.keys(request.body).length !== 1 || typeof request.body.interestLevel !== 'string' || !LEVELS.has(request.body.interestLevel)) {
      return reply.code(400).send({ error: 'INVALID_BODY' });
    }
    const now = new Date();
    const client = await getCassandraClient();
    const result = await client.execute(`UPDATE ${TABLE} SET interest_level = ?, updated_at = ? WHERE user_id = ? AND vehicle_id = ? IF EXISTS`,
      [request.body.interestLevel, now, types.Uuid.fromString(userId), types.Uuid.fromString(vehicleId)], { prepare: true });
    if (result.first()?.get('[applied]') !== true) return reply.code(404).send({ error: 'NOT_FOUND' });
    return { data: { userId, vehicleId, interestLevel: request.body.interestLevel, updatedAt: now.toISOString() } };
  });

  app.delete<{ Params: { userId: string; vehicleId: string } }>('/favorites/:userId/:vehicleId', async (request, reply) => {
    const { userId, vehicleId } = request.params;
    if (!uuid(userId) || !uuid(vehicleId)) return reply.code(400).send({ error: 'INVALID_ID' });
    const client = await getCassandraClient();
    const result = await client.execute(`DELETE FROM ${TABLE} WHERE user_id = ? AND vehicle_id = ? IF EXISTS`,
      [types.Uuid.fromString(userId), types.Uuid.fromString(vehicleId)], { prepare: true });
    if (result.first()?.get('[applied]') !== true) return reply.code(404).send({ error: 'NOT_FOUND' });
    return reply.code(204).send();
  });
}
