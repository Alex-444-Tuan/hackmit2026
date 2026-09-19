import json
import os
from pathlib import Path

FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent / "fixtures"

SUMMARIZE_SYSTEM_PROMPT = """You are a study-note summarizer. Return ONLY a JSON object with keys:
summary (string), keyConcepts (string array), questions (string array),
flowchart (array of {concept, leadsTo?, relatedTo?}).
If a concept matches one of the existing concepts listed below, reuse the exact existing name.
Only create a new name for a genuinely new concept."""


def use_fixture() -> bool:
    return os.environ.get("USE_FIXTURE", "1") == "1"


def summarize(raw_content: str, existing_concepts: list[str]) -> dict:
    if use_fixture():
        with open(FIXTURES_DIR / "fixture-summary-response.json") as f:
            return json.load(f)
    raise NotImplementedError("Live Groq call deferred: not needed by the screen-capture feature")


def connection_sentence(top_related_title: str) -> str:
    if use_fixture():
        return f"This builds on your previous note about {top_related_title}."
    raise NotImplementedError("Live Groq call deferred: not needed by the screen-capture feature")


# --- Screen-capture-only helpers (Gemini). Never called for the text-note
# path above; Groq stays the only vendor there. ---

_gemini_client = None


def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        from google import genai

        _gemini_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _gemini_client


def classify_doomscroll(chunk_content: str) -> bool:
    """Classifies one already-allowlisted chunk. Only ever called for chunks
    that passed screenWatcher.ts's fail-closed gate — a blocked chunk never
    reaches this function at all, per the privacy contract."""
    if use_fixture():
        with open(FIXTURES_DIR / "sample-screen-session" / "chunks.json") as f:
            cases = json.load(f)["chunks"]
        for case in cases:
            if case["content"] == chunk_content:
                return case["expectedDoomscroll"]
        return False
    client = _get_gemini_client()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=(
            "Is this screen activity a study session or unfocused/doomscrolling? "
            f"Answer only 'true' or 'false'.\n\n{chunk_content}"
        ),
    )
    return response.text.strip().lower().startswith("true")


def extract_session_content(allowed_chunks: list[str]) -> dict:
    """Post-session batch extraction (Path B). Reuses the same
    summary/keyConcepts/questions/flowchart shape as summarize() so the
    result feeds the existing canonicalization pipeline unchanged."""
    if use_fixture():
        with open(FIXTURES_DIR / "fixture-summary-response.json") as f:
            return json.load(f)
    client = _get_gemini_client()
    joined = "\n---\n".join(allowed_chunks)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=f"{SUMMARIZE_SYSTEM_PROMPT}\n\nScreen session content:\n{joined}",
    )
    return json.loads(response.text)
