
import { Pool } from "pg";
import { env } from "../config/env";

/**
 * Pool de conexoes com PostgreSQL.
 *
 * Reutiliza conexoes existentes, evitando abrir uma
 * nova conexao a cada requisicao HTTP.
 */
export const postgres = new Pool({
  host: env.PGHOST,
  port: env.PGPORT,
  database: env.PGDATABASE,
  user: env.PGUSER,
  password: env.PGPASSWORD,

  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
});

/**
 * Registra erros em conexoes ociosas.
 */
postgres.on("error", (error) => {
  console.error(
    "[PostgreSQL] Erro no pool de conexoes:",
    error
  );
});

/**
 * Verifica se o PostgreSQL esta respondendo.
 */
export async function checkPostgresConnection(): Promise<boolean> {
  try {
    await postgres.query("SELECT 1");
    return true;
  } catch (error) {
    console.error(
      "[PostgreSQL] Falha na verificacao de conexao:",
      error
    );

    return false;
  }
}
