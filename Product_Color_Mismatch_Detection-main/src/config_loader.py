from dataclasses import dataclass
from typing import Any, Dict

import os
import yaml


@dataclass
class Settings:
    """Configuration settings loaded from config.yml."""

    openai_api_key: str
    device: str = "cpu"


def load_settings(config_path: str = "config.yml") -> Settings:
    """
    Load settings from a YAML configuration file.

    Parameters
    ----------
    config_path : str
        Path to the YAML config file.

    Returns
    -------
    Settings
        Loaded settings object.
    """
    with open(config_path, "r", encoding="utf-8") as f:
        raw: Dict[str, Any] = yaml.safe_load(f)

    api_key = raw.get("openai_api_key", "")
    device = raw.get("device", "cpu")

    # Also set environment variable so LangChain/OpenAI can pick it up.
    if api_key:
        os.environ["OPENAI_API_KEY"] = api_key

    return Settings(openai_api_key=api_key, device=device)
