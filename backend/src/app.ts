
import Fastify from "fastify";

import { checkPostgresConnection } from "./database/postgresql";
import { vehiclesRoutes } from "./modules/vehicles/vehicles.routes";

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
   * Registra o modulo de veiculos.
   */
  app.register(vehiclesRoutes);

  return app;
}
