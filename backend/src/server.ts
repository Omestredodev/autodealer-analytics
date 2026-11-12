
import { buildApp } from "./app";
import { env } from "./config/env";
import { postgres } from "./database/postgresql";

const app = buildApp();

/**
 * Inicializa o servidor HTTP.
 */
async function start() {
  try {
    const address = await app.listen({
      host: "127.0.0.1",
      port: env.PORT
    });

    app.log.info(
      `AutoDealer Analytics API iniciada em ${address}`
    );
  } catch (error) {
    app.log.error(error, "Erro ao iniciar a API");
    process.exitCode = 1;

    await app.close();
    await postgres.end();
  }
}

/**
 * Encerra recursos da aplicacao.
 */
async function shutdown() {
  try {
    await app.close();
    await postgres.end();
  } catch (error) {
    console.error(
      "[Backend] Erro durante encerramento:",
      error
    );

    process.exitCode = 1;
  }
}

process.once("SIGINT", () => {
  void shutdown();
});

process.once("SIGTERM", () => {
  void shutdown();
});

void start();
