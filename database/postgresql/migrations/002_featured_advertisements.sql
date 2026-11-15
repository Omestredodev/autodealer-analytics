-- Migration aditiva, idempotente: não altera status nem exclui anúncios existentes.
ALTER TABLE public.advertisements
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_ads_featured_published
  ON public.advertisements (updated_at DESC, id DESC)
  WHERE is_featured = TRUE AND status = 'PUBLISHED';
