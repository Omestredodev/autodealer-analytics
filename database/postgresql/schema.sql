
-- =========================================================
-- AutoDealer Analytics
-- PostgreSQL 17
-- Schema oficial do banco de dados
-- =========================================================

-- UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- 1. USUARIOS
-- =========================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_users_role
        CHECK (role IN ('ADMIN', 'MANAGER', 'SELLER'))
);

-- =========================================================
-- 2. CLIENTES
-- =========================================================

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(30),
    document_number VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_customers_document
        UNIQUE (document_number)
);

-- =========================================================
-- 3. CATALOGO TECNICO DE VEICULOS
-- =========================================================

CREATE TABLE vehicle_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    make VARCHAR(80) NOT NULL,
    model VARCHAR(100) NOT NULL,
    version VARCHAR(100) NOT NULL,

    manufacturing_year SMALLINT NOT NULL,
    model_year SMALLINT NOT NULL,

    engine VARCHAR(100) NOT NULL,
    engine_displacement_cc INTEGER,
    engine_cylinders SMALLINT,
    engine_power_cv NUMERIC(7,2),
    engine_torque_nm NUMERIC(7,2),

    fuel_type VARCHAR(30) NOT NULL,
    propulsion_type VARCHAR(20) NOT NULL,
    transmission VARCHAR(30) NOT NULL,

    specification_source TEXT NOT NULL,
    specification_verified BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_vehicle_catalog_configuration
        UNIQUE (
            make,
            model,
            version,
            manufacturing_year,
            model_year
        ),

    CONSTRAINT chk_catalog_manufacturing_year
        CHECK (manufacturing_year BETWEEN 1900 AND 2100),

    CONSTRAINT chk_catalog_model_year
        CHECK (model_year BETWEEN 1900 AND 2100),

    CONSTRAINT chk_catalog_displacement
        CHECK (
            engine_displacement_cc IS NULL
            OR engine_displacement_cc > 0
        ),

    CONSTRAINT chk_catalog_cylinders
        CHECK (
            engine_cylinders IS NULL
            OR engine_cylinders > 0
        ),

    CONSTRAINT chk_catalog_power
        CHECK (
            engine_power_cv IS NULL
            OR engine_power_cv > 0
        ),

    CONSTRAINT chk_catalog_torque
        CHECK (
            engine_torque_nm IS NULL
            OR engine_torque_nm > 0
        ),

    CONSTRAINT chk_catalog_propulsion
        CHECK (
            propulsion_type IN (
                'COMBUSTION',
                'HYBRID',
                'PLUG_IN_HYBRID',
                'ELECTRIC'
            )
        ),
    CONSTRAINT chk_catalog_verified_source
        CHECK (
            specification_verified = FALSE
            OR (
                engine IS NOT NULL
                AND fuel_type IS NOT NULL
                AND transmission IS NOT NULL
                AND specification_source IS NOT NULL
            )
        )
);

-- =========================================================
-- 4. VEICULOS
-- =========================================================

CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relacionamento com catalogo tecnico
    catalog_id UUID REFERENCES vehicle_catalog(id),

    -- Identificacao
    make VARCHAR(80) NOT NULL,
    model VARCHAR(100) NOT NULL,
    version VARCHAR(100),

    -- Ano e caracteristicas da unidade
    manufacturing_year SMALLINT NOT NULL,
    model_year SMALLINT NOT NULL,
    color VARCHAR(50),
    mileage INTEGER NOT NULL DEFAULT 0,
    license_plate VARCHAR(10),
    vin VARCHAR(30) UNIQUE,

    -- Especificacoes do motor
    engine VARCHAR(100),
    engine_displacement_cc INTEGER,
    engine_cylinders SMALLINT,
    engine_power_cv NUMERIC(7,2),
    engine_torque_nm NUMERIC(7,2),

    -- Alimentacao e transmissao
    fuel_type VARCHAR(30),
    propulsion_type VARCHAR(20),
    transmission VARCHAR(30),

    -- Rastreabilidade
    specification_source TEXT,
    specification_verified BOOLEAN NOT NULL DEFAULT FALSE,

    -- Situacao
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',

    -- Auditoria temporal
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_vehicles_manufacturing_year
        CHECK (manufacturing_year BETWEEN 1900 AND 2100),

    CONSTRAINT chk_vehicles_model_year
        CHECK (model_year BETWEEN 1900 AND 2100),

    CONSTRAINT chk_vehicles_mileage
        CHECK (mileage >= 0),

    CONSTRAINT chk_vehicles_engine_displacement
        CHECK (
            engine_displacement_cc IS NULL
            OR engine_displacement_cc > 0
        ),

    CONSTRAINT chk_vehicles_engine_cylinders
        CHECK (
            engine_cylinders IS NULL
            OR engine_cylinders > 0
        ),

    CONSTRAINT chk_vehicles_engine_power
        CHECK (
            engine_power_cv IS NULL
            OR engine_power_cv > 0
        ),

    CONSTRAINT chk_vehicles_engine_torque
        CHECK (
            engine_torque_nm IS NULL
            OR engine_torque_nm > 0
        ),

    CONSTRAINT chk_vehicles_propulsion
        CHECK (
            propulsion_type IS NULL
            OR propulsion_type IN (
                'COMBUSTION',
                'HYBRID',
                'PLUG_IN_HYBRID',
                'ELECTRIC'
            )
        ),

    CONSTRAINT chk_vehicles_status
        CHECK (
            status IN (
                'AVAILABLE',
                'RESERVED',
                'SOLD',
                'INACTIVE'
            )
        ),

    CONSTRAINT chk_vehicles_specification_source
        CHECK (
            specification_verified = FALSE
            OR (
                engine IS NOT NULL
                AND fuel_type IS NOT NULL
                AND transmission IS NOT NULL
                AND specification_source IS NOT NULL
            )
        )
);

-- =========================================================
-- 5. ANUNCIOS
-- =========================================================

CREATE TABLE advertisements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    title VARCHAR(180) NOT NULL,
    description TEXT,
    price NUMERIC(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_advertisements_price
        CHECK (price >= 0),

    CONSTRAINT chk_advertisements_status
        CHECK (
            status IN ('DRAFT', 'PUBLISHED', 'PAUSED', 'ENDED')
        )
);

-- =========================================================
-- 6. LEADS
-- =========================================================

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    advertisement_id UUID REFERENCES advertisements(id),
    assigned_user_id UUID REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'NEW',
    source VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_leads_status
        CHECK (
            status IN ('NEW', 'IN_PROGRESS', 'CONVERTED', 'LOST')
        )
);

-- =========================================================
-- 7. AGENDAMENTOS
-- =========================================================

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    vehicle_id UUID REFERENCES vehicles(id),
    assigned_user_id UUID REFERENCES users(id),
    scheduled_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_appointments_status
        CHECK (
            status IN (
                'SCHEDULED',
                'CONFIRMED',
                'CANCELLED',
                'COMPLETED'
            )
        )
);

-- =========================================================
-- 8. VENDAS
-- =========================================================

CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    advertisement_id UUID REFERENCES advertisements(id),
    lead_id UUID REFERENCES leads(id),
    seller_id UUID REFERENCES users(id),
    sale_price NUMERIC(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    sold_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_sales_price
        CHECK (sale_price >= 0),

    CONSTRAINT chk_sales_status
        CHECK (
            status IN ('PENDING', 'COMPLETED', 'CANCELLED')
        )
);

-- =========================================================
-- FIM DO SCHEMA
-- =========================================================
