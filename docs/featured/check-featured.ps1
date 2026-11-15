$ErrorActionPreference = 'Stop'
function Check([string] $base) {
  $url = "$base/featured-vehicles"
  $result = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 20
  if ($null -eq $result.data) { throw "Resposta inválida: $url" }
  foreach ($item in $result.data) {
    if (-not $item.id -or -not $item.advertisement_id -or -not $item.make) { throw "Registro inválido: $url" }
  }
  Write-Host "[OK] $url - $(@($result.data).Count) destaque(s)"
}
Check 'http://127.0.0.1:3333'
Check 'http://127.0.0.1:5173/api'
$ads = Invoke-RestMethod -Uri 'http://127.0.0.1:3333/crud/stock/advertisements?page=1&limit=10' -Method GET -TimeoutSec 20
if ($null -eq $ads.data) { throw 'Lista administrativa inválida' }
Write-Host "[OK] /crud/stock/advertisements - $(@($ads.data).Count) anúncio(s) consultado(s)"
Write-Host '[OK] Testes de leitura concluídos. Nenhum dado alterado.'
