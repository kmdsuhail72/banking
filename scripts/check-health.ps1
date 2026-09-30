#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Health check all observability and banking service endpoints.
.DESCRIPTION
    Polls every observability tool and microservice /health endpoint,
    printing a colour-coded status table. Also shows any firing Prometheus
    alerts and direct Grafana dashboard links.
.PARAMETER Watch
    Keep polling every 10 seconds until Ctrl+C.
.EXAMPLE
    .\scripts\check-health.ps1
    .\scripts\check-health.ps1 -Watch
#>
param([switch]$Watch)

Set-StrictMode -Version Latest
$ErrorActionPreference = "SilentlyContinue"

function Test-Endpoint {
    param([string]$Name, [string]$Url)
    try {
        $resp = Invoke-WebRequest -Uri $Url -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($resp.StatusCode -eq 200) {
            return [PSCustomObject]@{ Name = $Name; Status = "[UP] "; Color = "Green" }
        } else {
            return [PSCustomObject]@{ Name = $Name; Status = "[??] $($resp.StatusCode)"; Color = "Yellow" }
        }
    } catch {
        return [PSCustomObject]@{ Name = $Name; Status = "[DOWN]"; Color = "Red" }
    }
}

$observabilityChecks = @(
    @{ Name = "Grafana";        Url = "http://localhost:3001/api/health" },
    @{ Name = "Prometheus";     Url = "http://localhost:9090/-/ready"    },
    @{ Name = "Alertmanager";   Url = "http://localhost:9093/-/ready"    },
    @{ Name = "Loki";           Url = "http://localhost:3100/ready"      },
    @{ Name = "Tempo";          Url = "http://localhost:3200/ready"      },
    @{ Name = "OTel Collector"; Url = "http://localhost:13133"           }
)

$serviceChecks = @(
    @{ Name = "auth-service";         Url = "http://localhost:4001/health" },
    @{ Name = "customer-service";     Url = "http://localhost:4002/health" },
    @{ Name = "account-service";      Url = "http://localhost:4003/health" },
    @{ Name = "transaction-service";  Url = "http://localhost:4004/health" },
    @{ Name = "payment-service";      Url = "http://localhost:4005/health" },
    @{ Name = "wallet-service";       Url = "http://localhost:4006/health" },
    @{ Name = "ledger-service";       Url = "http://localhost:4007/health" },
    @{ Name = "beneficiary-service";  Url = "http://localhost:4008/health" },
    @{ Name = "kyc-risk-service";     Url = "http://localhost:4009/health" },
    @{ Name = "notification-service"; Url = "http://localhost:4010/health" },
    @{ Name = "reporting-service";    Url = "http://localhost:4011/health" }
)

function Show-Checks {
    Clear-Host
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host ""
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host "  Banking Platform -- Health Check  $timestamp" -ForegroundColor Cyan
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "  OBSERVABILITY STACK" -ForegroundColor Magenta
    Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
    foreach ($c in $observabilityChecks) {
        $r = Test-Endpoint -Name $c.Name -Url $c.Url
        Write-Host ("  {0,-10} {1,-22}" -f $r.Status, $r.Name) -ForegroundColor $r.Color
    }

    Write-Host ""
    Write-Host "  BANKING MICROSERVICES" -ForegroundColor Magenta
    Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
    foreach ($c in $serviceChecks) {
        $r = Test-Endpoint -Name $c.Name -Url $c.Url
        Write-Host ("  {0,-10} {1,-26}" -f $r.Status, $r.Name) -ForegroundColor $r.Color
    }

    # ---- Prometheus alert summary -------------------------------------------
    Write-Host ""
    Write-Host "  PROMETHEUS ALERTS" -ForegroundColor Magenta
    Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
    try {
        $raw    = Invoke-WebRequest -Uri "http://localhost:9090/api/v1/rules" -UseBasicParsing -ErrorAction Stop
        $data   = ($raw.Content | ConvertFrom-Json).data
        $allRules = $data.groups | ForEach-Object { $_.rules } | Where-Object { $_.type -eq "alerting" }
        $firing   = $allRules | Where-Object { $_.state -eq "firing" }
        $pending  = $allRules | Where-Object { $_.state -eq "pending" }
        $countColor = if ($firing.Count -gt 0) { "Red" } elseif ($pending.Count -gt 0) { "Yellow" } else { "Green" }
        Write-Host ("  Rules loaded : {0}   Firing : {1}   Pending : {2}" -f $allRules.Count, $firing.Count, $pending.Count) -ForegroundColor $countColor
        if ($firing.Count -gt 0) {
            foreach ($a in $firing) {
                Write-Host ("  [FIRING]  {0}" -f $a.name) -ForegroundColor Red
            }
        }
        if ($pending.Count -gt 0) {
            foreach ($a in $pending) {
                Write-Host ("  [PENDING] {0}" -f $a.name) -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "  [WARN] Prometheus not reachable" -ForegroundColor Yellow
    }

    # ---- Dashboard links ----------------------------------------------------
    Write-Host ""
    Write-Host "  GRAFANA DASHBOARDS" -ForegroundColor DarkGray
    Write-Host "  --------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  Overview   --> http://localhost:3001/d/banking-overview"           -ForegroundColor DarkGray
    Write-Host "  Service    --> http://localhost:3001/d/banking-service-dashboard"  -ForegroundColor DarkGray
    Write-Host "  Traces     --> http://localhost:3001/d/banking-traces"             -ForegroundColor DarkGray
    Write-Host "  Kubernetes --> http://localhost:3001/d/banking-kubernetes"         -ForegroundColor DarkGray
    Write-Host ""

    if ($Watch) {
        Write-Host "  Refreshing every 10s ... (Ctrl+C to stop)" -ForegroundColor DarkGray
    }
}

if ($Watch) {
    while ($true) {
        Show-Checks
        Start-Sleep -Seconds 10
    }
} else {
    Show-Checks
}
