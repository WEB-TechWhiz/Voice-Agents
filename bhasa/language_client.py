"""
LanguageClient — drop-in SDK for your other microservices.

Usage:
    from language_client import LanguageClient

    lc = LanguageClient()                       # reads LANGUAGE_SERVICE_URL

    # ASR
    text = await lc.transcribe(audio_bytes)

    # NLU
    result = await lc.understand("mujhe ticket book karni hai")

    # TTS
    audio = await lc.speak("Aapka ticket book ho gaya!")
"""
import os
import io
import httpx
from dataclasses import dataclass

LANGUAGE_SERVICE_URL = os.getenv("LANGUAGE_SERVICE_URL", "http://language-service:8003")
TIMEOUT = float(os.getenv("LANGUAGE_SERVICE_TIMEOUT", 30))


@dataclass
class IntentResult:
    intent: str
    entities: list[dict]
    sentiment: str
    language: str
    confidence: float


class LanguageClient:
    def __init__(self, base_url: str = LANGUAGE_SERVICE_URL):
        self.base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(base_url=self.base_url, timeout=TIMEOUT)

    async def transcribe(
        self,
        audio_bytes: bytes,
        filename: str = "audio.wav",
        language: str | None = None,
    ) -> str:
        """Send audio, get back transcription text."""
        files = {"audio": (filename, io.BytesIO(audio_bytes), "audio/wav")}
        data = {"language": language} if language else {}
        resp = await self._client.post("/transcribe", files=files, data=data)
        resp.raise_for_status()
        return resp.json()["text"]

    async def understand(
        self,
        text: str,
        context: dict | None = None,
    ) -> IntentResult:
        """Extract intent + entities from text."""
        resp = await self._client.post(
            "/understand",
            json={"text": text, "context": context},
        )
        resp.raise_for_status()
        data = resp.json()
        return IntentResult(
            intent=data["intent"],
            entities=data["entities"],
            sentiment=data["sentiment"],
            language=data["language"],
            confidence=data["confidence"],
        )

    async def speak(
        self,
        text: str,
        language: str = "hi",
        voice: str | None = None,
        speed: float = 1.0,
    ) -> bytes:
        """Convert text to audio bytes (WAV/MP3)."""
        resp = await self._client.post(
            "/speak",
            json={"text": text, "language": language, "voice": voice, "speed": speed},
        )
        resp.raise_for_status()
        return resp.content

    async def health(self) -> dict:
        resp = await self._client.get("/health")
        resp.raise_for_status()
        return resp.json()

    async def close(self):
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()
