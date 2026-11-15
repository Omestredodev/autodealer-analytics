<#
AutoDealer Analytics - homologacao isolada das 3 bases a partir do HEAD Git.
Nao toca nos containers nem nos volumes do projeto autodealer-analytics.
Requer: Windows PowerShell 5.1+, Docker Desktop/Compose v2, Git.
Uso:
 powershell -NoProfile -ExecutionPolicy Bypass -File .\validar-autodealer-isolado-v2.ps1 -RepoPath C:\Projetos\autodealer-analytics
 Retomada: acrescente -ResumeBase e -ResumeProject
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$RepoPath,
    [string]$ResumeBase,
    [string]$ResumeProject
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Assert-Exit([string]$Etapa) {
    if ($LASTEXITCODE -ne 0) {
        throw "Falhou ($Etapa). Codigo de saida: $LASTEXITCODE"
    }
}

function Invoke-Docker([string[]]$Arguments, [string]$Etapa) {
    & docker @Arguments
    Assert-Exit $Etapa
}

function Wait-Service([string]$Service, [string[]]$Command, [string]$Label) {
    Write-Host "[AGUARDANDO] $Label" -ForegroundColor Cyan
    for ($i = 1; $i -le 60; $i++) {
        $connectionArgs = $script:dc + @('exec', '-T', $Service) + $Command
        # Cassandra pode ainda estar iniciando. No Windows PowerShell 5.1,
        # stderr do docker gera NativeCommandError com ErrorActionPreference=Stop.
        # O teste de prontidao deve reintentar, e nao abortar na primeira falha.
        $oldPreference = $ErrorActionPreference
        $exitCode = 1
        try {
            $ErrorActionPreference = 'Continue'
            & docker @connectionArgs *> $null
            $exitCode = $LASTEXITCODE
        }
        catch {
            $exitCode = 1
        }
        finally {
            $ErrorActionPreference = $oldPreference
        }
        if ($exitCode -eq 0) {
            Write-Host "[OK] $Label conectado." -ForegroundColor Green
            return
        }
        Start-Sleep -Seconds 5
    }
    throw "$Label nao respondeu apos as tentativas. Verifique: docker compose -f `"$script:composePath`" -p $script:project logs --tail 80 $Service"
}

function Apply-File([string]$Service, [string]$RelativePath, [string]$TempName, [string[]]$Command) {
    $local = Join-Path $script:codeDir ($RelativePath.Replace('/', [IO.Path]::DirectorySeparatorChar))
    if (-not (Test-Path -LiteralPath $local -PathType Leaf)) {
        throw "Arquivo ausente no HEAD versionado: $RelativePath"
    }
    Invoke-Docker ($script:dc + @('cp', $local, "${Service}:/tmp/$TempName")) "Copiar $RelativePath"
    Invoke-Docker ($script:dc + @('exec', '-T', $Service) + $Command) "Executar $RelativePath"
    Write-Host "[OK] $RelativePath" -ForegroundColor Green
}

$repo = (Resolve-Path -LiteralPath $RepoPath).Path
if (-not (Test-Path -LiteralPath (Join-Path $repo '.git'))) {
    throw 'RepoPath precisa apontar para a pasta do repositorio Git.'
}

& git -C $repo rev-parse --verify HEAD | Out-Null
Assert-Exit 'Verificar HEAD Git'
& docker compose version | Out-Null
Assert-Exit 'Verificar Docker Compose'

# Pode retomar a homologacao ja iniciada sem criar outros volumes/containers.
if ($ResumeBase -or $ResumeProject) {
    if (-not $ResumeBase -or -not $ResumeProject) {
        throw 'Para retomar informe -ResumeBase e -ResumeProject juntos.'
    }
    if ($ResumeProject -notmatch '^ad-hom-[0-9a-f]{8}$') {
        throw 'Nome inesperado de projeto Docker para homologacao.'
    }
    $project = $ResumeProject
    $base = (Resolve-Path -LiteralPath $ResumeBase).Path
    $script:codeDir = Join-Path $base 'codigo-versionado'
    $composePath = Join-Path $base 'compose.homologacao.yaml'
    foreach ($required in @($script:codeDir, $composePath)) {
        if (-not (Test-Path -LiteralPath $required)) {
            throw "Homologacao anterior incompleta: $required"
        }
    }
    Write-Host "[RETOMADA] Reutilizando projeto $project (sem criar volumes novos)." -ForegroundColor Cyan
} else {
    # Nome aleatorio: sem choque de nomes, portas ou volumes com a demonstracao.
    $token = [guid]::NewGuid().ToString('N').Substring(0, 8)
    $project = "ad-hom-$token"
    $base = Join-Path $env:TEMP "autodealer-homologacao-$token"
    $script:codeDir = Join-Path $base 'codigo-versionado'
    $archive = Join-Path $base 'head.zip'
    $composePath = Join-Path $base 'compose.homologacao.yaml'
    New-Item -ItemType Directory -Path $script:codeDir -Force | Out-Null

    Write-Host "[INFO] Projeto Docker exclusivo: $project"
    Write-Host '[INFO] Exportando apenas arquivos do commit HEAD (sem arquivos nao rastreados).'
    & git -C $repo archive --format=zip "--output=$archive" HEAD
    Assert-Exit 'git archive HEAD'
    Expand-Archive -LiteralPath $archive -DestinationPath $script:codeDir

    # Sem container_name e SEM portas publicadas. Volumes pertencem exclusivamente a $project.
    $password = 'local_' + [guid]::NewGuid().ToString('N')
$composeYaml = @"
services:
  postgresql:
    image: postgres:17
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: "$password"
      POSTGRES_DB: autodealer_analytics
    volumes:
      - postgresql_data:/var/lib/postgresql/data
  mongodb:
    image: mongo:7.0
    volumes:
      - mongodb_data:/data/db
  cassandra:
    image: cassandra:5.0
    environment:
      MAX_HEAP_SIZE: 1G
      HEAP_NEWSIZE: 256M
    volumes:
      - cassandra_data:/var/lib/cassandra
volumes:
  postgresql_data: {}
  mongodb_data: {}
  cassandra_data: {}
"@
    [IO.File]::WriteAllText($composePath, $composeYaml, (New-Object System.Text.UTF8Encoding($false)))
}
$script:project = $project
$script:composePath = $composePath
$script:dc = @('compose', '-f', $composePath, '-p', $project)

try {
    Write-Host '[INFO] Inicializando somente os containers isolados. Os 3 bancos atuais permanecem intactos.'
    Invoke-Docker ($dc + @('up', '-d')) 'Subir homologacao'
    Wait-Service 'postgresql' @('pg_isready', '-U', 'postgres', '-d', 'autodealer_analytics') 'PostgreSQL'
    Wait-Service 'mongodb' @('mongosh', '--quiet', '--eval', 'db.runCommand({ping:1}).ok') 'MongoDB'
    Wait-Service 'cassandra' @('cqlsh', '-e', 'SELECT release_version FROM system.local;') 'Cassandra'

    Write-Host "`n[POSTGRESQL] Schema, seed, indices e migracoes" -ForegroundColor Cyan
    Apply-File 'postgresql' 'database/postgresql/schema.sql' 'schema.sql' @('psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'autodealer_analytics', '-f', '/tmp/schema.sql')
    Apply-File 'postgresql' 'database/postgresql/seed.sql' 'seed.sql' @('psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'autodealer_analytics', '-f', '/tmp/seed.sql')
    $indexes = Join-Path $codeDir 'database/postgresql/indexes.sql'
    if (Test-Path -LiteralPath $indexes -PathType Leaf) {
        Apply-File 'postgresql' 'database/postgresql/indexes.sql' 'indexes.sql' @('psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'autodealer_analytics', '-f', '/tmp/indexes.sql')
    }
    Apply-File 'postgresql' 'database/postgresql/migrations/001_audit_outbox.sql' '001_audit_outbox.sql' @('psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'autodealer_analytics', '-f', '/tmp/001_audit_outbox.sql')
    Apply-File 'postgresql' 'database/postgresql/migrations/002_featured_advertisements.sql' '002_featured_advertisements.sql' @('psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'autodealer_analytics', '-f', '/tmp/002_featured_advertisements.sql')

    Write-Host "`n[MONGODB] Auditoria e vistorias" -ForegroundColor Cyan
    foreach ($name in @('collections.js', 'indexes.js', 'seed.js', 'inspections.js')) {
        Apply-File 'mongodb' "database/mongodb/$name" $name @('mongosh', '--quiet', 'mongodb://127.0.0.1:27017/autodealer', "/tmp/$name")
    }

    Write-Host "`n[CASSANDRA] Telemetria, seed e favoritos" -ForegroundColor Cyan
    foreach ($name in @('schema.cql', 'seed.cql', 'favorites.cql')) {
        Apply-File 'cassandra' "database/cassandra/$name" $name @('cqlsh', '-f', "/tmp/$name")
    }

    Write-Host "`n[VERIFICACAO] PostgreSQL" -ForegroundColor Cyan
    $pgCheck = @'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='advertisements' AND column_name='is_featured')
  THEN RAISE EXCEPTION 'Falta advertisements.is_featured'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.vehicles)
  THEN RAISE EXCEPTION 'Tabela vehicles sem dados de seed'; END IF;
END $$;
SELECT 'vehicles=' || COUNT(*) FROM public.vehicles;
'@
    $pgCheckPath = Join-Path $base 'verificar-postgres.sql'
    [IO.File]::WriteAllText($pgCheckPath, $pgCheck, (New-Object System.Text.UTF8Encoding($false)))
    Invoke-Docker ($dc + @('cp', $pgCheckPath, 'postgresql:/tmp/verificar-postgres.sql')) 'Copiar verificacao PostgreSQL'
    Invoke-Docker ($dc + @('exec', '-T', 'postgresql', 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'autodealer_analytics', '-f', '/tmp/verificar-postgres.sql')) 'Verificar PostgreSQL'

    Write-Host "`n[VERIFICACAO] MongoDB" -ForegroundColor Cyan
    $mongoCheck = @'
const names = db.getCollectionNames();
for (const name of ['audit_events', 'vehicle_inspections']) {
  if (!names.includes(name)) throw new Error('Colecao ausente: ' + name);
}
print('[OK] Colecoes: audit_events e vehicle_inspections');
print('[INFO] Auditorias de seed: ' + db.getCollection('audit_events').countDocuments({}));
'@
    $mongoCheckPath = Join-Path $base 'verificar-mongo.js'
    [IO.File]::WriteAllText($mongoCheckPath, $mongoCheck, (New-Object System.Text.UTF8Encoding($false)))
    Invoke-Docker ($dc + @('cp', $mongoCheckPath, 'mongodb:/tmp/verificar-mongo.js')) 'Copiar verificacao MongoDB'
    Invoke-Docker ($dc + @('exec', '-T', 'mongodb', 'mongosh', '--quiet', 'mongodb://127.0.0.1:27017/autodealer', '/tmp/verificar-mongo.js')) 'Verificar MongoDB'

    Write-Host "`n[VERIFICACAO] Cassandra" -ForegroundColor Cyan
    Invoke-Docker ($dc + @('exec', '-T', 'cassandra', 'cqlsh', '-e', 'DESCRIBE TABLE autodealer.favorites_by_user;')) 'Verificar Cassandra favorites'
    Invoke-Docker ($dc + @('exec', '-T', 'cassandra', 'cqlsh', '-e', 'DESCRIBE TABLE autodealer.events_by_vehicle;')) 'Verificar Cassandra telemetria'

    Write-Host "`n[SUCESSO] As tres bases foram inicializadas a partir dos arquivos do HEAD Git." -ForegroundColor Green
    Write-Host '[INFO] Isso valida estrutura e seeds; nao e um teste end-to-end com a API.'
}
finally {
    Write-Host "`n[ISOLAMENTO] Ambiente de teste: $base"
    Write-Host "[ISOLAMENTO] Projeto Docker: $project"
    Write-Host '[ISOLAMENTO] A demonstracao original nao foi alterada.'
    Write-Host '[LIMPEZA OPCIONAL] Para remover APENAS os bancos e volumes desta homologacao:'
    Write-Host ("docker compose -f `"$composePath`" -p $project down -v") -ForegroundColor Yellow
}
