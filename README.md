# Voice-Agents

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

> Next-generation conversational voice agent framework integrating speech-to-text (STT), large language model reasoning, and low-latency text-to-speech (TTS).

---

## 📋 Table of Contents
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [Contributing](#-contributing)
- [Author & License](#-author--license)

---

## 📌 Overview
**Voice-Agents** is designed to provide a comprehensive, maintainable, and scalable solution in the **Artificial Intelligence / Voice AI** domain. Engineered with modern industry standards and clean architecture.

---

## ✨ Key Features
- **Real-Time Speech Processing**: Low-latency streaming audio input and playback
- **Contextual LLM Reasoning**: Intelligent dialogue management and intent recognition
- **Custom Voice Profiles**: Configurable voice personalities and accents

---

## 🛠️ Tech Stack
- **Docker**

---

## 📂 Project Structure
```text
Voice-Agents/
├── bhasa/
│   ├── docker-compose.language.yml
│   ├── language_client.py
│   ├── language-service.zip
│   ├── main.py
│   ├── README.md
│   ├── speak.py
│   ├── transcribe.py
│   └── understand.py
├── DonotTouch/
│   ├── ZeroCostDevGuide_extracted/
│   │   ├── _rels/
│   │   ├── docProps/
│   │   ├── word/
│   │   └── [Content_Types].xml
│   ├── voice-ai-saas.zip
│   ├── VoiceAI_SaaS_Technical_Documentation_v1.docx
│   ├── VoiceAI_ZeroCost_DevGuide_v2.docx
│   └── VoiceAI_ZeroCost_DevGuide_v2.zip
├── services/
│   ├── call-gateway/
│   │   ├── src/
│   │   └── package.json
│   ├── dashboard-api/
│   │   ├── src/
│   │   └── package.json
│   ├── language-service/
│   │   └── src/
│   ├── lead-service/
│   │   ├── src/
│   │   └── package.json
│   ├── nlu-service/
│   │   ├── src/
│   │   └── package.json
│   ├── notification-service/
│   │   ├── src/
│   │   └── package.json
│   ├── stt-service/
│   │   ├── src/
│   │   └── package.json
│   └── tts-service/
│       ├── src/
│       └── package.json
├── shared/
│   ├── constants/
│   │   └── index.js
│   ├── models/
│   │   ├── Call.js
│   │   ├── Lead.js
│   │   ├── Tenant.js
│   │   └── User.js
│   ├── utils/
│   │   ├── asyncHandler.js
│   │   ├── errors.js
│   │   ├── http.js
│   │   ├── http.test.js
│   │   └── logger.js
│   ├── index.js
│   └── package.json
├── voice-ai-saas/
│   └── voice-ai-saas/
│       ├── scripts/
│       ├── services/
│       ├── shared/
│       ├── .gitignore
│       ├── docker-compose.yml
│       ├── package.json
│       └── README.md
├── .gitignore
├── docker-compose.yml
├── extract_devguide.py
├── implementationPlan.text
├── package-lock.json
├── package.json
├── PROJECT_SUMMARY.md
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.x or higher recommended)
- **npm**, **yarn**, or **pnpm**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/WEB-TechWhiz/Voice-Agents.git
   cd Voice-Agents
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```


5. **Start the development server:**
   ```bash
   npm run dev
   ```


## 📜 Available Scripts

In the project directory, you can run:

| Command | Action |
|---|---|
| `npm run bootstrap` (or `npm test` / `npm start`) | `npm install && npm run bootstrap -w shared && npm run bootstrap --workspaces --if-present` |
| `npm run dev` (or `npm test` / `npm start`) | `concurrently "npm run dev -w services/lead-service" "npm run dev -w services/stt-service" "npm run dev -w services/nlu-service" "npm run dev -w services/tts-service" "npm run dev -w services/call-gateway" "npm run dev -w services/dashboard-api" "npm run dev -w services/notification-service"` |
| `npm run start` (or `npm test` / `npm start`) | `docker-compose up -d && npm run dev` |
| `npm run stop` (or `npm test` / `npm start`) | `docker-compose down` |
| `npm run test` (or `npm test` / `npm start`) | `jest --passWithNoTests` |
| `npm run check` (or `npm test` / `npm start`) | `node --check shared/index.js && node --check services/call-gateway/src/app.js && node --check services/lead-service/src/app.js && node --check services/stt-service/src/app.js && node --check services/nlu-service/src/app.js && node --check services/tts-service/src/app.js && node --check services/dashboard-api/src/app.js && node --check services/notification-service/src/app.js` |


## 🤝 Contributing
Contributions, feedback, and pull requests are warmly welcomed!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 👤 Author & License
- **Maintainer**: [WEB-TechWhiz](https://github.com/WEB-TechWhiz)
- **License**: Distributed under the MIT License.
