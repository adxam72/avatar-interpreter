import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

BASE_DIR: Path = Path(__file__).resolve().parent
MODEL_PATH: Path = BASE_DIR / "models"
DATA_PATH: Path = BASE_DIR / "data"

CORS_ORIGINS: list[str] = [
    "http://localhost:8080",
    "http://localhost:5173",
]
