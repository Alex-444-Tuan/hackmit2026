import json
import os
from pathlib import Path

FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent / "fixtures"


def use_fixture() -> bool:
    return os.environ.get("USE_FIXTURE", "1") == "1"


def summarize(raw_content: str, existing_concepts: list[str]) -> dict:
    if use_fixture():
        with open(FIXTURES_DIR / "fixture-summary-response.json") as f:
            return json.load(f)
    raise NotImplementedError("Live Groq call added in Task 5")
