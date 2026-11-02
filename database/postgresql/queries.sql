
-- ============================================================
-- AUTODEALER ANALYTICS
-- PostgreSQL - Consultas de negócio
-- ============================================================


-- 1. VEÍCULOS DISPONÍVEIS
-- Lista veículos disponíveis para comercialização.

SELECT
    v.id,
    v.make,
    v.model,
    v.version,
    v.manufacturing_year,
    v.model_year,
    v.color,
    v.mileage,
    v.status
FROM vehicles v
WHERE v.status = 'AVAILABLE'
ORDER BY v.created_at DESC;


-- 2. ANÚNCIOS PUBLICADOS
-- Lista anúncios publicados e seus respectivos veículos.

SELECT
    a.id AS advertisement_id,
    a.title,
    a.price,
    a.published_at,
    v.make,
    v.model,
    v.version,
    v.model_year,
    v.color
FROM advertisements a
JOIN vehicles v ON v.id = a.vehicle_id
WHERE a.status = 'PUBLISHED'
ORDER BY a.published_at DESC;


-- 3. PESQUISA DE VEÍCULOS POR MARCA E MODELO
-- Exemplo: pesquisar veículos da BMW.

SELECT
    id,
    make,
    model,
    version,
    manufacturing_year,
    model_year,
    mileage,
    status
FROM vehicles
WHERE make ILIKE '%BMW%'
ORDER BY model, model_year DESC;


-- 4. LEADS POR STATUS
-- Apresenta a quantidade de leads em cada etapa comercial.

SELECT
    status,
    COUNT(*) AS total_leads
FROM leads
GROUP BY status
ORDER BY total_leads DESC;


-- 5. LEADS COM DADOS DOS CLIENTES
-- Exibe os leads e os respectivos clientes.

SELECT
    l.id AS lead_id,
    l.status,
    l.created_at,
    c.id AS customer_id,
    c.full_name AS customer_name,
    c.email,
    c.phone
FROM leads l
JOIN customers c ON c.id = l.customer_id
ORDER BY l.created_at DESC
LIMIT 100;


-- 6. AGENDAMENTOS POR PERÍODO
-- Exemplo: agendamentos realizados em novembro de 2026.

SELECT
    a.id,
    a.scheduled_at,
    a.status,
    c.full_name AS customer_name,
    v.make,
    v.model,
    v.version
FROM appointments a
JOIN customers c ON c.id = a.customer_id
JOIN vehicles v ON v.id = a.vehicle_id
WHERE a.scheduled_at >= TIMESTAMPTZ '2026-11-01 00:00:00-03'
  AND a.scheduled_at <  TIMESTAMPTZ '2026-12-01 00:00:00-03'
ORDER BY a.scheduled_at;


-- 7. VENDAS CONCLUÍDAS
-- Lista as vendas efetivamente concluídas.

SELECT
    s.id AS sale_id,
    s.sale_price,
    s.sold_at,
    c.full_name AS customer_name,
    v.make,
    v.model,
    v.version
FROM sales s
JOIN customers c ON c.id = s.customer_id
JOIN vehicles v ON v.id = s.vehicle_id
WHERE s.status = 'COMPLETED'
ORDER BY s.sold_at DESC;


-- 8. FATURAMENTO TOTAL
-- Calcula o faturamento considerando apenas vendas concluídas.

SELECT
    COUNT(*) AS total_vendas,
    COALESCE(SUM(sale_price), 0) AS faturamento_total,
    COALESCE(AVG(sale_price), 0) AS ticket_medio
FROM sales
WHERE status = 'COMPLETED';


-- 9. FATURAMENTO MENSAL
-- Agrupa o faturamento por mês.

SELECT
    DATE_TRUNC('month', sold_at) AS mes,
    COUNT(*) AS total_vendas,
    SUM(sale_price) AS faturamento
FROM sales
WHERE status = 'COMPLETED'
GROUP BY DATE_TRUNC('month', sold_at)
ORDER BY mes;


-- 10. TAXA DE CONVERSÃO DE LEADS
-- Compara leads convertidos com o total de leads.

SELECT
    COUNT(*) AS total_leads,
    COUNT(*) FILTER (
        WHERE status = 'CONVERTED'
    ) AS leads_convertidos,
    ROUND(
        COUNT(*) FILTER (
            WHERE status = 'CONVERTED'
        ) * 100.0 / NULLIF(COUNT(*), 0),
        2
    ) AS taxa_conversao_percentual
FROM leads;
