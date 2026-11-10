
-- =====================================================
-- AutoDealer Analytics
-- Cassandra - Dados ficticios para testes
-- Data dos eventos: 02/11/2026 (UTC)
-- =====================================================

USE autodealer;

-- IDs ficticios utilizados nos testes
-- O shard 0 e utilizado apenas para estes dados de exemplo.


-- =====================================================
-- EVENTO 1: Visualizacao de anuncio
-- =====================================================

INSERT INTO events_by_advertisement (
    advertisement_id, event_day, shard,
    occurred_at, event_id, event_type,
    vehicle_id, user_id, correlation_id
) VALUES (
    11111111-1111-4111-8111-111111111111,
    '2026-11-02', 0,
    '2026-11-02T10:00:00Z',
    aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,
    'ADVERTISEMENT_VIEWED',
    22222222-2222-4222-8222-222222222222,
    33333333-3333-4333-8333-333333333333,
    null
);

INSERT INTO events_by_user (
    user_id, event_day, shard,
    occurred_at, event_id, event_type,
    vehicle_id, advertisement_id, correlation_id
) VALUES (
    33333333-3333-4333-8333-333333333333,
    '2026-11-02', 0,
    '2026-11-02T10:00:00Z',
    aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,
    'ADVERTISEMENT_VIEWED',
    22222222-2222-4222-8222-222222222222,
    11111111-1111-4111-8111-111111111111,
    null
);

INSERT INTO events_by_vehicle (
    vehicle_id, event_day, shard,
    occurred_at, event_id, event_type,
    advertisement_id, user_id, correlation_id
) VALUES (
    22222222-2222-4222-8222-222222222222,
    '2026-11-02', 0,
    '2026-11-02T10:00:00Z',
    aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,
    'ADVERTISEMENT_VIEWED',
    11111111-1111-4111-8111-111111111111,
    33333333-3333-4333-8333-333333333333,
    null
);

INSERT INTO events_by_type (
    event_type, event_day, shard,
    occurred_at, event_id,
    vehicle_id, advertisement_id, user_id, correlation_id
) VALUES (
    'ADVERTISEMENT_VIEWED',
    '2026-11-02', 0,
    '2026-11-02T10:00:00Z',
    aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,
    22222222-2222-4222-8222-222222222222,
    11111111-1111-4111-8111-111111111111,
    33333333-3333-4333-8333-333333333333,
    null
);

INSERT INTO events_by_period (
    event_day, shard, occurred_at, event_id,
    event_type, vehicle_id, advertisement_id, user_id, correlation_id
) VALUES (
    '2026-11-02', 0,
    '2026-11-02T10:00:00Z',
    aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,
    'ADVERTISEMENT_VIEWED',
    22222222-2222-4222-8222-222222222222,
    11111111-1111-4111-8111-111111111111,
    33333333-3333-4333-8333-333333333333,
    null
);


-- =====================================================
-- EVENTO 2: Clique em anuncio
-- =====================================================

INSERT INTO events_by_advertisement (
    advertisement_id, event_day, shard,
    occurred_at, event_id, event_type,
    vehicle_id, user_id, correlation_id
) VALUES (
    11111111-1111-4111-8111-111111111111,
    '2026-11-02', 0,
    '2026-11-02T10:05:00Z',
    bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb,
    'ADVERTISEMENT_CLICKED',
    22222222-2222-4222-8222-222222222222,
    33333333-3333-4333-8333-333333333333,
    null
);

INSERT INTO events_by_user (
    user_id, event_day, shard,
    occurred_at, event_id, event_type,
    vehicle_id, advertisement_id, correlation_id
) VALUES (
    33333333-3333-4333-8333-333333333333,
    '2026-11-02', 0,
    '2026-11-02T10:05:00Z',
    bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb,
    'ADVERTISEMENT_CLICKED',
    22222222-2222-4222-8222-222222222222,
    11111111-1111-4111-8111-111111111111,
    null
);

INSERT INTO events_by_vehicle (
    vehicle_id, event_day, shard,
    occurred_at, event_id, event_type,
    advertisement_id, user_id, correlation_id
) VALUES (
    22222222-2222-4222-8222-222222222222,
    '2026-11-02', 0,
    '2026-11-02T10:05:00Z',
    bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb,
    'ADVERTISEMENT_CLICKED',
    11111111-1111-4111-8111-111111111111,
    33333333-3333-4333-8333-333333333333,
    null
);

INSERT INTO events_by_type (
    event_type, event_day, shard,
    occurred_at, event_id,
    vehicle_id, advertisement_id, user_id, correlation_id
) VALUES (
    'ADVERTISEMENT_CLICKED',
    '2026-11-02', 0,
    '2026-11-02T10:05:00Z',
    bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb,
    22222222-2222-4222-8222-222222222222,
    11111111-1111-4111-8111-111111111111,
    33333333-3333-4333-8333-333333333333,
    null
);

INSERT INTO events_by_period (
    event_day, shard, occurred_at, event_id,
    event_type, vehicle_id, advertisement_id, user_id, correlation_id
) VALUES (
    '2026-11-02', 0,
    '2026-11-02T10:05:00Z',
    bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb,
    'ADVERTISEMENT_CLICKED',
    22222222-2222-4222-8222-222222222222,
    11111111-1111-4111-8111-111111111111,
    33333333-3333-4333-8333-333333333333,
    null
);
