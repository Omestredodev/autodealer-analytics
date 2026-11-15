# AutoDealer Analytics - diagnostico de demonstracao (somente leitura)
$ErrorActionPreference = 'Continue'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
Set-Location $root
Write-Host '=== AUTODEALER: PRE-FLIGHT DE DEMONSTRACAO ===' -ForegroundColor Cyan
Write-Host '[1] Docker Compose:'
docker compose ps
if ($LASTEXITCODE -ne 0) {
    Write-Host '[ATENCAO] Docker Compose nao respondeu. Abra o Docker Desktop.' -ForegroundColor Yellow
}
Write-Host '[2] Backend Fastify (3333):'
$targets = @(
    @{ Label = 'API direta'; Url = 'http://127.0.0.1:3333/health' },
    @{ Label = 'Vite proxy'; Url = 'http://127.0.0.1:5173/api/health' }
)
$failed = $false
foreach ($target in $targets) {
    try {
        $r = Invoke-RestMethod -Uri $target.Url -TimeoutSec 6 -ErrorAction Stop
        $dbs = $r.databases
        $state = "$($dbs.postgresql) / $($dbs.mongodb) / $($dbs.cassandra)"
        Write-Host "[OK] $($target.Label): $($r.status) ($state)" -ForegroundColor Green
        if ($r.status -ne 'ok' -or $dbs.postgresql -ne 'connected' -or $dbs.mongodb -ne 'connected' -or $dbs.cassandra -ne 'connected') { $failed = $true }
    } catch {
        $failed = $true
        Write-Host "[ATENCAO] $($target.Label): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}
Write-Host '[3] Frontend (5173):'
try {
    $response = Invoke-WebRequest 'http://127.0.0.1:5173/' -TimeoutSec 6 -UseBasicParsing -ErrorAction Stop
    Write-Host "[OK] Frontend: HTTP $($response.StatusCode)" -ForegroundColor Green
} catch {
    $failed = $true
    Write-Host "[ATENCAO] Frontend: $($_.Exception.Message)" -ForegroundColor Yellow
}
if ($failed) {
    Write-Host 'Revisar Docker, backend npm run dev e frontend npm run dev (cada um em um terminal).' -ForegroundColor Yellow
    exit 1
}
Write-Host 'Ambiente de demonstracao pronto.' -ForegroundColor Green
exit 0
