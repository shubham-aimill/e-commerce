import os
import io
import logging
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Your existing mapping logic
import mapping as mp

# ==================================================
# 1. INITIALIZATION & LOGGING
# ==================================================
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("VTO-Engine")

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    logger.error("GEMINI_API_KEY missing from environment.")
    raise RuntimeError("GEMINI_API_KEY not found.")

client = genai.Client(api_key=API_KEY)
app = FastAPI(title="Gemini 3 Virtual Try-On API")

# ==================================================
# CORS Configuration
# ==================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================================================
# 2. BUSINESS LOGIC (Refined)
# ==================================================
def find_garment_path(brand: str, gender: str, category: str, size: str):
    """Matches files like: assets/inventory/nike/male/tshirts/nike-m-tshirts-M.jpg"""
    base = f"assets/inventory/{brand.lower()}/{gender}/{category}"
    if not os.path.exists(base):
        logger.warning(f"Inventory path not found: {base}")
        return None

    for ext in [".jpg", ".jpeg", ".png"]:
        filename = f"{brand.lower()}-{gender[0]}-{category}-{size}{ext}"
        path = os.path.join(base, filename)
        if os.path.exists(path):
            return path
    return None

# ==================================================
# 3. CORE ENDPOINT
# ==================================================
@app.post("/generate-tryon")
async def generate_tryon(
    gender: str = Form(..., description="male or female"),
    category: str = Form(..., description="tshirts, pants, jackets, shoes"),
    current_brand: str = Form(...),
    current_size: str = Form(...),
    target_brand: str = Form(...),
    user_image: Optional[UploadFile] = File(None)
):
    logger.info(f"Received Request: {current_brand} {current_size} -> {target_brand} {category}")

    # --- 3.1: Identity Logic ---
    try:
        if user_image:
            img_bytes = await user_image.read()
            user_img = Image.open(io.BytesIO(img_bytes))
        else:
            # Replicating your 'assets/default_models' logic
            default_path = f"assets/default_models/model_{gender}.jpg"
            if not os.path.exists(default_path):
                raise FileNotFoundError(f"Default model missing at {default_path}")
            user_img = Image.open(default_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image Error: {str(e)}")

    # --- 3.2: Size Mapping Logic ---
    final_size = mp.get_mapped_size_by_category(
        category=category,
        gender=gender,
        from_brand=current_brand,
        from_size=current_size,
        to_brand=target_brand
    )

    if not final_size:
        logger.error("Size mapping failed.")
        return JSONResponse(
            status_code=400, 
            content={"error": "Size mapping not found", "confidence": "LOW"}
        )

    # --- 3.3: Inventory Resolution ---
    cloth_path = find_garment_path(target_brand, gender, category, final_size)
    if not cloth_path:
        logger.error(f"Garment missing: {target_brand} {category} {final_size}")
        raise HTTPException(status_code=404, detail="Garment not found in inventory.")

    # --- 3.4: Gemini 3 Execution ---
    try:
        cloth_img = Image.open(cloth_path)
        
        prompt = (
            f"Perform a realistic virtual try-on. Dress the person in the first image "
            f"with the {category} garment from the second image. "
            "Preserve body pose, lighting, shadows, fabric texture, and occlusions. "
            "If hands or arms overlap the garment, keep them visible."
        )

        response = client.models.generate_content(
            model="gemini-3-pro-image-preview",
            contents=[user_img, cloth_img, prompt],
            config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"])
        )

        # --- 3.5: Response Extraction ---
        if response.candidates:
            for part in response.candidates[0].content.parts:
                if part.inline_data:
                    logger.info("Generation Successful.")
                    # Add mapped size to response headers
                    headers = {"X-Mapped-Size": final_size}
                    return Response(
                        content=part.inline_data.data, 
                        media_type="image/png",
                        headers=headers
                    )

        raise ValueError("Gemini returned no image data.")

    except Exception as e:
        logger.error(f"Gemini API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Engine Error: {str(e)}")

# ==================================================
# 4. HEALTH CHECK (Ensures components are loaded)
# ==================================================
@app.get("/health")
def health_check():
    return {"status": "online", "model": "gemini-3-pro-image-preview"}