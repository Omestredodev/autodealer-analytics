
-- =========================================================
-- AutoDealer Analytics
-- PostgreSQL 17
-- Seed inicial reproduzivel
-- =========================================================

BEGIN;

-- =========================================================
-- 1. USUARIOS
-- =========================================================

INSERT INTO users (
    full_name, email, password_hash, role
)
SELECT
    'Usuario ' || g,
    'usuario' || g || '@autodealer.test',
    'HASH_FICTICIO_NAO_UTILIZAVEL',
    CASE
        WHEN g = 1 THEN 'ADMIN'
        WHEN g <= 5 THEN 'MANAGER'
        ELSE 'SELLER'
    END
FROM generate_series(1, 20) AS g;


-- =========================================================
-- 2. CLIENTES
-- =========================================================

INSERT INTO customers (
    full_name, email, phone, document_number, created_at
)
SELECT
    'Cliente ' || g,
    'cliente' || g || '@email.test',
    '119' || LPAD(g::TEXT, 8, '0'),
    'DOC' || LPAD(g::TEXT, 10, '0'),
    TIMESTAMPTZ '2025-01-01 00:00:00+00'
        + (g * INTERVAL '1 hour')
FROM generate_series(1, 5000) AS g;


-- =========================================================
-- 3. CATALOGO TECNICO
-- =========================================================
-- Os registros abaixo representam configuracoes documentadas.
-- Anos indicam o ano de referencia da configuracao no catalogo.
-- Campos nao publicados pela fonte permanecem NULL.
-- specification_verified permanece FALSE ate a validacao
-- completa da ficha tecnica.
-- =========================================================

INSERT INTO vehicle_catalog (
    make,
    model,
    version,
    manufacturing_year,
    model_year,
    engine,
    engine_displacement_cc,
    engine_cylinders,
    engine_power_cv,
    engine_torque_nm,
    fuel_type,
    propulsion_type,
    transmission,
    specification_source,
    specification_verified
)
VALUES
(
    'Fiat',
    'Argo',
    '1.0',
    2026,
    2026,
    '1.0-6V',
    NULL,
    NULL,
    NULL,
    NULL,
    'FLEX',
    'COMBUSTION',
    'M-5',
    'INMETRO PBEV 2026 - https://www.gov.br/inmetro/pt-br/assuntos/regulamentacao/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/veiculos-automotivos-pbe-veicular',
    FALSE
),
(
    'BMW',
    'X1',
    'sDrive20i ActiveFlex',
    2019,
    2019,
    '2.0-16V',
    NULL,
    NULL,
    NULL,
    NULL,
    'FLEX',
    'COMBUSTION',
    'A-8',
    'INMETRO PBEV 2019 - https://www.gov.br/inmetro/pt-br/assuntos/regulamentacao/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/veiculos-automotivos-pbe-veicular/veiculos-leves-2019',
    FALSE
),
(
    'Mercedes-Benz',
    'C 200',
    'AMG LINE',
    2025,
    2025,
    '1.5-16V',
    NULL,
    NULL,
    NULL,
    NULL,
    'GASOLINA',
    'HYBRID',
    'A-9',
    'INMETRO PBEV 2025 - https://www.gov.br/inmetro/pt-br/assuntos/regulamentacao/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/veiculos-automotivos-pbe-veicular',
    FALSE
),
(
    'Mercedes-Benz',
    'C 300',
    'AMG LINE',
    2025,
    2025,
    '2.0-16V',
    NULL,
    NULL,
    NULL,
    NULL,
    'GASOLINA',
    'HYBRID',
    'A-9',
    'INMETRO PBEV 2025 - https://www.gov.br/inmetro/pt-br/assuntos/regulamentacao/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/veiculos-automotivos-pbe-veicular',
    FALSE
);


-- =========================================================
-- 4. VEICULOS
-- =========================================================
-- Geracao de 10.000 unidades ficticias.
-- As especificacoes sao copiadas do catalogo.
-- Caracteristicas de estoque sao simuladas.
-- =========================================================

INSERT INTO vehicles (
    catalog_id,
    make,
    model,
    version,
    manufacturing_year,
    model_year,
    color,
    mileage,
    license_plate,
    vin,
    engine,
    engine_displacement_cc,
    engine_cylinders,
    engine_power_cv,
    engine_torque_nm,
    fuel_type,
    propulsion_type,
    transmission,
    specification_source,
    specification_verified,
    status,
    created_at
)
SELECT
    c.id,
    c.make,
    c.model,
    c.version,
    c.manufacturing_year,
    c.model_year,

    CASE (g % 6)
        WHEN 0 THEN 'Preto'
        WHEN 1 THEN 'Branco'
        WHEN 2 THEN 'Prata'
        WHEN 3 THEN 'Cinza'
        WHEN 4 THEN 'Azul'
        ELSE 'Vermelho'
    END,

    (g * 137) % 150000,

    'TST' || LPAD(g::TEXT, 4, '0'),

    'VINTEST' || LPAD(g::TEXT, 11, '0'),

    c.engine,
    c.engine_displacement_cc,
    c.engine_cylinders,
    c.engine_power_cv,
    c.engine_torque_nm,
    c.fuel_type,
    c.propulsion_type,
    c.transmission,
    c.specification_source,
    c.specification_verified,

    CASE
        WHEN g % 20 = 0 THEN 'SOLD'
        WHEN g % 20 = 1 THEN 'RESERVED'
        WHEN g % 20 = 2 THEN 'INACTIVE'
        ELSE 'AVAILABLE'
    END,

    TIMESTAMPTZ '2025-01-01 00:00:00+00'
        + (g * INTERVAL '1 hour')

FROM generate_series(1, 10000) AS g
JOIN vehicle_catalog c
    ON c.id = (
        SELECT id
        FROM vehicle_catalog
        ORDER BY id
        OFFSET ((g - 1) % 4)
        LIMIT 1
    );


-- =========================================================
-- 5. ANUNCIOS
-- =========================================================

INSERT INTO advertisements (
    vehicle_id,
    title,
    description,
    price,
    status,
    published_at,
    ended_at,
    created_by,
    created_at
)
SELECT
    v.id,
    v.make || ' ' || v.model || ' ' || v.version,
    'Anuncio ficticio para testes de desempenho.',
    CASE v.make
        WHEN 'Mercedes-Benz' THEN 180000 + (g % 100) * 1000
        WHEN 'BMW' THEN 140000 + (g % 100) * 1000
        ELSE 65000 + (g % 100) * 500
    END,

    CASE
        WHEN g % 10 <= 5 THEN 'PUBLISHED'
        WHEN g % 10 <= 7 THEN 'PAUSED'
        WHEN g % 10 = 8 THEN 'ENDED'
        ELSE 'DRAFT'
    END,

    CASE
        WHEN g % 10 <= 5 THEN v.created_at + INTERVAL '1 day'
        ELSE NULL
    END,

    CASE
        WHEN g % 10 = 8 THEN v.created_at + INTERVAL '30 days'
        ELSE NULL
    END,

    (SELECT id FROM users ORDER BY id LIMIT 1 OFFSET ((g - 1) % 20)),

    v.created_at

FROM (
    SELECT id, make, model, version, created_at,
           ROW_NUMBER() OVER (ORDER BY id) AS rn
    FROM vehicles
) v
JOIN generate_series(1, 12000) AS s(g)
    ON TRUE
WHERE v.rn = ((g - 1) % 10000) + 1;


-- =========================================================
-- 6. LEADS
-- =========================================================

INSERT INTO leads (
    customer_id,
    advertisement_id,
    assigned_user_id,
    status,
    source,
    notes,
    created_at
)
SELECT
    c.id,
    a.id,
    u.id,

    CASE
        WHEN g % 10 <= 3 THEN 'NEW'
        WHEN g % 10 <= 6 THEN 'IN_PROGRESS'
        WHEN g % 10 <= 8 THEN 'CONVERTED'
        ELSE 'LOST'
    END,

    CASE (g % 4)
        WHEN 0 THEN 'WEBSITE'
        WHEN 1 THEN 'PHONE'
        WHEN 2 THEN 'SOCIAL_MEDIA'
        ELSE 'REFERRAL'
    END,

    'Lead ficticio para testes.',

    TIMESTAMPTZ '2025-01-01 00:00:00+00'
        + (g * INTERVAL '30 minutes')

FROM generate_series(1, 15000) AS s(g)

JOIN customers c
    ON c.id = (
        SELECT id FROM customers
        ORDER BY id OFFSET ((g - 1) % 5000) LIMIT 1
    )

JOIN advertisements a
    ON a.id = (
        SELECT id FROM advertisements
        ORDER BY id OFFSET ((g - 1) % 12000) LIMIT 1
    )

JOIN users u
    ON u.id = (
        SELECT id FROM users
        ORDER BY id OFFSET ((g - 1) % 20) LIMIT 1
    );


-- =========================================================
-- 7. AGENDAMENTOS
-- =========================================================

INSERT INTO appointments (
    lead_id,
    customer_id,
    vehicle_id,
    assigned_user_id,
    scheduled_at,
    status,
    notes
)
SELECT
    l.id,
    l.customer_id,
    v.id,
    u.id,

    TIMESTAMPTZ '2026-01-01 00:00:00+00'
        + (g % 60) * INTERVAL '1 day',

    CASE
        WHEN g % 10 <= 3 THEN 'SCHEDULED'
        WHEN g % 10 <= 5 THEN 'CONFIRMED'
        WHEN g % 10 <= 7 THEN 'COMPLETED'
        ELSE 'CANCELLED'
    END,

    'Agendamento ficticio para testes.'

FROM generate_series(1, 7000) AS s(g)

JOIN leads l
    ON l.id = (
        SELECT id FROM leads
        ORDER BY id OFFSET ((g - 1) % 15000) LIMIT 1
    )

JOIN vehicles v
    ON v.id = (
        SELECT id FROM vehicles
        ORDER BY id OFFSET ((g - 1) % 10000) LIMIT 1
    )

JOIN users u
    ON u.id = (
        SELECT id FROM users
        ORDER BY id OFFSET ((g - 1) % 20) LIMIT 1
    );


-- =========================================================
-- 8. VENDAS
-- =========================================================

INSERT INTO sales (
    vehicle_id,
    customer_id,
    advertisement_id,
    seller_id,
    sale_price,
    status,
    sold_at,
    created_at
)
SELECT
    v.id,
    c.id,
    a.id,
    u.id,

    CASE v.make
        WHEN 'Mercedes-Benz' THEN 180000 + (g % 100) * 1000
        WHEN 'BMW' THEN 140000 + (g % 100) * 1000
        ELSE 65000 + (g % 100) * 500
    END,

    CASE
        WHEN g % 10 <= 6 THEN 'COMPLETED'
        WHEN g % 10 <= 8 THEN 'PENDING'
        ELSE 'CANCELLED'
    END,

    CASE
        WHEN g % 10 <= 6 THEN
            TIMESTAMPTZ '2025-01-01 00:00:00+00'
            + (g * INTERVAL '1 day')
        ELSE NULL
    END,

    TIMESTAMPTZ '2025-01-01 00:00:00+00'
        + (g * INTERVAL '1 day')

FROM generate_series(1, 4000) AS s(g)

JOIN vehicles v
    ON v.id = (
        SELECT id FROM vehicles
        ORDER BY id OFFSET ((g - 1) % 10000) LIMIT 1
    )

JOIN customers c
    ON c.id = (
        SELECT id FROM customers
        ORDER BY id OFFSET ((g - 1) % 5000) LIMIT 1
    )

JOIN advertisements a
    ON a.id = (
        SELECT id FROM advertisements
        ORDER BY id OFFSET ((g - 1) % 12000) LIMIT 1
    )

JOIN users u
    ON u.id = (
        SELECT id FROM users
        ORDER BY id OFFSET ((g - 1) % 20) LIMIT 1
    );


COMMIT;

-- =========================================================
-- FIM DO SEED
-- =========================================================
