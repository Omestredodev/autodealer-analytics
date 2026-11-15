$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$sql = Join-Path $root 'database/postgresql/migrations/002_featured_advertisements.sql'
if (-not (Test-Path $sql)) { throw "Migration ausente: $sql" }
docker compose -f (Join-Path $root 'docker-compose.yml') ps
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose não disponível. Inicie os bancos antes.' }
docker cp $sql 'autodealer-postgres:/tmp/002_featured_advertisements.sql'
if ($LASTEXITCODE -ne 0) { throw 'Erro ao enviar migration ao contêiner.' }
docker exec autodealer-postgres psql -X -v ON_ERROR_STOP=1 -U postgres -d autodealer_analytics -f /tmp/002_featured_advertisements.sql
if ($LASTEXITCODE -ne 0) { throw 'Falha na migration PostgreSQL.' }
Write-Host '[OK] Coluna e índice de anúncios destacados disponíveis.'
