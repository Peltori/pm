#!/usr/bin/env bash
set -e

echo "Starting PM app..."
cd "$(dirname "$0")/.."
docker compose up -d

echo "Waiting for container to be healthy..."
timeout=30
while [ $timeout -gt 0 ]; do
    if docker compose ps | grep -q "healthy"; then
        echo "PM app is running at http://localhost:8000"
        exit 0
    fi
    sleep 1
    timeout=$((timeout - 1))
done

echo "Container started but health check failed. Check logs with: docker compose logs"
docker compose ps
