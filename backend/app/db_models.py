import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON, Integer
from app.db import Base


def gen_id() -> str:
    return str(uuid.uuid4())


class NoteORM(Base):
    __tablename__ = "notes"
    id = Column(String, primary_key=True, default=gen_id)
    title = Column(String, nullable=False)
    source = Column(String, nullable=False)
    source_url = Column(String, nullable=True)
    raw_content = Column(String, nullable=False)
    summary = Column(String, default="")
    key_concepts = Column(JSON, default=list)
    questions = Column(JSON, default=list)
    flowchart = Column(JSON, default=list)
    related_note_ids = Column(JSON, default=list)
    connection_sentence = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ConceptORM(Base):
    __tablename__ = "concepts"
    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    normalized_name = Column(String, nullable=False, unique=True)


class NoteConceptORM(Base):
    __tablename__ = "note_concepts"
    id = Column(String, primary_key=True, default=gen_id)
    note_id = Column(String, nullable=False)
    concept_id = Column(String, nullable=False)
    timestamp_seconds = Column(Integer, nullable=True)


class ConceptLinkORM(Base):
    __tablename__ = "concept_links"
    id = Column(String, primary_key=True, default=gen_id)
    from_concept_id = Column(String, nullable=False)
    to_concept_id = Column(String, nullable=False)
    kind = Column(String, nullable=False)  # "leads-to" | "related-to"


class ScreenSessionORM(Base):
    __tablename__ = "screen_sessions"
    id = Column(String, primary_key=True, default=gen_id)
    study_session_id = Column(String, nullable=False)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ended_at = Column(DateTime, nullable=True)


# SessionORM and PetStateORM (study-session CRUD, pet streak) are out of
# scope for the current screen-capture-focused sprint — not needed by
# backend/app/screen.py. Add them when session completion (CLAUDE.md Build
# order step 11) is back in scope.
