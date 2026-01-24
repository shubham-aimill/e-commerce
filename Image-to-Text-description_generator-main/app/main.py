from fastapi import FastAPI, UploadFile, File, HTTPException, Body, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import uuid
from typing import List

# Import your existing AI logic
from app.description_generator import generate_description
from app.config import SUPPORTED_LANGUAGES

# -------------------- App Setup --------------------
app = FastAPI(title="Image-to-Text Vision API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Preload MiniCPM model if it's the selected backend (improves first request speed)
@app.on_event("startup")
async def startup_event():
    """Preload models at startup to avoid first-request delay"""
    import os
    backend = os.environ.get("VISION_BACKEND", "gpt4o").lower()
    
    if backend == "minicpm":
        print("[Startup] Preloading MiniCPM-V model...")
        try:
            from app.vision_minicpm import load_backend
            load_backend()  # This will cache the model
            print("[Startup] MiniCPM-V model preloaded successfully!")
        except Exception as e:
            print(f"[Startup] Warning: Could not preload MiniCPM-V: {e}")
            print("[Startup] Model will be loaded on first request instead.")
    else:
        print(f"[Startup] Using {backend} backend (no preloading needed)")

# Ensure upload directory exists
UPLOAD_DIR = "temp"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/temp", StaticFiles(directory=UPLOAD_DIR), name="temp")

# -------------------- Endpoints --------------------

# 1️⃣ Get KPIs
@app.get("/image-to-text/kpis")
async def get_kpis():
    return {
        "kpis": [
            {"label": "Language Completeness", "value": "87%", "icon": "Languages", "change": 12},
            {"label": "Marketplace Readiness", "value": "94/100", "icon": "Target", "change": 5},
            {"label": "SEO Quality Score", "value": "91/100", "icon": "Zap", "change": 8},
            {"label": "Attribute Accuracy", "value": "96%", "icon": "CheckCircle", "change": 3},
            {"label": "Time Saved/Listing", "value": "4.2min", "icon": "Clock", "change": -22},
        ]
    }

# 2️⃣ Upload Image
@app.post("/image-to-text/upload")
async def upload_image(file: UploadFile = File(...), sku: str = None):
    if file.filename is None:
        raise HTTPException(status_code=400, detail="No file uploaded")

    # Generate unique ID
    file_id = f"img-{uuid.uuid4().hex[:8]}"
    extension = os.path.splitext(file.filename)[1].lower() or ".jpeg"
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}{extension}")

    # Max file size 10MB
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    with open(file_path, "wb") as f:
        f.write(contents)

    return {
        "success": True,
        "imageId": file_id,
        "url": f"http://localhost:8010/temp/{file_id}{extension}",
        "filename": file.filename,
        "sku": sku
    }

# 2.5️⃣ Generate Description (direct file upload - for Streamlit UI)
@app.post("/generate-description")
async def generate_description_endpoint(
    image: UploadFile = File(...),
    language: str = Form(None)
):
    """
    Direct endpoint for Streamlit UI - accepts file upload and language,
    returns generated description immediately.
    """
    if image.filename is None:
        raise HTTPException(status_code=400, detail="No file uploaded")

    # Default language to English if not provided
    if language is None:
        language = "en"
    
    if language not in SUPPORTED_LANGUAGES.values():
        raise HTTPException(status_code=400, detail=f"Unsupported language: {language}")

    # Save uploaded file temporarily
    file_id = f"temp-{uuid.uuid4().hex[:8]}"
    extension = os.path.splitext(image.filename)[1].lower() or ".jpeg"
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}{extension}")

    # Max file size 10MB
    contents = await image.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    with open(file_path, "wb") as f:
        f.write(contents)

    try:
        # Generate description (this may take 10-60 seconds depending on backend)
        ai_result = generate_description(file_path, language)
        
        return {
            "title": ai_result.get("title", ""),
            "short_description": ai_result.get("short_description", ""),
            "long_description": ai_result.get("long_description", ""),
            "bullet_points": ai_result.get("bullet_points", []),
            "attributes": ai_result.get("attributes", {})
        }
    except Exception as e:
        # Better error handling
        raise HTTPException(
            status_code=500,
            detail=f"Description generation failed: {str(e)}"
        )
    finally:
        # Clean up temporary file
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass  # Ignore cleanup errors

# 3️⃣ Generate Product Description
@app.post("/image-to-text/generate")
async def generate_product_text(payload: dict = Body(...)):
    image_id = payload.get("imageId")
    language = payload.get("language", "en")
    region = payload.get("region", "global")
    marketplace = payload.get("marketplace")
    sku = payload.get("sku")
    extension = payload.get("extension", ".jpeg")

    if language not in SUPPORTED_LANGUAGES.values():
        raise HTTPException(status_code=400, detail=f"Unsupported language: {language}")

    image_path = os.path.join(UPLOAD_DIR, f"{image_id}{extension}")
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Image not found")

    # Call your AI backend dynamically
    ai_result = generate_description(image_path, language)

    return {
        "success": True,
        "jobId": f"job-{uuid.uuid4().hex[:5]}",
        "title": ai_result.get("title"),
        "shortDescription": ai_result.get("short_description"),
        "bulletPoints": ai_result.get("bullet_points", []),
        "attributes": [
            {"name": k.capitalize(), "value": v, "confidence": 100}  # placeholder confidence
            for k, v in ai_result.get("attributes", {}).items()
        ]
    }

# 4️⃣ Get Translations
@app.get("/image-to-text/translations/{image_id}")
async def get_translations(image_id: str, language: str = None):
    # Find the image file in temp
    files = [f for f in os.listdir(UPLOAD_DIR) if f.startswith(image_id)]
    if not files:
        raise HTTPException(status_code=404, detail="Image not found")
    file_path = os.path.join(UPLOAD_DIR, files[0])

    translations = []
    for lang in SUPPORTED_LANGUAGES:
        if language and lang != language:
            continue
        result = generate_description(file_path, lang)
        status = "complete" if result else "pending"
        translations.append({
            "code": lang,
            "name": lang.capitalize(),
            "flag": "🇮🇳" if lang != "en" else "🇬🇧",
            "status": status,
            "title": result.get("title") if result else None,
            "description": result.get("short_description") if result else None,
            "bulletPoints": result.get("bullet_points") if result else None
        })

    return {"imageId": image_id, "translations": translations}

# 5️⃣ Get Localization Quality Check
@app.get("/image-to-text/quality-check/{image_id}")
async def get_quality_check(image_id: str):
    # Find the image file in temp
    files = [f for f in os.listdir(UPLOAD_DIR) if f.startswith(image_id)]
    if not files:
        raise HTTPException(status_code=404, detail="Image not found")
    file_path = os.path.join(UPLOAD_DIR, files[0])

    quality_checks = []
    for lang in SUPPORTED_LANGUAGES:
        result = generate_description(file_path, lang)
        if not result:
            continue
        # Simple dynamic checks example
        checks = {
            "grammar": True,
            "keywords": 90,  # placeholder score
            "cultural": 95,  # placeholder score
            "forbidden": False
        }
        quality_checks.append({
            "code": lang,
            "name": lang.capitalize(),
            "flag": "🇮🇳" if lang != "en" else "🇬🇧",
            "status": "complete",
            "checks": checks
        })

    return {"imageId": image_id, "qualityChecks": quality_checks}

# 6️⃣ Approve Translations
@app.post("/image-to-text/approve")
async def approve_translations(payload: dict = Body(...)):
    image_id = payload.get("imageId")
    languages: List[str] = payload.get("languages")  # optional

    if languages:
        approved_count = len(languages)
    else:
        approved_count = len(SUPPORTED_LANGUAGES)

    return {
        "success": True,
        "approved": approved_count,
        "message": "All translations approved successfully"
    }

# -------------------- Main --------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8010, reload=True)
