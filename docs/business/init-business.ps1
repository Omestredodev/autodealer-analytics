# Cria apenas novas estruturas de vistorias e favoritos. Não recria bancos, não executa seed.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Push-Location $root
try {
    docker compose ps
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose indisponível' }
    docker cp '.\database\mongodb\inspections.js' 'autodealer-mongo:/tmp/inspections.js'
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao copiar script MongoDB' }
    docker exec autodealer-mongo mongosh --quiet 'mongodb://127.0.0.1:27017/autodealer' /tmp/inspections.js
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao inicializar vistorias MongoDB' }
    docker cp '.\database\cassandra\favorites.cql' 'autodealer-cassandra:/tmp/favorites.cql'
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao copiar CQL' }
    docker exec autodealer-cassandra cqlsh -f /tmp/favorites.cql
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar tabela de favoritos' }
    Write-Host '[OK] Vistorias e favoritos inicializados sem alterar auditoria/telemetria.'
} finally { Pop-Location }
