#!/bin/bash
set -e
echo "=== Voice AI SaaS — Setup Script ==="

echo "[1/4] Copying .env..."
[ ! -f .env ] && cp .env.example .env && echo ".env created — fill in your values" || echo ".env already exists"

echo "[2/4] Starting infra containers..."
docker-compose up -d mongodb redis ollama

echo "[3/4] Waiting for Ollama to be ready..."
sleep 5
docker exec voiceai-ollama ollama pull llama3.1:8b

echo "[4/4] Starting all services..."
docker-compose up -d

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Services running:"
echo "  call-gateway      → http://localhost:4001"
echo "  nlu-service       → http://localhost:4002"
echo "  stt-service       → http://localhost:4003"
echo "  tts-service       → http://localhost:4004"
echo "  lead-service      → http://localhost:4005"
echo "  notification      → http://localhost:4006"
echo "  auth-service      → http://localhost:4007"
echo "  dashboard-api     → http://localhost:4008"
echo ""
echo "For WhatsApp: docker logs voiceai-notify  (scan QR code)"
