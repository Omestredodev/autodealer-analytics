
-- ============================================================
-- AUTODEALER ANALYTICS
-- PostgreSQL - Benchmark de desempenho
-- ============================================================

-- IMPORTANTE:
-- Execute os testes em uma base sem alterações concorrentes.
-- Os resultados podem variar conforme cache e hardware.


-- ============================================================
-- TESTE 1 - VEÍCULOS DISPONÍVEIS
-- ============================================================

-- Cenário sem utilização de Index Scan.
BEGIN;
SET LOCAL enable_indexscan = OFF;
SET LOCAL enable_indexonlyscan = OFF;

EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM vehicles
WHERE status = 'AVAILABLE'
ORDER BY created_at DESC;

ROLLBACK;


-- Cenário normal.
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM vehicles
WHERE status = 'AVAILABLE'
ORDER BY created_at DESC;


-- ============================================================
-- TESTE 2 - PESQUISA POR MARCA E MODELO
-- ============================================================

BEGIN;
SET LOCAL enable_indexscan = OFF;
SET LOCAL enable_indexonlyscan = OFF;

EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM vehicles
WHERE make = 'BMW'
ORDER BY model, model_year DESC;

ROLLBACK;


EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM vehicles
WHERE make = 'BMW'
ORDER BY model, model_year DESC;


-- ============================================================
-- TESTE 3 - ANÚNCIOS PUBLICADOS
-- ============================================================

BEGIN;
SET LOCAL enable_indexscan = OFF;
SET LOCAL enable_indexonlyscan = OFF;

EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM advertisements
WHERE status = 'PUBLISHED'
ORDER BY published_at DESC;

ROLLBACK;


EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM advertisements
WHERE status = 'PUBLISHED'
ORDER BY published_at DESC;


-- ============================================================
-- TESTE 4 - LEADS POR STATUS
-- ============================================================

BEGIN;
SET LOCAL enable_indexscan = OFF;
SET LOCAL enable_indexonlyscan = OFF;

EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM leads
WHERE status = 'CONVERTED';

ROLLBACK;


EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM leads
WHERE status = 'CONVERTED';


-- ============================================================
-- TESTE 5 - AGENDAMENTOS POR PERÍODO
-- ============================================================

BEGIN;
SET LOCAL enable_indexscan = OFF;
SET LOCAL enable_indexonlyscan = OFF;

EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM appointments
WHERE scheduled_at >= TIMESTAMPTZ '2026-11-01 00:00:00-03'
  AND scheduled_at < TIMESTAMPTZ '2026-12-01 00:00:00-03';

ROLLBACK;


EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM appointments
WHERE scheduled_at >= TIMESTAMPTZ '2026-11-01 00:00:00-03'
  AND scheduled_at < TIMESTAMPTZ '2026-12-01 00:00:00-03';


-- ============================================================
-- TESTE 6 - VENDAS CONCLUÍDAS
-- ============================================================

BEGIN;
SET LOCAL enable_indexscan = OFF;
SET LOCAL enable_indexonlyscan = OFF;

EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM sales
WHERE status = 'COMPLETED'
ORDER BY sold_at DESC;

ROLLBACK;


EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM sales
WHERE status = 'COMPLETED'
ORDER BY sold_at DESC;
