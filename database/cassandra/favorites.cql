-- Favoritos do usuario: particao por usuario, clustering por veiculo.
-- Sem alterar as tabelas existentes de telemetria.
CREATE TABLE IF NOT EXISTS autodealer.favorites_by_user (
    user_id UUID,
    vehicle_id UUID,
    interest_level TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    PRIMARY KEY ((user_id), vehicle_id)
);
