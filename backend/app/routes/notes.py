from fastapi import APIRouter
from sqlalchemy import func
from app.db_models import NoteORM, NoteConceptORM
from app.models import CamelModel

router = APIRouter()


class NoteResponse(CamelModel):
    id: str
    title: str
    source: str
    source_url: str | None
    raw_content: str
    summary: str
    key_concepts: list[str]
    questions: list[str]
    flowchart: list[dict]
    related_note_ids: list[str]
    connection_sentence: str | None
    created_at: str

    @staticmethod
    def from_orm_note(note: NoteORM) -> "NoteResponse":
        return NoteResponse(
            id=note.id,
            title=note.title,
            source=note.source,
            source_url=note.source_url,
            raw_content=note.raw_content,
            summary=note.summary,
            key_concepts=note.key_concepts,
            questions=note.questions,
            flowchart=note.flowchart,
            related_note_ids=note.related_note_ids,
            connection_sentence=note.connection_sentence,
            created_at=note.created_at.isoformat(),
        )


def compute_related_note_ids(db, note_id: str, limit: int = 3) -> list[str]:
    """Other notes sharing the most note_concepts rows, ties broken by most
    recent. Reused by backend/app/screen.py's session-batch endpoint so a
    screen-capture note gets "this builds on..." just like a text note."""
    my_concept_ids = [nc.concept_id for nc in db.query(NoteConceptORM).filter_by(note_id=note_id).all()]
    if not my_concept_ids:
        return []
    rows = (
        db.query(NoteConceptORM.note_id, func.count(NoteConceptORM.concept_id).label("shared"))
        .filter(NoteConceptORM.concept_id.in_(my_concept_ids), NoteConceptORM.note_id != note_id)
        .group_by(NoteConceptORM.note_id)
        .all()
    )
    note_by_id = {n.id: n for n in db.query(NoteORM).filter(NoteORM.id.in_([r[0] for r in rows])).all()}
    ranked = sorted(rows, key=lambda r: (-r.shared, -note_by_id[r[0]].created_at.timestamp()))
    return [r[0] for r in ranked[:limit]]


@router.post("/notes")
def create_note():
    # Full text-capture pipeline (LLM summarize, canonicalization, related
    # notes, connector sentence) is out of scope for the current
    # screen-capture-focused sprint. NoteResponse and compute_related_note_ids
    # above are already real and reused by screen.py.
    raise NotImplementedError("Deferred: not needed by the screen-capture feature")
