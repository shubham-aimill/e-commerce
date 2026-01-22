import os

# Base URL for serving images (Backend is at localhost:8000)
BASE_ASSET_URL = "http://localhost:8000/static/templates"

# Path to the physical assets folder (for checking file extensions)
CURRENT_FILE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(os.path.dirname(CURRENT_FILE_DIR), "assets", "templates")

def get_smart_image_url(image_id):
    """
    Checks if the image exists as .jpg or .jpeg and returns the correct URL.
    This fixes the issue of mixed file extensions.
    """
    # 1. Check for .jpg
    if os.path.exists(os.path.join(TEMPLATE_DIR, f"{image_id}.jpg")):
        return f"{BASE_ASSET_URL}/{image_id}.jpg"
    
    # 2. Check for .jpeg
    if os.path.exists(os.path.join(TEMPLATE_DIR, f"{image_id}.jpeg")):
        return f"{BASE_ASSET_URL}/{image_id}.jpeg"
    
    # 3. Fallback (Return .jpg even if missing, so frontend shows 404 error)
    return f"{BASE_ASSET_URL}/{image_id}.jpg"

def get_template_database():
    """
    Returns the structured dictionary of all photoshoot templates.
    """
    return {
        "Indian": [
            {
                "id": "in_saree", 
                "name": "Saree Elegance", 
                "uses": "4.5k", 
                "img": get_smart_image_url("in_saree"), 
                "prompt": "Full body fashion shot of an Indian female model wearing the input saree. Traditional drape, hand on hip, warm studio lighting, elegant pose."
            },
            {
                "id": "in_kurta", 
                "name": "Kurta Classic", 
                "uses": "3.8k", 
                "img": get_smart_image_url("in_kurta"), 
                "prompt": "E-commerce photography of an Indian model wearing the input kurta. Standing straight, neutral expression, clean grey background, sharp focus."
            },
            {
                "id": "in_fest", 
                "name": "Festival Vibes", 
                "uses": "2.8k", 
                "img": get_smart_image_url("in_fest"), 
                "prompt": "Festive Diwali photoshoot. Indian model wearing the input cloth. Background with blurred marigold flowers and warm diya lights. Happy celebration vibe."
            },
            {
                "id": "in_fusion", 
                "name": "Ethnic Fusion", 
                "uses": "2.1k", 
                "img": get_smart_image_url("in_fusion"), 
                "prompt": "Trendy Indo-western fashion shot. Young Indian model wearing the input cloth in a modern Mumbai cafe setting. Natural daylight, chic pose."
            }
        ],
        "South African": [
            {
                "id": "sa_ubuntu", 
                "name": "Ubuntu Spirit", 
                "uses": "1.9k", 
                "img": get_smart_image_url("sa_ubuntu"), 
                "prompt": "Outdoor lifestyle shot. South African model with natural hair wearing the input cloth. Sunny day, blue sky, urban nature background."
            },
            {
                "id": "sa_safari", 
                "name": "Safari Chic", 
                "uses": "1.5k", 
                "img": get_smart_image_url("sa_safari"), 
                "prompt": "Golden hour photography. South African model wearing the input cloth. Background implying a nature reserve or lodge. Warm earth tones."
            },
            {
                "id": "sa_modern", 
                "name": "Modern Afro", 
                "uses": "1.2k", 
                "img": get_smart_image_url("sa_modern"), 
                "prompt": "High fashion studio portrait. Black model wearing the input cloth. Bold colorful geometric background. Editorial lighting."
            },
            {
                "id": "sa_cape", 
                "name": "Cape Town Cool", 
                "uses": "900", 
                "img": get_smart_image_url("sa_cape"), 
                "prompt": "Street style photography in Cape Town. Model leaning against a textured colorful wall. Wearing the input cloth. Cool, modern aesthetic."
            }
        ],
        "Global": [
            {
                "id": "gl_studio", 
                "name": "Studio Pro", 
                "uses": "8.9k", 
                "img": get_smart_image_url("gl_studio"), 
                "prompt": "Standard Amazon e-commerce shot. Professional model wearing the input cloth. Pure white background (RGB 255,255,255). Front facing, neutral pose."
            },
            {
                "id": "gl_urban", 
                "name": "Urban Edge", 
                "uses": "6.7k", 
                "img": get_smart_image_url("gl_urban"), 
                "prompt": "Urban streetwear style. Model walking on a blurred city street (New York/London). Wearing the input cloth. Overcast soft lighting."
            },
            {
                "id": "gl_min", 
                "name": "Minimalist", 
                "uses": "5.4k", 
                "img": get_smart_image_url("gl_min"), 
                "prompt": "Minimalist aesthetic. Model wearing the input cloth against a soft pastel beige wall. Soft shadows, artistic composition."
            },
            {
                "id": "gl_high", 
                "name": "High Fashion", 
                "uses": "4.1k", 
                "img": get_smart_image_url("gl_high"), 
                "prompt": "Vogue magazine style. Dramatic side lighting. Model wearing the input cloth with an angular, confident pose. Moody dark background."
            }
        ]
    }