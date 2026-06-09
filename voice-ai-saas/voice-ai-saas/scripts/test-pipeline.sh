#!/bin/bash
echo "=== Testing Voice Pipeline ==="

echo "[1] Ollama (LLM) —"
curl -s http://localhost:11434/api/tags | python3 -c "import sys,json; d=json.load(sys.stdin); print('  Models:', [m['name'] for m in d.get('models',[])])"

echo "[2] Whisper (STT) —"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/health 2>/dev/null || echo "000")
echo "  Status: $STATUS"

echo "[3] Coqui TTS —"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8082/health 2>/dev/null || echo "000")
echo "  Status: $STATUS"

echo "[4] NLU Intent Test —"
curl -s -X POST http://localhost:4002/process \
  -H "Content-Type: application/json" \
  -d '{"callSid":"test-001","transcript":"mujhe appointment book karna hai"}' | python3 -m json.tool

echo ""
echo "=== Pipeline test complete ==="
