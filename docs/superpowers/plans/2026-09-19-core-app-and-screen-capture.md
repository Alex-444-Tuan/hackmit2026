# StudyPet Core App + Screen Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the StudyPet golden demo flow (CLAUDE.md Build order steps 1–11: FastAPI backend, Electron/React shell, timer, capture, Groq summarize, concept canonicalization, flowchart, related notes, knowledge graph, pet, session completion) end-to-end in fixture mode, then add the screen-capture feature (`docs/screen-capture-spec.md`) on top with test coverage.

**Architecture:** FastAPI + SQLAlchemy + SQLite backend owning all LLM calls and business logic; Electron + React + TS thin shell (main window + floating pet window) talking to the backend over HTTP; screen capture adds a local-only classifier + fail-closed allowlist gate in the Electron main process, with only allowlisted content ever crossing to the backend.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy, pytest; Node 20, Electron, electron-vite, React 19, TypeScript, vitest; Groq (existing text pipeline), Gemini (screen-capture path only).

**Spec:** `CLAUDE.md` (core app), `docs/screen-capture-spec.md` + `docs/privacy/*` (screen capture). This plan implements exactly what those documents specify — no additions.

## Global Constraints

- All JSON over HTTP is camelCase (Pydantic `alias_generator=to_camel`, `populate_by_name=True`, responses use `by_alias=True`). Python internals stay snake_case.
- No platform-specific shell commands or APIs outside `screenWatcher.ts`'s OS-specific branches (which are required by the spec — Accessibility API on macOS, UI Automation on Windows).
- `USE_FIXTURE=1` is the default `.env` value; no `GROQ_API_KEY` or `GEMINI_API_KEY` required to run the full golden flow or the screen-capture demo path.
- Screen capture: local classifier and allowlist gate run 100% in `src/main/screenWatcher.ts`, never in the renderer or backend. A blocked chunk is never captured, never persisted, never sent over the network. An allowed chunk is deleted from the backend immediately after the Gemini call returns — never written to a table.
- No embeddings, no vector DB, no second graph database — concept canonicalization and the graph are plain SQLite join tables, per CLAUDE.md.
- Preload bridge (`window.studypet`) exposes exactly the methods listed in CLAUDE.md's "Preload API" section, nothing more.

---

## Part 1 — Core App (CLAUDE.md Build order steps 1–11)

### Task 1: FastAPI backend skeleton + fixture-mode LLM stub

**Files:**
- Create: `backend/app/__init__.py` (empty)
- Create: `backend/app/main.py`
- Create: `backend/app/db.py`
- Create: `backend/app/models.py`
- Create: `backend/app/llm.py`
- Create: `backend/app/concepts.py` (normalize-only for now; canonicalization logic added in Task 6)
- Create: `backend/app/routes/__init__.py` (empty)
- Create: `backend/app/routes/notes.py` (stub: `POST /notes` saves raw content only, per Task 4)
- Create: `backend/app/routes/graph.py` (stub returning empty `GraphData`)
- Create: `backend/app/routes/sessions.py` (stub CRUD, in-memory list is fine until Task 11)
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Test: `backend/tests/test_health.py`

**Interfaces:**
- Produces: `GET /health` → `{"status": "ok"}`. `db.py` exposes `get_db()` (FastAPI dependency yielding a SQLAlchemy `Session`) and `Base` (declarative base). `models.py` exposes `CamelModel` (base Pydantic model with `alias_generator=to_camel, populate_by_name=True`).

- [ ] **Step 1: Write `backend/requirements.txt`**

```
fastapi
uvicorn
sqlalchemy
groq
google-genai
python-dotenv
youtube-transcript-api
pytest
httpx
```

- [ ] **Step 2: Write `backend/.env.example`**

```
GROQ_API_KEY=
GEMINI_API_KEY=
USE_FIXTURE=1
```

- [ ] **Step 3: Write `backend/app/db.py`**

```python
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DB_PATH = Path(__file__).resolve().parent.parent / "studypet.db"
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    import app.db_models  # noqa: F401  (registers tables on Base)
    Base.metadata.create_all(bind=engine)
```

- [ ] **Step 4: Write `backend/app/models.py`**

```python
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class HealthResponse(CamelModel):
    status: str
```

- [ ] **Step 5: Write `backend/app/llm.py` (fixture mode only for now)**

```python
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
```

- [ ] **Step 6: Write `backend/app/concepts.py` (normalize only)**

```python
import re


def normalize_concept_name(name: str) -> str:
    name = " ".join(name.strip().lower().split())
    words = name.split(" ")
    if words:
        last = words[-1]
        if len(last) > 3 and not last.endswith(("ss", "us", "is")) and last.endswith("s"):
            words[-1] = last[:-1]
    return " ".join(words)
```

- [ ] **Step 7: Write `backend/app/routes/notes.py`, `graph.py`, `sessions.py` (stubs)**

```python
# backend/app/routes/notes.py
from fastapi import APIRouter

router = APIRouter()


@router.post("/notes")
def create_note():
    raise NotImplementedError("Implemented in Task 4")
```

```python
# backend/app/routes/graph.py
from fastapi import APIRouter
from app.models import CamelModel

router = APIRouter()


class GraphData(CamelModel):
    nodes: list[dict] = []
    links: list[dict] = []


@router.get("/graph", response_model=GraphData, response_model_by_alias=True)
def get_graph():
    return GraphData()
```

```python
# backend/app/routes/sessions.py
from fastapi import APIRouter

router = APIRouter()
```

- [ ] **Step 8: Write `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import init_db
from app.models import HealthResponse
from app.routes import notes, graph, sessions

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health", response_model=HealthResponse, response_model_by_alias=True)
def health():
    return HealthResponse(status="ok")


app.include_router(notes.router)
app.include_router(graph.router)
app.include_router(sessions.router)
```

- [ ] **Step 9: Write the failing test `backend/tests/test_health.py`**

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 10: Run test to verify it fails, then passes**

Run: `cd backend && python -m pytest tests/test_health.py -v`
Expected first run: FAIL (import errors — files don't exist yet). After Steps 1–8: PASS.

- [ ] **Step 11: Confirm `uvicorn` runs**

Run: `cd backend && uvicorn app.main:app --reload --port 8000` then `curl http://localhost:8000/health` in another terminal.
Expected: `{"status":"ok"}`

- [ ] **Step 12: Commit**

```bash
git add backend/
git commit -m "feat: scaffold FastAPI backend with health check and fixture-mode llm stub"
```

---

### Task 2: Electron + React scaffold wired to backend health check

**Files:**
- Modify: `src/main/index.ts` (no change needed — already scaffolded; verify it loads renderer)
- Create: `src/preload/index.ts`
- Create: `src/renderer/src/App.tsx` (or `src/renderer/App.tsx` — match whatever electron-vite produced; confirmed by `find src/renderer -type f` before editing)
- Create: `src/renderer/src/api/client.ts`
- Modify: `package.json` (add `axios` dependency — already present per current `package.json`)

**Interfaces:**
- Consumes: `GET /health` from Task 1.
- Produces: `window.studypet` bridge object matching CLAUDE.md's `StudyPetBridge` interface (methods `minimize`, `close`, `showPet`, `hidePet`, `sendSessionState`, `onSessionState`, `openExternal` — `showPet`/`hidePet`/`sendSessionState`/`onSessionState`/`openExternal` are wired to real IPC in Tasks 10 and 13; stub them as no-ops here if their target windows don't exist yet, but keep the exact method names and signatures below since later tasks call them).

- [ ] **Step 1: Check actual renderer file layout produced by the scaffold**

Run: `find src/renderer -type f`
Use whatever path this prints for `App.tsx` and place `api/client.ts` alongside it.

- [ ] **Step 2: Write `src/preload/index.ts`**

```typescript
import { contextBridge, ipcRenderer } from 'electron'

const bridge = {
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close'),
  showPet: () => ipcRenderer.send('pet:show'),
  hidePet: () => ipcRenderer.send('pet:hide'),
  sendSessionState: (state: { mood: string; secondsLeft: number; streak: number }) =>
    ipcRenderer.send('session-state-changed', state),
  onSessionState: (cb: (state: { mood: string; secondsLeft: number; streak: number }) => void) => {
    const listener = (_event: unknown, state: { mood: string; secondsLeft: number; streak: number }) =>
      cb(state)
    ipcRenderer.on('session-state-changed', listener)
    return () => ipcRenderer.removeListener('session-state-changed', listener)
  },
  openExternal: (url: string) => ipcRenderer.send('open-external', url)
}

contextBridge.exposeInMainWorld('studypet', bridge)
```

- [ ] **Step 3: Write `src/renderer/.../api/client.ts`**

```typescript
import axios from 'axios'

export const api = axios.create({ baseURL: 'http://localhost:8000' })

export async function getHealth(): Promise<{ status: string }> {
  const response = await api.get('/health')
  return response.data
}
```

- [ ] **Step 4: Update `App.tsx` to call `getHealth()` on mount and render the status**

```tsx
import { useEffect, useState } from 'react'
import { getHealth } from './api/client'

export default function App(): JSX.Element {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    getHealth()
      .then((res) => setStatus(res.status))
      .catch(() => setStatus('backend unreachable'))
  }, [])

  return <div>Backend status: {status}</div>
}
```

- [ ] **Step 5: Manual verification**

Run backend (`uvicorn app.main:app --reload --port 8000`) in one terminal, `npm run dev` in another.
Expected: Electron window opens and shows "Backend status: ok".

- [ ] **Step 6: Commit**

```bash
git add src/preload/index.ts src/renderer/ package.json package-lock.json
git commit -m "feat: wire Electron renderer to backend health check, add preload bridge skeleton"
```

---

### Task 3: Dashboard timer (session start/pause/finish)

**Files:**
- Create: `src/renderer/.../pages/Dashboard.tsx`
- Create: `src/renderer/.../components/SessionTimer.tsx`
- Modify: `App.tsx` to render `Dashboard`

**Interfaces:**
- Produces: `SessionTimer` component taking `endTimestampMs: number | null` and `onFinish: () => void` props; computes remaining time from `Date.now()`, not `setInterval` ticks alone.

- [ ] **Step 1: Write `SessionTimer.tsx`**

```tsx
import { useEffect, useState } from 'react'

interface Props {
  endTimestampMs: number | null
  onFinish: () => void
}

export function SessionTimer({ endTimestampMs, onFinish }: Props): JSX.Element | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  useEffect(() => {
    if (endTimestampMs === null) {
      setSecondsLeft(null)
      return
    }
    const tick = (): void => {
      const remaining = Math.max(0, Math.round((endTimestampMs - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining === 0) onFinish()
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [endTimestampMs, onFinish])

  if (secondsLeft === null) return null
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  return (
    <div>
      {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  )
}
```

- [ ] **Step 2: Write `Dashboard.tsx`**

```tsx
import { useState } from 'react'
import { SessionTimer } from '../components/SessionTimer'

export function Dashboard(): JSX.Element {
  const [goal, setGoal] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(25)
  const [endTimestampMs, setEndTimestampMs] = useState<number | null>(null)

  const start = (): void => setEndTimestampMs(Date.now() + durationMinutes * 60_000)
  const finish = (): void => setEndTimestampMs(null)

  return (
    <div>
      <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Study goal" />
      <input
        type="number"
        value={durationMinutes}
        onChange={(e) => setDurationMinutes(Number(e.target.value))}
      />
      <button onClick={start}>Start</button>
      <SessionTimer endTimestampMs={endTimestampMs} onFinish={finish} />
    </div>
  )
}
```

- [ ] **Step 3: Render `Dashboard` from `App.tsx`, manually verify timer counts down and reaches 0**

- [ ] **Step 4: Commit**

```bash
git add src/renderer/
git commit -m "feat: add dashboard with goal input and timestamp-based session timer"
```

---

### Task 4: Capture screen → `POST /notes` (raw content only) + seed-notes loading

**Files:**
- Create: `backend/app/db_models.py` (SQLAlchemy ORM models: `NoteORM`, `ConceptORM`, `NoteConceptORM`, `ConceptLinkORM`, `SessionORM`, `PetStateORM` — full schema now so later tasks don't need migrations)
- Modify: `backend/app/routes/notes.py` (implement `POST /notes`)
- Modify: `backend/app/db.py` (add `seed_if_empty(db)` called from `init_db`)
- Create: `fixtures/seed-notes.json`
- Create: `src/renderer/.../pages/Capture.tsx`
- Test: `backend/tests/test_notes.py`

**Interfaces:**
- Consumes: `CamelModel` from `models.py`.
- Produces: `NoteORM` table columns: `id (str, uuid)`, `title`, `source`, `source_url`, `raw_content`, `summary`, `key_concepts (JSON list)`, `questions (JSON list)`, `flowchart (JSON list)`, `related_note_ids (JSON list)`, `connection_sentence`, `created_at`. `POST /notes` accepts `{title, source, sourceUrl?, rawContent}` and returns the created `Note` with empty `summary`/`keyConcepts`/etc. (AI wired in Task 5).

- [ ] **Step 1: Write `backend/app/db_models.py`**

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON, Integer, Boolean
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


class SessionORM(Base):
    __tablename__ = "sessions"
    id = Column(String, primary_key=True, default=gen_id)
    subject = Column(String, nullable=False)
    goal = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    completed = Column(Boolean, default=False)
    related_note_ids = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class PetStateORM(Base):
    __tablename__ = "pet_state"
    id = Column(String, primary_key=True, default=lambda: "singleton")
    experience = Column(Integer, default=0)
    streak = Column(Integer, default=0)
    mood = Column(String, default="idle")
    accessories = Column(JSON, default=list)
```

- [ ] **Step 2: Write `fixtures/seed-notes.json`**

```json
[
  {
    "title": "Functions",
    "concepts": ["Functions", "Domain", "Range", "Graphs Of Functions"],
    "summary": "A function maps each input to exactly one output. Domain is the set of valid inputs; range is the set of possible outputs.",
    "flowchart": [
      { "concept": "Functions", "leadsTo": ["Domain", "Range"] },
      { "concept": "Domain", "relatedTo": ["Graphs Of Functions"] }
    ]
  },
  {
    "title": "Limits",
    "concepts": ["Limits", "Approaching A Value", "One-Sided Limits", "Continuity"],
    "summary": "A limit describes the value a function approaches as the input approaches some point, from one or both sides.",
    "flowchart": [
      { "concept": "Limits", "leadsTo": ["Continuity"] },
      { "concept": "Limits", "relatedTo": ["One-Sided Limits"] }
    ]
  },
  {
    "title": "Slope",
    "concepts": ["Slope", "Rate Of Change", "Secant Lines", "Functions"],
    "summary": "Slope measures the rate of change between two points on a function, computed via a secant line.",
    "flowchart": [
      { "concept": "Slope", "relatedTo": ["Rate Of Change", "Secant Lines", "Functions"] }
    ]
  },
  {
    "title": "Tangent Lines",
    "concepts": ["Tangent Lines", "Slope", "Limits", "Instantaneous Rate Of Change"],
    "summary": "A tangent line touches a curve at one point; its slope is the limit of secant-line slopes as the interval shrinks to zero.",
    "flowchart": [
      { "concept": "Limits", "leadsTo": ["Tangent Lines"] },
      { "concept": "Tangent Lines", "relatedTo": ["Slope", "Instantaneous Rate Of Change"] }
    ]
  }
]
```

- [ ] **Step 3: Add `seed_if_empty` to `backend/app/db.py` (append below `init_db`)**

Note: this seeding function only inserts `NoteORM`/`ConceptORM`/`NoteConceptORM`/`ConceptLinkORM` rows — it does not call the LLM. Concept canonicalization for seed data reuses `normalize_concept_name` from Task 1.

```python
def seed_if_empty(db) -> None:
    import json
    from app.db_models import NoteORM, ConceptORM, NoteConceptORM, ConceptLinkORM
    from app.concepts import normalize_concept_name

    if db.query(NoteORM).first() is not None:
        return

    with open(Path(__file__).resolve().parent.parent.parent / "fixtures" / "seed-notes.json") as f:
        seed_notes = json.load(f)

    normalized_to_concept: dict[str, ConceptORM] = {}

    def get_or_create_concept(name: str) -> ConceptORM:
        normalized = normalize_concept_name(name)
        if normalized in normalized_to_concept:
            return normalized_to_concept[normalized]
        existing = db.query(ConceptORM).filter_by(normalized_name=normalized).first()
        if existing:
            normalized_to_concept[normalized] = existing
            return existing
        concept = ConceptORM(name=name, normalized_name=normalized)
        db.add(concept)
        db.flush()
        normalized_to_concept[normalized] = concept
        return concept

    for entry in seed_notes:
        note = NoteORM(
            title=entry["title"],
            source="pasted-text",
            raw_content=entry["summary"],
            summary=entry["summary"],
            key_concepts=entry["concepts"],
            questions=[],
            flowchart=entry["flowchart"],
            related_note_ids=[],
        )
        db.add(note)
        db.flush()

        touched_names = set(entry["concepts"])
        for edge in entry["flowchart"]:
            touched_names.add(edge["concept"])
            touched_names.update(edge.get("leadsTo", []))
            touched_names.update(edge.get("relatedTo", []))

        for name in touched_names:
            concept = get_or_create_concept(name)
            db.add(NoteConceptORM(note_id=note.id, concept_id=concept.id))

        for edge in entry["flowchart"]:
            from_concept = get_or_create_concept(edge["concept"])
            for kind, targets in (("leads-to", edge.get("leadsTo", [])), ("related-to", edge.get("relatedTo", []))):
                for target_name in targets:
                    to_concept = get_or_create_concept(target_name)
                    if from_concept.id == to_concept.id:
                        continue
                    exists = (
                        db.query(ConceptLinkORM)
                        .filter_by(from_concept_id=from_concept.id, to_concept_id=to_concept.id, kind=kind)
                        .first()
                    )
                    if not exists:
                        db.add(ConceptLinkORM(from_concept_id=from_concept.id, to_concept_id=to_concept.id, kind=kind))

    db.commit()
```

Wire it into `init_db`:

```python
def init_db() -> None:
    import app.db_models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()
```

- [ ] **Step 4: Implement `POST /notes` in `backend/app/routes/notes.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import get_db
from app.db_models import NoteORM
from app.models import CamelModel

router = APIRouter()


class CreateNoteRequest(CamelModel):
    title: str
    source: str
    source_url: str | None = None
    raw_content: str


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


@router.post("/notes", response_model=NoteResponse, response_model_by_alias=True)
def create_note(body: CreateNoteRequest, db: Session = Depends(get_db)):
    note = NoteORM(
        title=body.title,
        source=body.source,
        source_url=body.source_url,
        raw_content=body.raw_content,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return NoteResponse.from_orm_note(note)
```

- [ ] **Step 5: Write the failing test `backend/tests/test_notes.py`**

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_create_note_saves_raw_content():
    response = client.post(
        "/notes",
        json={"title": "Derivatives", "source": "pasted-text", "rawContent": "A derivative measures..."},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["rawContent"] == "A derivative measures..."
    assert body["title"] == "Derivatives"
    assert body["summary"] == ""


def test_seed_notes_load_on_startup():
    response = client.get("/health")
    assert response.status_code == 200
```

- [ ] **Step 6: Run tests, verify fail then pass**

Run: `cd backend && python -m pytest tests/test_notes.py -v`

- [ ] **Step 7: Write `Capture.tsx`**

```tsx
import { useState } from 'react'
import { api } from '../api/client'

export function Capture(): JSX.Element {
  const [text, setText] = useState('')

  const submit = async (): Promise<void> => {
    await api.post('/notes', { title: 'Untitled', source: 'pasted-text', rawContent: text })
  }

  return (
    <div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={submit}>Save</button>
    </div>
  )
}
```

- [ ] **Step 8: Manual verification** — paste text in Capture, confirm a row appears in `backend/studypet.db`'s `notes` table (`sqlite3 backend/studypet.db "select title from notes;"`) and that the 4 seed notes are present on first run.

- [ ] **Step 9: Commit**

```bash
git add backend/ fixtures/seed-notes.json src/renderer/
git commit -m "feat: add note capture endpoint, full db schema, and seed-notes loading"
```

---

### Task 5: Groq summarize wiring + fixture

**Files:**
- Modify: `backend/app/llm.py` (add live Groq call)
- Modify: `backend/app/routes/notes.py` (`POST /notes` now calls `llm.summarize`)
- Create: `fixtures/sample-lecture-transcript.txt`
- Create: `fixtures/fixture-summary-response.json`
- Test: `backend/tests/test_llm.py`

**Interfaces:**
- Produces: `llm.summarize(raw_content: str, existing_concepts: list[str]) -> dict` returning `{"summary": str, "keyConcepts": list[str], "questions": list[str], "flowchart": list[dict]}`.

- [ ] **Step 1: Write `fixtures/sample-lecture-transcript.txt`**

```
Today we're covering derivatives. Recall that a limit describes the value a function approaches. Continuity means a function has no breaks. The derivative is defined as the limit of the slope of a secant line as the interval shrinks to zero — this gives us the instantaneous rate of change, also called the slope of the tangent line at a point.
```

- [ ] **Step 2: Write `fixtures/fixture-summary-response.json`**

```json
{
  "summary": "Derivatives extend the idea of slope: the derivative at a point is the limit of secant-line slopes as the interval shrinks to zero, giving the instantaneous rate of change (the slope of the tangent line).",
  "keyConcepts": ["Derivatives", "Limits", "Continuity", "Slope", "Functions"],
  "questions": ["Why is the derivative defined as a limit rather than a direct measurement?"],
  "flowchart": [
    { "concept": "Limits", "leadsTo": ["Continuity", "Derivatives"] },
    { "concept": "Derivatives", "relatedTo": ["Slope"] },
    { "concept": "Slope", "relatedTo": ["Functions"] }
  ]
}
```

- [ ] **Step 3: Write the failing test `backend/tests/test_llm.py`**

```python
import os
from app import llm


def test_summarize_fixture_mode_includes_seeded_concepts():
    os.environ["USE_FIXTURE"] = "1"
    result = llm.summarize("derivatives transcript text", existing_concepts=["Limits", "Slope"])
    assert set(["Limits", "Continuity", "Slope", "Functions"]).issubset(set(result["keyConcepts"]))
```

- [ ] **Step 4: Add live Groq call to `backend/app/llm.py` (append below `summarize`)**

```python
from groq import Groq

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.environ["GROQ_API_KEY"])
    return _client


SUMMARIZE_SYSTEM_PROMPT = """You are a study-note summarizer. Return ONLY a JSON object with keys:
summary (string), keyConcepts (string array), questions (string array),
flowchart (array of {concept, leadsTo?, relatedTo?}).
If a concept matches one of the existing concepts listed below, reuse the exact existing name.
Only create a new name for a genuinely new concept."""


def summarize_live(raw_content: str, existing_concepts: list[str]) -> dict:
    client = _get_client()
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SUMMARIZE_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Existing concepts: {existing_concepts}\n\nTranscript:\n{raw_content}",
            },
        ],
        response_format={"type": "json_object"},
    )
    return json.loads(completion.choices[0].message.content)
```

Update `summarize` to dispatch:

```python
def summarize(raw_content: str, existing_concepts: list[str]) -> dict:
    if use_fixture():
        with open(FIXTURES_DIR / "fixture-summary-response.json") as f:
            return json.load(f)
    return summarize_live(raw_content, existing_concepts)
```

- [ ] **Step 5: Wire `llm.summarize` into `POST /notes`** — modify `create_note` in `notes.py` to call `llm.summarize(body.raw_content, existing_concepts=[])` (existing_concepts populated for real in Task 6) and populate `note.summary`, `note.key_concepts`, `note.questions`, `note.flowchart` before commit.

- [ ] **Step 6: Run tests, verify fail then pass**

Run: `cd backend && python -m pytest tests/test_llm.py -v`

- [ ] **Step 7: Commit**

```bash
git add backend/app/llm.py backend/app/routes/notes.py fixtures/ backend/tests/test_llm.py
git commit -m "feat: wire Groq summarize call with fixture-mode fallback"
```

---

### Task 6: Concept canonicalization wired into note creation

**Files:**
- Modify: `backend/app/concepts.py` (add `canonicalize_note_concepts`)
- Modify: `backend/app/routes/notes.py` (call canonicalization after summarize)
- Test: `backend/tests/test_concepts.py`

**Interfaces:**
- Consumes: `normalize_concept_name` from Task 1, `ConceptORM`/`NoteConceptORM`/`ConceptLinkORM` from Task 4.
- Produces: `concepts.get_or_create_concept(db, name) -> ConceptORM`, `concepts.canonicalize_note_concepts(db, note_id, flowchart: list[dict]) -> None` (links every concept touched by `flowchart[].concept`/`leadsTo`/`relatedTo` to `note_id`, and stores deduplicated `concept_links`, dropping self-links).

- [ ] **Step 1: Write the failing test `backend/tests/test_concepts.py`**

```python
from app.concepts import normalize_concept_name


def test_normalize_strips_plural_on_last_word_only():
    assert normalize_concept_name("Tangent Lines") == "tangent line"


def test_normalize_keeps_special_endings_intact():
    assert normalize_concept_name("Calculus") == "calculus"
    assert normalize_concept_name("Analysis") == "analysis"
    assert normalize_concept_name("Class") == "class"


def test_canonicalize_reuses_existing_concept(db_session):
    from app.concepts import get_or_create_concept, canonicalize_note_concepts
    from app.db_models import NoteORM, ConceptORM

    existing = ConceptORM(name="Limits", normalized_name="limit")
    db_session.add(existing)
    db_session.flush()

    note = NoteORM(title="Derivatives", source="pasted-text", raw_content="...")
    db_session.add(note)
    db_session.flush()

    canonicalize_note_concepts(
        db_session,
        note.id,
        [{"concept": "Limits", "leadsTo": ["Derivatives"]}],
    )
    db_session.commit()

    concepts = db_session.query(ConceptORM).filter_by(normalized_name="limit").all()
    assert len(concepts) == 1  # reused, no duplicate
```

Add a `db_session` pytest fixture in `backend/tests/conftest.py`:

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db import Base
import app.db_models  # noqa: F401


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_concepts.py -v`
Expected: FAIL (`get_or_create_concept`, `canonicalize_note_concepts` not defined).

- [ ] **Step 3: Implement in `backend/app/concepts.py` (append)**

```python
from app.db_models import ConceptORM, NoteConceptORM, ConceptLinkORM


def get_or_create_concept(db, name: str) -> ConceptORM:
    normalized = normalize_concept_name(name)
    existing = db.query(ConceptORM).filter_by(normalized_name=normalized).first()
    if existing:
        return existing
    concept = ConceptORM(name=name, normalized_name=normalized)
    db.add(concept)
    db.flush()
    return concept


def canonicalize_note_concepts(db, note_id: str, flowchart: list[dict]) -> None:
    touched_names: set[str] = set()
    for edge in flowchart:
        touched_names.add(edge["concept"])
        touched_names.update(edge.get("leadsTo", []))
        touched_names.update(edge.get("relatedTo", []))

    for name in touched_names:
        concept = get_or_create_concept(db, name)
        db.add(NoteConceptORM(note_id=note_id, concept_id=concept.id))

    for edge in flowchart:
        from_concept = get_or_create_concept(db, edge["concept"])
        for kind, targets in (("leads-to", edge.get("leadsTo", [])), ("related-to", edge.get("relatedTo", []))):
            for target_name in targets:
                to_concept = get_or_create_concept(db, target_name)
                if from_concept.id == to_concept.id:
                    continue
                exists = (
                    db.query(ConceptLinkORM)
                    .filter_by(from_concept_id=from_concept.id, to_concept_id=to_concept.id, kind=kind)
                    .first()
                )
                if not exists:
                    db.add(ConceptLinkORM(from_concept_id=from_concept.id, to_concept_id=to_concept.id, kind=kind))
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Wire into `POST /notes`** — after `note.flowchart = result["flowchart"]`, call `concepts.canonicalize_note_concepts(db, note.id, result["flowchart"])` before `db.commit()`. Also pass real existing concept names into `llm.summarize`: `existing_concepts=[c.name for c in db.query(ConceptORM).order_by(ConceptORM.id.desc()).limit(150)]`.

- [ ] **Step 6: Manual verification** — with `USE_FIXTURE=1`, POST the derivatives transcript via Capture; confirm in `sqlite3 backend/studypet.db` that "Limits" resolves to the *same* `concepts.id` as the seeded "Limits" note, and no concept has zero rows in `note_concepts`.

- [ ] **Step 7: Commit**

```bash
git add backend/app/concepts.py backend/app/routes/notes.py backend/tests/
git commit -m "feat: canonicalize note concepts into shared concept graph tables"
```

---

### Task 7: Render summary + Mermaid flowchart

**Files:**
- Create: `src/renderer/.../pages/NoteView.tsx`
- Create: `src/renderer/.../components/FlowchartView.tsx`

**Interfaces:**
- Produces: `FlowchartView({ flowchart }: { flowchart: FlowchartEdge[] })` — builds a Mermaid `graph TD` string in code (never asks the LLM for Mermaid syntax), sanitizing node IDs as `n0`, `n1`, ... and quoting concept names as labels.

- [ ] **Step 1: Write `FlowchartView.tsx`**

```tsx
import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

interface FlowchartEdge {
  concept: string
  leadsTo?: string[]
  relatedTo?: string[]
}

function buildMermaidSource(flowchart: FlowchartEdge[]): string {
  const idByConcept = new Map<string, string>()
  let counter = 0
  const idFor = (concept: string): string => {
    if (!idByConcept.has(concept)) {
      idByConcept.set(concept, `n${counter++}`)
    }
    return idByConcept.get(concept) as string
  }

  flowchart.forEach((edge) => idFor(edge.concept))
  flowchart.forEach((edge) => {
    ;[...(edge.leadsTo ?? []), ...(edge.relatedTo ?? [])].forEach((target) => idFor(target))
  })

  const lines = ['graph TD']
  idByConcept.forEach((id, concept) => {
    lines.push(`  ${id}["${concept.replace(/"/g, "'")}"]`)
  })
  flowchart.forEach((edge) => {
    const fromId = idFor(edge.concept)
    ;(edge.leadsTo ?? []).forEach((target) => lines.push(`  ${fromId} --> ${idFor(target)}`))
    ;(edge.relatedTo ?? []).forEach((target) => lines.push(`  ${fromId} -.-> ${idFor(target)}`))
  })
  return lines.join('\n')
}

export function FlowchartView({ flowchart }: { flowchart: FlowchartEdge[] }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const source = buildMermaidSource(flowchart)
    mermaid.render('flowchart-svg', source).then(({ svg }) => {
      if (ref.current) ref.current.innerHTML = svg
    })
  }, [flowchart])

  return <div ref={ref} />
}
```

- [ ] **Step 2: Write `NoteView.tsx`** rendering `note.summary` as text and `<FlowchartView flowchart={note.flowchart} />`.

- [ ] **Step 3: Manual verification** — open a note created in Task 6, confirm the flowchart renders and concept names with parentheses/colons/quotes (test with a manually edited fixture concept name) don't break the diagram.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/
git commit -m "feat: render note summary and mermaid flowchart from structured backend response"
```

---

### Task 8: Related notes + connector sentence

**Files:**
- Modify: `backend/app/routes/notes.py` (compute `related_note_ids` after canonicalization, call connector sentence)
- Modify: `backend/app/llm.py` (add `connection_sentence` fixture + live call)
- Create: `src/renderer/.../components/RelatedNotes.tsx`
- Test: `backend/tests/test_related_notes.py`

**Interfaces:**
- Produces: `llm.connection_sentence(top_related_title: str, note_summary: str) -> str`. Route-level: `related_notes(db, note_id, concept_ids) -> list[str]` returning up to 3 other note IDs ranked by shared `note_concepts` count, ties broken by most recent `created_at`.

- [ ] **Step 1: Write the failing test `backend/tests/test_related_notes.py`**

```python
def test_related_notes_ranks_by_shared_concept_count(db_session):
    from app.routes.notes import compute_related_note_ids
    from app.db_models import NoteORM, ConceptORM, NoteConceptORM

    concept = ConceptORM(name="Limits", normalized_name="limit")
    db_session.add(concept)
    db_session.flush()

    old_note = NoteORM(title="Limits", source="pasted-text", raw_content="...")
    new_note = NoteORM(title="Derivatives", source="pasted-text", raw_content="...")
    db_session.add_all([old_note, new_note])
    db_session.flush()

    db_session.add(NoteConceptORM(note_id=old_note.id, concept_id=concept.id))
    db_session.add(NoteConceptORM(note_id=new_note.id, concept_id=concept.id))
    db_session.commit()

    related = compute_related_note_ids(db_session, new_note.id)
    assert related == [old_note.id]
```

- [ ] **Step 2: Implement `compute_related_note_ids` in `notes.py` (append)**

```python
from sqlalchemy import func
from app.db_models import NoteConceptORM, NoteORM


def compute_related_note_ids(db, note_id: str, limit: int = 3) -> list[str]:
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
```

- [ ] **Step 3: Run test, verify fail then pass**

- [ ] **Step 4: Add `connection_sentence` to `llm.py`**

```python
def connection_sentence(top_related_title: str) -> str:
    if use_fixture():
        return f"This builds on your previous note about {top_related_title}."
    client = _get_client()
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": f"In one short sentence, explain how a new note builds on a previous note titled '{top_related_title}'. Start with 'This builds on your previous note about {top_related_title} because'."}],
    )
    return completion.choices[0].message.content.strip()
```

- [ ] **Step 5: Wire into `create_note`** — after canonicalization: `related_ids = compute_related_note_ids(db, note.id)`; if non-empty, `top_note = db.query(NoteORM).get(related_ids[0])`, `note.connection_sentence = llm.connection_sentence(top_note.title)`; `note.related_note_ids = related_ids`; commit.

- [ ] **Step 6: Write `RelatedNotes.tsx`** rendering `note.connectionSentence` and a list of `note.relatedNoteIds` as links to `NoteView`.

- [ ] **Step 7: Manual verification** — with fixture mode, confirm the derivatives note's `connectionSentence` reads "This builds on your previous note about Limits." (or whichever seeded note shares the most concepts).

- [ ] **Step 8: Commit**

```bash
git add backend/ src/renderer/
git commit -m "feat: compute related notes by shared concept count and generate connector sentence"
```

---

### Task 9: Knowledge Graph view

**Files:**
- Modify: `backend/app/routes/graph.py` (implement real `GET /graph`)
- Create: `src/renderer/.../components/KnowledgeGraph.tsx`
- Create: `src/renderer/.../pages/GraphView.tsx`
- Test: `backend/tests/test_graph.py`

**Interfaces:**
- Produces: `GET /graph` → `GraphData` per CLAUDE.md (`nodes: [{id, name, noteCount}]`, `links: [{source, target, kind}]`), built from `concepts` + `note_concepts` + `concept_links`.

- [ ] **Step 1: Write the failing test `backend/tests/test_graph.py`**

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_graph_includes_seeded_hub_concepts():
    response = client.get("/graph")
    assert response.status_code == 200
    node_names = {n["name"] for n in response.json()["nodes"]}
    assert "Limits" in node_names
    assert "Slope" in node_names
```

- [ ] **Step 2: Implement `GET /graph` in `backend/app/routes/graph.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.db import get_db
from app.db_models import ConceptORM, NoteConceptORM, ConceptLinkORM
from app.models import CamelModel

router = APIRouter()


class GraphNode(CamelModel):
    id: str
    name: str
    note_count: int


class GraphLink(CamelModel):
    source: str
    target: str
    kind: str


class GraphData(CamelModel):
    nodes: list[GraphNode]
    links: list[GraphLink]


@router.get("/graph", response_model=GraphData, response_model_by_alias=True)
def get_graph(db: Session = Depends(get_db)):
    counts = dict(
        db.query(NoteConceptORM.concept_id, func.count(NoteConceptORM.note_id))
        .group_by(NoteConceptORM.concept_id)
        .all()
    )
    nodes = [
        GraphNode(id=c.id, name=c.name, note_count=counts.get(c.id, 0))
        for c in db.query(ConceptORM).all()
    ]
    links = [
        GraphLink(source=link.from_concept_id, target=link.to_concept_id, kind=link.kind)
        for link in db.query(ConceptLinkORM).all()
    ]
    return GraphData(nodes=nodes, links=links)
```

- [ ] **Step 3: Run test, verify fail then pass**

- [ ] **Step 4: Write `KnowledgeGraph.tsx`** wrapping `react-force-graph-2d`, node size scaled by `noteCount`, `onNodeClick` fetching notes for that concept (add `GET /concepts/{id}/notes` if not already covered — reuse `RelatedNotes` styling for the side panel).

- [ ] **Step 5: Write `GraphView.tsx`** fetching `GET /graph` and rendering `KnowledgeGraph`.

- [ ] **Step 6: Manual verification** — open Graph view after Task 6's derivatives note is created; confirm "Limits" node's `noteCount` includes both the seeded note and the new one, and no isolated 0-note nodes exist.

- [ ] **Step 7: Commit**

```bash
git add backend/ src/renderer/
git commit -m "feat: implement knowledge graph endpoint and force-graph view"
```

---

### Task 10: Pet window with mood sync

**Files:**
- Create: `src/main/petWindow.ts`
- Modify: `src/main/index.ts` (create pet window, relay `session-state-changed` IPC, handle `pet:show`/`pet:hide`/`window:minimize`/`window:close`)
- Create: `src/renderer/pet-window/PetRoot.tsx`
- Create: `pet.html`
- Modify: `electron.vite.config.ts` (add `pet.html` as second renderer input)
- Create: `src/renderer/.../components/Pet.tsx`

**Interfaces:**
- Consumes: `window.studypet.sendSessionState`/`onSessionState` from Task 2's preload.
- Produces: Pet window showing CSS/emoji pet with mood classes `studying`/`distracted`/`celebrating`/`idle`, no polling.

- [ ] **Step 1: Write `src/main/petWindow.ts`**

```typescript
import { BrowserWindow, join } from 'electron'
import { is } from '@electron-toolkit/utils'

let petWindow: BrowserWindow | null = null

export function createPetWindow(): BrowserWindow {
  petWindow = new BrowserWindow({
    width: 220,
    height: 220,
    alwaysOnTop: true,
    frame: false,
    resizable: false,
    webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: false }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    petWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/pet.html`)
  } else {
    petWindow.loadFile(join(__dirname, '../renderer/pet.html'))
  }

  return petWindow
}

export function getPetWindow(): BrowserWindow | null {
  return petWindow
}
```

- [ ] **Step 2: Modify `src/main/index.ts`** — import `createPetWindow`, `getPetWindow`; call `createPetWindow()` in `app.whenReady()`; add:

```typescript
ipcMain.on('session-state-changed', (_event, state) => {
  getPetWindow()?.webContents.send('session-state-changed', state)
})
ipcMain.on('pet:show', () => getPetWindow()?.show())
ipcMain.on('pet:hide', () => getPetWindow()?.hide())
```

- [ ] **Step 3: Write `pet.html`** (minimal HTML entry loading `PetRoot.tsx`, mirroring the main `index.html`'s structure).

- [ ] **Step 4: Add `pet.html` as a second input in `electron.vite.config.ts`**'s renderer `build.rollupOptions.input`.

- [ ] **Step 5: Write `PetRoot.tsx`**

```tsx
import { useEffect, useState } from 'react'

type Mood = 'studying' | 'distracted' | 'celebrating' | 'idle'

const EMOJI: Record<Mood, string> = { studying: '📖', distracted: '❓', celebrating: '🎉', idle: '😴' }

export default function PetRoot(): JSX.Element {
  const [mood, setMood] = useState<Mood>('idle')

  useEffect(() => {
    return window.studypet.onSessionState((state) => setMood(state.mood as Mood))
  }, [])

  return <div className={`pet pet--${mood}`}>{EMOJI[mood]}</div>
}
```

- [ ] **Step 6: Write `Pet.tsx`** (main-window-side component, calls `window.studypet.sendSessionState({mood, secondsLeft, streak})` whenever `Dashboard`'s timer state changes).

- [ ] **Step 7: Manual verification** — start a session, confirm pet window shows the studying emoji; this is IPC-relayed (main → pet), not polled or backend-round-tripped (verify by checking no network tab activity from the pet window).

- [ ] **Step 8: Commit**

```bash
git add src/
git commit -m "feat: add floating pet window synced via IPC relay from main window"
```

---

### Task 11: Session completion (streak + logging)

**Files:**
- Modify: `backend/app/routes/sessions.py` (implement `POST /sessions`, `PATCH /sessions/{id}/complete`)
- Modify: `src/renderer/.../pages/Dashboard.tsx` (call session endpoints, celebrate on finish, send `mood: 'celebrating'`)
- Test: `backend/tests/test_sessions.py`

**Interfaces:**
- Produces: `POST /sessions` → `StudySession` row; `PATCH /sessions/{id}/complete` → sets `completed=true`, increments `PetStateORM.streak` by 1, returns updated `StudySession`.

- [ ] **Step 1: Write the failing test `backend/tests/test_sessions.py`**

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_completing_session_increments_streak():
    create = client.post("/sessions", json={"subject": "Calculus", "goal": "derivatives", "durationMinutes": 25})
    session_id = create.json()["id"]
    response = client.patch(f"/sessions/{session_id}/complete")
    assert response.status_code == 200
    assert response.json()["completed"] is True
```

- [ ] **Step 2: Implement in `backend/app/routes/sessions.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import get_db
from app.db_models import SessionORM, PetStateORM
from app.models import CamelModel

router = APIRouter()


class CreateSessionRequest(CamelModel):
    subject: str
    goal: str
    duration_minutes: int


class SessionResponse(CamelModel):
    id: str
    subject: str
    goal: str
    duration_minutes: int
    completed: bool
    related_note_ids: list[str]
    created_at: str

    @staticmethod
    def from_orm(s: SessionORM) -> "SessionResponse":
        return SessionResponse(
            id=s.id, subject=s.subject, goal=s.goal, duration_minutes=s.duration_minutes,
            completed=s.completed, related_note_ids=s.related_note_ids, created_at=s.created_at.isoformat(),
        )


@router.post("/sessions", response_model=SessionResponse, response_model_by_alias=True)
def create_session(body: CreateSessionRequest, db: Session = Depends(get_db)):
    session = SessionORM(subject=body.subject, goal=body.goal, duration_minutes=body.duration_minutes)
    db.add(session)
    db.commit()
    db.refresh(session)
    return SessionResponse.from_orm(session)


@router.patch("/sessions/{session_id}/complete", response_model=SessionResponse, response_model_by_alias=True)
def complete_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(SessionORM).get(session_id)
    session.completed = True
    pet_state = db.query(PetStateORM).get("singleton") or PetStateORM(id="singleton")
    pet_state.streak += 1
    db.add(pet_state)
    db.commit()
    db.refresh(session)
    return SessionResponse.from_orm(session)
```

- [ ] **Step 3: Run test, verify fail then pass**

- [ ] **Step 4: Wire `Dashboard.tsx`** — call `POST /sessions` on start, `PATCH /sessions/{id}/complete` in `SessionTimer`'s `onFinish`, then `window.studypet.sendSessionState({mood: 'celebrating', ...})`.

- [ ] **Step 5: Manual full golden-flow verification** — run through CLAUDE.md's 7-step demo flow end-to-end in fixture mode: start session → paste transcript → see summary/flowchart → see connection sentence → open graph view → let timer finish → confirm pet celebrates and streak increments in `pet_state` table.

- [ ] **Step 6: Commit**

```bash
git add backend/ src/renderer/
git commit -m "feat: log session completion and increment pet streak"
```

---

## Part 2 — Screen Capture (docs/screen-capture-spec.md)

**Do not start Part 2 until Part 1's Task 11 manual verification (Step 5) has passed.**

### Task 12: Local classifier + fail-closed allowlist gate (`screenWatcher.ts`)

**Files:**
- Create: `src/main/screenWatcher.ts`
- Create: `src/main/allowlist.ts` (default seed list + lookup — settings UI location is an open item per CLAUDE.md; ship a hardcoded default array for now, exported so a settings surface can replace it later without touching gate logic)
- Test: `src/main/__tests__/screenWatcher.test.ts` (vitest)

**Interfaces:**
- Produces:
  - `allowlist.ts`: `DEFAULT_ALLOWLIST: string[]` (lowercase app/domain names), `isAllowed(processNameOrDomain: string, allowlist?: string[]): boolean`.
  - `screenWatcher.ts`: `classifyChunk(activeWindow: { processName: string; tabUrl?: string }): 'allowed' | 'blocked'` (fail-closed: returns `'blocked'` on any unrecognized or empty input), `evaluateChunk(activeWindow): { decision: 'allowed' | 'blocked'; doomscroll: boolean | null }` — for `'blocked'`, `doomscroll` is computed locally as `true` (per spec: blocked contexts are the doomscroll signal) with `null` reserved for `'allowed'` (the real classification comes from the backend's Gemini call in Task 13, not from this module).

- [ ] **Step 1: Write the failing test `src/main/__tests__/screenWatcher.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { isAllowed, DEFAULT_ALLOWLIST } from '../allowlist'
import { classifyChunk, evaluateChunk } from '../screenWatcher'

describe('allowlist', () => {
  it('matches a known study app case-insensitively', () => {
    expect(isAllowed('Notion', DEFAULT_ALLOWLIST)).toBe(true)
  })

  it('fails closed on an unrecognized app', () => {
    expect(isAllowed('random-unknown-app', DEFAULT_ALLOWLIST)).toBe(false)
  })

  it('fails closed on empty input', () => {
    expect(isAllowed('', DEFAULT_ALLOWLIST)).toBe(false)
  })
})

describe('classifyChunk', () => {
  it('classifies an allowlisted process as allowed', () => {
    expect(classifyChunk({ processName: 'notion' })).toBe('allowed')
  })

  it('classifies an unlisted process as blocked (fail-closed)', () => {
    expect(classifyChunk({ processName: 'some-random-game' })).toBe('blocked')
  })

  it('classifies a tab URL not on the allowlist as blocked even if the browser itself is allowlisted', () => {
    expect(classifyChunk({ processName: 'chrome', tabUrl: 'https://tiktok.com/foo' })).toBe('blocked')
  })
})

describe('evaluateChunk', () => {
  it('never sets doomscroll on an allowed chunk locally (backend decides)', () => {
    const result = evaluateChunk({ processName: 'notion' })
    expect(result.decision).toBe('allowed')
    expect(result.doomscroll).toBeNull()
  })

  it('sets doomscroll true on a blocked chunk with zero network call', () => {
    const result = evaluateChunk({ processName: 'some-random-game' })
    expect(result.decision).toBe('blocked')
    expect(result.doomscroll).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/main/__tests__/screenWatcher.test.ts`
Expected: FAIL (`../allowlist` and `../screenWatcher` don't exist).

- [ ] **Step 3: Write `src/main/allowlist.ts`**

```typescript
export const DEFAULT_ALLOWLIST: string[] = [
  'notion',
  'notion.so',
  'obsidian',
  'khanacademy.org',
  'coursera.org',
  'youtube.com', // study-context gating for this domain happens at the transcript/link level, not here
  'docs.google.com',
  'wikipedia.org',
  'chatgpt.com',
  'claude.ai'
]

export function isAllowed(processNameOrDomain: string, allowlist: string[] = DEFAULT_ALLOWLIST): boolean {
  const normalized = processNameOrDomain.trim().toLowerCase()
  if (!normalized) return false
  return allowlist.some((entry) => normalized === entry || normalized.includes(entry))
}
```

- [ ] **Step 4: Write `src/main/screenWatcher.ts`**

```typescript
import { isAllowed, DEFAULT_ALLOWLIST } from './allowlist'

interface ActiveWindow {
  processName: string
  tabUrl?: string
}

export function classifyChunk(activeWindow: ActiveWindow, allowlist: string[] = DEFAULT_ALLOWLIST): 'allowed' | 'blocked' {
  if (!activeWindow.processName) return 'blocked'
  if (activeWindow.tabUrl) {
    return isAllowed(activeWindow.tabUrl, allowlist) ? 'allowed' : 'blocked'
  }
  return isAllowed(activeWindow.processName, allowlist) ? 'allowed' : 'blocked'
}

export function evaluateChunk(
  activeWindow: ActiveWindow,
  allowlist: string[] = DEFAULT_ALLOWLIST
): { decision: 'allowed' | 'blocked'; doomscroll: boolean | null } {
  const decision = classifyChunk(activeWindow, allowlist)
  return { decision, doomscroll: decision === 'blocked' ? true : null }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/main/__tests__/screenWatcher.test.ts`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/allowlist.ts src/main/screenWatcher.ts src/main/__tests__/screenWatcher.test.ts
git commit -m "feat: add fail-closed allowlist gate and local doomscroll classifier for screen capture"
```

---

### Task 13: Backend screen-capture endpoints (`screen.py`) with delete-on-response retention

**Files:**
- Create: `backend/app/screen.py`
- Modify: `backend/app/llm.py` (add Gemini client + `classify_doomscroll`, `extract_session_content`)
- Modify: `backend/app/db_models.py` (add `ScreenSessionORM`; extend `NoteORM.source` values — no schema change needed since `source` is a plain string column, just document the new value)
- Modify: `backend/app/main.py` (include `screen.router`)
- Test: `backend/tests/test_screen.py`

**Interfaces:**
- Produces:
  - `llm.classify_doomscroll(chunk_content: str) -> bool` (fixture mode: alternate canned true/false per `fixtures/sample-screen-session/`; live mode: one Gemini call).
  - `llm.extract_session_content(allowed_chunks: list[str]) -> dict` (same shape as `llm.summarize`'s return — reuses the existing summarize→canonicalize→note pipeline, per spec).
  - `POST /screen/chunk` — body `{sessionId: str, content: str}` → `{doomscroll: bool}`. **Never persists `content`** — classifies in-memory and returns.
  - `POST /screen/session-batch` — body `{sessionId: str, allowedChunks: list[str]}` → creates a `Note` with `source="screen-capture"` via the existing `create_note`-equivalent path (calls `llm.extract_session_content`, then `concepts.canonicalize_note_concepts`, then `compute_related_note_ids`/`connection_sentence` exactly as Task 5/6/8 do for text notes — no new pipeline).

- [ ] **Step 1: Write `fixtures/sample-screen-session/chunks.json`**

```json
{
  "chunks": [
    { "content": "Notion page: derivative practice problems, working through chain rule examples", "expectedDoomscroll": false },
    { "content": "Notion page: 20 minutes idle, cursor not moving, tab still open", "expectedDoomscroll": true }
  ]
}
```

- [ ] **Step 2: Write the failing test `backend/tests/test_screen.py`**

```python
import json
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
FIXTURE_DIR = Path(__file__).resolve().parent.parent.parent / "fixtures" / "sample-screen-session"


def test_chunk_endpoint_never_persists_content(db_session_override):
    response = client.post("/screen/chunk", json={"sessionId": "s1", "content": "some allowed study content"})
    assert response.status_code == 200
    assert "doomscroll" in response.json()
    # no table stores raw chunk content — verify no new table row was created anywhere queryable
    from app.db import SessionLocal
    from app.db_models import NoteORM
    db = SessionLocal()
    notes_with_chunk_content = db.query(NoteORM).filter(NoteORM.raw_content.contains("some allowed study content")).all()
    db.close()
    assert notes_with_chunk_content == []


def test_session_batch_creates_screen_capture_note():
    with open(FIXTURE_DIR / "chunks.json") as f:
        chunks = [c["content"] for c in json.load(f)["chunks"]]
    response = client.post("/screen/session-batch", json={"sessionId": "s1", "allowedChunks": chunks})
    assert response.status_code == 200
    assert response.json()["source"] == "screen-capture"


def test_doomscroll_classification_matches_fixture_expectations():
    from app import llm
    with open(FIXTURE_DIR / "chunks.json") as f:
        cases = json.load(f)["chunks"]
    for case in cases:
        assert llm.classify_doomscroll(case["content"]) == case["expectedDoomscroll"]
```

Add a `db_session_override` fixture to `backend/tests/conftest.py` if the app's `get_db` needs overriding for test isolation — otherwise reuse the existing app-level SQLite file, since these tests only assert absence of persisted content, not full isolation.

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_screen.py -v`
Expected: FAIL (`screen.py`, `classify_doomscroll`, `extract_session_content` don't exist).

- [ ] **Step 4: Add fixture-mode Gemini stubs to `backend/app/llm.py` (append)**

```python
def classify_doomscroll(chunk_content: str) -> bool:
    if use_fixture():
        import json
        with open(FIXTURES_DIR / "sample-screen-session" / "chunks.json") as f:
            cases = json.load(f)["chunks"]
        for case in cases:
            if case["content"] == chunk_content:
                return case["expectedDoomscroll"]
        return False
    return _classify_doomscroll_live(chunk_content)


def extract_session_content(allowed_chunks: list[str]) -> dict:
    if use_fixture():
        with open(FIXTURES_DIR / "fixture-summary-response.json") as f:
            return json.load(f)
    return _extract_session_content_live(allowed_chunks)


_gemini_client = None


def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        from google import genai
        _gemini_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _gemini_client


def _classify_doomscroll_live(chunk_content: str) -> bool:
    client = _get_gemini_client()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=f"Is this screen activity a study session or unfocused/doomscrolling? Answer only 'true' or 'false'.\n\n{chunk_content}",
    )
    return response.text.strip().lower().startswith("true")


def _extract_session_content_live(allowed_chunks: list[str]) -> dict:
    client = _get_gemini_client()
    joined = "\n---\n".join(allowed_chunks)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=SUMMARIZE_SYSTEM_PROMPT + f"\n\nScreen session content:\n{joined}",
    )
    return json.loads(response.text)
```

- [ ] **Step 5: Add `ScreenSessionORM` to `backend/app/db_models.py` (append)**

```python
class ScreenSessionORM(Base):
    __tablename__ = "screen_sessions"
    id = Column(String, primary_key=True, default=gen_id)
    study_session_id = Column(String, nullable=False)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ended_at = Column(DateTime, nullable=True)
```

- [ ] **Step 6: Write `backend/app/screen.py`**

```python
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
    doomscroll = llm.classify_doomscroll(body.content)
    return ChunkResponse(doomscroll=doomscroll)
    # `body.content` goes out of scope here and is never written to a table or file —
    # this is the "delete immediately on response" retention rule.


@router.post("/screen/session-batch", response_model=NoteResponse, response_model_by_alias=True)
def session_batch(body: SessionBatchRequest, db: Session = Depends(get_db)):
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
```

Note: `raw_content` on a screen-capture note stores the *allowed* chunk text that already crossed into the batch step (this is the extracted content itself, not a "raw chunk" in the retention-rule sense — the retention rule is about the per-chunk real-time path in `POST /screen/chunk`, which never writes anything).

- [ ] **Step 7: Register the router in `backend/app/main.py`**

```python
from app import screen
...
app.include_router(screen.router)
```

- [ ] **Step 8: Run tests, verify they pass**

Run: `cd backend && python -m pytest tests/test_screen.py -v`

- [ ] **Step 9: Commit**

```bash
git add backend/app/screen.py backend/app/llm.py backend/app/db_models.py backend/app/main.py fixtures/sample-screen-session/ backend/tests/test_screen.py
git commit -m "feat: add screen-capture chunk classification and session-batch note extraction endpoints"
```

---

### Task 14: Wire real-time path end-to-end + integration test

**Files:**
- Modify: `src/main/screenWatcher.ts` (add `runScreenWatcherTick` that calls `evaluateChunk`, and only on `'allowed'` POSTs to `/screen/chunk`)
- Modify: `src/main/index.ts` (start/stop the watcher tied to session start/finish, relay doomscroll signal to pet window via existing `session-state-changed` channel)
- Test: `src/main/__tests__/screenWatcher.integration.test.ts` (vitest, mocks `fetch`/axios)

**Interfaces:**
- Produces: `runScreenWatcherTick(activeWindow, postChunk: (sessionId: string, content: string) => Promise<{doomscroll: boolean}>) -> Promise<boolean>` — returns the doomscroll boolean, calling `postChunk` only when `evaluateChunk` returns `'allowed'`; returns the local `true` immediately (no `await`, no call to `postChunk`) when blocked.

- [ ] **Step 1: Write the failing test `src/main/__tests__/screenWatcher.integration.test.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { runScreenWatcherTick } from '../screenWatcher'

describe('runScreenWatcherTick', () => {
  it('never calls postChunk for a blocked context', async () => {
    const postChunk = vi.fn()
    const doomscroll = await runScreenWatcherTick({ processName: 'some-random-game' }, postChunk)
    expect(postChunk).not.toHaveBeenCalled()
    expect(doomscroll).toBe(true)
  })

  it('calls postChunk only for an allowed context and returns its result', async () => {
    const postChunk = vi.fn().mockResolvedValue({ doomscroll: false })
    const doomscroll = await runScreenWatcherTick({ processName: 'notion' }, postChunk)
    expect(postChunk).toHaveBeenCalledTimes(1)
    expect(doomscroll).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/main/__tests__/screenWatcher.integration.test.ts`

- [ ] **Step 3: Implement `runScreenWatcherTick` in `screenWatcher.ts` (append)**

```typescript
export async function runScreenWatcherTick(
  activeWindow: ActiveWindow,
  postChunk: (sessionId: string, content: string) => Promise<{ doomscroll: boolean }>,
  sessionId = 'current'
): Promise<boolean> {
  const { decision, doomscroll } = evaluateChunk(activeWindow)
  if (decision === 'blocked') {
    return doomscroll as boolean
  }
  const result = await postChunk(sessionId, JSON.stringify(activeWindow))
  return result.doomscroll
}
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Wire into `src/main/index.ts`** — on session start, `setInterval` (e.g. every 30s per spec's proposed chunk size) calling `runScreenWatcherTick` with a real `postChunk` that POSTs to `http://localhost:8000/screen/chunk`, then relays `{mood: doomscroll ? 'distracted' : 'studying', ...}` to the pet window over the existing `session-state-changed` channel; clear the interval on session finish/pause.

- [ ] **Step 6: Manual verification** — start a session, switch focus to an unlisted app; confirm (a) no network request fires (check DevTools Network tab is empty for that tick), (b) the pet window mood switches, matching the "never a penalty" rule (no negative animation, just the existing distracted mood).

- [ ] **Step 7: Commit**

```bash
git add src/main/
git commit -m "feat: wire real-time screen-watcher tick into session lifecycle, gated by allowlist"
```

---

## Self-Review Notes

- **Spec coverage:** Every numbered item in `docs/screen-capture-spec.md`'s "Screen function" section maps to Task 12 (local classifier + gate), Task 13 (backend endpoints + retention), Task 14 (real-time wiring). Privacy table rows map: local classifier → Task 12; allowlist gate → Task 12; local doomscroll signal → Task 12/`evaluateChunk`; redaction → **not implemented, flagged as an open item in CLAUDE.md, out of scope for this plan**; data retention → Task 13's `/screen/chunk` (never persists) and `/screen/session-batch` (existing pipeline's own note storage, which is the intended persisted artifact); privacy messaging → not a code task, copy already fixed in `docs/privacy/privacy-messaging.md`, no consent-screen UI task exists yet because CLAUDE.md flags it as undesigned — **do not build a consent screen under this plan without a follow-up task once that surface is designed**.
- **CLAUDE.md Build order steps 1–11:** all covered by Tasks 1–11.
- **Type consistency check:** `evaluateChunk`'s return type `{ decision, doomscroll }` is consumed identically in Task 12's own tests and Task 14's `runScreenWatcherTick`. `NoteResponse.from_orm_note` (Task 4) is reused unchanged by Task 13's `screen.py`. `compute_related_note_ids` (Task 8) is reused unchanged by Task 13. No signature drift found.
