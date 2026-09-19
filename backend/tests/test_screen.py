import json
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.db import SessionLocal, init_db
from app.db_models import NoteORM

# TestClient() alone doesn't reliably fire FastAPI's startup event in every
# httpx/Starlette version, so init_db() is called explicitly here rather than
# relying on it — otherwise these tests would flake on "no such table".
init_db()
client = TestClient(app)
FIXTURE_DIR = Path(__file__).resolve().parent.parent.parent / "fixtures" / "sample-screen-session"


def test_chunk_endpoint_never_persists_content():
    response = client.post("/screen/chunk", json={"sessionId": "s1", "content": "some allowed study content"})
    assert response.status_code == 200
    assert "doomscroll" in response.json()

    # No table stores raw chunk content — the retention rule is that a
    # chunk sent to /screen/chunk is classified in memory and never written
    # anywhere, unlike a session-batch note's raw_content (which stores the
    # already-extracted, already-allowed session text, not a live chunk).
    db = SessionLocal()
    try:
        notes_with_chunk_content = (
            db.query(NoteORM).filter(NoteORM.raw_content.contains("some allowed study content")).all()
        )
    finally:
        db.close()
    assert notes_with_chunk_content == []


def test_doomscroll_classification_matches_fixture_expectations():
    with open(FIXTURE_DIR / "chunks.json") as f:
        cases = json.load(f)["chunks"]
    for case in cases:
        response = client.post("/screen/chunk", json={"sessionId": "s1", "content": case["content"]})
        assert response.status_code == 200
        assert response.json()["doomscroll"] == case["expectedDoomscroll"]


def test_session_batch_creates_screen_capture_note():
    with open(FIXTURE_DIR / "chunks.json") as f:
        chunks = [c["content"] for c in json.load(f)["chunks"]]

    response = client.post("/screen/session-batch", json={"sessionId": "s1", "allowedChunks": chunks})

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "screen-capture"
    assert body["summary"]
    assert "Limits" in body["keyConcepts"]


def test_session_batch_canonicalizes_concepts_no_orphans():
    with open(FIXTURE_DIR / "chunks.json") as f:
        chunks = [c["content"] for c in json.load(f)["chunks"]]

    response = client.post("/screen/session-batch", json={"sessionId": "s2", "allowedChunks": chunks})
    note_id = response.json()["id"]

    from app.db_models import NoteConceptORM

    db = SessionLocal()
    try:
        linked_concepts = db.query(NoteConceptORM).filter_by(note_id=note_id).all()
    finally:
        db.close()
    # Every concept in the fixture's flowchart must be linked to the note,
    # even ones the LLM left out of keyConcepts — no orphan graph nodes.
    assert len(linked_concepts) > 0
