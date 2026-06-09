# Voice Agents Project Summary

---

## 1️⃣ Project Overview

**Voice Agents** is a **backend‑first MVP** for a multi‑tenant voice‑assistant platform targeting Indian businesses. It simulates an end‑to‑end voice call workflow:

1. **Exotel‑style webhook** receives an inbound call.
2. **Redis (or in‑memory fallback)** stores per‑call session data.
3. **Mock STT** converts audio/text payload to a transcript.
4. **Rule‑based (or AI) NLU** extracts intent and entities.
5. **Mock TTS** returns an XML `<Say>` or `<Play>` response.
6. **Lead Service** persists call metadata, transcripts, leads, and analytics in MongoDB.
7. **Dashboard API** serves authenticated tenant data (calls, leads, analytics).

The repository ships a **complete demo pipeline** that can be run locally with Docker, MongoDB, Redis and `npm run dev`.

---

## 2️⃣ High‑Level Architecture & Service Map

```
+-------------------+        +-------------------+        +-------------------+
|   Call Gateway   | <----> |   Lead Service   | <----> |   MongoDB (DB)   |
|   (Express/API)  |        |   (Express/API)  |        +-------------------+
+-------------------+        +-------------------+               ^
        ^   |                     ^   |                     |
        |   v                     |   v                     |
+-------------------+   +-------------------+   +-------------------+
|   STT Service    |   |   NLU Service    |   |   TTS Service    |
| (mock/Deepgram)  |   | (rule/Claude)    |   | (mock/ElevenLabs) |
+-------------------+   +-------------------+   +-------------------+
        ^                     ^                     ^
        |                     |                     |
        +---------------------+---------------------+
                              |
                     +-------------------+
                     | Dashboard API     |
                     | (Auth + UI data) |
                     +-------------------+
```

*All services are **Express** applications listening on distinct ports (4001‑4007).*

---

## 3️⃣ Core Services & Their Responsibilities

| Service | Port | Main Routes | Key responsibilities |
|---------|------|-------------|-----------------------|
| **call‑gateway** | 4001 | `POST /webhook/call‑connect`<br>`POST /webhook/speech‑input`<br>`POST /webhook/call‑status`<br>`GET /health` | Accepts Exotel‑style webhooks, manages session state (Redis ↔ in‑memory), orchestrates calls to STT, NLU, TTS, Lead Service, builds XML responses. |
| **stt‑service** | 4004 | `POST /transcribe` | Mock transcription (or Deepgram / Bhashini when `MOCK_MODE=false`). Returns `{ transcript, language }`. |
| **nlu‑service** | 4005 | `POST /understand` | Rule‑based intent detection (appointment, lead capture, order status, etc.). In future can call Claude / Sarvam APIs. Returns `{ intent, response, entities, shouldEndCall }`. |
| **tts‑service** | 4006 | `POST /synthesize` | Mock TTS (returns static text) or real ElevenLabs / Azure TTS. Returns `{ audioUrl }`. |
| **lead‑service** | 4003 | `POST /calls`, `PUT /calls/:sid`, `POST /leads`, `GET /calls`, `GET /leads`, `GET /analytics/summary` | Persists call logs, lead records, analytics in MongoDB. Provides tenant bootstrap endpoint (`/tenants/resolve`). |
| **dashboard‑api** | 4002 | `POST /auth/register`, `POST /auth/login`, `<protected>` CRUD for calls/leads/analytics | Authenticated JWT API for front‑end dashboards (React UI to be built later). |
| **notification‑service** | 4007 | `POST /notify` | Mock endpoint for post‑call notifications (WhatsApp, SendGrid, etc.). |

---

## 4️⃣ API Design & Protocols

| Area | Protocol | Details |
|------|----------|---------|
| **Webhooks** | **HTTP POST (XML/JSON)** | Exotel‑style webhook endpoints (`/webhook/*`). Signature verification via `verifySignature` middleware. |
| **Internal Service Calls** | **HTTP POST/PUT (JSON)** | All micro‑services communicate over REST JSON using **Axios**. URLs are derived from environment variables (`*_SERVICE_URL`). |
| **Authentication** | **JWT** | Dashboard API uses `JWT_SECRET` and `JWT_EXPIRES_IN` (default 7 days). Tokens are issued on login and passed via `Authorization: Bearer <token>`. |
| **Data Store** | **MongoDB** (via Mongoose‑like driver) | Calls, leads, tenant configs, analytics are persisted. Connection string set via `MONGODB_URI`. |
| **Cache / Session** | **Redis** (or fallback in‑memory) | Session objects stored under `session:call:<CallSid>` with 1‑hour TTL. |
| **External SaaS** | **REST/HTTPS** | *Exotel* (telephony webhook), *Deepgram* / *Bhashini* (STT), *Claude* / *Sarvam* (NLU), *ElevenLabs* / *Azure* (TTS), *Twilio* (fallback), *SendGrid*, *WhatsApp Business API* (notifications). |

---

## 5️⃣ Feature Set & Implementation Approaches

| Feature | Implementation Approach |
|---------|--------------------------|
| **Multi‑tenant demo** | Tenant ID resolved via `/tenants/resolve` (uses demo business defaults). All data isolated per tenant. |
| **Mock vs Real integrations** | Controlled by `MOCK_MODE` env flag. When `true`, all external API keys are dummy values; the services return static responses. When `false`, real keys are required and the services call the actual providers. |
| **Rule‑based NLU** | Simple keyword/regex matching inside `nlu-service`. Returns intents like `capture_lead`, `book_appointment`, `order_status`, `business_info`, `human_handoff`. |
| **Session Management** | Prefer Redis (high‑availability). If Redis cannot be reached, falls back to a `Map` in memory (useful for local dev). |
| **Call Flow XML** | `xmlResponse` helper builds Exotel‑compatible `<Response>` XML with either `<Say>` (text) or `<Play>` (audio URL) and optionally `<Gather>` for speech input. |
| **Lead Capture** | After NLU determines `capture_lead` or `book_appointment`, the service posts to `lead-service` to store lead data. |
| **Health Checks** | Each service exposes `/health` returning `{status: 'UP', service: '<name>'}` for kube/Docker health probes. |
| **Logging & Error Handling** | Centralised `shared` logger (Winston) and `errorHandler` middleware. Errors wrapped in `AppError` with proper status codes. |
| **Docker Compose** | `docker-compose.yml` spins up MongoDB and Redis for local dev. Services are started via `npm run dev`. |

---

## 6️⃣ Technology Stack

- **Runtime**: Node.js (v20) with **Express.js** for HTTP APIs
- **Package Manager**: npm (`package.json` in root & each service)
- **Database**: MongoDB Atlas / cloud cluster (`MONGODB_URI`)
- **Cache**: Redis (`REDIS_URL`)
- **Message Queue**: None yet (future work may add RabbitMQ/Kafka)
- **Configuration**: `.env` loaded via `dotenv`
- **Containerisation**: Docker & Docker‑Compose (MongoDB + Redis)
- **Testing / Lint**: `npm run check` (ESLint, Prettier)
- **Documentation**: This summary + `README.md`

---

## 7️⃣ Security & Privacy Considerations

| Concern | Current Handling |
|---------|------------------|
| **Secrets** | Stored in `.env` (never committed – `.gitignore` includes `.env`). `JWT_SECRET` is a long random string. |
| **Webhook Signature** | `verifyExotelSignature` middleware validates the Exotel request signature using `EXOTEL_API_KEY`/`TOKEN`. |
| **Input Validation** | Minimal validation in the MVP; future phases will add Joi/Zod schemas for each endpoint. |
| **Rate Limiting / CORS** | Planned for Phase 6 (production hardening) – to be added via `express-rate-limit` and `helmet`. |
| **Data at Rest** | MongoDB connection uses TLS by default (Atlas). Redis runs locally unencrypted for dev; production will enable TLS. |

---

## 8️⃣ Future Roadmap (as described in README)

1. **Real Telephony Integration** – Exotel signature verification, ngrok tunnel, production‑grade XML.
2. **AI Provider Switchover** – Replace mock STT/NLU/TTS with Deepgram, Bhashini, Claude, Sarvam, ElevenLabs, Azure.
3. **Frontend Dashboard** – React UI consuming `dashboard-api`.
4. **Async Notification Workers** – Queue‑based processing for WhatsApp, SendGrid, CRM.
5. **Production Hardening** – Validation schemas, rate limiting, security headers, CI/CD, Dockerfiles, Kubernetes manifests.

---

## 9️⃣ Quick How‑to Run Locally (summary from README)

```bash
# 1️⃣ Install deps
npm install

# 2️⃣ Spin up MongoDB & Redis
docker-compose up -d   # brings up mongodb & redis containers

# 3️⃣ Start all services (each watches its own `package.json` scripts)
npm run dev   # launches call‑gateway, stt, nlu, tts, lead, dashboard, notification
```

Now you can simulate a call with the curl examples in the README (connect, speech‑input, status). All data is stored in MongoDB and can be inspected via the Lead Service endpoints.

---

## 10️⃣ Where to Find the Source Files

- **Root** – `README.md`, `.env.example`, `docker-compose.yml`
- **services/** – each micro‑service lives in its own folder (`call-gateway`, `stt-service`, `nlu-service`, `tts-service`, `lead-service`, `dashboard-api`, `notification-service`).
- **shared/** – common utilities (`logger`, `errorHandler`, HTTP helpers) used across services.

---

*Prepared by Antigravity – a powerful coding assistant.*
