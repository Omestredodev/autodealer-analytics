param(
    [switch] $Mutate,
    [string] $Base = 'http://127.0.0.1:3333'
)
$ErrorActionPreference = 'Stop'
function Check($condition, $description) {
    if (-not $condition) { throw "[FALHOU] $description" }
    Write-Host "[OK] $description" -ForegroundColor Green
}

Write-Host '[1] Consultando saude dos tres bancos...'
$health = Invoke-RestMethod "$Base/health"
Check ($health.status -eq 'ok' -and $health.databases.postgresql -eq 'connected' -and $health.databases.mongodb -eq 'connected' -and $health.databases.cassandra -eq 'connected') 'PostgreSQL, MongoDB e Cassandra conectados'

Write-Host '[2] Consultando os modulos comerciais...'
foreach ($name in @('leads','appointments','sales')) {
    $response = Invoke-RestMethod "$Base/$($name)?page=1&limit=2"
    Check ($null -ne $response.pagination.total -and $null -ne $response.data) "GET /$name; total: $($response.pagination.total)"
    if ($response.data.Count -gt 0) {
        $id = $response.data[0].id
        $detail = Invoke-RestMethod "$Base/$name/$id"
        Check ($detail.data.id -eq $id) "GET /$name/:id"
    }
}

Write-Host '[3] Consultando auditoria MongoDB e estatisticas da outbox...'
$audits = Invoke-RestMethod "$Base/audit-events?limit=2"
Check ($null -ne $audits.data) 'GET /audit-events'

if (-not $Mutate) {
    Write-Host '[OK] Testes de leitura terminados. Para exercitar PATCH, rode com -Mutate.' -ForegroundColor Green
    exit 0
}

Write-Host '[4] Executando alteracoes reais em registros do seed...'
Write-Host 'AVISO: os passos seguintes ALTERAM status nos bancos de desenvolvimento.' -ForegroundColor Yellow

$lead = Invoke-RestMethod "$Base/leads?status=NEW&limit=1"
if ($lead.data.Count -gt 0) {
    $id = $lead.data[0].id
    $result = Invoke-RestMethod -Method Patch -Uri "$Base/leads/$id/status" -ContentType 'application/json' -Body '{"status":"IN_PROGRESS"}'
    Check ($result.data.status -eq 'IN_PROGRESS') 'Lead NEW -> IN_PROGRESS'
    Check ($result.audit.status -eq 'delivered') 'Auditoria do lead entregue ao MongoDB'
    $auditHistory = Invoke-RestMethod "$Base/audit-events?entityType=lead&entityId=$id&limit=10"
    Check (@($auditHistory.data | Where-Object { $_.eventId -eq $result.audit.eventIds[0] }).Count -gt 0) 'Evento LEAD_STATUS_CHANGED consultado no MongoDB'
    $same = Invoke-RestMethod -Method Patch -Uri "$Base/leads/$id/status" -ContentType 'application/json' -Body '{"status":"IN_PROGRESS"}'
    Check ($same.unchanged -eq $true) 'Repeticao da transicao nao cria nova auditoria'
} else { Write-Host '[SKIP] Sem leads NEW para alterar.' }

$appointment = Invoke-RestMethod "$Base/appointments?status=SCHEDULED&limit=1"
if ($appointment.data.Count -gt 0) {
    $id = $appointment.data[0].id
    $result = Invoke-RestMethod -Method Patch -Uri "$Base/appointments/$id/status" -ContentType 'application/json' -Body '{"status":"CONFIRMED"}'
    Check ($result.data.status -eq 'CONFIRMED') 'Agendamento SCHEDULED -> CONFIRMED'
    Check ($result.audit.status -eq 'delivered') 'Auditoria do agendamento entregue ao MongoDB'
} else { Write-Host '[SKIP] Sem agendamentos SCHEDULED para alterar.' }

# Escolhe venda pendente de um veiculo disponivel/reservado, ainda nao vendido.
$query = "SELECT s.id FROM public.sales s JOIN public.vehicles v ON v.id=s.vehicle_id WHERE s.status='PENDING' AND v.status IN ('AVAILABLE','RESERVED') AND NOT EXISTS (SELECT 1 FROM public.sales x WHERE x.vehicle_id=s.vehicle_id AND x.id<>s.id AND x.status='COMPLETED') ORDER BY s.created_at LIMIT 1;"
$saleId = (& docker exec autodealer-postgres psql -At -U postgres -d autodealer_analytics -c $query | Out-String).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Falha ao selecionar uma venda segura para o teste.' }
if ($saleId) {
    $result = Invoke-RestMethod -Method Patch -Uri "$Base/sales/$saleId/status" -ContentType 'application/json' -Body '{"status":"COMPLETED"}'
    Check ($result.data.status -eq 'COMPLETED') 'Venda PENDING -> COMPLETED'
    Check ($result.audit.status -eq 'delivered') 'Auditorias da venda entregues ao MongoDB'
    Check ($result.audit.eventIds.Count -ge 2) 'Auditorias da venda e do veiculo geradas'
    $vehicleId = $result.data.vehicle_id
    $vehicleStatus = (& docker exec autodealer-postgres psql -At -U postgres -d autodealer_analytics -c "SELECT status FROM public.vehicles WHERE id='$vehicleId';" | Out-String).Trim()
    Check ($vehicleStatus -eq 'SOLD') 'Veiculo associado marcado como SOLD'
} else {
    Write-Host '[SKIP] Nenhuma venda PENDING com veiculo disponivel/reservado para concluir.' -ForegroundColor Yellow
}

Write-Host '[5] Verificando auditorias pendentes da outbox...'
$pending = (& docker exec autodealer-postgres psql -At -U postgres -d autodealer_analytics -c "SELECT COUNT(*) FROM public.audit_outbox WHERE delivered_at IS NULL;" | Out-String).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Falha ao consultar audit_outbox.' }
Write-Host "Pendentes: $pending"
Check ($pending -eq '0') 'Eventos gerados entregues ao MongoDB'
Write-Host '[OK] Operacoes comerciais + auditoria validadas.' -ForegroundColor Green
