import argparse

from src.config_loader import load_settings
from src.clip_color_detector import ClipColorDetector
from src.color_match_agent import ColorMatchAgent
from src.hf_pipeline import process_hf_dataset


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Product Color Mismatch Identification using CLIP and LangChain on HF dataset."
    )
    parser.add_argument(
        "--output-csv",
        type=str,
        required=True,
        help="Path to output CSV with detected colors and verdict.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional: maximum number of HF rows to process (for quick tests).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    settings = load_settings("config.yml")

    clip_detector = ClipColorDetector(device=settings.device)
    color_agent = ColorMatchAgent(openai_api_key=settings.openai_api_key)

    process_hf_dataset(
        output_csv=args.output_csv,
        clip_detector=clip_detector,
        color_agent=color_agent,
        limit=args.limit,
        image_dir="data/images",
    )


if __name__ == "__main__":
    main()
