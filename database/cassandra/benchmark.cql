
-- =====================================================
-- AutoDealer Analytics
-- Cassandra - Consultas para testes de benchmark
-- =====================================================

USE autodealer;

-- Consistencia utilizada nos testes locais.
CONSISTENCY ONE;


-- 1. Leitura de eventos por anuncio
SELECT *
FROM events_by_advertisement
WHERE advertisement_id = 11111111-1111-4111-8111-111111111111
AND event_day = '2026-11-02'
AND shard = 0
LIMIT 100;


-- 2. Leitura de eventos por usuario
SELECT *
FROM events_by_user
WHERE user_id = 33333333-3333-4333-8333-333333333333
AND event_day = '2026-11-02'
AND shard = 0
LIMIT 100;


-- 3. Leitura de eventos por veiculo
SELECT *
FROM events_by_vehicle
WHERE vehicle_id = 22222222-2222-4222-8222-222222222222
AND event_day = '2026-11-02'
AND shard = 0
LIMIT 100;


-- 4. Leitura de eventos por tipo
SELECT *
FROM events_by_type
WHERE event_type = 'ADVERTISEMENT_VIEWED'
AND event_day = '2026-11-02'
AND shard = 0
LIMIT 100;


-- 5. Leitura de eventos por periodo
SELECT *
FROM events_by_period
WHERE event_day = '2026-11-02'
AND shard = 0
LIMIT 100;
