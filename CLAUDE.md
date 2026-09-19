# CLAUDE.md

This file orients Claude Code on this repo. Read it before making architecture or scope decisions. Most of those calls have already been made below specifically to keep this buildable in 24 hours. Don't relitigate them mid-build; if something in here turns out to be wrong, fix this file too.

## What this is

**StudyPet/Pawgress** is a desktop study companion and lightweight second brain. It must run on **both macOS and Windows** (team members use both), so avoid platform-specific APIs and shell commands.

It does four things:

1. Turns lecture/study material into a summary + flowchart.
2. Merges every note's concepts into one shared **knowledge graph**, so new material visibly plugs into what you already know.
3. Accepts pasted text, uploaded text files, or a **YouTube link** (transcript only), with concepts linked back to the moment in the video.
4. Uses a small virtual pet as a focus/accountability companion during study sessions.

Positioning: *a virtual study companion that turns what you watch into connected knowledge, and keeps you from doomscrolling.*

The pet is the emotional hook. The summary/flowchart is the visible AI feature. The **knowledge graph** is the second-brain differentiator; a "related notes" sidebar alone reads as NotebookLM + pomodoro, so the graph is what makes the brain visible. Pet, summary, and graph are all required for the demo. YouTube input is a stretch step (see Build order).

## The one demo flow that must work end-to-end

Build toward this specific path before anything else:

1. User opens the app, starts a session: "Study Calculus for 25 minutes."
2. A pet appears in a small window and starts its "studying" animation.
3. User pastes a lecture transcript about derivatives into the capture screen.
4. App generates: a short summary, key concepts, and a flowchart (limits → continuity → derivatives → slope).
5. App finds an older saved note about limits and shows: "This builds on your previous note about limits."
6. User opens the Knowledge Graph view. The new derivatives concepts attach to existing nodes from the seeded notes ("Limits", "Slope", "Functions"), so the new note is visibly wired into prior knowledge. Selecting a node lists every note that mentions it.
7. Timer runs out. Pet celebrates. Session is logged (streak +1).

Stretch extension (only after 1 to 7 are solid): in step 3, paste a YouTube lecture link instead of text. Same pipeline runs on the transcript, and each concept in the note links to its timestamp in the video.

If steps 1 to 7 work reliably, the project is demo-ready. Everything else is polish.

## Tech stack (decided)

- **FastAPI backend (Python 3.11)**: owns SQLite, the LLM calls, and all business logic (capture, summarize, concept canonicalization, related notes, graph building, session CRUD) as REST endpoints. Built fresh for this project.
- **Electron + React + TypeScript**, scaffolded with **electron-vite** (see Setup). Electron is a thin shell: window management (main window + a floating, always-on-top pet window), relaying pet state between windows, and opening external links. The renderer talks to FastAPI over `http://localhost:8000`.
- **SQLite** via **SQLAlchemy** in the backend. No cloud, no auth, no multi-user. Single local demo user only.
- **Groq API**, called server-side only, so the API key never ships to the renderer/browser context.
- **Mermaid.js** in the renderer for the per-note flowchart, fed by structured JSON from the backend. Never ask the LLM to emit Mermaid syntax directly (unreliable). Ask for `{ concept, leadsTo?, relatedTo? }[]` and generate the Mermaid string in code. Node IDs must be sanitized (e.g. `n0`, `n1`) with the concept name as a quoted label, so parentheses, colons, or quotes in concept names can't break the diagram.
- **react-force-graph-2d** in the renderer for the global knowledge graph. Mermaid is fine for one note's flowchart but does not handle a growing, interactive multi-note graph well.
- **youtube-transcript-api** (Python, backend only) for the stretch YouTube input. Fetches captions only. No video or audio download.

## Architecture

```
backend/ (FastAPI, Python)
  - owns the SQLite db
  - owns the Groq client + prompt templates
  - REST endpoints: capture/summarize, related notes, graph, session CRUD
  - youtube transcript fetch (stretch)
  - CORS configured for the Electron renderer's dev origin (electron-vite default: http://localhost:5173)

src/main/ (Electron, Node/TS)
  - app entry, main window management
  - floating pet window (separate BrowserWindow, always-on-top)
  - relays session-state-changed IPC from main window to pet window
  - opens validated external links (YouTube timestamps) via shell.openExternal
  - does NOT talk to the LLM or the db directly

src/preload/
  - minimal contextBridge API, and nothing beyond it (see "Preload API")

src/renderer/ (React)
  - Dashboard: session start/pause/finish, timer, goal input
  - Capture screen: paste transcript / upload text file / YouTube link (stretch)
  - Note view: summary + Mermaid flowchart + related notes
  - Knowledge Graph view: global concept graph across all notes
  - Pet window: its own small React root, rendered in the pet BrowserWindow
  - api/client.ts: axios wrapper hitting the FastAPI backend
```

## Preload API

The preload exposes exactly this on `window.studypet`, nothing more. No raw `ipcRenderer`, no Node access in the renderer.

```ts
interface StudyPetBridge {
  // window controls
  minimize(): void;
  close(): void;
  showPet(): void;
  hidePet(): void;

  // pet state sync (main window sends, pet window listens)
  sendSessionState(state: { mood: PetState["mood"]; secondsLeft: number; streak: number }): void;
  onSessionState(cb: (state: { mood: PetState["mood"]; secondsLeft: number; streak: number }) => void): () => void; // returns unsubscribe

  // external links: main process only allows https://www.youtube.com/watch URLs
  openExternal(url: string): void;
}
```

## Project structure

```
studypet/
├── backend/                        # FastAPI
│   ├── app/
│   │   ├── main.py                 # FastAPI app + CORS config
│   │   ├── db.py                   # SQLAlchemy setup + queries + first-run seeding
│   │   ├── llm.py                  # Groq client wrapper + fixture mode
│   │   ├── concepts.py             # concept normalization + canonicalization
│   │   ├── youtube.py              # transcript fetch (stretch)
│   │   ├── models.py               # Pydantic schemas (camelCase aliases)
│   │   └── routes/
│   │       ├── notes.py            # capture, summarize, related notes
│   │       ├── graph.py            # GET /graph
│   │       └── sessions.py         # session CRUD
│   ├── requirements.txt
│   └── .env.example                # GROQ_API_KEY=, USE_FIXTURE=1
│
├── src/                             # Electron shell + React frontend
│   ├── main/
│   │   ├── index.ts                 # app entry, window management, IPC relay
│   │   └── petWindow.ts             # floating pet BrowserWindow
│   ├── preload/
│   │   └── index.ts                 # contextBridge (see Preload API)
│   └── renderer/
│       ├── App.tsx
│       ├── api/
│       │   ├── client.ts            # axios wrapper -> http://localhost:8000
│       │   └── types.ts             # TS mirrors of backend models
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── Capture.tsx
│       │   ├── NoteView.tsx         # summary + flowchart + related notes
│       │   └── GraphView.tsx        # global knowledge graph
│       ├── components/
│       │   ├── SessionTimer.tsx
│       │   ├── FlowchartView.tsx
│       │   ├── RelatedNotes.tsx
│       │   ├── KnowledgeGraph.tsx   # react-force-graph-2d wrapper
│       │   └── Pet.tsx
│       └── pet-window/
│           └── PetRoot.tsx
├── fixtures/
│   ├── sample-lecture-transcript.txt   # canned demo input (derivatives)
│   ├── fixture-summary-response.json   # canned LLM summarize output for the transcript
│   ├── seed-notes.json                 # 4 pre-seeded older notes with concepts + links
│   └── sample-youtube-transcript.json  # canned transcript segments for fixture mode
├── package.json
└── CLAUDE.md
```

electron-vite's template nests renderer files under `src/renderer/src/`. Either layout is fine; keep whichever the scaffold produces and don't spend time moving files.

## API naming convention

- **JSON over HTTP is camelCase everywhere.** Python code stays snake_case internally.
- In `models.py`, every Pydantic model uses `alias_generator=to_camel` and `populate_by_name=True`, and routes return with `response_model_by_alias=True` (or `model_dump(by_alias=True)`).
- LLM prompts request **camelCase keys** (`keyConcepts`, `leadsTo`, `relatedTo`, `firstMentionSeconds`) so the model output validates directly into the Pydantic models.

## Data models

Backend defines these as Pydantic models; the frontend mirrors them as matching TS interfaces (`src/renderer/api/types.ts`).

```ts
interface Note {
  id: string;
  title: string;
  source: "pasted-text" | "uploaded-file" | "youtube";
  sourceUrl?: string;             // youtube only
  rawContent: string;
  summary: string;
  keyConcepts: string[];          // canonical concept names
  questions: string[];
  flowchart: FlowchartEdge[];
  relatedNoteIds: string[];
  connectionSentence?: string;    // "This builds on your previous note about..."
  createdAt: string;
}

interface FlowchartEdge {
  concept: string;
  leadsTo?: string[];
  relatedTo?: string[];
}

interface Concept {
  id: string;
  name: string;                   // display name, e.g. "Derivatives"
  normalizedName: string;         // e.g. "derivative"
}

interface NoteConcept {
  noteId: string;
  conceptId: string;
  timestampSeconds?: number;      // first mention in the video, youtube notes only
}

interface GraphData {
  nodes: { id: string; name: string; noteCount: number }[];
  links: { source: string; target: string; kind: "leads-to" | "related-to" }[];
}

interface StudySession {
  id: string;
  subject: string;
  goal: string;
  durationMinutes: number;
  completed: boolean;
  relatedNoteIds: string[];
  createdAt: string;
}

interface PetState {
  experience: number;
  streak: number;
  mood: "studying" | "distracted" | "celebrating" | "idle";
  accessories: string[];
}
```

SQLite tables: `notes`, `concepts`, `note_concepts`, `concept_links` (fromConceptId, toConceptId, kind), `sessions`, `pet_state`.

## How concepts stay connected (canonicalization)

This is what makes the graph merge instead of fragmenting into duplicates. Keep it simple.

1. **Prompt side:** the summarize call includes the list of existing concept names from the `concepts` table (cap at the 150 most recent to keep the prompt small). The prompt instructs: "If a concept matches one of these, reuse the exact existing name. Only create a new name for a genuinely new concept."
2. **Code side safety net:** `concepts.py` normalizes every name before lookup:
   - lowercase, trim, collapse internal whitespace
   - singularize simple plurals: strip one trailing "s" **only if** the word is longer than 3 letters and does not end in "ss", "us", or "is" (so "calculus", "analysis", "class" stay intact)
   - apply to the last word only ("tangent lines" → "tangent line")
   - look up by `normalizedName`. Match → reuse the existing concept row (keep its original display name). No match → insert a new one.
3. **Every concept a note touches gets linked to that note.** Any concept appearing in `flowchart[].concept`, `leadsTo`, or `relatedTo` is canonicalized and added to `note_concepts` for that note, even if the LLM left it out of `keyConcepts`. This prevents orphan graph nodes with 0 notes.
4. Flowchart `leadsTo` / `relatedTo` pairs are stored in `concept_links`, deduplicated on (from, to, kind). Self links are dropped.

No embeddings, no fuzzy matching library. Only add one if the demo fixtures visibly produce duplicate nodes.

## How "related notes" works (no vector DB)

1. The summarize endpoint returns `summary`, `keyConcepts`, `questions`, and `flowchart` in one structured LLM response (one call, since latency matters live on stage).
2. After canonicalization, related notes = other notes sharing the most `conceptId`s via `note_concepts`. Rank by shared count (ties broken by most recent), take the top 3.
3. For the top match, one more short LLM call generates `connectionSentence` ("This builds on your previous note about limits because…"). Store it on the note so it isn't regenerated on every view.

## How the knowledge graph works

- `GET /graph` returns `GraphData` built straight from SQLite: every row in `concepts` is a node (`noteCount` from `note_concepts`), every row in `concept_links` is a link.
- The renderer draws it with `react-force-graph-2d`. Node size scales with `noteCount`, so shared concepts like "Limits" look like hubs.
- Selecting a node shows the notes that mention it (a small side panel; reuse `RelatedNotes` styling). Selecting a note opens `NoteView`.
- Optional polish only: highlight the concepts from the most recently created note.
- This is not a graph database. It is two join tables and a query.

## YouTube input (stretch, step 12 only)

- Capture screen accepts a YouTube URL. Backend extracts the video ID and calls `youtube-transcript-api`.
- Transcript segments are joined into text with inline `[mm:ss]` markers every ~30 seconds. The summarize prompt additionally asks for `firstMentionSeconds` per key concept, stored on `note_concepts.timestampSeconds`.
- In `NoteView`, each concept with a timestamp calls `window.studypet.openExternal("https://www.youtube.com/watch?v=<id>&t=<seconds>s")`. The main process rejects any URL that isn't `https://www.youtube.com/watch`.
- If a video has no transcript, return a clear error and tell the user to paste text instead. Don't try to transcribe audio.
- With `USE_FIXTURE=1`, skip the network fetch and load `fixtures/sample-youtube-transcript.json`.

## Build order

Work top to bottom. After each step, the app should still run. Never leave it in a broken state overnight.

1. Scaffold the FastAPI backend fresh (`main.py`, `db.py`, `llm.py`, `models.py` with camelCase aliases, `routes/`). Confirm `uvicorn` runs and CORS is open to the Electron dev origin.
2. Scaffold Electron + React + TS with electron-vite, get a blank window rendering and hitting `GET /health` on the backend. Set up the preload bridge skeleton.
3. Dashboard: goal input, start/pause/finish, timer. No AI yet. Store the session end time as a timestamp and compute remaining time from `Date.now()`; never count down with `setInterval` ticks alone, because Chromium throttles timers when the window is minimized or hidden.
4. Capture screen: paste text → `POST /notes` → save raw content only (no AI yet). Confirm SQLite read/write works, and that `seed-notes.json` loads on first startup.
5. Wire the Groq call in `backend/app/llm.py`: one structured-output prompt returning `summary`, `keyConcepts`, `questions`, `flowchart` in one camelCase JSON response, **with the existing concept list included in the prompt**. Test against `fixtures/sample-lecture-transcript.txt` before touching the UI.
6. Concept canonicalization (`concepts.py`) + `concepts`, `note_concepts`, `concept_links` tables. Verify that summarizing the derivatives fixture reuses the seeded "Limits" concept, creates no duplicate nodes, and leaves no concept with 0 notes.
7. Render the summary + Mermaid flowchart from that response.
8. Related notes (shared concept count) + the one-sentence connector call.
9. Knowledge Graph view: `GET /graph` + `GraphView.tsx` with `react-force-graph-2d`, node selection → note list.
10. Pet window: CSS/emoji-based pet (no image assets) with three moods (studying/distracted/celebrating) tied to session state, synced from the main window to the pet window via the preload bridge (`sendSessionState` → main process relays `session-state-changed` → pet window's `onSessionState`; no polling, no backend round-trip). The pet window needs its own HTML entry (e.g. `pet.html` loading `PetRoot.tsx`), added as a second renderer input in `electron.vite.config.ts`. Animation polish is optional; a state-swapped class is enough.
11. Session completion: streak counter, log to SQLite.
12. Only if the golden flow is solid: YouTube link input with timestamps (see section above).
13. Only if time still remains: distraction nudge (see Pet behavior rules), session history view, export to markdown.

## Explicit non-goals: do not build these this weekend

- Screen observation / detecting which other apps or sites are active. (Listening to StudyPet's **own** window focus/blur events for the nudge is allowed; see Pet behavior rules.)
- Browser extension
- TikTok or Canvas scraping of any kind
- YouTube beyond a single user-pasted link: no channel/playlist/feed scraping, no video or audio download, no processing of video frames
- Live lecture audio recording or transcription (transcript/text input only)
- Hard website blocking
- User accounts, cloud sync, multi-user support
- A real graph database (Neo4j etc.) or vector store; the graph lives in SQLite join tables
- Complex pet gamification (shops, currencies, multiplayer)

If an idea from the source brainstorm isn't in the "Build order" list above, it's explicitly out of scope for this build. Flag it back to the user rather than implementing it.

## Pet behavior rules

- Studying: pet reads/writes/gains experience. Calm, positive state.
- Distraction nudge (only if step 13 gets built): during an active session, if the StudyPet main window has been blurred (not focused) for more than 3 continuous minutes, set mood to `distracted` and show a gentle question in the pet window ("Back to studying?"). Refocusing the main window returns mood to `studying`. Never a penalty, never a sad/dying animation, never a system notification spam loop (max one nudge per 10 minutes).
- Session complete: celebration, streak +1, maybe unlock a cosmetic.
- The pet never punishes. This is a deliberate product decision from the original brainstorm. Don't add negative-consequence mechanics even if it seems like it'd add "depth."

## Demo-day safety net

On first startup, if the `notes` table is empty, seed `fixtures/seed-notes.json` into SQLite **including concepts and concept links**. Seed 4 short calculus notes so the graph looks like a real brain on stage:

1. **Functions** (functions, domain, range, graphs of functions)
2. **Limits** (limits, approaching a value, one-sided limits, continuity)
3. **Slope** (slope, rate of change, secant lines, functions)
4. **Tangent Lines** (tangent lines, slope, limits, instantaneous rate of change)

These overlap on purpose, so the seeded graph already has visible hubs before the live note is added.

Fixture mode is explicit, not automatic-on-error. When `USE_FIXTURE=1` (env var, or a per-request flag):

- `llm.py` summarize skips Groq and returns `fixtures/fixture-summary-response.json`. Its concepts must include the exact names "Limits", "Continuity", "Slope", and "Functions" so canonicalization merges them with the seeded notes and demo step 6 shows all three hubs.
- `llm.py` connection sentence skips Groq and returns a canned sentence templated with the top related note's title ("This builds on your previous note about {title}.").
- `youtube.py` loads `fixtures/sample-youtube-transcript.json` instead of hitting the network.

Until a `GROQ_API_KEY` is added to `.env`, default `.env` to `USE_FIXTURE=1` so the entire golden flow is testable with no key and no internet.

## Setup

Works on macOS and Windows. Differences are noted inline.

Prerequisites: Python 3.11 and Node.js 20 LTS (install Node from nodejs.org on either OS, or `brew install node` on macOS).

```bash
# backend (terminal 1)
cd backend
python -m venv venv
# macOS:   source venv/bin/activate
# Windows: venv\Scripts\activate
pip install -r requirements.txt
# macOS:   cp .env.example .env
# Windows: copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

`backend/requirements.txt`:

```
fastapi
uvicorn
sqlalchemy
groq
python-dotenv
youtube-transcript-api
```

```bash
# frontend, first time only: scaffold in a SEPARATE temp folder, outside the repo
npm create @quick-start/electron@latest studypet-scaffold -- --template react-ts
# then copy everything from studypet-scaffold/ into the repo root except node_modules,
# and delete studypet-scaffold/
```

Never run the scaffold command inside the repo. If the target folder isn't empty, its overwrite prompt can delete `backend/` and this file.

```bash
# frontend (terminal 2)
cd studypet
npm install
npm install react-force-graph-2d mermaid axios
npm run dev
```

If the repo already exists with `package.json`, skip the scaffold command and just run `npm install` and `npm run dev`.

## Conventions

- Python backend, TypeScript frontend. Don't over-engineer types on either side for a hackathon; loose typing at the HTTP boundary is fine if it saves time, but keys are always camelCase.
- No shell scripts or commands that only work on one OS. Use `path.join` in Node and `pathlib` in Python.
- No test suite for this build. Manual verification against the golden demo flow is the bar.
- Prefer one larger structured LLM call over several small ones (latency + reliability during a live demo).
- If a feature isn't needed for the golden demo flow, it's lower priority than making the golden demo flow bulletproof.