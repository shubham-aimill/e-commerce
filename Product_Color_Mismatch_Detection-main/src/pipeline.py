import ast
import os
import re
from io import BytesIO
from typing import List, Optional

import pandas as pd
import requests
from PIL import Image
from tqdm import tqdm
from requests.exceptions import Timeout, ConnectionError, RequestException

from .clip_color_detector import ClipColorDetector
from .color_match_agent import ColorMatchAgent, Verdict


# -------------------------------------------------
# Helpers
# -------------------------------------------------


def _parse_image_urls(images_cell) -> List[str]:
    """
    Parse ALL image URLs from the 'images' column.

    Expected format (ASOS):
    "['https://images.asos-media.com/...-4?$n_1920w$&wid=1926&fit=constrain',
      'https://images.asos-media.com/...-1-neutral?$n_1920w$&wid=1926&fit=constrain',
      ... ]"

    Returns
    -------
    list[str]
        List of cleaned URL strings.
    """
    if images_cell is None:
        return []

    if not isinstance(images_cell, str):
        images_cell = str(images_cell)

    images_cell = images_cell.strip()
    if not images_cell:
        return []

    # Main path: list literal -> ast.literal_eval
    if images_cell.startswith("[") and images_cell.endswith("]"):
        try:
            parsed = ast.literal_eval(images_cell)
            if isinstance(parsed, list):
                urls: List[str] = []
                for item in parsed:
                    if not item:
                        continue
                    u = str(item).strip().strip("\"'")
                    if u:
                        urls.append(u)
                return urls
        except (SyntaxError, ValueError, TypeError):
            # Fall back to regex
            pass

    # Fallback: regex scan for URLs in the string
    urls = re.findall(r"(https?://[^\s'\"|]+)", images_cell)
    return urls


def _load_image_from_url(
    url: str,
    debug: bool = False,
    idx: int = -1,
    img_idx: int = -1,
    timeout: int = 30,
    max_retries: int = 3,
) -> Optional[Image.Image]:
    """
    Load an image from a single HTTP/HTTPS URL using a browser-like User-Agent,
    with retries and a longer timeout.

    Parameters
    ----------
    url : str
        Image URL.
    debug : bool
        Whether to print debug info (first few rows only).
    idx : int
        Dataset row index (for logging).
    img_idx : int
        Image index within that row (for logging).
    timeout : int
        Request timeout in seconds.
    max_retries : int
        How many times to retry on timeouts / connection errors.

    Returns
    -------
    PIL.Image.Image or None
        Loaded image (RGB) or None if all attempts fail.
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0 Safari/537.36"
        ),
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    last_error: Optional[Exception] = None

    for attempt in range(1, max_retries + 1):
        try:
            if debug and idx < 5:
                print(
                    f"[DEBUG] Row {idx} img {img_idx} try {attempt}/{max_retries} "
                    f"-> {url[:100]}..."
                )

            resp = requests.get(url, headers=headers, timeout=timeout)
            if debug and idx < 5:
                print(
                    f"[DEBUG] Row {idx} img {img_idx} HTTP {resp.status_code} "
                    f"(attempt {attempt})"
                )

            resp.raise_for_status()
            img = Image.open(BytesIO(resp.content))
            return img.convert("RGB")

        except (Timeout, ConnectionError) as exc:
            last_error = exc
            if debug and idx < 5:
                print(
                    f"[DEBUG] Row {idx} img {img_idx} timeout/conn error on attempt "
                    f"{attempt}: {exc}"
                )
            # retry (unless final attempt)
            continue

        except RequestException as exc:
            last_error = exc
            if debug and idx < 5:
                print(
                    f"[DEBUG] Row {idx} img {img_idx} HTTP error on attempt "
                    f"{attempt}: {exc}"
                )
            # HTTP error like 4xx / 5xx – no point retrying
            break

        except Exception as exc:  # noqa: BLE001
            last_error = exc
            if debug and idx < 5:
                print(
                    f"[DEBUG] Row {idx} img {img_idx} unknown error on attempt "
                    f"{attempt}: {exc}"
                )
            break

    if debug and idx < 5:
        print(
            f"[DEBUG] Row {idx} img {img_idx} failed after {max_retries} attempts: "
            f"{last_error}"
        )
    return None


def _pick_color_column(df: pd.DataFrame) -> str:
    """
    Choose the most appropriate color column from the dataframe.

    Handles common ASOS-style schemas:
    - 'color'
    - 'colour'
    - 'base_colour'
    """
    for col in ["color", "colour", "base_colour"]:
        if col in df.columns:
            print(f"[INFO] Using '{col}' as expected color column.")
            return col
    raise ValueError(
        "Input CSV must contain one of these color columns: "
        "'color', 'colour', or 'base_colour'."
    )


def _get_row_identifier(row: pd.Series, idx: int) -> str:
    """
    Build a safe identifier for saving images and debugging.

    Tries typical ID/code columns and falls back to row index.
    """
    for key in ["id", "product_id", "product_code", "productCode", "sku"]:
        if key in row.index and pd.notna(row[key]):
            raw = str(row[key])
            break
    else:
        raw = str(idx)

    safe = re.sub(r"[^A-Za-z0-9_-]+", "_", raw)
    return safe or str(idx)


# -------------------------------------------------
# Main pipeline
# -------------------------------------------------


def process_dataset(
    input_csv: str,
    output_csv: str,
    clip_detector: ClipColorDetector,
    color_agent: ColorMatchAgent,
    limit: Optional[int] = None,
    image_dir: str = "data/images",
) -> None:
    """
    Process the dataset to detect colors and create a Match/Mismatch verdict.

    For each product row:
    - Parse ALL image URLs from the 'images' column.
    - Download & save each image under `image_dir`.
    - Use the FIRST successfully loaded image for CLIP color detection.
    - Use LangChain agent to decide Match/Mismatch vs catalog color.

    Parameters
    ----------
    input_csv : str
        Path to input CSV.
    output_csv : str
        Path to output CSV.
    clip_detector : ClipColorDetector
        Initialized CLIP color detector.
    color_agent : ColorMatchAgent
        LangChain agent to decide Match/Mismatch.
    limit : int, optional
        Optional limit on number of rows to process.
    image_dir : str
        Directory where images will be saved.
    """
    df = pd.read_csv(input_csv)

    if limit is not None:
        df = df.head(limit).copy()
    else:
        df = df.copy()

    # Pick expected color column flexibly
    color_col = _pick_color_column(df)

    # Ensure images column exists
    if "images" not in df.columns:
        raise ValueError("Input CSV must contain an 'images' column.")

    # Ensure image directory exists
    os.makedirs(image_dir, exist_ok=True)

    detected_colors: List[Optional[str]] = []
    detected_confidences: List[Optional[float]] = []
    verdicts: List[Verdict] = []

    for idx, row in tqdm(df.iterrows(), total=len(df), desc="Processing products"):
        expected_color = str(row.get(color_col, "")).strip()

        raw_images_cell = row.get("images")
        urls = _parse_image_urls(raw_images_cell)

        if idx < 5:
            print(f"[DEBUG] Row {idx} raw images cell: {raw_images_cell!r}")
            print(f"[DEBUG] Row {idx} parsed URLs ({len(urls)}):")
            for j, u in enumerate(urls[:5]):
                print(f"    [{j}] {u}")

        if not urls:
            detected_colors.append(None)
            detected_confidences.append(None)
            verdicts.append("Mismatch")
            continue

        # Download and save all images for this row,
        # but only use the first successfully loaded image for CLIP
        first_image: Optional[Image.Image] = None
        row_id = _get_row_identifier(row, idx)

        for j, url in enumerate(urls):
            img = _load_image_from_url(url, debug=True, idx=idx, img_idx=j)
            if img is None:
                continue

            # Save image
            img_filename = f"{idx:05d}_{row_id}_img{j}.jpg"
            img_path = os.path.join(image_dir, img_filename)
            try:
                img.save(img_path)
                if idx < 5:
                    print(f"[DEBUG] Saved image row {idx} img {j} -> {img_path}")
            except Exception as exc:  # noqa: BLE001
                if idx < 5:
                    print(f"[DEBUG] Failed to save image row {idx} img {j}: {exc}")

            # Use first successful image for CLIP
            if first_image is None:
                first_image = img

        if first_image is None:
            # All downloads failed
            detected_colors.append(None)
            detected_confidences.append(None)
            verdicts.append("Mismatch")
            continue

        # CLIP color detection using first successful image
        clip_result = clip_detector.detect_color(image=first_image)
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

    df["detected_color"] = detected_colors
    df["detected_confidence"] = detected_confidences
    df["Verdict"] = verdicts

    df.to_csv(output_csv, index=False)
    print(f"Saved output with 'Verdict' column to: {output_csv}")
    print(f"Images saved under: {os.path.abspath(image_dir)}")
