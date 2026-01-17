import os
import io
import logging
import base64
import time
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from dotenv import load_dotenv
from google import genai
from google.genai import types
import mapping as mp

# ==================================================
# 1. INITIALIZATION & LOGGING
# ==================================================
load_dotenv()

# Configure Global Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()] # Ensures logs print to terminal
)
logger = logging.getLogger("VTO-Backend")

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    logger.critical("GEMINI_API_KEY is missing from environment variables!")
    raise RuntimeError("GEMINI_API_KEY not found.")

logger.info("Initializing Gemini Client...")
client = genai.Client(api_key=API_KEY)
app = FastAPI(title="Gemini 3 Virtual Try-On API")

# Configure CORS to allow frontend requests
# For production, you may want to restrict allow_origins to specific domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development and Render deployment
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("FastAPI Backend Started Successfully.")

def encode_image_to_base64(image_path):
    if not os.path.exists(image_path):
        logger.warning(f"Image not found for encoding: {image_path}")
        return None
    try:
        with open(image_path, "rb") as img_file:
            return base64.b64encode(img_file.read()).decode('utf-8')
    except Exception as e:
        logger.error(f"Failed to encode image {image_path}: {e}")
        return None

# ==================================================
# 2. ENDPOINT: GET OPTIONS
# ==================================================
@app.post("/get-garment-options")
async def get_garment_options(
    gender: str = Form(...),
    category: str = Form(...),
    current_brand: str = Form(...),
    current_size: str = Form(...),
    target_brand: str = Form(...)
):
    logger.info(f"Request: Get Options | {gender} | {category} | {current_brand} {current_size} -> {target_brand}")

    # 1. Get Mapped Size
    final_size = mp.get_mapped_size_by_category(
        category=category,
        gender=gender,
        from_brand=current_brand,
        from_size=current_size,
        to_brand=target_brand
    )

    if not final_size:
        logger.error("Mapping failed: Size returned None")
        return JSONResponse(status_code=400, content={"error": "Size mapping not found"})

    logger.info(f"Mapped Size: {final_size}")

    # 2. Build Directory Path
    base_dir = f"assets/inventory/{target_brand.lower()}/{gender}/{category}"
    if not os.path.exists(base_dir):
        logger.error(f"Inventory Directory Missing: {base_dir}")
        return JSONResponse(status_code=404, content={"error": f"Inventory folder missing for {target_brand}"})

    # 3. Find SKUs
    found_garments = []
    gender_code = gender[0] 

    for index in [1, 2, 3]:
        sku_found = False
        for ext in [".jpeg", ".jpg", ".png"]:
            filename = f"{target_brand.lower()}-{gender_code}-{category}-{final_size}-{index}{ext}"
            full_path = os.path.join(base_dir, filename)

            if os.path.exists(full_path):
                found_garments.append({
                    "sku_index": index,
                    "path": full_path,
                    "filename": filename,
                    "image_base64": encode_image_to_base64(full_path)
                })
                sku_found = True
                logger.debug(f"Found SKU: {filename}")
                break 
        
        if not sku_found:
             logger.debug(f"SKU {index} not found for pattern {filename}")

    if not found_garments:
        logger.warning(f"No garments found in {base_dir} for size {final_size}")
        return JSONResponse(status_code=404, content={"error": f"No garments found for size {final_size}"})

    logger.info(f"Returning {len(found_garments)} garment options.")
    return {
        "status": "success",
        "mapped_size": final_size,
        "garments": found_garments
    }

# ==================================================
# 2.5. ENDPOINT: GET SUPPORTED SIZES (New - for dynamic dropdown)
# ==================================================
@app.get("/get-supported-sizes")
async def get_supported_sizes(
    category: str,
    gender: str,
    brand: str
):
    """Returns valid sizes for the dropdown based on category, gender, and brand."""
    logger.info(f"Request: Get Supported Sizes | {category} | {gender} | {brand}")
    
    try:
        sizes = mp.get_supported_sizes(category, gender, brand)
        logger.info(f"Returning {len(sizes)} supported sizes: {sizes}")
        return {
            "status": "success",
            "sizes": sizes
        }
    except KeyError as e:
        logger.warning(f"Invalid parameters for size lookup: {e}")
        return JSONResponse(
            status_code=400,
            content={"error": f"Invalid category/gender/brand combination: {str(e)}"}
        )

# ==================================================
# 3. ENDPOINT: GENERATE TRY-ON
# ==================================================
@app.post("/generate-tryon")
async def generate_tryon(
    garment_path: str = Form(...),
    gender: str = Form(...),
    category: str = Form(...),
    user_image: Optional[UploadFile] = File(None)
):
    logger.info("Request: Generate Try-On Started.")
    logger.info(f"Selected Garment: {garment_path}")

    # --- Load User Image ---
    try:
        if user_image:
            logger.info(f"Using uploaded user image: {user_image.filename}")
            img_bytes = await user_image.read()
            user_img = Image.open(io.BytesIO(img_bytes))
        else:
            default_path = f"assets/default_models/model_{gender}.jpg"
            logger.info(f"Using default model image: {default_path}")
            if not os.path.exists(default_path):
                logger.error("Default model file is missing!")
                raise FileNotFoundError(f"Default model missing at {default_path}")
            user_img = Image.open(default_path)
    except Exception as e:
        logger.error(f"Error loading user image: {e}")
        raise HTTPException(status_code=400, detail=f"User Image Error: {str(e)}")

    # --- Load Garment Image ---
    if not os.path.exists(garment_path):
        logger.error(f"Garment file not found: {garment_path}")
        raise HTTPException(status_code=404, detail="Selected garment file missing")
    cloth_img = Image.open(garment_path)

    # --- Gemini Generation (Retry Logic) ---
    prompt = (
        f"Perform a realistic virtual try-on. "
        f"Dress the person in the first image with the {category} garment from the second image. "
        "Maintain pose, lighting, and background exactly."
    )

    max_retries = 3
    for attempt in range(max_retries):
        try:
            logger.info(f"Calling Gemini API (Attempt {attempt + 1}/{max_retries})...")
            
            response = client.models.generate_content(
                model="gemini-3-pro-image-preview",
                contents=[user_img, cloth_img, prompt],
                config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"])
            )

            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if part.inline_data:
                        logger.info("Gemini Generation Successful.")
                        return Response(content=part.inline_data.data, media_type="image/png")
            
            logger.warning("Gemini returned response but no inline image data.")
            raise ValueError("No image data in Gemini response.")

        except Exception as e:
            error_str = str(e)
            if "503" in error_str or "overloaded" in error_str.lower() or "500" in error_str:
                wait_time = (attempt + 1) * 3
                logger.warning(f"Gemini Server Busy (503/500). Waiting {wait_time}s...")
                time.sleep(wait_time)
            else:
                logger.error(f"Non-retriable Gemini Error: {error_str}")
                raise HTTPException(status_code=500, detail=f"AI Engine Error: {error_str}")

    logger.critical("All retry attempts failed.")
    raise HTTPException(status_code=503, detail="Server is currently overloaded. Please wait 1 minute and try again.")
