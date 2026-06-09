#!/bin/bash
SERVICES=(
  "call-gateway:4001"
  "nlu-service:4002"
  "stt-service:4003"
  "tts-service:4004"
  "lead-service:4005"
  "notification-service:4006"
  "auth-service:4007"
  "dashboard-api:4008"
)

echo "=== Health Check ==="
for svc in "${SERVICES[@]}"; do
  name="${svc%%:*}"
  port="${svc##*:}"
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health 2>/dev/null)
  if [ "$status" = "200" ]; then
    echo "  [OK]   $name (:$port)"
  else
    echo "  [FAIL] $name (:$port) — HTTP $status"
  fi
done
