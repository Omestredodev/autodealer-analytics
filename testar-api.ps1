$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:3333'

Write-Host '1/6 GET /health'
$health = Invoke-RestMethod "$base/health"
if ($health.status -ne 'ok' -or $health.databases.postgresql -ne 'connected') {
  throw 'API ou PostgreSQL indisponível.'
}

Write-Host '2/6 GET /vehicles?page=1&limit=5'
$vehicles = Invoke-RestMethod "$base/vehicles?page=1&limit=5"
if ($null -eq $vehicles.pagination.total) { throw 'Paginação de veículos ausente.' }
Write-Host "   Veículos públicos: $($vehicles.pagination.total)"

Write-Host '3/6 GET /vehicles?sort=price_asc&limit=3'
$prices = Invoke-RestMethod "$base/vehicles?sort=price_asc&limit=3"
Write-Host "   Veículos retornados: $($prices.pagination.returned)"

Write-Host '4/6 GET /advertisements?page=1&limit=5'
$ads = Invoke-RestMethod "$base/advertisements?page=1&limit=5"
if ($null -eq $ads.pagination.total) { throw 'Paginação de anúncios ausente.' }
Write-Host "   Anúncios públicos (um por veículo): $($ads.pagination.total)"

if ($vehicles.pagination.total -ne $ads.pagination.total) {
  throw 'Contagens de veículos/anúncios divergentes — revisar filtros de catálogo.'
}

if (@($vehicles.data).Count -gt 0) {
  Write-Host '5/6 GET /vehicles/:id'
  $vehicleId = $vehicles.data[0].id
  $detail = Invoke-RestMethod "$base/vehicles/$vehicleId"
  if ($detail.data.id -ne $vehicleId) { throw 'Detalhe do veículo inconsistente.' }
} else { Write-Host '5/6 Sem veículos públicos; teste de detalhe ignorado.' }

if (@($ads.data).Count -gt 0) {
  Write-Host '6/6 GET /advertisements/:id'
  $adId = $ads.data[0].id
  $detail = Invoke-RestMethod "$base/advertisements/$adId"
  if ($detail.data.id -ne $adId) { throw 'Detalhe do anúncio inconsistente.' }
} else { Write-Host '6/6 Sem anúncios públicos; teste de detalhe ignorado.' }

Write-Host 'OK — Testes de leitura concluídos.' -ForegroundColor Green
