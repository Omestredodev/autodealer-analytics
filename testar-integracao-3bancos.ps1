$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:3333'

Write-Host '[1] Verificando os tres bancos...'
$health = Invoke-RestMethod "$base/health"
$health | ConvertTo-Json -Depth 5
if ($health.status -ne 'ok' -or $health.databases.mongodb -ne 'connected' -or $health.databases.cassandra -ne 'connected') {
  throw 'A saude da API ainda nao confirma os tres bancos.'
}

Write-Host '[2] Lendo historico de auditoria do MongoDB...'
$audit = Invoke-RestMethod "$base/audit-events?limit=20"
Write-Host "Eventos de auditoria retornados: $($audit.returned)"
if ($audit.returned -lt 1) { throw 'Colecao audit_events vazia. Verifique o seed MongoDB.' }
$audit.data | Select-Object -First 2 eventId, eventType, entityType, entityId | Format-Table

Write-Host '[3] Consultando os 2 eventos ficticios do seed Cassandra...'
$seed = Invoke-RestMethod "$base/activity-events?day=2026-11-02&shard=0&limit=10"
Write-Host "Eventos do seed encontrados: $($seed.returned)"
if ($seed.returned -lt 2) { throw 'Nao foram encontrados os dois eventos do seed Cassandra.' }

Write-Host '[4] Gerando evento real a partir de um anuncio PostgreSQL...'
$ads = Invoke-RestMethod "$base/advertisements?limit=1"
if ($ads.data.Count -lt 1) { throw 'Nao existem anuncios ativos para o teste.' }
$adId = $ads.data[0].id
$event = @{
  eventId = [guid]::NewGuid().ToString()
  occurredAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
  eventType = 'ADVERTISEMENT_VIEWED'
  advertisementId = $adId
}
$body = $event | ConvertTo-Json -Depth 5 -Compress
$created = Invoke-RestMethod "$base/activity-events" -Method Post -ContentType 'application/json' -Body $body
$created | ConvertTo-Json -Depth 5
if (-not $created.data.tablesWritten -or $created.data.tablesWritten.Count -lt 4) {
  throw 'Evento nao foi registrado nas tabelas esperadas.'
}

Write-Host '[5] Lendo o evento gravado no Cassandra...'
$day = $created.data.day
$shard = $created.data.shard
$read = Invoke-RestMethod "${base}/activity-events/advertisement/${adId}?day=${day}&shard=${shard}&limit=20"
$found = $read.data | Where-Object { $_.event_id -eq $event.eventId }
if (-not $found) { throw 'Evento gravado nao foi encontrado na consulta por anuncio.' }
Write-Host "Evento encontrado: $($event.eventId)"
Write-Host '[OK] Integracao PostgreSQL + MongoDB + Cassandra validada.'
