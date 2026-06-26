Push-Location (Split-Path $PSScriptRoot -Parent)

docker compose down

Write-Host "PM app stopped."

Pop-Location
