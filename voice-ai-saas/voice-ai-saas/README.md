# Voice AI SaaS — Zero Cost Stack
### By Muffincodes | Jugaad Edition v2.0

India-focused AI voice receptionist — built entirely on free & open-source tools.

---

## Tech Stack

| Layer | Tool | Cost |
|-------|------|------|
| Telephony | Twilio Free Trial | ₹0 |
| STT | Whisper.cpp + Bhashini | ₹0 |
| LLM/NLU | Ollama + Llama 3.1 8B | ₹0 |
| TTS | Coqui TTS (Hindi) | ₹0 |
| WhatsApp | whatsapp-web.js | ₹0 |
| Hosting | Oracle Cloud Free Tier | ₹0 |
| DB | MongoDB Atlas M0 | ₹0 |
| Cache | Redis (self-hosted) | ₹0 |

**Monthly cost: ₹0 – ₹500**

---

## Project Structure

```
voice-ai-saas/
├── services/
│   ├── call-gateway/       # Twilio webhooks, call flow TwiML
│   ├── nlu-service/        # Ollama + Llama — intent detection
│   ├── stt-service/        # Whisper.cpp + Bhashini — speech-to-text
│   ├── tts-service/        # Coqui TTS — text-to-speech
│   ├── session-service/    # Redis — active call sessions
│   ├── lead-service/       # MongoDB — lead capture & management
│   ├── notification-service/ # whatsapp-web.js — follow-up messages
│   ├── auth-service/       # JWT — tenant authentication
│   └── dashboard-api/      # Stats & analytics REST API
├── shared/
│   ├── utils/              # logger, AppError, response helpers
│   └── constants/          # intents, languages, statuses
├── infrastructure/
│   ├── k8s/                # Kubernetes manifests (production)
│   └── nginx/              # Reverse proxy config
├── scripts/
│   ├── setup.sh            # One-command setup
│   ├── health-check.sh     # Check all services
│   └── test-pipeline.sh    # Test voice pipeline
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Quick Start

```bash
# 1. Clone & setup
git clone https://github.com/muffincodes/voice-ai-saas
cd voice-ai-saas

# 2. Run setup (pulls Llama model — ~5GB first time)
chmod +x scripts/setup.sh && ./scripts/setup.sh

# 3. Fill in .env values
nano .env

# 4. Check all services healthy
./scripts/health-check.sh

# 5. WhatsApp — scan QR code
docker logs voiceai-notify
```

---

## Service Ports

| Service | Port |
|---------|------|
| call-gateway | 4001 |
| nlu-service | 4002 |
| stt-service | 4003 |
| tts-service | 4004 |
| lead-service | 4005 |
| notification-service | 4006 |
| auth-service | 4007 |
| dashboard-api | 4008 |
| Ollama | 11434 |
| Whisper | 8081 |
| Coqui TTS | 8082 |

---

## Webhook Setup (Twilio)

Set these in Twilio Console → Phone Numbers → Your Number:

- **Incoming call webhook**: `https://your-domain.com/webhook/call-connect`
- **Call status webhook**: `https://your-domain.com/webhook/call-status`

For local dev: use `ngrok http 4001` and use the ngrok URL.

---

## Developer Guide

See `VoiceAI_ZeroCost_DevGuide_v2.docx` for complete implementation details.
