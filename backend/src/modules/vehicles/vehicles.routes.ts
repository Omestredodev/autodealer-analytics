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

/**
 * Endpoints públicos. Um veículo aparece no catálogo se estiver AVAILABLE
 * e possuir um anúncio PUBLISHED. Havendo vários anúncios publicados,
 * o mais recente é escolhido, evitando duplicatas na listagem.
 */
const VEHICLE_FIELDS = `
  v.id,
  v.make,
  v.model,
  v.version,
  v.manufacturing_year,
  v.model_year,
  v.color,
  v.mileage,
  v.engine,
  v.fuel_type,
  v.transmission,
  v.status,
  v.created_at,
  a.id AS advertisement_id,
  a.title AS advertisement_title,
  a.price::text AS price,
  a.published_at
`;

type CountRow = { total: number };

export async function vehiclesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/vehicles', async (request, reply) => {
    const parsed = parseCatalogQuery(request.query);
    if (!parsed.ok) {
      return reply.code(400).send({ error: 'INVALID_QUERY', message: parsed.message });
    }

    const { page, limit, sort, where, params } = parsed.query;
    const totalSql = `${CURRENT_ADS_CTE}
      SELECT COUNT(*)::int AS total ${PUBLIC_FROM} ${where}`;
    const dataSql = `${CURRENT_ADS_CTE}
      SELECT ${VEHICLE_FIELDS} ${PUBLIC_FROM} ${where}
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

  app.get<{ Params: { id: string } }>('/vehicles/:id', async (request, reply) => {
    const { id } = request.params;
    if (!isUuid(id)) {
      return reply.code(400).send({ error: 'INVALID_ID', message: 'ID deve ser UUID válido' });
    }

    const sql = `${CURRENT_ADS_CTE}
      SELECT ${VEHICLE_FIELDS} ${PUBLIC_FROM}
      WHERE v.status = 'AVAILABLE' AND v.id = $1
      LIMIT 1`;
    const result = await postgres.query(sql, [id]);
    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'NOT_FOUND', message: 'Veículo não encontrado no catálogo público' });
    }
    return { data: result.rows[0] };
  });
}
