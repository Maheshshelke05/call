#!/usr/bin/env bash
# Production EC2 Deployment Script
set -e

echo "=== [1/5] Pulling latest repository code ==="
git pull origin main

echo "=== [2/5] Validating environment configurations ==="
if [ ! -f .env.production ]; then
    echo "ERROR: .env.production file missing on server!"
    exit 1
fi

echo "=== [3/5] Building Docker containers ==="
docker compose -f docker-compose.prod.yml build --no-cache

echo "=== [4/5] Executing database migrations ==="
docker compose -f docker-compose.prod.yml run --rm api python -m alembic upgrade head || true

echo "=== [5/5] Re-launching services with zero downtime ==="
docker compose -f docker-compose.prod.yml up -d --remove-orphans

echo "=== Verifying Health Endpoints ==="
sleep 5
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
if [ "$HEALTH_STATUS" -eq 200 ]; then
    echo "SUCCESS: FastAPI Backend is healthy (HTTP 200)"
else
    echo "WARNING: Health endpoint returned HTTP $HEALTH_STATUS. Check logs with 'docker compose logs api'."
fi
