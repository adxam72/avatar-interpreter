import logging
import re

logger = logging.getLogger(__name__)

SUFFIXES: list[str] = [
    "lar", "ler",
    "ga", "ka", "qa",
    "ni", "ini",
    "dan", "den",
    "da", "de",
    "ning",
    "man", "miz", "siz", "lar",
    "moqda", "yotir", "yapti",
    "gan", "gen",
    "adi", "edi",
    "chi", "lik", "siz",
]

STOP_WORDS: set[str] = {"va", "ham", "bilan", "uchun", "lekin", "ammo", "yoki"}

VERB_SUFFIXES: set[str] = {"moq", "moqda", "yotir", "yapti", "adi", "edi", "gan", "gen", "di"}


def tokenize(text: str) -> list[str]:
    """So'zlarni ajratadi va tinish belgilarini olib tashlaydi.

    Args:
        text: Kiritilgan matn.

    Returns:
        So'zlar ro'yxati (kichik harflarda).
    """
    cleaned = re.sub(r"[^\w\s'ʻ]", "", text.lower())
    tokens = cleaned.split()
    return [t for t in tokens if t]


def stem(word: str) -> str:
    """Qo'shimchalarni olib tashlaydi (rule-based stemmer).

    Eng uzun mos qo'shimchani birinchi olib tashlaydi.
    Qolgan so'z 2 ta harfdan kam bo'lsa, asl so'zni qaytaradi.

    Args:
        word: Bitta so'z.

    Returns:
        Ildiz so'z.
    """
    sorted_suffixes = sorted(SUFFIXES, key=len, reverse=True)

    for suffix in sorted_suffixes:
        if word.endswith(suffix) and len(word) - len(suffix) >= 2:
            return word[: -len(suffix)]

    return word


def reorder_for_sign(tokens: list[str]) -> list[str]:
    """SOV (Subject-Object-Verb) tartibiga o'zgartiradi.

    O'zbek tili aslida SOV, lekin ba'zan tartib o'zgaradi.
    Bu funksiya fe'lni oxiriga qo'yadi va stop-so'zlarni olib tashlaydi.

    Args:
        tokens: So'zlar ro'yxati.

    Returns:
        Surdo tili tartibidagi so'zlar.
    """
    if not tokens:
        return tokens

    filtered = [t for t in tokens if t not in STOP_WORDS]

    verbs: list[str] = []
    non_verbs: list[str] = []

    for token in filtered:
        is_verb = any(token.endswith(vs) for vs in VERB_SUFFIXES)
        if is_verb:
            verbs.append(stem(token))
        else:
            non_verbs.append(stem(token))

    return non_verbs + verbs
