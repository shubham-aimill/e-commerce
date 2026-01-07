from __future__ import annotations

import os
import re
from typing import Optional, List

import pandas as pd
from datasets import load_dataset
from PIL import Image
from tqdm import tqdm

from .clip_color_detector import ClipColorDetector
from .color_match_agent import ColorMatchAgent, Verdict


def _pick_color_key(example_keys: List[str]) -> str:
    """
    Pick the most appropriate color field from a Hugging Face example.

    For ashraq/fashion-product-images-small, the schema is:
      ['id', 'gender', 'masterCategory', 'subCategory', 'articleType',
       'baseColour', 'season', 'year', 'usage', 'productDisplayName', 'image']

    We primarily want 'baseColour'.
    """
    preferred = ["baseColour", "base_colour", "color", "colour"]
    for key in preferred:
        if key in example_keys:
            print(f"[INFO] Using '{key}' as expected color field.")
            return key
    raise ValueError(
        "Could not find a color field. Expected one of: "
        "'baseColour', 'base_colour', 'color', 'colour'."
    )


def _get_row_identifier(example: dict, idx: int) -> str:
    """
    Build a safe identifier for saving images and debugging.

    Tries 'id' then falls back to row index.
    """
    raw = None
    if "id" in example and example["id"] is not None:
        raw = str(example["id"])

    if not raw:
        raw = str(idx)

    safe = re.sub(r"[^A-Za-z0-9_-]+", "_", raw)
    return safe or str(idx)


def process_hf_dataset(
    output_csv: str,
    clip_detector: ClipColorDetector,
    color_agent: ColorMatchAgent,
    hf_name: str = "ashraq/fashion-product-images-small",
    split: str = "train",
    limit: Optional[int] = None,
    image_dir: str = "data/images",
) -> None:
    """
    Process the Hugging Face dataset to detect colors and create a Match/Mismatch verdict.

    Uses:
      - Dataset: ashraq/fashion-product-images-small
      - Expected color: 'baseColour' (or fallback fields)
      - Image: 'image' (already a PIL.Image from the dataset)

    For each example:
      - Saves the image into `image_dir`.
      - Uses CLIP to detect color.
      - Uses LangChain agent to decide Match/Mismatch vs expected color.

    Parameters
    ----------
    output_csv : str
        Path to output CSV (metadata + detected_color, detected_confidence, Verdict).
    clip_detector : ClipColorDetector
        Initialized CLIP color detector.
    color_agent : ColorMatchAgent
        LangChain agent to decide Match/Mismatch.
    hf_name : str
        Hugging Face dataset identifier.
    split : str
        Dataset split (e.g. 'train').
    limit : int, optional
        Optional limit on number of rows to process.
    image_dir : str
        Directory where images will be saved.
    """
    print(f"[INFO] Loading Hugging Face dataset: {hf_name} (split='{split}')")
    ds = load_dataset(hf_name, split=split)

    # Apply row limit at the dataset level if requested
    if limit is not None:
        ds = ds.select(range(min(limit, len(ds))))
        print(f"[INFO] Limited to first {len(ds)} examples.")

    # Determine which key to use as the expected color
    example_keys = list(ds.features.keys())
    color_key = _pick_color_key(example_keys)

    if "image" not in example_keys:
        raise ValueError("Dataset must contain an 'image' column (PIL images).")

    # Separate metadata (non-image) into a DataFrame
    meta_ds = ds.remove_columns(["image"])
    meta_df = meta_ds.to_pandas().copy()

    # Ensure image directory exists
    os.makedirs(image_dir, exist_ok=True)

    detected_colors: List[Optional[str]] = []
    detected_confidences: List[Optional[float]] = []
    verdicts: List[Verdict] = []

    for idx, example in tqdm(
        enumerate(ds),
        total=len(ds),
        desc="Processing HF products",
    ):
        expected_color = str(example.get(color_key, "")).strip()
        image: Image.Image = example["image"]

        # Save image locally
        row_id = _get_row_identifier(example, idx)
        img_filename = f"{idx:05d}_{row_id}.jpg"
        img_path = os.path.join(image_dir, img_filename)
        try:
            image.save(img_path)
            if idx < 5:
                print(f"[DEBUG] Saved HF image for row {idx} -> {img_path}")
        except Exception as exc:  # noqa: BLE001
            if idx < 5:
                print(f"[DEBUG] Failed to save HF image for row {idx}: {exc}")

        # CLIP color detection
        clip_result = clip_detector.detect_color(image=image)
        detected_color = clip_result["detected_color"]
        detected_confidence = float(clip_result["detected_confidence"])

        # LangChain agent for verdict
        verdict: Verdict = color_agent.get_verdict(
            expected_color=expected_color,
            detected_color=detected_color,
        )

        detected_colors.append(detected_color)
        detected_confidences.append(detected_confidence)
        verdicts.append(verdict)

    meta_df["detected_color"] = detected_colors
    meta_df["detected_confidence"] = detected_confidences
    meta_df["Verdict"] = verdicts

    # Save final CSV
    meta_df.to_csv(output_csv, index=False)
    print(f"[INFO] Saved output with 'Verdict' column to: {output_csv}")
    print(f"[INFO] Images saved under: {os.path.abspath(image_dir)}")
