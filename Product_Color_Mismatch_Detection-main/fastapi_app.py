from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image
import io
import os
import re
from typing import Optional, List
import uvicorn
from dotenv import load_dotenv
import pandas as pd
load_dotenv()


from src.clip_color_detector import ClipColorDetector
from src.color_match_agent import ColorMatchAgent


app = FastAPI(title="Product Color Detection API")
IMAGE_DIR = "data/images"

# Allow frontend calls (Streamlit etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_CSV_PATH = "data/hf_products_with_verdict.csv"
COLOR_COLUMN_CANDIDATES = ["baseColour", "base_colour", "color", "colour"]
NAME_COLUMN_CANDIDATES = ["productDisplayName", "product_name", "name", "title"]


def sanitize_id(raw: str) -> str:
    """Sanitize ID for filename matching."""
    safe = re.sub(r"[^A-Za-z0-9_-]+", "_", str(raw))
    return safe or "unknown"


def get_image_path(product_id: str, index: Optional[int] = None) -> Optional[str]:
    """
    Find image path for a product ID.
    Looks for pattern: {index:05d}_{id}.{ext}
    """
    safe_id = sanitize_id(product_id)
    
    # Try exact match with index if provided
    if index is not None:
        expected_name = f"{index:05d}_{safe_id}.jpg"
        path = os.path.join(IMAGE_DIR, expected_name)
        if os.path.exists(path):
            return path
        
        # Try with different extensions
        for ext in [".jpg", ".jpeg", ".png"]:
            path = os.path.join(IMAGE_DIR, f"{index:05d}_{safe_id}{ext}")
            if os.path.exists(path):
                return path
        
        # Try prefix match
        prefix = f"{index:05d}_"
        if os.path.exists(IMAGE_DIR):
            for fname in os.listdir(IMAGE_DIR):
                if fname.startswith(prefix) and fname.lower().endswith((".jpg", ".jpeg", ".png")):
                    return os.path.join(IMAGE_DIR, fname)
    
    # Fallback: search by ID in filename
    if os.path.exists(IMAGE_DIR):
        for fname in os.listdir(IMAGE_DIR):
            if safe_id in fname and fname.lower().endswith((".jpg", ".jpeg", ".png")):
                return os.path.join(IMAGE_DIR, fname)
    
    return None

# Instantiate components (kept intact)
detector = ClipColorDetector(
    device="cpu",
    enable_gpt_fallback=True,
)

agent = ColorMatchAgent(
    openai_api_key=os.getenv("OPENAI_API_KEY"),
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/image/{product_id}")
def get_product_image(product_id: str, index: Optional[int] = Query(None)):
    """
    Serve product image by product ID.
    Optional query param: index (row index in CSV)
    """
    img_path = get_image_path(product_id, index)
    
    if img_path is None or not os.path.exists(img_path):
        raise HTTPException(
            status_code=404,
            detail=f"Image not found for product ID: {product_id}",
        )
    
    # Determine media type
    ext = os.path.splitext(img_path)[1].lower()
    media_type = "image/jpeg" if ext in [".jpg", ".jpeg"] else "image/png"
    
    return FileResponse(img_path, media_type=media_type)


@app.get("/dataset")
def get_dataset():
    """
    Browse the processed dataset used by the Streamlit app.

    Returns JSON with:
    - rows: list of product records
    - color_column: which column contains the catalog color
    - name_column: which column contains the product name (if any)
    """
    if not os.path.exists(OUTPUT_CSV_PATH):
        raise HTTPException(
            status_code=404,
            detail=f"Output CSV not found at: {OUTPUT_CSV_PATH}",
        )

    df = pd.read_csv(OUTPUT_CSV_PATH)

    if df.empty:
        raise HTTPException(
            status_code=400,
            detail="Dataset is empty. Run the pipeline first to generate the CSV.",
        )

    color_col = next(
        (c for c in COLOR_COLUMN_CANDIDATES if c in df.columns),
        None,
    )
    if color_col is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Could not find a color column. "
                "Expected one of: baseColour, base_colour, color, colour."
            ),
        )

    for col in ["detected_color", "detected_confidence", "Verdict"]:
        if col not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required column in CSV: '{col}'",
            )

    name_col = next(
        (c for c in NAME_COLUMN_CANDIDATES if c in df.columns),
        None,
    )

    # Convert NaN to None so JSON is clean
    records = df.where(pd.notnull(df), None).to_dict(orient="records")

    return {
        "rows": records,
        "color_column": color_col,
        "name_column": name_col,
    }


@app.post("/detect-color")
async def detect_color(
    file: UploadFile = File(...),
    top_k: int = Form(3),
    confidence_threshold: float = Form(0.25),
):
    img_bytes = await file.read()
    image = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    result = detector.detect_color(
        image=image,
        candidate_colors=None,
        top_k=top_k,
        confidence_threshold=confidence_threshold,
    )

    return result


@app.post("/match-color")
async def match_color(
    expected_color: str = Form(...),
    detected_color: str = Form(...),
):
    verdict = agent.get_verdict(expected_color, detected_color)
    return {
        "expected_color": expected_color,
        "detected_color": detected_color,
        "verdict": verdict,
    }


@app.post("/detect-and-match")
async def detect_and_match(
    file: UploadFile = File(...),
    expected_color: str = Form(...),
):
    img_bytes = await file.read()
    image = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    det = detector.detect_color(image=image)

    verdict = agent.get_verdict(
        expected_color=expected_color,
        detected_color=det["detected_color"],
    )

    return {
        "detection": det,
        "expected_color": expected_color,
        "verdict": verdict,
    }
if __name__ == "__main__":
    uvicorn.run(
        "fastapi_app:app",
        host="0.0.0.0",
        port=8020,
        reload=True
    )
