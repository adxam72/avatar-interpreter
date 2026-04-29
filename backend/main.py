import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import CORS_ORIGINS, DATA_PATH, MODEL_PATH
from services.sign_recognizer import SignRecognizer
from services.text_to_sign import get_animation_data, text_to_gloss
from services.landmark_extractor import normalize_landmarks

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("zehn-backend")

sign_recognizer: SignRecognizer | None = None
sign_dictionary: dict[str, Any] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models and data on startup."""
    global sign_recognizer, sign_dictionary

    logger.info("Zehn AI Backend running on port 8000")

    sign_recognizer = SignRecognizer(MODEL_PATH)

    dict_path = DATA_PATH / "sign_dictionary.json"
    if dict_path.exists():
        with open(dict_path, "r", encoding="utf-8") as f:
            sign_dictionary = json.load(f)
        logger.info("Sign dictionary loaded: %d words", len(sign_dictionary.get("words", [])))
    else:
        logger.warning("sign_dictionary.json not found at %s", dict_path)

    yield

    logger.info("Shutting down Zehn AI Backend")


app = FastAPI(
    title="Zehn AI Backend",
    description="O'zbek imo-ishora tilini aniqlash va tarjima qilish API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ──


class RecognizeRequest(BaseModel):
    landmarks: list[list[float]] = Field(..., description="21 ta qo'l landmark [x, y, z]")
    sequence: bool = Field(False, description="Dinamik ishora (ketma-ketlik) yoki statik")
    num_hands: int = Field(1, ge=1, le=2, description="Qo'llar soni")


class RecognizeResponse(BaseModel):
    sign: str
    confidence: float
    hand_mode: str


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Tarjima qilinadigan matn")


class TranslateResponse(BaseModel):
    glosses: list[str]
    animations: list[dict[str, Any]]


class SpeechToTextResponse(BaseModel):
    text: str


class DictionaryListResponse(BaseModel):
    words: list[str]
    total: int
    categories: dict[str, list[str]]


# ── Endpoints ──


@app.get("/")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "service": "zehn-ai-backend"}


@app.post("/api/recognize", response_model=RecognizeResponse)
async def recognize_sign(request: RecognizeRequest) -> RecognizeResponse:
    """Qo'l landmark'larini qabul qilib, ishora nomini qaytaradi."""
    try:
        if sign_recognizer is None:
            return RecognizeResponse(sign="unknown", confidence=0.0, hand_mode="one_hand")

        hand_mode = "two_hand" if request.num_hands == 2 else "one_hand"

        if request.sequence:
            result = sign_recognizer.recognize_dynamic(request.landmarks)
        else:
            result = sign_recognizer.recognize_static(request.landmarks)

        return RecognizeResponse(
            sign=result["sign"],
            confidence=result["confidence"],
            hand_mode=hand_mode,
        )
    except Exception:
        logger.exception("Error in /api/recognize")
        return RecognizeResponse(sign="error", confidence=0.0, hand_mode="one_hand")


@app.post("/api/translate", response_model=TranslateResponse)
async def translate_text(request: TranslateRequest) -> TranslateResponse:
    """Matnni surdo tili animatsiya ma'lumotlariga aylantiradi."""
    try:
        glosses = text_to_gloss(request.text)
        animations = get_animation_data(glosses, sign_dictionary)
        return TranslateResponse(glosses=glosses, animations=animations)
    except Exception:
        logger.exception("Error in /api/translate")
        return TranslateResponse(glosses=[], animations=[])


@app.post("/api/speech-to-text", response_model=SpeechToTextResponse)
async def speech_to_text(audio: UploadFile = File(...)) -> SpeechToTextResponse:
    """Audio faylni matnga aylantiradi (hozircha placeholder)."""
    logger.info("Received audio file: %s (%s)", audio.filename, audio.content_type)
    return SpeechToTextResponse(text="[speech-to-text hali tayyor emas]")


@app.get("/api/dictionary", response_model=DictionaryListResponse)
async def get_dictionary() -> DictionaryListResponse:
    """Barcha mavjud so'zlar ro'yxatini qaytaradi."""
    words_list: list[dict[str, Any]] = sign_dictionary.get("words", [])
    word_names = [w["word"] for w in words_list]

    categories: dict[str, list[str]] = {}
    for w in words_list:
        cat = w.get("category", "other")
        categories.setdefault(cat, []).append(w["word"])

    return DictionaryListResponse(
        words=word_names,
        total=len(word_names),
        categories=categories,
    )


@app.get("/api/dictionary/{word}")
async def get_word_animation(word: str) -> dict[str, Any]:
    """Bitta so'zning animatsiya ma'lumotini qaytaradi."""
    words_list: list[dict[str, Any]] = sign_dictionary.get("words", [])
    for entry in words_list:
        if entry["word"] == word:
            return entry

    return {"error": f"'{word}' so'zi topilmadi", "word": word}


@app.websocket("/ws/recognize")
async def websocket_recognize(ws: WebSocket) -> None:
    """Real-time ishora tanish uchun WebSocket endpoint."""
    await ws.accept()
    logger.info("WebSocket client connected")

    try:
        while True:
            data = await ws.receive_json()
            landmarks = data.get("landmarks", [])
            num_hands = data.get("num_hands", 1)

            if sign_recognizer is None:
                await ws.send_json({"sign": "unknown", "confidence": 0.0, "hand_mode": "one_hand"})
                continue

            try:
                normalized = normalize_landmarks(landmarks)
                result = sign_recognizer.recognize_static(normalized)
                hand_mode = "two_hand" if num_hands == 2 else "one_hand"

                await ws.send_json({
                    "sign": result["sign"],
                    "confidence": result["confidence"],
                    "hand_mode": hand_mode,
                })
            except Exception:
                logger.exception("WebSocket recognize error")
                await ws.send_json({"sign": "error", "confidence": 0.0, "hand_mode": "one_hand"})

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
