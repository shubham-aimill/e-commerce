from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import os
from typing import Optional, List
import uvicorn
from dotenv import load_dotenv
load_dotenv()


from src.clip_color_detector import ClipColorDetector
from src.color_match_agent import ColorMatchAgent


app = FastAPI(title="Product Color Detection API")

# Allow frontend calls (Streamlit etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
