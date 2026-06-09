"""
POST /understand
  Input:  { text, context? }
  Output: { intent, entities, sentiment, language, confidence }

Backend: Ollama (local LLM — mistral / llama3)
Fallback: OpenAI GPT-4o-mini if OPENAI_API_KEY is set
"""
import os
import json
import time
import logging
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("NLU_MODEL", "mistral")


class UnderstandRequest(BaseModel):
    text: str
    context: dict | None = None  # optional: previous intent, user profile, etc.


class Entity(BaseModel):
    type: str       # e.g. "location", "product", "date"
    value: str
    raw: str


class UnderstandResponse(BaseModel):
    intent: str
    entities: list[Entity]
    sentiment: str      # positive / negative / neutral
    language: str       # hi / en / hinglish
    confidence: float
    duration_ms: int


NLU_SYSTEM_PROMPT = """You are a multilingual NLU engine for an Indian voice AI assistant.
Analyze the user's message (Hindi, English, or Hinglish) and return ONLY a valid JSON object.

Required fields:
- intent: string (snake_case, e.g. "book_ticket", "check_order", "get_help", "chitchat")
- entities: array of {type, value, raw} objects
- sentiment: "positive" | "negative" | "neutral"
- language: "hi" | "en" | "hinglish"
- confidence: float 0.0–1.0

Example output:
{
  "intent": "book_ticket",
  "entities": [
    {"type": "source", "value": "Mumbai", "raw": "Mumbai se"},
    {"type": "destination", "value": "Delhi", "raw": "Delhi jaana hai"}
  ],
  "sentiment": "neutral",
  "language": "hinglish",
  "confidence": 0.92
}

Return ONLY the JSON object. No explanation, no markdown, no preamble."""


async def _call_ollama(text: str, context: dict | None) -> dict:
    context_str = f"\nContext: {json.dumps(context)}" if context else ""
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": f"{NLU_SYSTEM_PROMPT}\n\nUser message: {text}{context_str}\n\nJSON:",
        "stream": False,
        "options": {"temperature": 0.1, "num_predict": 300},
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{OLLAMA_URL}/api/generate", json=payload)
        resp.raise_for_status()
        raw = resp.json().get("response", "")
        return json.loads(raw.strip())


async def _call_openai(text: str, context: dict | None) -> dict:
    from openai import AsyncOpenAI
    client = AsyncOpenAI()
    context_str = f"\nContext: {json.dumps(context)}" if context else ""
    resp = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": NLU_SYSTEM_PROMPT},
            {"role": "user", "content": f"User message: {text}{context_str}"},
        ],
        temperature=0.1,
        max_tokens=300,
        response_format={"type": "json_object"},
    )
    return json.loads(resp.choices[0].message.content)


@router.post("", response_model=UnderstandResponse)
async def understand_text(body: UnderstandRequest):
    """Extract intent and entities from Hindi, English, or Hinglish text."""
    if not body.text.strip():
        raise HTTPException(400, "Text cannot be empty")

    start = time.perf_counter()
    result = None

    # Try Ollama first (local, free, private)
    try:
        result = await _call_ollama(body.text, body.context)
    except Exception as e:
        logger.warning(f"Ollama NLU failed: {e}")

    # Fallback to OpenAI
    if result is None and os.getenv("OPENAI_API_KEY"):
        try:
            result = await _call_openai(body.text, body.context)
        except Exception as e:
            logger.error(f"OpenAI NLU also failed: {e}")

    if result is None:
        raise HTTPException(503, "NLU backend unavailable. Start Ollama: `ollama serve`")

    duration_ms = int((time.perf_counter() - start) * 1000)

    return UnderstandResponse(
        intent=result.get("intent", "unknown"),
        entities=[Entity(**e) for e in result.get("entities", [])],
        sentiment=result.get("sentiment", "neutral"),
        language=result.get("language", "hi"),
        confidence=float(result.get("confidence", 0.8)),
        duration_ms=duration_ms,
    )
