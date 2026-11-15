# Validação de leitura; não cria, atualiza ou exclui dados.
$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:3333'
$health = Invoke-RestMethod "$base/health" -TimeoutSec 20
if ($health.status -ne 'ok') { throw 'API ou banco não está disponível.' }
$status = Invoke-RestMethod "$base/crud/status" -TimeoutSec 20
if (-not $status.enabled) { throw 'CRUD_DEMO_ENABLED não está ativo no backend local.' }
$hist = Invoke-RestMethod "$base/crud/inspections?page=1&limit=15" -TimeoutSec 20
if ($null -eq $hist.pagination -or $null -eq $hist.data) { throw 'Histórico não retornou dados e metadados de paginação.' }
Write-Host "[OK] Histórico geral (MongoDB + PostgreSQL): $($hist.pagination.total) vistorias, $($hist.returned) nesta página."
$approved = Invoke-RestMethod "$base/crud/inspections?page=1&limit=15&status=APPROVED" -TimeoutSec 20
Write-Host "[OK] Filtro de aprovadas: $($approved.returned) nesta página."
$user = Invoke-RestMethod "$base/crud/demo-user" -TimeoutSec 20
$userId = $user.data.id
if (-not $userId) { throw 'Perfil demonstrativo não encontrado.' }
$favorite = Invoke-RestMethod "$base/crud/favorites?userId=$userId" -TimeoutSec 20
Write-Host "[OK] Favoritos Cassandra: $($favorite.returned) para o perfil local."
Write-Host '[SUCESSO] Consultas de histórico e favoritos aprovadas (sem escrita).'
