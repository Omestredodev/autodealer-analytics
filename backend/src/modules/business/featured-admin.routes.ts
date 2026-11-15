import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { postgres } from '../../database/postgresql';
import { isUuid } from '../catalog/catalog.shared';
import { enqueueAudit, deliverAuditBatch } from '../operations/audit-outbox';

/** Admin local; registrado sob /crud e sujeito ao preHandler do modo demonstração. */
export async function featuredAdminRoutes(app: FastifyInstance): Promise<void> {
  app.patch<{ Params: { id: string } }>('/stock/advertisements/:id/featured', async (request, reply) => {
    const { id } = request.params;
    if (!isUuid(id)) return reply.code(400).send({ error: 'INVALID_ID' });
    const raw = request.body;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
        Object.keys(raw as object).length !== 1 ||
        typeof (raw as { featured?: unknown }).featured !== 'boolean') {
      return reply.code(400).send({ error: 'INVALID_BODY', message: 'Envie {"featured":true|false}' });
    }
    const featured = (raw as { featured: boolean }).featured;
    const client = await postgres.connect();
    const eventIds: string[] = [];
    try {
      await client.query('BEGIN');
      const record = await client.query<{ id: string; is_featured: boolean; status: string; vehicle_status: string }>(
        `SELECT a.id, a.is_featured, a.status, v.status AS vehicle_status
         FROM public.advertisements a JOIN public.vehicles v ON v.id=a.vehicle_id
         WHERE a.id=$1 FOR UPDATE OF a`, [id],
      );
      const ad = record.rows[0];
      if (!ad) {
        await client.query('ROLLBACK');
        return reply.code(404).send({ error: 'NOT_FOUND' });
      }
      if (featured && (ad.status !== 'PUBLISHED' || ad.vehicle_status !== 'AVAILABLE')) {
        await client.query('ROLLBACK');
        return reply.code(409).send({ error: 'NOT_ELIGIBLE', message: 'Só é possível destacar anúncios publicados de veículos disponíveis' });
      }
      if (featured === ad.is_featured) {
        await client.query('COMMIT');
        return { data: { id, featured }, unchanged: true };
      }
      await client.query('UPDATE public.advertisements SET is_featured=$2, updated_at=NOW() WHERE id=$1', [id, featured]);
      eventIds.push(await enqueueAudit(client, {
        eventType: 'ADVERTISEMENT_UPDATED', entityType: 'advertisement', entityId: id,
        previousValues: { featured: ad.is_featured }, newValues: { featured }, correlationId: randomUUID(),
      }));
      await client.query('COMMIT');
      const audit = await deliverAuditBatch(eventIds);
      return { data: { id, featured }, audit };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { client.release(); }
  });
}
