"""
Language Service — Mini Bhashini
ASR (transcribe) + TTS (speak) + NLU (understand)
"""
import os
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn

from .routers import transcribe, understand, speak
from .middleware import RateLimitMiddleware, RequestLogMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Language Service starting up...")
    yield
    logger.info("Language Service shutting down...")


app = FastAPI(
    title="Language Service",
    description="Mini Bhashini — ASR + NLU + TTS for Hindi/Hinglish Voice AI",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestLogMiddleware)

app.include_router(transcribe.router, prefix="/transcribe", tags=["ASR"])
app.include_router(understand.router, prefix="/understand", tags=["NLU"])
app.include_router(speak.router, prefix="/speak", tags=["TTS"])


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "language-service",
        "version": "1.0.0",
        "models": {
            "asr": os.getenv("ASR_MODEL", "whisper"),
            "nlu": os.getenv("NLU_MODEL", "ollama/mistral"),
            "tts": os.getenv("TTS_ENGINE", "coqui"),
        },
    }


if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8003)),
        reload=os.getenv("ENV", "prod") == "dev",
    )
