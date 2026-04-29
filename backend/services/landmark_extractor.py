import logging
from typing import Any

import numpy as np
from numpy.typing import NDArray

logger = logging.getLogger(__name__)

try:
    import mediapipe as mp
    mp_holistic = mp.solutions.holistic
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False
    logger.warning("MediaPipe not installed — video landmark extraction disabled")


def normalize_landmarks(landmarks: list[list[float]]) -> list[list[float]]:
    """Landmark'larni wrist ga nisbatan normalize qiladi.

    Wrist (landmark 0) ni origin (0,0,0) qiladi,
    barcha nuqtalarni unga nisbatan hisoblaydi,
    kaft masofasiga bo'lib scale qiladi.
    """
    if not landmarks or len(landmarks) < 2:
        return landmarks

    arr = np.array(landmarks, dtype=np.float64)
    wrist = arr[0].copy()

    arr = arr - wrist

    if len(arr) > 9:
        palm_distance = float(np.linalg.norm(arr[9]))
        if palm_distance > 1e-6:
            arr = arr / palm_distance

    return arr.tolist()


def extract_landmarks_from_video(video_path: str) -> NDArray[np.float64]:
    """MediaPipe Holistic ishlatib videodan har frame uchun landmark'larni chiqaradi.

    Har bir frame: 21 ta qo'l landmark (x, y, z) = 63 ta raqam.
    Agar ikki qo'l bo'lsa: 126 ta raqam.
    Wrist ga nisbatan normalize va kaft hajmiga scale qilinadi.

    Args:
        video_path: Video fayl yo'li.

    Returns:
        numpy array [frames, features] — har bir frame uchun landmark vektori.
    """
    if not MEDIAPIPE_AVAILABLE:
        raise RuntimeError("MediaPipe o'rnatilmagan. `pip install mediapipe` bilan o'rnating.")

    import cv2

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise FileNotFoundError(f"Video faylni ochib bo'lmadi: {video_path}")

    all_frames: list[NDArray[np.float64]] = []

    try:
        with mp_holistic.Holistic(
            static_image_mode=False,
            model_complexity=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        ) as holistic:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = holistic.process(rgb)

                frame_landmarks = _extract_frame_landmarks(results)
                if frame_landmarks is not None:
                    all_frames.append(frame_landmarks)
    finally:
        cap.release()

    if not all_frames:
        logger.warning("Videodan birorta ham landmark topilmadi: %s", video_path)
        return np.empty((0, 63), dtype=np.float64)

    return np.stack(all_frames)


def _extract_frame_landmarks(results: Any) -> NDArray[np.float64] | None:
    """Bitta frame natijasidan landmark vektorini chiqaradi."""
    right_hand = results.right_hand_landmarks
    left_hand = results.left_hand_landmarks

    if right_hand is None and left_hand is None:
        return None

    features: list[float] = []

    if right_hand is not None:
        rh = [[lm.x, lm.y, lm.z] for lm in right_hand.landmark]
        rh_norm = normalize_landmarks(rh)
        for pt in rh_norm:
            features.extend(pt)
    else:
        features.extend([0.0] * 63)

    if left_hand is not None:
        lh = [[lm.x, lm.y, lm.z] for lm in left_hand.landmark]
        lh_norm = normalize_landmarks(lh)
        for pt in lh_norm:
            features.extend(pt)

    return np.array(features, dtype=np.float64)
