from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import get_db
from app.db_models import NoteORM, ConceptORM
from app.models import CamelModel
from app import llm, concepts
from app.routes.notes import compute_related_note_ids, NoteResponse

router = APIRouter()


class ChunkRequest(CamelModel):
    session_id: str
    content: str


class ChunkResponse(CamelModel):
    doomscroll: bool


class SessionBatchRequest(CamelModel):
    session_id: str
    allowed_chunks: list[str]


@router.post("/screen/chunk", response_model=ChunkResponse, response_model_by_alias=True)
def classify_chunk(body: ChunkRequest):
    """Real-time path (Path A). Only ever called for a chunk that already
    passed screenWatcher.ts's fail-closed allowlist gate on the client — a
    blocked chunk is never captured, so it never reaches this endpoint.

    Retention: `body.content` is classified in memory and never written to a
    table, a file, or any other persisted artifact. It goes out of scope the
    moment this function returns — that is the "delete immediately on
    response" rule from docs/privacy/data-retention.md.
    """
    doomscroll = llm.classify_doomscroll(body.content)
    return ChunkResponse(doomscroll=doomscroll)


@router.post("/screen/session-batch", response_model=NoteResponse, response_model_by_alias=True)
def session_batch(body: SessionBatchRequest, db: Session = Depends(get_db)):
    """Post-session path (Path B). Runs once, after the session ends, only
    over chunks that were already allowed during the session. Reuses the
    same extraction -> canonicalization -> related-notes pipeline the text
    capture path uses, per docs/screen-capture-spec.md — no new pipeline.
    """
    existing_concepts = [c.name for c in db.query(ConceptORM).order_by(ConceptORM.id.desc()).limit(150)]
    result = llm.extract_session_content(body.allowed_chunks)

    note = NoteORM(
        title=result.get("summary", "Screen session")[:60],
        source="screen-capture",
        raw_content="\n---\n".join(body.allowed_chunks),
        summary=result["summary"],
        key_concepts=result["keyConcepts"],
        questions=result["questions"],
        flowchart=result["flowchart"],
    )
    db.add(note)
    db.flush()

    concepts.canonicalize_note_concepts(db, note.id, result["flowchart"])

    related_ids = compute_related_note_ids(db, note.id)
    note.related_note_ids = related_ids
    if related_ids:
        top_note = db.query(NoteORM).get(related_ids[0])
        note.connection_sentence = llm.connection_sentence(top_note.title)

    db.commit()
    db.refresh(note)
    return NoteResponse.from_orm_note(note)
