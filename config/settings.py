# ~/anitej-briefing/config/settings.py
import json
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


def _require(key: str) -> str:
    val = os.environ.get(key)
    if val is None:
        raise RuntimeError(
            f"Required environment variable '{key}' is not set. "
            "Copy .env.example to .env and fill in the value."
        )
    return val


DATA_REPO_PATH = Path(_require("DATA_REPO_PATH"))
GOOGLE_CREDENTIALS_PATH = Path(_require("GOOGLE_CREDENTIALS_PATH"))
GOOGLE_TOKEN_PATH = Path(_require("GOOGLE_TOKEN_PATH"))
USER_EMAIL = _require("USER_EMAIL")
GITHUB_DATA_REPO = os.environ.get("GITHUB_DATA_REPO", "anitejtripathy/anitej-briefing-data")


def _load_vip_config() -> dict:
    vip_path = DATA_REPO_PATH / "config" / "vip.json"
    try:
        with open(vip_path) as f:
            return json.load(f)
    except FileNotFoundError:
        raise FileNotFoundError(
            f"VIP config not found at {vip_path}. "
            "Ensure DATA_REPO_PATH points to a valid clone of anitej-briefing-data."
        ) from None


# VIP_CONFIG contains all raw config. notification_thresholds available for future use.
VIP_CONFIG = _load_vip_config()
VIP_EMAILS: set[str] = set(VIP_CONFIG["vip_senders"])
SLACK_ALIASES: list[str] = VIP_CONFIG["slack_aliases"]
