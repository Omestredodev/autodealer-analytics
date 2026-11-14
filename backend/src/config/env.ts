
import "dotenv/config";

/**
 * Centraliza as configuracoes da aplicacao.
 * Valores sensiveis sao carregados do arquivo .env.
 */

function getPort(name: string, defaultValue: number): number {
  const value = Number(process.env[name] ?? defaultValue);

  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`Porta invalida na variavel ${name}`);
  }

  return value;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Variavel obrigatoria nao configurada: ${name}`
    );
  }

  return value;
}

export const env = {
  PORT: getPort("PORT", 3333),

  PGHOST: process.env.PGHOST ?? "127.0.0.1",
  PGPORT: getPort("PGPORT", 5432),
  PGDATABASE: process.env.PGDATABASE ?? "autodealer_analytics",
  PGUSER: process.env.PGUSER ?? "postgres",
  PGPASSWORD: getRequiredEnv("PGPASSWORD")
};
