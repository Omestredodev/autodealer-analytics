param([switch]$ExecuteWriteFlow)
$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:3333'
function RequestJson([string]$Method,[string]$Path,[object]$Body = $null) {
    $args = @{ Uri = "$base$Path"; Method = $Method; TimeoutSec = 20; ErrorAction = 'Stop' }
    if ($null -ne $Body) {
        $args.ContentType = 'application/json; charset=utf-8'
        $json = ConvertTo-Json -InputObject $Body -Depth 8 -Compress
        $args.Body = [System.Text.Encoding]::UTF8.GetBytes($json)
    }
    Invoke-RestMethod @args
}
$health = RequestJson GET '/health'
if ($health.status -ne 'ok') { throw 'API not ready' }
$status = RequestJson GET '/crud/status'
if (-not $status.enabled) { throw 'CRUD_DEMO_ENABLED not active' }
$catalog = RequestJson GET '/crud/stock/vehicle-catalog?limit=5'
$candidates = RequestJson GET '/crud/stock/advertisable-vehicles?limit=5'
Write-Host '[OK] Catalog technical configurations available:' @($catalog.data).Count
Write-Host '[OK] Vehicles available for first advertisement:' @($candidates.data).Count
if (-not $ExecuteWriteFlow) {
    Write-Host 'READ-ONLY OK. To create a temporary example and then logically inactivate it, use -ExecuteWriteFlow.'
    return
}
Write-Host 'WARNING: this test creates real historical rows; logical deletes preserve them for auditing.'
$id = $null
$adId = $null
try {
    $label = [Guid]::NewGuid().ToString('N').Substring(0,8)
    $vehicle = RequestJson POST '/crud/stock/vehicles' @{
        make = 'TESTE'; model = "CICLO-$label"; version = 'INTEGRACAO'
        manufacturingYear = 2024; modelYear = 2025
        mileage = 10; color = 'Branco'
    }
    $id = $vehicle.data.id
    if (-not $id) { throw 'No vehicle ID returned' }
    Write-Host '[OK] New stock vehicle:' $id
    $check = RequestJson GET "/crud/stock/advertisable-vehicles?search=$id&limit=10"
    if (-not (@($check.data.id) -contains $id)) { throw 'Vehicle not found among advertisable records' }
    Write-Host '[OK] Vehicle available to create advertisement'
    $ad = RequestJson POST '/crud/stock/advertisements' @{
        vehicleId = $id; title = "Veiculo de demonstracao $label"
        description = 'Anuncio de teste de ciclo'; price = '89000.00'; publish = $false
    }
    $adId = $ad.data.id
    if ($ad.data.status -ne 'DRAFT') { throw 'Draft creation failed' }
    Write-Host '[OK] Advertisement draft:' $adId
    $published = RequestJson PATCH "/crud/stock/advertisements/$adId" @{ status = 'PUBLISHED' }
    if ($published.data.status -ne 'PUBLISHED') { throw 'Publication failed' }
    $public = RequestJson GET "/vehicles/$id"
    if ($public.data.id -ne $id) { throw 'Vehicle not visible in public catalog' }
    Write-Host '[OK] Advertisement published; vehicle visible in public catalog'
} finally {
    if ($adId) {
        try { RequestJson DELETE "/crud/stock/advertisements/$adId" | Out-Null; Write-Host '[OK] Test advertisement ended' }
        catch { Write-Warning "Could not end test ad $adId : $_" }
    }
    if ($id) {
        try { RequestJson DELETE "/crud/stock/vehicles/$id" | Out-Null; Write-Host '[OK] Test vehicle inactivated' }
        catch { Write-Warning "Could not inactivate test vehicle $id : $_" }
    }
}
Write-Host '[SUCESSO] Cycle: register vehicle -> select -> draft -> publish -> public catalog.'
