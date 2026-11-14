
import Fastify from "fastify";

import { checkPostgresConnection } from "./database/postgresql";
import { vehiclesRoutes } from "./modules/vehicles/vehicles.routes";
import { advertisementsRoutes } from "./modules/advertisements/advertisements.routes";

/**
 * Configura a instancia principal do Fastify.
 */
export function buildApp() {
  const app = Fastify({
    logger: true
  });

  /**
   * Endpoint de verificacao da API.
   *
   * GET /health
   */
  app.get("/health", async (_request, reply) => {
    const postgresConnected = await checkPostgresConnection();

    if (!postgresConnected) {
      return reply.code(503).send({
        status: "degraded",
        service: "autodealer-backend",
        databases: {
          postgresql: "unavailable"
        }
      });
    }

    return reply.send({
      status: "ok",
      service: "autodealer-backend",
      databases: {
        postgresql: "connected"
      }
    });
  });

  /**
   * Registra os modulos da API.
   */
  app.register(vehiclesRoutes);
  app.register(advertisementsRoutes);

  return app;
}
