
-- =====================================================
-- AutoDealer Analytics
-- Cassandra - Estrutura do banco de eventos
-- =====================================================

-- Keyspace utilizado no ambiente de desenvolvimento.
-- Replication factor 1: adequado para nosso ambiente local.
CREATE KEYSPACE IF NOT EXISTS autodealer
WITH replication = {
    'class': 'SimpleStrategy',
    'replication_factor': 1
};

USE autodealer;


-- =====================================================
-- 1. Eventos por anuncio
-- Consulta os eventos relacionados a um anuncio.
-- =====================================================

CREATE TABLE IF NOT EXISTS events_by_advertisement (
    advertisement_id UUID,
    event_day DATE,
    shard INT,
    occurred_at TIMESTAMP,
    event_id UUID,
    event_type TEXT,
    vehicle_id UUID,
    user_id UUID,
    correlation_id UUID,
    PRIMARY KEY (
        (advertisement_id, event_day, shard),
        occurred_at,
        event_id
    )
) WITH CLUSTERING ORDER BY (occurred_at DESC, event_id ASC);


-- =====================================================
-- 2. Eventos por usuario
-- Consulta o historico de eventos de um usuario.
-- =====================================================

CREATE TABLE IF NOT EXISTS events_by_user (
    user_id UUID,
    event_day DATE,
    shard INT,
    occurred_at TIMESTAMP,
    event_id UUID,
    event_type TEXT,
    vehicle_id UUID,
    advertisement_id UUID,
    correlation_id UUID,
    PRIMARY KEY (
        (user_id, event_day, shard),
        occurred_at,
        event_id
    )
) WITH CLUSTERING ORDER BY (occurred_at DESC, event_id ASC);


-- =====================================================
-- 3. Eventos por veiculo
-- Consulta os eventos relacionados a um veiculo.
-- =====================================================

CREATE TABLE IF NOT EXISTS events_by_vehicle (
    vehicle_id UUID,
    event_day DATE,
    shard INT,
    occurred_at TIMESTAMP,
    event_id UUID,
    event_type TEXT,
    advertisement_id UUID,
    user_id UUID,
    correlation_id UUID,
    PRIMARY KEY (
        (vehicle_id, event_day, shard),
        occurred_at,
        event_id
    )
) WITH CLUSTERING ORDER BY (occurred_at DESC, event_id ASC);


-- =====================================================
-- 4. Eventos por tipo
-- Consulta eventos de um tipo especifico.
-- =====================================================

CREATE TABLE IF NOT EXISTS events_by_type (
    event_type TEXT,
    event_day DATE,
    shard INT,
    occurred_at TIMESTAMP,
    event_id UUID,
    vehicle_id UUID,
    advertisement_id UUID,
    user_id UUID,
    correlation_id UUID,
    PRIMARY KEY (
        (event_type, event_day, shard),
        occurred_at,
        event_id
    )
) WITH CLUSTERING ORDER BY (occurred_at DESC, event_id ASC);


-- =====================================================
-- 5. Eventos por periodo
-- Consulta os eventos registrados em determinado dia.
-- =====================================================

CREATE TABLE IF NOT EXISTS events_by_period (
    event_day DATE,
    shard INT,
    occurred_at TIMESTAMP,
    event_id UUID,
    event_type TEXT,
    vehicle_id UUID,
    advertisement_id UUID,
    user_id UUID,
    correlation_id UUID,
    PRIMARY KEY (
        (event_day, shard),
        occurred_at,
        event_id
    )
) WITH CLUSTERING ORDER BY (occurred_at DESC, event_id ASC);
