
import type { FastifyPluginAsync } from "fastify";
import { postgres } from "../../database/postgresql";

/**
 * Parametros recebidos pela URL.
 *
 * Exemplo:
 * GET /vehicles?page=1&limit=10
 */
interface VehiclesQuery {
  page?: string;
  limit?: string;
}

/**
 * Estrutura dos campos retornados pelo PostgreSQL.
 */
interface VehicleRow {
  id: string;
  status: string;
  created_at: Date;
}

export const vehiclesRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: VehiclesQuery }>(
    "/vehicles",
    async (request, reply) => {
      const page = Number(request.query.page ?? 1);
      const limit = Number(request.query.limit ?? 20);

      // Evita paginas e limites invalidos.
      if (
        !Number.isSafeInteger(page) ||
        page < 1 ||
        !Number.isSafeInteger(limit) ||
        limit < 1 ||
        limit > 100
      ) {
        return reply.code(400).send({
          error: "Parametros invalidos",
          message:
            "page deve ser maior ou igual a 1 e " +
            "limit deve estar entre 1 e 100"
        });
      }

      const offset = (page - 1) * limit;

      if (!Number.isSafeInteger(offset)) {
        return reply.code(400).send({
          error: "Pagina fora do intervalo permitido"
        });
      }

      /**
       * Consulta somente veiculos disponiveis.
       *
       * Os parametros $1, $2 e $3 sao enviados
       * separadamente para evitar SQL Injection.
       */
      const result = await postgres.query<VehicleRow>(
        `
          SELECT
            id,
            status,
            created_at
          FROM public.vehicles
          WHERE status = $1
          ORDER BY created_at DESC, id DESC
          LIMIT $2 OFFSET $3
        `,
        ["AVAILABLE", limit, offset]
      );

      return reply.send({
        data: result.rows,
        pagination: {
          page,
          limit,
          returned: result.rows.length
        }
      });
    }
  );
};
