import base64
import os
import json
from PIL import Image
from io import BytesIO
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


def _encode_image_b64_uri(image_path: str, max_size: int = 1024) -> str:
    """
    Encode image to base64, with optional resizing for large images.
    Resizing speeds up processing significantly for high-resolution images.
    """
    img = Image.open(image_path).convert("RGB")
    
    # Resize if image is too large (reduces encoding time and API payload size)
    if max(img.width, img.height) > max_size:
        img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    
    # Convert to JPEG bytes
    buffer = BytesIO()
    img.save(buffer, format="JPEG", quality=85, optimize=True)
    img_bytes = buffer.getvalue()
    
    # Encode to base64
    b64 = base64.b64encode(img_bytes).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"


def describe_image_json_gpt4o(image_path: str, language: str):
    """
    GPT-4o Vision backend — cloud model
    Full JSON guaranteed using response_format=json_object
    """

    image_data_url = _encode_image_b64_uri(image_path)

    response = client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a product content generation system. "
                    "You MUST return ONLY valid JSON."
                ),
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            f"Generate structured product content in {language} "
                            "for the image. Use only visible evidence. "
                            "Return exactly this JSON structure:\n"
                            "{\n"
                            '  \"title\": string,\n'
                            '  \"short_description\": string,\n'
                            '  \"long_description\": string,\n'
                            '  \"bullet_points\": [string],\n'
                            '  \"attributes\": {\n'
                            '    \"color\": string,\n'
                            '    \"material\": string,\n'
                            '    \"pattern\": string,\n'
                            '    \"category\": string,\n'
                            '    \"gender\": string\n'
                            "  }\n"
                            "}"
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": image_data_url},
                    },
                ],
            },
        ],
        max_tokens=700,
    )

    return json.loads(response.choices[0].message.content)
