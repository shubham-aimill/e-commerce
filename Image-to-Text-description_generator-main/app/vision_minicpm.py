import json
import torch
from PIL import Image
from transformers import AutoModel, AutoTokenizer

print(">>> USING vision_minicpm.py FROM:", __file__)

MODEL_ID = "openbmb/MiniCPM-V-2_6"

# Global model cache - loaded once and reused
_model_cache = None
_tokenizer_cache = None
_device = None


def _select_device():
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def load_backend():
    """
    Load model once and cache it for reuse.
    This is a HUGE performance improvement - model loading takes 10-30 seconds!
    """
    global _model_cache, _tokenizer_cache, _device
    
    if _model_cache is not None and _tokenizer_cache is not None:
        # Model already loaded, reuse it
        return _model_cache, _tokenizer_cache
    
    # First time loading
    if _device is None:
        _device = _select_device()
        print(f"[MiniCPM] Selected device: {_device}")
    
    print(f"[MiniCPM] Loading model (this happens once, takes ~10-30 seconds)...")
    
    _tokenizer_cache = AutoTokenizer.from_pretrained(
        MODEL_ID,
        trust_remote_code=True
    )

    _model_cache = AutoModel.from_pretrained(
        MODEL_ID,
        trust_remote_code=True,
        torch_dtype=torch.float16 if _device.type != "cpu" else torch.float32
    ).to(_device).eval()

    print(f"[MiniCPM] Model loaded and cached on {_device}")

    return _model_cache, _tokenizer_cache


def describe_image_json_minicpm(image_path: str, language: str):
    """
    Generate description using cached model (much faster after first load)
    """
    model, tokenizer = load_backend()

    # ---- load image ----
    image = Image.open(image_path).convert("RGB")

    # ---- instruction ----
    prompt = f"""
Look at the image and output ONLY valid JSON in {language}.

JSON schema:
{{
 "title": string,
 "short_description": string,
 "long_description": string,
 "bullet_points": [string],
 "attributes": {{
   "color": string,
   "material": string,
   "pattern": string,
   "category": string,
   "gender": string
 }}
}}

Rules:
- Only describe visible information
- No brand hallucination
- No extra text, ONLY JSON
"""

    # -------- MiniCPM expected format --------
    msgs = [
        {
            "role": "user",
            "content": prompt
        }
    ]

    # ---- NOTE: image must be passed as separate argument ----
    with torch.no_grad():
        output = model.chat(
            image=image,
            msgs=msgs,
            tokenizer=tokenizer,
            device=_device,
            max_new_tokens=600,
            do_sample=False
        )

    # ---- JSON extraction ----
    start = output.find("{")
    end = output.rfind("}")

    if start == -1 or end == -1:
        raise ValueError("MiniCPM did not return JSON:\n" + output)

    json_text = output[start:end+1]

    return json.loads(json_text)
