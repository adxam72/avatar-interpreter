import json
import logging
from pathlib import Path
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


class SignRecognizer:
    """Ishora tanish — ONNX model yoki rule-based fallback."""

    def __init__(self, model_dir: Path) -> None:
        """Model fayllarni yuklaydi (agar mavjud bo'lsa).

        Args:
            model_dir: models/ papka yo'li.
        """
        self._static_session: Any = None
        self._dynamic_session: Any = None
        self._labels: list[str] = []

        self._load_models(model_dir)

    def _load_models(self, model_dir: Path) -> None:
        """ONNX modellarni yuklashga harakat qiladi."""
        static_path = model_dir / "static_model.onnx"
        dynamic_path = model_dir / "dynamic_model.onnx"
        labels_path = model_dir / "labels.json"

        if labels_path.exists():
            with open(labels_path, "r", encoding="utf-8") as f:
                self._labels = json.load(f)
            logger.info("Labels loaded: %d classes", len(self._labels))

        try:
            import onnxruntime as ort

            if static_path.exists():
                self._static_session = ort.InferenceSession(str(static_path))
                logger.info("Static ONNX model loaded: %s", static_path)

            if dynamic_path.exists():
                self._dynamic_session = ort.InferenceSession(str(dynamic_path))
                logger.info("Dynamic ONNX model loaded: %s", dynamic_path)

        except ImportError:
            logger.warning("onnxruntime not installed — using rule-based fallback only")
        except Exception:
            logger.exception("Failed to load ONNX models")

    def recognize_static(self, landmarks: list[list[float]]) -> dict[str, Any]:
        """Bitta frame'dan ishora aniqlaydi.

        Args:
            landmarks: 21 ta qo'l landmark [[x, y, z], ...].

        Returns:
            {"sign": str, "confidence": float}
        """
        if self._static_session is not None and self._labels:
            return self._predict_onnx(self._static_session, landmarks)

        return self._rule_based_recognize(landmarks)

    def recognize_dynamic(self, sequence: list[list[float]]) -> dict[str, Any]:
        """30 frame ketma-ketlikdan ishora aniqlaydi.

        Args:
            sequence: Ketma-ketlik [[x, y, z, ...], ...] — har bir element bitta frame.

        Returns:
            {"sign": str, "confidence": float}
        """
        if self._dynamic_session is not None and self._labels:
            return self._predict_onnx_dynamic(self._dynamic_session, sequence)

        return {"sign": "unknown", "confidence": 0.0}

    def _predict_onnx(self, session: Any, landmarks: list[list[float]]) -> dict[str, Any]:
        """ONNX model bilan statik predict qiladi."""
        try:
            flat = np.array(landmarks, dtype=np.float32).flatten()
            input_data = flat.reshape(1, -1)

            input_name = session.get_inputs()[0].name
            outputs = session.run(None, {input_name: input_data})

            probs = outputs[0][0]
            idx = int(np.argmax(probs))
            confidence = float(probs[idx])

            sign = self._labels[idx] if idx < len(self._labels) else "unknown"
            return {"sign": sign, "confidence": confidence}

        except Exception:
            logger.exception("ONNX static prediction failed")
            return self._rule_based_recognize(landmarks)

    def _predict_onnx_dynamic(self, session: Any, sequence: list[list[float]]) -> dict[str, Any]:
        """ONNX model bilan dinamik predict qiladi."""
        try:
            arr = np.array(sequence, dtype=np.float32)
            if arr.ndim == 2:
                arr = arr.reshape(1, *arr.shape)

            input_name = session.get_inputs()[0].name
            outputs = session.run(None, {input_name: arr})

            probs = outputs[0][0]
            idx = int(np.argmax(probs))
            confidence = float(probs[idx])

            sign = self._labels[idx] if idx < len(self._labels) else "unknown"
            return {"sign": sign, "confidence": confidence}

        except Exception:
            logger.exception("ONNX dynamic prediction failed")
            return {"sign": "unknown", "confidence": 0.0}

    def _rule_based_recognize(self, landmarks: list[list[float]]) -> dict[str, Any]:
        """Model yo'q bo'lganda rule-based fallback.

        Barmoq holatlarini tahlil qilib, oddiy ishoralarni aniqlaydi.
        """
        if not landmarks or len(landmarks) < 21:
            return {"sign": "unknown", "confidence": 0.0}

        try:
            arr = np.array(landmarks, dtype=np.float64)

            thumb_tip = arr[4]
            index_tip = arr[8]
            middle_tip = arr[12]
            ring_tip = arr[16]
            pinky_tip = arr[20]
            wrist = arr[0]

            fingers_up = [
                bool(thumb_tip[1] < arr[3][1]),
                bool(index_tip[1] < arr[6][1]),
                bool(middle_tip[1] < arr[10][1]),
                bool(ring_tip[1] < arr[14][1]),
                bool(pinky_tip[1] < arr[18][1]),
            ]

            total_up = sum(fingers_up)

            if total_up == 5:
                return {"sign": "salom", "confidence": 0.7}
            if total_up == 0:
                return {"sign": "yoq", "confidence": 0.6}
            if fingers_up == [True, False, False, False, False]:
                return {"sign": "yaxshi", "confidence": 0.65}
            if fingers_up == [False, True, False, False, False]:
                return {"sign": "bir", "confidence": 0.65}
            if fingers_up == [False, True, True, False, False]:
                return {"sign": "ikki", "confidence": 0.65}

            return {"sign": "unknown", "confidence": 0.0}

        except Exception:
            logger.exception("Rule-based recognition failed")
            return {"sign": "unknown", "confidence": 0.0}
