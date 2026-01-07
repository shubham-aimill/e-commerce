from typing import Dict, List, Optional, Tuple
import os
import io
import base64

import torch
from PIL import Image
from transformers import CLIPModel, CLIPProcessor

from .color_palette import COLOR_CANDIDATES

from dotenv import load_dotenv
load_dotenv()


# GPT Vision
from langchain_openai import ChatOpenAI


class ClipColorDetector:
    """
    Detects dominant color of an image using CLIP with optional GPT fallback.
    """

    def __init__(
        self,
        device: str = "cpu",
        enable_gpt_fallback: bool = True,
        gpt_model_name: str = "gpt-4o-mini",
        openai_api_key: Optional[str] = None,
    ) -> None:
        """
        Initialize CLIP model and optional GPT fallback.
        """

        # -------- CLIP --------
        self.device = device
        self.model = CLIPModel.from_pretrained("openai/clip-vit-large-patch14")
        self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-large-patch14")

        self.model.to(self.device)
        self.model.eval()

        # -------- GPT fallback --------
        self.enable_gpt_fallback = enable_gpt_fallback

        if openai_api_key is None:
            openai_api_key = os.getenv("OPENAI_API_KEY")

        self.llm = None
        if self.enable_gpt_fallback:
            self.llm = ChatOpenAI(
                model=gpt_model_name,
                api_key=openai_api_key,
            )

    # -------------------------------------------------------------------------
    # GPT fallback
    # -------------------------------------------------------------------------
    def _detect_with_gpt(
        self,
        image: Image.Image,
        candidate_colors: List[str],
    ) -> Dict[str, object]:
        """
        Fallback color detection using GPT Vision model with guaranteed JSON output.
        """

        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        b64_image = base64.b64encode(buffered.getvalue()).decode("utf-8")

        prompt = f"""
        You are a product color classifier.

        You MUST respond ONLY with valid JSON and NOTHING else.

        Select the single closest color name from this list:
        {candidate_colors}

        JSON schema to follow exactly:

        {{
            "detected_color": "<one_of_candidate_list>",
            "reason": "<short explanation>"
        }}
        """

        msg = [
            (
                "user",
                [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{b64_image}"},
                    },
                ],
            )
        ]

        raw = self.llm.invoke(msg).content.strip()

        # ---- Robust JSON parse ----
        import json

        try:
            parsed = json.loads(raw)
        except Exception:
            # last resort: extract color heuristically
            detected = None
            for c in candidate_colors:
                if c.lower() in raw.lower():
                    detected = c
                    break

            return {
                "detected_color": detected or "unknown",
                "detected_confidence": None,
                "top_candidates": [],
                "fallback_model": "gpt",
                "raw_model_output": raw,
            }

        detected_color = parsed.get("detected_color")

        if detected_color not in candidate_colors:
            # enforce candidate restriction
            for c in candidate_colors:
                if c.lower() == str(detected_color).lower():
                    detected_color = c
                    break

        return {
            "detected_color": detected_color,
            "detected_confidence": None,
            "top_candidates": [(detected_color, None)],
            "fallback_model": "gpt",
            "reason": parsed.get("reason", None),
        }


    # -------------------------------------------------------------------------
    # Primary CLIP detection
    # -------------------------------------------------------------------------
    def detect_color(
        self,
        image: Image.Image,
        candidate_colors: Optional[List[str]] = None,
        top_k: int = 3,
        confidence_threshold: float = 0.25,
        use_fallback_on_failure: bool = True,
    ) -> Dict[str, object]:
        """
        Detect color using CLIP; optionally fallback to GPT.
        """

        if candidate_colors is None:
            candidate_colors = COLOR_CANDIDATES

        text_prompts = [
            f"a product in {color_name} color" for color_name in candidate_colors
        ]

        try:
            inputs = self.processor(
                text=text_prompts,
                images=image,
                return_tensors="pt",
                padding=True,
            )

            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            with torch.no_grad():
                outputs = self.model(**inputs)
                logits_per_image = outputs.logits_per_image
                probs = logits_per_image.softmax(dim=1)[0]

            # Get top-k indices
            top_k = min(top_k, len(candidate_colors))
            top_prob_values, top_indices = torch.topk(probs, k=top_k)

            top_candidates: List[Tuple[str, float]] = [
                (candidate_colors[int(idx)], float(prob))
                for idx, prob in zip(top_indices, top_prob_values)
            ]

            detected_color, detected_confidence = top_candidates[0]

            # low-confidence fallback trigger
            if (
                self.enable_gpt_fallback
                and use_fallback_on_failure
                and detected_confidence < confidence_threshold
            ):
                return self._detect_with_gpt(image, candidate_colors)

            return {
                "detected_color": detected_color,
                "detected_confidence": detected_confidence,
                "top_candidates": top_candidates,
                "fallback_model": "clip",
            }

        except Exception:
            # CLIP failed → soft fallback
            if self.enable_gpt_fallback and use_fallback_on_failure:
                return self._detect_with_gpt(image, candidate_colors)
            raise
