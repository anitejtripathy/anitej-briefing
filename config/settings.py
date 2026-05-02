import json
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

DATA_REPO_PATH = Path(os.environ["DATA_REPO_PATH"])
GOOGLE_CREDENTIALS_PATH = Path(os.environ["GOOGLE_CREDENTIALS_PATH"])
GOOGLE_TOKEN_PATH = Path(os.environ["GOOGLE_TOKEN_PATH"])
USER_EMAIL = os.environ["USER_EMAIL"]
GITHUB_DATA_REPO = os.environ.get("GITHUB_DATA_REPO", "anitejtripathy/anitej-briefing-data")


def load_vip_config() -> dict:
    vip_path = DATA_REPO_PATH / "config" / "vip.json"
    with open(vip_path) as f:
        return json.load(f)


VIP_CONFIG = load_vip_config()
VIP_EMAILS: set[str] = set(VIP_CONFIG["vip_senders"])
SLACK_ALIASES: list[str] = VIP_CONFIG["slack_aliases"]
