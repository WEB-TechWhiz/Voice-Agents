# Language Service — Mini Bhashini

Tera apna **Hindi/Hinglish voice AI backend**.  
Teeno microservices ka ek single service mein integration — ASR + NLU + TTS.

```
POST /transcribe   → audio file  →  text
POST /understand   → text        →  intent JSON
POST /speak        → text        →  WAV audio
GET  /health       → status check
```

---

## Quickstart (5 min)

### 1. Install dependencies

```bash
cd language-service
pip install -r requirements.txt
```

### 2. Setup `.env`

```bash
cp .env.example .env
# Edit .env — minimum required: nothing! Defaults work out of the box.
```

### 3. Start Ollama (for NLU)

```bash
# Install: https://ollama.ai
ollama serve
ollama pull mistral
```

### 4. Run the service

```bash
uvicorn src.main:app --host 0.0.0.0 --port 8003 --reload
```

### 5. Test it

```bash
# Health check
curl http://localhost:8003/health

# Transcribe audio
curl -X POST http://localhost:8003/transcribe \
  -F "audio=@sample.wav" \
  -F "language=hi"

# Understand text
curl -X POST http://localhost:8003/understand \
  -H "Content-Type: application/json" \
  -d '{"text": "mujhe Delhi ka ticket book karna hai"}'

# Speak text
curl -X POST http://localhost:8003/speak \
  -H "Content-Type: application/json" \
  -d '{"text": "Namaste! Aapki kya madad kar sakta hoon?", "language": "hi"}' \
  --output response.wav
```

---

## Docker (existing project ke saath integrate karo)

### Option A: Existing docker-compose mein add karo

Apne `docker-compose.yml` mein yeh block add karo:

```yaml
  language-service:
    build: ./language-service
    ports:
      - "8003:8003"
    environment:
      - OLLAMA_URL=http://ollama:11434
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - ollama
```

### Option B: Separate compose file

```bash
docker compose -f docker-compose.yml -f language-service/docker-compose.language.yml up
```

---

## Integration — Doosri microservice se call karna

`language_client.py` copy karo apni service mein:

```python
from language_client import LanguageClient

lc = LanguageClient()  # LANGUAGE_SERVICE_URL env var se URL lega

# Voice pipeline example
async def handle_voice_query(audio_bytes: bytes):
    # Step 1: Audio → Text
    text = await lc.transcribe(audio_bytes, language="hi")
    
    # Step 2: Text → Intent
    result = await lc.understand(text)
    print(f"Intent: {result.intent}")       # e.g. "book_ticket"
    print(f"Entities: {result.entities}")   # e.g. [{"type": "destination", "value": "Delhi"}]
    
    # Step 3: Process business logic...
    response_text = process_intent(result)
    
    # Step 4: Text → Voice
    audio_response = await lc.speak(response_text, language="hi")
    return audio_response
```

---

## Model Options

### ASR (Speech → Text)

| Model | Speed | Quality | Cost |
|-------|-------|---------|------|
| `whisper tiny` | Fastest | Basic | Free |
| `whisper base` | Fast | Good ✅ | Free |
| `whisper small` | Medium | Better | Free |
| `whisper large-v3` | Slow | Best | Free |
| OpenAI API | Cloud | Excellent | ~$0.006/min |

Set in `.env`: `WHISPER_MODEL=base`

### NLU (Text → Intent)

| Model | Setup | Quality |
|-------|-------|---------|
| Ollama + Mistral | `ollama pull mistral` ✅ | Good |
| Ollama + Llama3 | `ollama pull llama3` | Better |
| OpenAI GPT-4o-mini | API key | Best |

Set in `.env`: `NLU_MODEL=mistral`

### TTS (Text → Speech)

| Engine | Quality | Cost | Setup |
|--------|---------|------|-------|
| gTTS | OK, Google voice | Free* | `pip install gtts` ✅ |
| Coqui TTS | Good, local | Free | `pip install TTS` + 2GB model |
| ElevenLabs | Excellent | Paid | API key |

Set in `.env`: `TTS_ENGINE=gtts`

---

## Baad mein add kar sakte ho

- **IndicTrans2** — Hindi ↔ English translation endpoint (`POST /translate`)
- **MMS by Meta** — 22 Indian languages (Bhojpuri, Tamil, Telugu)
- **IndicBERT** — better intent classification for Indian languages
- **Streaming TTS** — real-time audio stream instead of waiting for full audio

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8003 | Server port |
| `WHISPER_MODEL` | base | Whisper model size |
| `OLLAMA_URL` | http://localhost:11434 | Ollama server URL |
| `NLU_MODEL` | mistral | Ollama model name |
| `TTS_ENGINE` | gtts | TTS backend |
| `OPENAI_API_KEY` | — | Optional: OpenAI fallback |
| `REDIS_URL` | redis://localhost:6379 | Redis for rate limiting |
| `RATE_LIMIT_RPM` | 60 | Requests per minute per IP |
