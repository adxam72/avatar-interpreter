import logging
from typing import Any

from services.nlp_pipeline import reorder_for_sign, tokenize

logger = logging.getLogger(__name__)

ALPHABET_HAND: dict[str, str] = {
    "a": "fist", "b": "flat", "c": "C", "d": "point", "e": "claw",
    "f": "ok", "g": "point", "h": "peace", "i": "Y", "j": "Y",
    "k": "peace", "l": "L", "m": "fist", "n": "fist", "o": "C",
    "p": "point", "q": "point", "r": "peace", "s": "fist", "t": "fist",
    "u": "peace", "v": "peace", "w": "open", "x": "claw", "y": "Y",
    "z": "point",
}

REST_POSE: dict[str, Any] = {
    "leftArm": {"shoulder": 0, "elbow": 0, "wrist": 0, "rotation": 0},
    "rightArm": {"shoulder": 0, "elbow": 0, "wrist": 0, "rotation": 0},
    "leftHand": "open",
    "rightHand": "open",
    "duration": 300,
}


def text_to_gloss(text: str) -> list[str]:
    """O'zbek matnni surdo tili gloss ketma-ketligiga aylantiradi.

    Matnni tokenizatsiya qiladi, qo'shimchalarni ajratadi,
    surdo tili tartibiga (SOV) o'zgartiradi.

    Args:
        text: O'zbek tilidagi matn.

    Returns:
        Gloss so'zlar ro'yxati.
    """
    tokens = tokenize(text)
    glosses = reorder_for_sign(tokens)
    logger.info("text_to_gloss: '%s' -> %s", text, glosses)
    return glosses


def get_animation_data(
    glosses: list[str],
    sign_dictionary: dict[str, Any],
) -> list[dict[str, Any]]:
    """Gloss ro'yxati uchun animatsiya ma'lumotlarini oladi.

    Sign dictionary'dan animatsiya topadi.
    Topilmagan so'zlar uchun fingerspelling qaytaradi.
    So'zlar orasiga transition keyframe'lar qo'shadi.

    Args:
        glosses: Gloss so'zlar ro'yxati.
        sign_dictionary: Lug'at ma'lumotlari.

    Returns:
        Animatsiya ma'lumotlari ro'yxati.
    """
    animations: list[dict[str, Any]] = []
    words_data: list[dict[str, Any]] = sign_dictionary.get("words", [])

    word_map: dict[str, dict[str, Any]] = {}
    for entry in words_data:
        word_map[entry["word"]] = entry

    for i, gloss in enumerate(glosses):
        if gloss in word_map:
            entry = word_map[gloss]
            animations.append({
                "word": gloss,
                "type": "sign",
                "poses": entry.get("poses", []),
            })
        else:
            animations.append({
                "word": gloss,
                "type": "fingerspell",
                "poses": _fingerspell(gloss),
            })

        if i < len(glosses) - 1:
            animations.append({
                "word": "_transition",
                "type": "transition",
                "poses": [REST_POSE],
            })

    return animations


def _fingerspell(word: str) -> list[dict[str, Any]]:
    """So'zni harflab ko'rsatish uchun pose'lar yaratadi."""
    poses: list[dict[str, Any]] = []

    for ch in word.lower():
        shape = ALPHABET_HAND.get(ch, "open")
        poses.append({
            "leftArm": {"shoulder": 0, "elbow": 0, "wrist": 0, "rotation": 0},
            "rightArm": {"shoulder": 0.5, "elbow": 1.7, "wrist": 0, "rotation": 0},
            "leftHand": "open",
            "rightHand": shape,
            "duration": 400,
        })

    return poses
