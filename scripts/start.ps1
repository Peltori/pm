$ErrorActionPreference = "Stop"

Write-Host "Starting PM app..."
Push-Location (Split-Path $PSScriptRoot -Parent)

docker compose up -d

Write-Host "Waiting for container to be healthy..."
$timeout = 30
while ($timeout -gt 0) {
    $status = docker compose ps
    if ($status -match "healthy") {
        Write-Host "PM app is running at http://localhost:8000"
        Pop-Location
        exit 0
    }
    Start-Sleep -Seconds 1
    $timeout--
}

Write-Host "Container started but health check failed. Check logs with: docker compose logs"
docker compose ps
Pop-Location
