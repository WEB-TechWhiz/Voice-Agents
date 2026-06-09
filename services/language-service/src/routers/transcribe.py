"""
POST /transcribe
  Input:  audio file (wav / mp3 / ogg / webm), optional language hint
  Output: { text, language, confidence, duration_ms }

Backend: OpenAI Whisper (local, via faster-whisper or openai SDK)
Fallback: openai.audio.transcriptions if OPENAI_API_KEY is set
"""
import os
import time
import tempfile
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_TYPES = {"audio/wav", "audio/mpeg", "audio/ogg", "audio/webm", "audio/mp4"}
MAX_SIZE_MB = int(os.getenv("MAX_AUDIO_MB", 25))


class TranscribeResponse(BaseModel):
    text: str
    language: str
    confidence: float
    duration_ms: int


def _get_whisper():
    """Load whisper model (cached after first call)."""
    if not hasattr(_get_whisper, "_model"):
        model_size = os.getenv("WHISPER_MODEL", "base")
        try:
            from faster_whisper import WhisperModel
            _get_whisper._model = WhisperModel(model_size, device="cpu", compute_type="int8")
            _get_whisper._backend = "faster_whisper"
            logger.info(f"Loaded faster-whisper ({model_size})")
        except ImportError:
            import whisper
            _get_whisper._model = whisper.load_model(model_size)
            _get_whisper._backend = "whisper"
            logger.info(f"Loaded openai-whisper ({model_size})")
    return _get_whisper._model, _get_whisper._backend


async def _transcribe_openai_api(audio_bytes: bytes, filename: str, language: str | None) -> dict:
    """Fallback: use OpenAI API if OPENAI_API_KEY is present."""
    from openai import AsyncOpenAI
    client = AsyncOpenAI()

    import io
    file_tuple = (filename, io.BytesIO(audio_bytes), "audio/wav")
    result = await client.audio.transcriptions.create(
        model="whisper-1",
        file=file_tuple,
        language=language,
        response_format="verbose_json",
    )
    return {
        "text": result.text,
        "language": getattr(result, "language", language or "hi"),
        "confidence": 0.95,
    }


@router.post("", response_model=TranscribeResponse)
async def transcribe_audio(
    audio: UploadFile = File(..., description="Audio file to transcribe"),
    language: str = Form(None, description="Language hint: 'hi' for Hindi, 'en' for English"),
):
    """Convert audio to text. Supports Hindi, Hinglish, and English."""
    # Validate file size
    audio_bytes = await audio.read()
    size_mb = len(audio_bytes) / (1024 * 1024)
    if size_mb > MAX_SIZE_MB:
        raise HTTPException(400, f"File too large: {size_mb:.1f}MB > {MAX_SIZE_MB}MB limit")

    if not audio_bytes:
        raise HTTPException(400, "Empty audio file")

    start = time.perf_counter()

    # Use OpenAI API if key is available and no local model preference
    if os.getenv("OPENAI_API_KEY") and os.getenv("PREFER_LOCAL_ASR", "false") != "true":
        try:
            result = await _transcribe_openai_api(audio_bytes, audio.filename or "audio.wav", language)
            duration_ms = int((time.perf_counter() - start) * 1000)
            return TranscribeResponse(
                text=result["text"],
                language=result["language"],
                confidence=result["confidence"],
                duration_ms=duration_ms,
            )
        except Exception as e:
            logger.warning(f"OpenAI ASR failed, falling back to local: {e}")

    # Local Whisper
    try:
        model, backend = _get_whisper()
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        if backend == "faster_whisper":
            segments, info = model.transcribe(
                tmp_path,
                language=language,
                beam_size=5,
                vad_filter=True,
            )
            text = " ".join(seg.text.strip() for seg in segments)
            detected_lang = info.language
            confidence = info.language_probability
        else:
            result = model.transcribe(tmp_path, language=language, fp16=False)
            text = result["text"].strip()
            detected_lang = result.get("language", language or "hi")
            confidence = 0.9

        os.unlink(tmp_path)
        duration_ms = int((time.perf_counter() - start) * 1000)

        return TranscribeResponse(
            text=text,
            language=detected_lang,
            confidence=round(confidence, 3),
            duration_ms=duration_ms,
        )
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(500, f"Transcription error: {str(e)}")
