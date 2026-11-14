import type { FastifyInstance } from 'fastify';
import { postgres } from '../../database/postgresql';
import {
  CURRENT_ADS_CTE,
  PUBLIC_FROM,
  getOrderBy,
  isUuid,
  pagination,
  parseCatalogQuery,
} from '../catalog/catalog.shared';

const ADVERTISEMENT_FIELDS = `
  a.id,
  a.vehicle_id,
  a.title,
  a.description,
  a.price::text AS price,
  'PUBLISHED'::text AS status,
  a.published_at,
  v.make,
  v.model,
  v.version,
  v.model_year,
  v.mileage,
  v.color,
  v.fuel_type,
  v.transmission
`;

type CountRow = { total: number };

/** Endpoints públicos. Anúncios inativos não são expostos. */
export async function advertisementsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/advertisements', async (request, reply) => {
    const parsed = parseCatalogQuery(request.query);
    if (!parsed.ok) {
      return reply.code(400).send({ error: 'INVALID_QUERY', message: parsed.message });
    }

    const { page, limit, sort, where, params } = parsed.query;
    const totalSql = `${CURRENT_ADS_CTE}
      SELECT COUNT(*)::int AS total ${PUBLIC_FROM} ${where}`;
    const dataSql = `${CURRENT_ADS_CTE}
      SELECT ${ADVERTISEMENT_FIELDS} ${PUBLIC_FROM} ${where}
      ORDER BY ${getOrderBy(sort)}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const [countResult, dataResult] = await Promise.all([
      postgres.query<CountRow>(totalSql, params),
      postgres.query(dataSql, [...params, limit, (page - 1) * limit]),
    ]);
    const total = countResult.rows[0]?.total ?? 0;

    return {
      data: dataResult.rows,
      pagination: pagination(page, limit, total, dataResult.rows.length),
    };
  });

  app.get<{ Params: { id: string } }>('/advertisements/:id', async (request, reply) => {
    const { id } = request.params;
    if (!isUuid(id)) {
      return reply.code(400).send({ error: 'INVALID_ID', message: 'ID deve ser UUID válido' });
    }

    const sql = `${CURRENT_ADS_CTE}
      SELECT ${ADVERTISEMENT_FIELDS} ${PUBLIC_FROM}
      WHERE v.status = 'AVAILABLE' AND a.id = $1
      LIMIT 1`;
    const result = await postgres.query(sql, [id]);
    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Anúncio não encontrado no catálogo público' });
    }
    return { data: result.rows[0] };
  });
}
