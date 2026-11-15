import type { FastifyInstance } from 'fastify';
import { postgres } from '../../database/postgresql';

/** Página inicial pública: apenas anúncios destacados, publicados e com veículo disponível. */
export async function featuredRoutes(app: FastifyInstance): Promise<void> {
  app.get('/featured-vehicles', async () => {
    const result = await postgres.query(`
      SELECT v.id, v.make, v.model, v.version, v.model_year, v.mileage, v.transmission,
             a.id AS advertisement_id, a.title, a.price::text AS price
        FROM public.advertisements a
        JOIN public.vehicles v ON v.id = a.vehicle_id
       WHERE a.is_featured = TRUE
         AND a.status = 'PUBLISHED'
         AND v.status = 'AVAILABLE'
       ORDER BY a.updated_at DESC, a.id DESC
       LIMIT 6
    `);
    return { data: result.rows, returned: result.rows.length };
  });
}
