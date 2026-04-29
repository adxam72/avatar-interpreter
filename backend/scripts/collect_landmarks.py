"""Kameradan ishora landmark'larini yig'ish skripti.

Foydalanish:
    python scripts/collect_landmarks.py --word salom --person gulnora --samples 10

Natija: data/raw/{word}/{word}_{person}_{nn}.json
"""

import argparse
import json
import logging
import sys
from pathlib import Path

import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def collect_landmarks(word: str, person: str, samples: int, output_dir: Path) -> None:
    """Kamerani yoqib, landmark'larni yig'adi va JSON faylga saqlaydi.

    Args:
        word: Ishora so'zi (masalan, 'salom').
        person: Foydalanuvchi ismi.
        samples: Nechta namuna yig'ish kerak.
        output_dir: Saqlash papkasi.
    """
    try:
        import cv2
        import mediapipe as mp
    except ImportError:
        logger.error("cv2 va mediapipe o'rnatilmagan. `pip install opencv-python mediapipe` bilan o'rnating.")
        return

    from services.landmark_extractor import normalize_landmarks

    word_dir = output_dir / word
    word_dir.mkdir(parents=True, exist_ok=True)

    mp_hands = mp.solutions.hands

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        logger.error("Kamerani ochib bo'lmadi!")
        return

    logger.info("=== Landmark yig'ish ===")
    logger.info("So'z: %s | Foydalanuvchi: %s | Namunalar: %d", word, person, samples)
    logger.info("'%s' ishorasini ko'rsating. SPACE — saqlash, Q — chiqish.", word)

    collected = 0

    try:
        with mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5,
        ) as hands:
            while collected < samples:
                ret, frame = cap.read()
                if not ret:
                    break

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = hands.process(rgb)

                status = f"{word} - {collected}/{samples}"

                if results.multi_hand_landmarks:
                    mp_drawing = mp.solutions.drawing_utils
                    for hand_lm in results.multi_hand_landmarks:
                        mp_drawing.draw_landmarks(frame, hand_lm, mp_hands.HAND_CONNECTIONS)
                    status += " [QO'L ANIQLANDI]"
                else:
                    status += " [qo'l topilmadi]"

                cv2.putText(frame, status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                cv2.imshow("Zehn - Landmark Collector", frame)

                key = cv2.waitKey(1) & 0xFF

                if key == ord("q"):
                    logger.info("Foydalanuvchi chiqdi.")
                    break

                if key == ord(" ") and results.multi_hand_landmarks:
                    all_hands_data: list[dict] = []

                    for hand_lm in results.multi_hand_landmarks:
                        raw = [[lm.x, lm.y, lm.z] for lm in hand_lm.landmark]
                        normalized = normalize_landmarks(raw)
                        all_hands_data.append({
                            "raw": raw,
                            "normalized": normalized,
                        })

                    sample_data = {
                        "word": word,
                        "person": person,
                        "sample_index": collected,
                        "num_hands": len(all_hands_data),
                        "hands": all_hands_data,
                    }

                    filename = f"{word}_{person}_{collected:02d}.json"
                    filepath = word_dir / filename
                    with open(filepath, "w", encoding="utf-8") as f:
                        json.dump(sample_data, f, indent=2, ensure_ascii=False)

                    collected += 1
                    logger.info("Saqlandi: %s (%d/%d)", filename, collected, samples)

    finally:
        cap.release()
        cv2.destroyAllWindows()

    logger.info("Yig'ish tugadi: %d/%d namuna saqlandi.", collected, samples)


def main() -> None:
    """CLI argumentlarni o'qib, yig'ish jarayonini boshlaydi."""
    parser = argparse.ArgumentParser(description="Ishora landmark'larini yig'ish")
    parser.add_argument("--word", type=str, required=True, help="Ishora so'zi (masalan: salom)")
    parser.add_argument("--person", type=str, required=True, help="Foydalanuvchi ismi")
    parser.add_argument("--samples", type=int, default=10, help="Namunalar soni (default: 10)")
    parser.add_argument("--output", type=str, default=None, help="Saqlash papkasi (default: data/raw/)")

    args = parser.parse_args()

    if args.output:
        output_dir = Path(args.output)
    else:
        output_dir = Path(__file__).resolve().parent.parent / "data" / "raw"

    collect_landmarks(args.word, args.person, args.samples, output_dir)


if __name__ == "__main__":
    main()
