#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Start the Banking Platform observability stack (or full stack).
.DESCRIPTION
    Starts Prometheus, Alertmanager, Loki, Promtail, Tempo, OTel Collector,
    and Grafana. Optionally starts all 11 microservices.
.PARAMETER Full
    Also start all 11 banking microservices (requires built Docker images).
.PARAMETER Down
    Stop and remove containers.
.PARAMETER Volumes
    When used with -Down, also remove volumes.
.PARAMETER Logs
    Stream logs after starting.
.EXAMPLE
    .\scripts\start-observability.ps1
    .\scripts\start-observability.ps1 -Full
    .\scripts\start-observability.ps1 -Down
    .\scripts\start-observability.ps1 -Down -Volumes
#>
param(
    [switch]$Full,
    [switch]$Down,
    [switch]$Logs,
    [switch]$Volumes
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$observabilityCompose = Join-Path $root "docker-compose.observability.yml"
$fullCompose          = Join-Path $root "docker-compose.full.yml"

$composeFile = if ($Full) { $fullCompose } else { $observabilityCompose }

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Banking Platform -- Observability Stack" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

if ($Down) {
    $downArgs = @("compose", "-f", $composeFile, "down")
    if ($Volumes) { $downArgs += "-v" }
    Write-Host "[STOP] Stopping observability stack..." -ForegroundColor Yellow
    & docker @downArgs
    Write-Host "[OK] Stopped." -ForegroundColor Green
    exit 0
}

Write-Host "[START] Starting observability stack..." -ForegroundColor Green
Write-Host "        Compose file: $composeFile" -ForegroundColor Gray
Write-Host ""

& docker compose -f $composeFile up -d --remove-orphans

if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] docker compose failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[WAIT] Waiting for services to become healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# ---- Health checks ----------------------------------------------------------
$checks = @(
    @{ Name = "Grafana";        Url = "http://localhost:3001/api/health" },
    @{ Name = "Prometheus";     Url = "http://localhost:9090/-/ready"    },
    @{ Name = "Alertmanager";   Url = "http://localhost:9093/-/ready"    },
    @{ Name = "Loki";           Url = "http://localhost:3100/ready"      },
    @{ Name = "Tempo";          Url = "http://localhost:3200/ready"      },
    @{ Name = "OTel Collector"; Url = "http://localhost:13133"           }
)

$allOk = $true
foreach ($check in $checks) {
    try {
        $resp = Invoke-WebRequest -Uri $check.Url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($resp.StatusCode -eq 200) {
            Write-Host ("  [OK]  {0}" -f $check.Name) -ForegroundColor Green
        } else {
            Write-Host ("  [??]  {0} returned {1}" -f $check.Name, $resp.StatusCode) -ForegroundColor Yellow
        }
    } catch {
        Write-Host ("  [DOWN] {0} is not ready yet" -f $check.Name) -ForegroundColor Red
        $allOk = $false
    }
}

Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Access URLs:" -ForegroundColor Cyan
Write-Host "    Grafana      --> http://localhost:3001  (admin/admin)" -ForegroundColor White
Write-Host "    Prometheus   --> http://localhost:9090"               -ForegroundColor White
Write-Host "    Alertmanager --> http://localhost:9093"               -ForegroundColor White
Write-Host "    Loki         --> http://localhost:3100"               -ForegroundColor White
Write-Host "    Tempo        --> http://localhost:3200"               -ForegroundColor White
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

if (-not $allOk) {
    Write-Host "[WARN] Some services are still starting. Run .\scripts\check-health.ps1 in a moment." -ForegroundColor Yellow
}

if ($Logs) {
    Write-Host "[LOGS] Streaming logs (Ctrl+C to stop)..." -ForegroundColor Gray
    & docker compose -f $composeFile logs -f --tail 50
}
