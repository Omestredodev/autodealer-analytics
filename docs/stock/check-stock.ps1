# Testes de leitura para gestão de estoque e anúncios (nenhuma escrita).
$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:3333'
$checks = @(
    @{ Label = 'Veículos administrativos'; Path = '/crud/stock/vehicles?page=1&limit=2' },
    @{ Label = 'Anúncios administrativos'; Path = '/crud/stock/advertisements?page=1&limit=2' },
    @{ Label = 'Catálogo público de veículos'; Path = '/vehicles?page=1&limit=2' },
    @{ Label = 'Catálogo público de anúncios'; Path = '/advertisements?page=1&limit=2' }
)
foreach ($check in $checks) {
    try {
        $result = Invoke-RestMethod -Uri ($base + $check.Path) -TimeoutSec 20
        if ($null -eq $result.data) { throw 'A resposta não contém data' }
        Write-Host "[OK] $($check.Label) - $(@($result.data).Count) registros na página"
    } catch {
        Write-Host "[ERRO] $($check.Label) - $($_.Exception.Message)"
        exit 1
    }
}
Write-Host '[OK] As quatro rotas de consulta responderam corretamente.'
