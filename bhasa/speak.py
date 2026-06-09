"""
POST /speak
  Input:  { text, language?, voice?, speed? }
  Output: audio/wav stream

Backends (in priority order):
  1. Coqui TTS — local, Hindi model (xtts_v2 or indic-tts)
  2. gTTS        — Google TTS, Hindi support, needs internet
  3. ElevenLabs  — high quality, needs API key
"""
import os
import io
import time
import logging
import tempfile
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

TTS_ENGINE = os.getenv("TTS_ENGINE", "gtts")  # coqui | gtts | elevenlabs
DEFAULT_LANGUAGE = os.getenv("TTS_DEFAULT_LANG", "hi")


class SpeakRequest(BaseModel):
    text: str
    language: str = "hi"       # hi, en
    voice: str | None = None   # engine-specific voice id
    speed: float = 1.0         # 0.5 – 2.0


def _get_coqui_model(language: str):
    """Lazy-load Coqui TTS model."""
    key = f"coqui_{language}"
    if not hasattr(_get_coqui_model, "_models"):
        _get_coqui_model._models = {}
    if key not in _get_coqui_model._models:
        from TTS.api import TTS
        model_name = (
            "tts_models/hi/fairseq/vits"       # Hindi
            if language == "hi"
            else "tts_models/en/ljspeech/glow-tts"  # English fallback
        )
        _get_coqui_model._models[key] = TTS(model_name=model_name, progress_bar=False)
        logger.info(f"Loaded Coqui TTS model: {model_name}")
    return _get_coqui_model._models[key]


async def _speak_coqui(text: str, language: str, speed: float) -> bytes:
    tts = _get_coqui_model(language)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name
    tts.tts_to_file(text=text, file_path=tmp_path)
    with open(tmp_path, "rb") as f:
        audio_bytes = f.read()
    os.unlink(tmp_path)
    return audio_bytes


async def _speak_gtts(text: str, language: str, speed: float) -> bytes:
    from gtts import gTTS
    slow = speed < 0.8
    tts = gTTS(text=text, lang=language, slow=slow)
    buf = io.BytesIO()
    tts.write_to_fp(buf)
    buf.seek(0)
    # gTTS returns MP3; convert to WAV for uniform output
    try:
        from pydub import AudioSegment
        mp3 = AudioSegment.from_mp3(buf)
        wav_buf = io.BytesIO()
        mp3.export(wav_buf, format="wav")
        return wav_buf.getvalue()
    except Exception:
        # pydub not installed — return MP3 (still playable)
        return buf.read()


async def _speak_elevenlabs(text: str, voice: str | None, speed: float) -> bytes:
    from elevenlabs import generate, Voice
    api_key = os.getenv("ELEVENLABS_API_KEY")
    voice_id = voice or os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
    audio = generate(
        text=text,
        voice=Voice(voice_id=voice_id),
        model="eleven_multilingual_v2",
        api_key=api_key,
    )
    return audio


@router.post("")
async def speak_text(body: SpeakRequest):
    """Convert text to speech. Returns audio/wav stream."""
    if not body.text.strip():
        raise HTTPException(400, "Text cannot be empty")
    if len(body.text) > 2000:
        raise HTTPException(400, "Text too long (max 2000 chars)")
    if not (0.3 <= body.speed <= 2.5):
        raise HTTPException(400, "Speed must be between 0.3 and 2.5")

    engine = TTS_ENGINE
    audio_bytes: bytes | None = None

    # Try engines in order
    for attempt_engine in [engine, "gtts"]:
        try:
            if attempt_engine == "coqui":
                audio_bytes = await _speak_coqui(body.text, body.language, body.speed)
                break
            elif attempt_engine == "elevenlabs" and os.getenv("ELEVENLABS_API_KEY"):
                audio_bytes = await _speak_elevenlabs(body.text, body.voice, body.speed)
                break
            elif attempt_engine == "gtts":
                audio_bytes = await _speak_gtts(body.text, body.language, body.speed)
                break
        except Exception as e:
            logger.warning(f"TTS engine '{attempt_engine}' failed: {e}")

    if not audio_bytes:
        raise HTTPException(503, "All TTS engines failed. Install gtts: pip install gtts")

    # Detect content type
    content_type = "audio/wav"
    if audio_bytes[:3] == b"ID3" or audio_bytes[:2] == b"\xff\xfb":
        content_type = "audio/mpeg"

    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type=content_type,
        headers={
            "Content-Disposition": "inline; filename=speech.wav",
            "X-Text-Length": str(len(body.text)),
        },
    )
