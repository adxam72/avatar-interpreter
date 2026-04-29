"""Ishora tanish modelini o'rgatish skripti.

Statik model: Dense NN (63 -> 128 -> 64 -> num_classes)
Dinamik model: LSTM (30, 63) -> LSTM(128) -> Dense(num_classes)

Foydalanish:
    python scripts/train_model.py
    python scripts/train_model.py --data-dir data/raw --epochs 50 --batch-size 32

Natija: models/static_model.onnx, models/dynamic_model.onnx, models/labels.json
"""

import argparse
import json
import logging
import sys
from pathlib import Path

import numpy as np
from numpy.typing import NDArray

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
SEQUENCE_LENGTH = 30
FEATURES_PER_HAND = 63


def load_dataset(data_dir: Path) -> tuple[NDArray[np.float32], NDArray[np.int64], list[str]]:
    """Dataset'ni data/raw/ papkadan yuklaydi.

    Args:
        data_dir: data/raw/ papka yo'li.

    Returns:
        (X, y, labels) — feature array, label array, label nomlari.
    """
    if not data_dir.exists():
        logger.error("Data papkasi topilmadi: %s", data_dir)
        logger.info("Avval scripts/collect_landmarks.py bilan ma'lumot yig'ing.")
        sys.exit(1)

    features_list: list[NDArray[np.float32]] = []
    labels_list: list[int] = []
    label_names: list[str] = []

    for word_dir in sorted(data_dir.iterdir()):
        if not word_dir.is_dir():
            continue

        word = word_dir.name
        if word not in label_names:
            label_names.append(word)
        label_idx = label_names.index(word)

        json_files = list(word_dir.glob("*.json"))
        if not json_files:
            continue

        logger.info("Loading '%s': %d samples", word, len(json_files))

        for json_file in json_files:
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    data = json.load(f)

                hands = data.get("hands", [])
                if not hands:
                    continue

                flat: list[float] = []
                for hand in hands:
                    normalized = hand.get("normalized", [])
                    for pt in normalized:
                        flat.extend(pt)

                while len(flat) < FEATURES_PER_HAND:
                    flat.append(0.0)
                flat = flat[:FEATURES_PER_HAND]

                features_list.append(np.array(flat, dtype=np.float32))
                labels_list.append(label_idx)

            except Exception:
                logger.exception("Failed to load %s", json_file)

    if not features_list:
        logger.error("Hech qanday ma'lumot topilmadi!")
        sys.exit(1)

    X = np.stack(features_list)
    y = np.array(labels_list, dtype=np.int64)

    logger.info("Dataset: %d samples, %d classes", len(X), len(label_names))
    return X, y, label_names


def train_static_model(
    X: NDArray[np.float32],
    y: NDArray[np.int64],
    num_classes: int,
    epochs: int,
    batch_size: int,
) -> None:
    """Dense NN modelini o'rgatib ONNX formatda saqlaydi.

    Arxitektura: 63 -> 128 -> 64 -> num_classes

    Args:
        X: Feature array [samples, 63].
        y: Label array [samples].
        num_classes: Klasslar soni.
        epochs: Epoch soni.
        batch_size: Batch hajmi.
    """
    try:
        import tensorflow as tf
    except ImportError:
        logger.error("tensorflow o'rnatilmagan. `pip install tensorflow` bilan o'rnating.")
        return

    logger.info("=== Static model training ===")

    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(FEATURES_PER_HAND,)),
        tf.keras.layers.Dense(128, activation="relu"),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(64, activation="relu"),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(num_classes, activation="softmax"),
    ])

    model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    model.summary()

    history = model.fit(
        X, y,
        epochs=epochs,
        batch_size=batch_size,
        validation_split=0.2,
        verbose=1,
    )

    final_acc = history.history["accuracy"][-1]
    final_loss = history.history["loss"][-1]
    val_acc = history.history.get("val_accuracy", [0])[-1]
    val_loss = history.history.get("val_loss", [0])[-1]

    logger.info("Training — accuracy: %.4f, loss: %.4f", final_acc, final_loss)
    logger.info("Validation — accuracy: %.4f, loss: %.4f", val_acc, val_loss)

    _save_as_onnx(model, MODELS_DIR / "static_model.onnx", (FEATURES_PER_HAND,))


def train_dynamic_model(
    X: NDArray[np.float32],
    y: NDArray[np.int64],
    num_classes: int,
    epochs: int,
    batch_size: int,
) -> None:
    """LSTM modelini o'rgatib ONNX formatda saqlaydi.

    Arxitektura: LSTM(128) -> Dense(num_classes)
    Input shape: (30, 63)

    Args:
        X: Feature array [samples, 63] — har bir sample SEQUENCE_LENGTH marta takrorlanadi.
        y: Label array [samples].
        num_classes: Klasslar soni.
        epochs: Epoch soni.
        batch_size: Batch hajmi.
    """
    try:
        import tensorflow as tf
    except ImportError:
        logger.error("tensorflow o'rnatilmagan.")
        return

    logger.info("=== Dynamic model training ===")

    X_seq = np.repeat(X[:, np.newaxis, :], SEQUENCE_LENGTH, axis=1)
    noise = np.random.normal(0, 0.01, X_seq.shape).astype(np.float32)
    X_seq = X_seq + noise

    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(SEQUENCE_LENGTH, FEATURES_PER_HAND)),
        tf.keras.layers.LSTM(128, return_sequences=False),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(64, activation="relu"),
        tf.keras.layers.Dense(num_classes, activation="softmax"),
    ])

    model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    model.summary()

    history = model.fit(
        X_seq, y,
        epochs=epochs,
        batch_size=batch_size,
        validation_split=0.2,
        verbose=1,
    )

    final_acc = history.history["accuracy"][-1]
    logger.info("Dynamic model — accuracy: %.4f", final_acc)

    _save_as_onnx(model, MODELS_DIR / "dynamic_model.onnx", (SEQUENCE_LENGTH, FEATURES_PER_HAND))


def _save_as_onnx(model, output_path: Path, input_shape: tuple[int, ...]) -> None:
    """TensorFlow modelni ONNX formatga o'tkazib saqlaydi."""
    try:
        import tf2onnx
        import tensorflow as tf

        output_path.parent.mkdir(parents=True, exist_ok=True)

        spec = (tf.TensorSpec((None, *input_shape), tf.float32, name="input"),)
        tf2onnx.convert.from_keras(model, input_signature=spec, output_path=str(output_path))

        logger.info("ONNX model saved: %s", output_path)

    except ImportError:
        logger.warning("tf2onnx o'rnatilmagan. Model SavedModel formatda saqlanadi.")
        saved_model_dir = output_path.with_suffix("")
        model.save(str(saved_model_dir))
        logger.info("SavedModel saved: %s", saved_model_dir)


def main() -> None:
    """Training pipeline'ni boshlaydi."""
    parser = argparse.ArgumentParser(description="Ishora tanish modelini o'rgatish")
    parser.add_argument("--data-dir", type=str, default=None, help="Data papkasi (default: data/raw/)")
    parser.add_argument("--epochs", type=int, default=50, help="Epoch soni (default: 50)")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch hajmi (default: 32)")

    args = parser.parse_args()

    data_dir = Path(args.data_dir) if args.data_dir else BASE_DIR / "data" / "raw"

    X, y, label_names = load_dataset(data_dir)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    labels_path = MODELS_DIR / "labels.json"
    with open(labels_path, "w", encoding="utf-8") as f:
        json.dump(label_names, f, ensure_ascii=False, indent=2)
    logger.info("Labels saved: %s", labels_path)

    num_classes = len(label_names)

    train_static_model(X, y, num_classes, args.epochs, args.batch_size)
    train_dynamic_model(X, y, num_classes, args.epochs, args.batch_size)

    logger.info("=== Training complete ===")


if __name__ == "__main__":
    main()
