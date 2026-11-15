-- AutoDealer Analytics | Entrega 4
-- Migração ADITIVA e idempotente. Não apaga registros existentes.
-- A outbox é escrita na MESMA transação PostgreSQL da mudança comercial.
BEGIN;
CREATE TABLE IF NOT EXISTS public.audit_outbox (
    event_id UUID PRIMARY KEY,
    event_type VARCHAR(64) NOT NULL,
    entity_type VARCHAR(32) NOT NULL,
    entity_id UUID NOT NULL,
    previous_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    new_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    correlation_id UUID NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    last_error TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_outbox_pending
    ON public.audit_outbox (created_at, event_id)
    WHERE delivered_at IS NULL;
COMMIT;
