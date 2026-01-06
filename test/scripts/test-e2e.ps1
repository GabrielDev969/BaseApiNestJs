# scripts/test-e2e.ps1
$ErrorActionPreference = "Stop"

Write-Host "[DB] Subindo banco de testes..." -ForegroundColor Cyan
docker compose -f docker-compose.test.yml up -d

Write-Host "[WAIT] Aguardando banco ficar pronto..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "[MIGRATE] Aplicando migrations..." -ForegroundColor Cyan
pnpm test:db:migrate

Write-Host "[TEST] Executando testes..." -ForegroundColor Green
$testExitCode = 0
try {
    pnpm test:e2e
    $testExitCode = $LASTEXITCODE
} catch {
    $testExitCode = 1
}

Write-Host "[CLEANUP] Derrubando banco de testes..." -ForegroundColor Cyan
docker compose -f docker-compose.test.yml down -v

if ($testExitCode -ne 0) {
    Write-Host "[FAIL] Testes falharam!" -ForegroundColor Red
    exit $testExitCode
}

Write-Host "[OK] Testes passaram!" -ForegroundColor Green
exit 0