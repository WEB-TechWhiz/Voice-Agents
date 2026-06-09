# Voice AI SaaS MVP

Backend-first MVP for a multi-tenant voice agent platform for Indian businesses. The project simulates an inbound phone call, understands the caller message, generates an agent response, stores call and lead data, and exposes dashboard APIs for tenants.

The default local setup runs fully in mock mode, so you can test the complete call flow without paid telephony, STT, LLM, or TTS providers.

## What This Project Does

1. Receives an Exotel-style inbound call webhook.
2. Creates or resolves a demo tenant.
3. Stores call session state in Redis, with an in-memory fallback.
4. Sends caller speech/text to the STT service.
5. Sends the transcript to the NLU service for intent and entity extraction.
6. Sends the agent response to the TTS service.
7. Stores call transcripts, leads, and analytics in MongoDB.
8. Exposes authenticated dashboard APIs for calls, leads, analytics, and tenant config.

## Project Structure

```text
.
|-- package.json                    # Root workspace scripts
|-- docker-compose.yml              # MongoDB and Redis for local development
|-- .env                            # Local environment variables, not committed
|-- shared/                         # Shared models, constants, logger, errors, HTTP helpers
|-- services/
|   |-- call-gateway/               # Exotel-style webhook orchestration service
|   |-- dashboard-api/              # JWT auth and tenant dashboard API
|   |-- lead-service/               # Calls, leads, tenants, analytics persistence
|   |-- stt-service/                # Mock speech-to-text endpoint
|   |-- nlu-service/                # Rule-based intent detection endpoint
|   |-- tts-service/                # Mock text-to-speech endpoint
|   |-- notification-service/       # Mock post-call notification endpoint
|   `-- language-service/           # Experimental Python language service source
|-- bhasa/                          # Experimental Mini Bhashini/FastAPI prototype
|-- voice-ai-saas/voice-ai-saas/    # Alternate/scaffolded project copy
`-- DonotTouch/                     # Archived/reference material
```

For normal local development, use the root project at this folder:

```powershell
D:\Voice Agents
```

## Main Services

| Service | Port | Main file | Purpose |
| --- | ---: | --- | --- |
| Call Gateway | 4001 | `services/call-gateway/src/app.js` | Receives call webhooks and coordinates the voice pipeline |
| Dashboard API | 4002 | `services/dashboard-api/src/app.js` | Handles register/login and protected tenant data |
| Lead Service | 4003 | `services/lead-service/src/app.js` | Stores tenants, calls, leads, and analytics |
| STT Service | 4004 | `services/stt-service/src/app.js` | Mock transcription service |
| NLU Service | 4005 | `services/nlu-service/src/app.js` | Rule-based intent and entity extraction |
| TTS Service | 4006 | `services/tts-service/src/app.js` | Mock speech synthesis response |
| Notification Service | 4007 | `services/notification-service/src/app.js` | Mock post-call notification queue |

## Prerequisites

Install these before running the project locally:

- Node.js 18 or newer
- npm
- Docker Desktop
- PowerShell, Windows Terminal, Git Bash, or another terminal

Optional tools:

- MongoDB Compass, to inspect saved calls and leads visually
- Postman, Insomnia, or curl, to test APIs
- Ollama and Python 3.10+, only if you want to experiment with the optional Bhasa language service

## Environment Setup

The services load environment variables from the root `.env` file.

Create `.env` in the project root if it does not exist:

```powershell
cd "D:\Voice Agents"
New-Item -ItemType File -Path .env
```

Use this local mock configuration:

```env
NODE_ENV=development
MOCK_MODE=true

PORT_CALL_GATEWAY=4001
PORT_DASHBOARD_API=4002
PORT_LEAD_SERVICE=4003
PORT_STT_SERVICE=4004
PORT_NLU_SERVICE=4005
PORT_TTS_SERVICE=4006
PORT_NOTIFICATION_SERVICE=4007

LEAD_SERVICE_URL=http://localhost:4003
STT_SERVICE_URL=http://localhost:4004
NLU_SERVICE_URL=http://localhost:4005
TTS_SERVICE_URL=http://localhost:4006

DEMO_BUSINESS_NAME=Demo Clinic
DEMO_BUSINESS_TYPE=clinic
DEMO_BUSINESS_PHONE=+919999999999

MONGODB_URI=mongodb://localhost:27017/voiceai
REDIS_URL=redis://localhost:6379

JWT_SECRET=change_this_for_local_dev
JWT_EXPIRES_IN=7d

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+1xxxxxxxxxx
PUBLIC_BASE_URL=https://your-public-ngrok-url.ngrok-free.app
```

Keep `MOCK_MODE=true` for local development. In mock mode, webhook signature verification is skipped and the STT/NLU/TTS services do not require external API keys.

## Install Dependencies

From the root folder:

```powershell
cd "D:\Voice Agents"
npm install
```

This installs the root dependencies and npm workspace dependencies for `shared` and `services/*`.

## Start MongoDB and Redis

Start the local infrastructure containers:

```powershell
docker compose up -d
```

Confirm both containers are running:

```powershell
docker compose ps
```

Expected containers:

- `voiceai_mongodb`
- `voiceai_redis`

To stop them later:

```powershell
docker compose down
```

## Run the Project Locally

Start all Node.js services:

```powershell
npm run dev
```

This command starts all services together with `concurrently`:

- `call-gateway`
- `lead-service`
- `stt-service`
- `nlu-service`
- `tts-service`
- `dashboard-api`
- `notification-service`

Keep this terminal open while testing the project.

## Verify Services Are Running

Open a second terminal and run:

```powershell
curl http://localhost:4001/health
curl http://localhost:4002/health
curl http://localhost:4003/health
curl http://localhost:4004/health
curl http://localhost:4005/health
curl http://localhost:4006/health
curl http://localhost:4007/health
```

Each service should return JSON with `status` set to `UP`.

## Test the Demo Call Flow

The call flow uses the Call Gateway on port `4001`.

### 1. Start a Call

```powershell
curl -X POST http://localhost:4001/webhook/call-connect `
  -H "Content-Type: application/json" `
  -d "{\"CallSid\":\"demo-call-1\",\"From\":\"+919876543210\",\"To\":\"+911234567890\"}"
```

Expected result: XML with a greeting and a speech gather instruction.

### 2. Send Caller Speech

```powershell
curl -X POST http://localhost:4001/webhook/speech-input `
  -H "Content-Type: application/json" `
  -d "{\"CallSid\":\"demo-call-1\",\"SpeechResult\":\"my name is Rahul I want to book an appointment\"}"
```

Expected result: XML with the agent response. The NLU service should detect the appointment intent and the lead service should store call/lead data.

### 3. End the Call

```powershell
curl -X POST http://localhost:4001/webhook/call-status `
  -H "Content-Type: application/json" `
  -d "{\"CallSid\":\"demo-call-1\",\"CallStatus\":\"completed\",\"Duration\":90}"
```

Expected result:

```json
{"success":true}
```

## Read Captured Data

The Lead Service exposes local read APIs on port `4003`.

```powershell
curl http://localhost:4003/calls
curl http://localhost:4003/leads
curl http://localhost:4003/analytics/summary
```

These endpoints are useful for local development because they do not require dashboard authentication.

## Dashboard API Usage

The Dashboard API runs on port `4002`. Its data endpoints require a JWT token.

### Register a Tenant User

```powershell
curl -X POST http://localhost:4002/auth/register `
  -H "Content-Type: application/json" `
  -d "{\"businessName\":\"Demo Clinic\",\"businessType\":\"clinic\",\"phone\":\"+919999999999\",\"email\":\"owner@example.com\",\"password\":\"password123\",\"name\":\"Demo Owner\"}"
```

Copy the returned `data.token`.

### Login

```powershell
curl -X POST http://localhost:4002/auth/login `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"owner@example.com\",\"password\":\"password123\"}"
```

### Call Protected Dashboard APIs

Replace `<TOKEN>` with the token returned by register or login:

```powershell
curl http://localhost:4002/calls -H "Authorization: Bearer <TOKEN>"
curl http://localhost:4002/leads -H "Authorization: Bearer <TOKEN>"
curl http://localhost:4002/analytics/summary -H "Authorization: Bearer <TOKEN>"
curl http://localhost:4002/tenant/config -H "Authorization: Bearer <TOKEN>"
```

## Useful npm Commands

```powershell
npm install       # Install dependencies
npm run dev       # Start all Node.js services
npm run start     # Start Docker infra, then start all services
npm run stop      # Stop Docker infra
npm run check     # Run Node syntax checks
npm test          # Run Jest tests
```

You can also run one service at a time:

```powershell
npm run dev -w services/call-gateway
npm run dev -w services/lead-service
npm run dev -w services/dashboard-api
npm run dev -w services/stt-service
npm run dev -w services/nlu-service
npm run dev -w services/tts-service
npm run dev -w services/notification-service
```

## API Reference

### Call Gateway

Base URL:

```text
http://localhost:4001
```

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Service health check |
| POST | `/webhook/call-connect` | Starts a new call session |
| POST | `/webhook/speech-input` | Processes caller speech/text |
| POST | `/webhook/call-status` | Marks a call completed/dropped |
| POST | `/calls/outbound` | Starts an outbound Twilio call |

### Start a Real Outbound Call with Twilio

Twilio cannot call `localhost`, so expose the local Call Gateway with a public HTTPS URL first.

Start the app:

```powershell
npm run dev
```

In another terminal, expose port `4001`:

```powershell
ngrok http 4001
```

Copy the HTTPS forwarding URL from ngrok and set it in `.env`:

```env
PUBLIC_BASE_URL=https://your-public-ngrok-url.ngrok-free.app
TWILIO_FROM_NUMBER=+1xxxxxxxxxx
```

`TWILIO_FROM_NUMBER` must be a Twilio phone number from your account. The `to` number must use E.164 format, for example `+919876543210`.

Restart `npm run dev` after changing `.env`, then call:

```powershell
curl -X POST http://localhost:4001/calls/outbound `
  -H "Content-Type: application/json" `
  -d "{\"to\":\"+91YOUR_NUMBER_HERE\"}"
```

Expected result:

```json
{
  "success": true,
  "data": {
    "sid": "CA...",
    "status": "queued",
    "direction": "outbound-api"
  }
}
```

When you answer the phone, Twilio requests `PUBLIC_BASE_URL/webhook/call-connect`, and the call enters the same voice-agent flow used by the local demo.

### Lead Service

Base URL:

```text
http://localhost:4003
```

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Service health check |
| POST | `/tenants/resolve` | Resolve or create a demo tenant |
| GET | `/tenants/:id` | Fetch tenant details |
| POST | `/calls` | Create a call record |
| PUT | `/calls/:callSid` | Update call transcript, status, intent, or entities |
| GET | `/calls` | List calls |
| GET | `/calls/:callSid` | Fetch one call |
| POST | `/leads` | Create or update a lead |
| GET | `/leads` | List leads |
| PUT | `/leads/:id` | Update lead status/details |
| GET | `/analytics/summary` | Get call and lead summary |

### STT Service

Base URL:

```text
http://localhost:4004
```

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Service health check |
| POST | `/transcribe` | Returns a transcript from text/mock audio input |

Example:

```powershell
curl -X POST http://localhost:4004/transcribe `
  -H "Content-Type: application/json" `
  -d "{\"text\":\"mujhe appointment book karna hai\",\"language\":\"auto\"}"
```

### NLU Service

Base URL:

```text
http://localhost:4005
```

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Service health check |
| POST | `/understand` | Detects intent, entities, and response text |

Example:

```powershell
curl -X POST http://localhost:4005/understand `
  -H "Content-Type: application/json" `
  -d "{\"transcript\":\"my name is Rahul I want to book an appointment\"}"
```

### TTS Service

Base URL:

```text
http://localhost:4006
```

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Service health check |
| POST | `/synthesize` | Returns mock TTS data for call XML |

Example:

```powershell
curl -X POST http://localhost:4006/synthesize `
  -H "Content-Type: application/json" `
  -d "{\"text\":\"Namaste, main aapki madad kar sakta hoon\",\"language\":\"hinglish\"}"
```

### Dashboard API

Base URL:

```text
http://localhost:4002
```

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | No | Service health check |
| POST | `/auth/register` | No | Create tenant and owner user |
| POST | `/auth/login` | No | Login and receive JWT |
| GET | `/calls` | Yes | List tenant calls |
| GET | `/leads` | Yes | List tenant leads |
| PUT | `/leads/:id` | Yes | Update tenant lead |
| GET | `/analytics/summary` | Yes | Tenant analytics |
| GET | `/tenant/config` | Yes | Read tenant config |
| PUT | `/tenant/config` | Yes | Update tenant config |

### Notification Service

Base URL:

```text
http://localhost:4007
```

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Service health check |
| POST | `/notifications/post-call` | Queue/mock a post-call notification |

## Data Storage

MongoDB stores:

- Tenants
- Users
- Calls
- Leads

Redis stores:

- Active call sessions under keys like `session:call:<CallSid>`

If Redis is not available, the Call Gateway falls back to in-memory sessions. This is fine for local testing but not for production.

## Mock Mode vs Real Providers

### Mock Mode

Recommended for local setup:

```env
MOCK_MODE=true
```

Behavior:

- Exotel signature validation is skipped.
- STT accepts a text field and returns it as the transcript.
- NLU uses local regex/rule matching.
- TTS returns text for XML `<Say>` output.
- Notification service returns a mock queued/sent response.

### Real Provider Mode

Set only when you have implemented and verified real integrations:

```env
MOCK_MODE=false
```

Real provider mode requires extra work and credentials. The current Node services still mostly contain mock/stub behavior, so production provider integration is not complete yet.

Potential provider variables already reserved in the project:

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
PUBLIC_BASE_URL=
DEEPGRAM_API_KEY=
ELEVENLABS_API_KEY=
EXOTEL_API_TOKEN=
```

## Optional Bhasa / Language Service Notes

The repository includes experimental Python language-service code in:

- `bhasa/`
- `services/language-service/`

This code is intended for a future real AI stack with:

- Whisper or faster-whisper for ASR
- Ollama or OpenAI for NLU
- gTTS, Coqui, or ElevenLabs for TTS

It is not part of the default `npm run dev` workflow right now. The root Node.js services do not currently call this service by default.

If you continue the Bhasa integration later, you will likely need to add:

- `services/language-service/requirements.txt`
- `services/language-service/Dockerfile`
- missing `speak.py` wiring under `services/language-service/src/routers`
- Node service proxy calls from STT, NLU, and TTS to `LANGUAGE_SERVICE_URL`

## Troubleshooting

### `docker compose up -d` fails

Make sure Docker Desktop is installed and running. Then retry:

```powershell
docker compose up -d
```

### `npm run dev` fails with workspace errors

Reinstall dependencies from the root:

```powershell
npm install
```

Then retry:

```powershell
npm run dev
```

### Port already in use

Another process may already be using ports `4001` to `4007`, `27017`, or `6379`.

On Windows, check a port:

```powershell
netstat -ano | findstr :4001
```

Stop the conflicting process or change the relevant `PORT_*` value in `.env`.

### Webhook returns missing or invalid signature

For local testing, set:

```env
MOCK_MODE=true
```

When `MOCK_MODE=false`, `call-gateway` expects a valid `X-Exotel-Signature` header.

### Calls or leads are empty

Make sure MongoDB is running:

```powershell
docker compose ps
```

Then run the full call flow again:

1. `POST /webhook/call-connect`
2. `POST /webhook/speech-input`
3. `POST /webhook/call-status`

### Dashboard protected endpoints return `401`

Register or login first, then send the returned JWT token in the header:

```text
Authorization: Bearer <TOKEN>
```

## Local Development Checklist

Use this checklist when setting up on a new machine:

1. Open terminal in `D:\Voice Agents`.
2. Install Node.js, npm, and Docker Desktop.
3. Create `.env` with `MOCK_MODE=true`.
4. Run `npm install`.
5. Run `docker compose up -d`.
6. Run `npm run dev`.
7. Check all `/health` endpoints.
8. Run the demo call flow.
9. Read calls, leads, and analytics from the Lead Service.

## Current MVP Limitations

- No frontend dashboard is included in the root runnable MVP.
- Exotel production webhook validation still needs real-world testing.
- STT, NLU, and TTS are mock/rule-based in the default Node.js workflow.
- Notification delivery is mocked.
- Input validation is minimal and should be hardened before production.
- The Python Bhasa service is experimental and not fully wired into the Node.js pipeline.

## Production Readiness Notes

Before deploying this project, add or verify:

- Real Exotel webhook payload compatibility.
- Strong `JWT_SECRET`.
- Real provider integrations for STT, NLU, and TTS.
- Request validation schemas.
- Rate limiting and security headers.
- CORS configuration.
- Centralized logging and monitoring.
- Dockerfiles for all Node.js services.
- CI checks and integration tests.
- Encrypted production MongoDB and Redis connections.
#   V o i c e - A g e n t s  
 