
-- =====================================================
-- AutoDealer Analytics
-- Cassandra - Consultas de eventos
-- =====================================================

USE autodealer;


-- 1. Consultar eventos de um anuncio em um dia
SELECT *
FROM events_by_advertisement
WHERE advertisement_id = 11111111-1111-4111-8111-111111111111
AND event_day = '2026-11-02'
AND shard = 0;


-- 2. Consultar historico de eventos de um usuario
SELECT *
FROM events_by_user
WHERE user_id = 33333333-3333-4333-8333-333333333333
AND event_day = '2026-11-02'
AND shard = 0;


-- 3. Consultar eventos relacionados a um veiculo
SELECT *
FROM events_by_vehicle
WHERE vehicle_id = 22222222-2222-4222-8222-222222222222
AND event_day = '2026-11-02'
AND shard = 0;


-- 4. Consultar eventos de um tipo especifico
SELECT *
FROM events_by_type
WHERE event_type = 'ADVERTISEMENT_VIEWED'
AND event_day = '2026-11-02'
AND shard = 0;


-- 5. Consultar todos os eventos registrados em um dia
SELECT *
FROM events_by_period
WHERE event_day = '2026-11-02'
AND shard = 0;
