# Teste ponta a ponta: cria, lê, altera e remove APENAS registros criados neste teste.
# API deve estar reiniciada com CRUD_DEMO_ENABLED=true e as novas estruturas inicializadas.
$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:3333'
$created = @{}
function RequestJson([string]$method, [string]$route, [object]$payload = $null) {
    $params = @{
        Uri         = "$base$route"
        Method      = $method
        TimeoutSec  = 20
        ErrorAction = 'Stop'
    }

    if ($null -ne $payload) {
        $params.ContentType = 'application/json; charset=utf-8'

        $json = ConvertTo-Json -InputObject $payload -Depth 8 -Compress

        $params.Body = [System.Text.Encoding]::UTF8.GetBytes($json)
    }

    Invoke-RestMethod @params
}
function AssertEqual($a, $b, [string]$label) {
    if ($a -ne $b) { throw "FALHOU: $label (esperado $b, encontrado $a)" }
    Write-Host "[OK] $label"
}
function DeleteCreated([string]$route, [switch]$BestEffort) {
    try {
        $null = Invoke-WebRequest -Uri "$base$route" -Method DELETE -UseBasicParsing -ErrorAction Stop -TimeoutSec 20
    } catch {
        if ($BestEffort) { Write-Warning "Limpeza manual necessária em $route : $($_.Exception.Message)" }
        else { throw }
    }
}
try {
    if (-not (RequestJson 'GET' '/crud/status').enabled) { throw 'Ative CRUD_DEMO_ENABLED=true e reinicie a API' }
    $vehicle = (RequestJson 'GET' '/vehicles?page=1&limit=1').data[0]
    if (-not $vehicle) { throw 'Nenhum veículo publicado disponível' }
    $vehicleId = [string]$vehicle.id
    $user = (RequestJson 'GET' '/crud/demo-user').data
    $userId = [string]$user.id
    Write-Host "Teste com veículo $vehicleId e usuário local $userId"

    $c = RequestJson 'POST' '/crud/customers' @{ full_name = 'Cliente Integração Teste'; phone = '11999990000' }
    $created['pg'] = "/crud/customers/$($c.data.id)"
    AssertEqual (RequestJson 'GET' $created['pg']).data.full_name 'Cliente Integração Teste' 'PostgreSQL Create/Read'
    AssertEqual (RequestJson 'PATCH' $created['pg'] @{full_name='Cliente Atualizado Teste'}).data.full_name 'Cliente Atualizado Teste' 'PostgreSQL Update'
    DeleteCreated $created['pg']; $created.Remove('pg')
    Write-Host '[OK] PostgreSQL Delete'

    $check = @{ bodywork='OK'; mechanical='ATTENTION'; tires='OK'; documents='OK' }
    $i = RequestJson 'POST' '/crud/inspections' @{ vehicleId=$vehicleId; checklist=$check; notes='Vistoria temporária do teste' }
    $created['mongo'] = "/crud/inspections/$($i.data.id)"
    AssertEqual (RequestJson 'GET' $created['mongo']).data.status 'DRAFT' 'MongoDB Create/Read'
    AssertEqual (RequestJson 'PATCH' $created['mongo'] @{notes='Vistoria corrigida'}).data.notes 'Vistoria corrigida' 'MongoDB Update'
    DeleteCreated $created['mongo']; $created.Remove('mongo')
    Write-Host '[OK] MongoDB Delete de rascunho'

    $f = RequestJson 'POST' '/crud/favorites' @{userId=$userId;vehicleId=$vehicleId;interestLevel='MEDIUM'}
    $created['cass'] = "/crud/favorites/$userId/$vehicleId"
    AssertEqual $f.data.interestLevel 'MEDIUM' 'Cassandra Create'
    $list = RequestJson 'GET' "/crud/favorites?userId=$userId"
    AssertEqual @($list.data | Where-Object vehicleId -eq $vehicleId).Count 1 'Cassandra Read'
    AssertEqual (RequestJson 'PATCH' $created['cass'] @{interestLevel='HIGH'}).data.interestLevel 'HIGH' 'Cassandra Update'
    DeleteCreated $created['cass']; $created.Remove('cass')
    Write-Host '[OK] Cassandra Delete'
    Write-Host ''
    Write-Host '[SUCESSO] CRUD funcional testado em clientes, vistorias e favoritos.'
} finally {
    foreach ($key in @($created.Keys)) { DeleteCreated $created[$key] -BestEffort }
}
