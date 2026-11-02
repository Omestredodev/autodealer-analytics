
-- ============================================================
-- AUTODEALER ANALYTICS
-- PostgreSQL - Indexação e otimização
-- ============================================================


-- 1. VEÍCULOS
-- Otimiza a listagem de veículos disponíveis por data.
CREATE INDEX idx_vehicles_available_created
ON vehicles (created_at DESC)
WHERE status = 'AVAILABLE';

-- Otimiza pesquisas por marca, modelo e ano.
CREATE INDEX idx_vehicles_make_model_year
ON vehicles (make, model, model_year DESC);


-- 2. ANÚNCIOS
-- Otimiza a consulta de anúncios publicados por data.
CREATE INDEX idx_advertisements_published_date
ON advertisements (published_at DESC)
WHERE status = 'PUBLISHED';

-- Otimiza relacionamentos entre anúncios e veículos.
CREATE INDEX idx_advertisements_vehicle
ON advertisements (vehicle_id);


-- 3. LEADS
-- Otimiza agrupamentos e filtros por status.
CREATE INDEX idx_leads_status
ON leads (status);

-- Otimiza consultas de leads por data.
CREATE INDEX idx_leads_created_at
ON leads (created_at DESC);

-- Otimiza relacionamentos com clientes.
CREATE INDEX idx_leads_customer
ON leads (customer_id);


-- 4. AGENDAMENTOS
-- Otimiza pesquisas por período.
CREATE INDEX idx_appointments_scheduled_at
ON appointments (scheduled_at);

-- Otimiza relacionamentos com clientes e veículos.
CREATE INDEX idx_appointments_customer
ON appointments (customer_id);

CREATE INDEX idx_appointments_vehicle
ON appointments (vehicle_id);


-- 5. VENDAS
-- Otimiza consultas de vendas concluídas por data.
CREATE INDEX idx_sales_completed_date
ON sales (sold_at DESC)
WHERE status = 'COMPLETED';

-- Otimiza relacionamentos com clientes e veículos.
CREATE INDEX idx_sales_customer
ON sales (customer_id);

CREATE INDEX idx_sales_vehicle
ON sales (vehicle_id);


-- 6. ATUALIZAÇÃO DAS ESTATÍSTICAS
-- Ajuda o otimizador do PostgreSQL a escolher os melhores planos.
ANALYZE vehicles;
ANALYZE advertisements;
ANALYZE leads;
ANALYZE appointments;
ANALYZE sales;
