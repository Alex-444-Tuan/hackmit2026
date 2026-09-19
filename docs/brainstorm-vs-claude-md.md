# Brainstorm vs. CLAUDE.md: What's the Same, What's Different

Comparing `screen-watching-brainstorm.md` against the current `CLAUDE.md` to
surface overlap, additions, and outright conflicts before anything gets built
or CLAUDE.md gets edited.

## Same — no conflict

| Item | CLAUDE.md | Brainstorm |
|---|---|---|
| Knowledge graph is the core differentiator | "the knowledge graph is the second-brain differentiator... required for the demo" | "the biggest feature... want more time on it" |
| End-of-session pet celebration | "Session complete: celebration, streak +1" (Pet behavior rules) | "pet chain of action at the end of the session cheer up when finishing session. this is core" |
| Concept canonicalization pipeline reused for new content | Section "How concepts stay connected" | Screen-watched content is described as feeding "the knowledge graph pipeline" — implies reusing the same pipeline, doesn't propose a new one |
| Pet never punishes | "The pet never punishes... deliberate product decision" | Doomscroll nudge is framed as a notification/attention-pull, not a penalty — consistent, though not stated as explicitly |
| Single-session, no queue/concurrency infra for v1 | Whole build is scoped to one demo user, no multi-session infra anywhere | "for POC we only focus on one at a time... note it for future development" — same instinct, applied to chunk processing |
| Streak tracker already exists | Build order step 11 ("Session completion: streak counter, log to SQLite"); `StudySession.completed` and `PetState.streak` are already in the data model | "i want to create a streak tracker, if user learn on multiple days they will have long streak" — this is already planned, just phrased as a fresh idea here |

## New — brainstorm adds something CLAUDE.md doesn't have an opinion on

| Item | Notes |
|---|---|
| Screen watching via Gemini video understanding | Entirely new capability and new vendor (Gemini) alongside Groq |
| Doomscroll detection signal (boolean per chunk) | New real-time classification job, no equivalent in CLAUDE.md |
| Real-time vs. post-session batch split for screen data | New architectural pattern specific to this feature |
| Pet voice/audio | CLAUDE.md's pet is explicitly "CSS/emoji-based... no image assets," silent |
| Pet "resting" chain-of-action for in-session breaks | Not mentioned anywhere in CLAUDE.md; CLAUDE.md only has studying/distracted/celebrating/idle moods |
| Dedicated privacy/security workstream for screen capture | CLAUDE.md has no privacy/security section at all — the app currently has no sensitive-data surface to warrant one |
| OpenClaw-style assistant framing | CLAUDE.md has no concept of a conversational assistant over the notes/graph — the graph is currently only browsed visually (GraphView + node selection), never queried in natural language |
| GraphRAG query layer | No retrieval/RAG mechanism anywhere in CLAUDE.md — "related notes" is a plain shared-concept-count join, not embedding- or LLM-retrieval-based |
| Quiz/assignment generation from the graph | Not mentioned in CLAUDE.md; no quiz/assignment data model, endpoint, or UI exists |
| Future: shared/public knowledge graphs (e.g. a professor's graph) | Not mentioned in CLAUDE.md; explicitly flagged by you as future-only, not current scope |

## Conflicting — brainstorm contradicts a locked-in CLAUDE.md decision

| Item | CLAUDE.md says | Brainstorm says | Conflict |
|---|---|---|---|
| Screen observation | Explicit non-goal: *"Screen observation / detecting which other apps or sites are active"* — listed under "do not build this weekend" | Screen watching (via Gemini) is the foundation of two core features (doomscroll detection + content tracking) | Direct contradiction. One of these has to give: either this becomes a documented phase-2/post-hackathon feature, or CLAUDE.md's non-goal is removed and the 24-hour scope grows substantially. |
| LLM vendor | "Groq API, called server-side only" — the only LLM in the architecture | Gemini video understanding added for screen analysis | Not necessarily incompatible (they'd serve different jobs), but it breaks the "single vendor" simplicity CLAUDE.md was written around, and adds a second API key/dependency to manage in a 24-hour build |
| Distraction nudge trigger mechanism | Step 13 (stretch): nudge triggered by the StudyPet **window's own focus/blur** for >3 continuous minutes — explicitly cheap and local, chosen specifically to avoid the excluded "screen observation" | Nudge triggered by a doomscroll signal derived from continuously watching screen content | These are two different mechanisms for the same feature. CLAUDE.md's version was deliberately designed to stay inside the non-goals boundary (it does not inspect content, only window focus). The brainstorm's version is the exact thing the non-goal was written to exclude. |
| Currency/economy system | Explicit non-goal: *"Complex pet gamification (shops, currencies, multiplayer)"* | Virtual currency earned and spent on chests, pet skins, study-area skins, and doomscroll-reminder animations | Direct contradiction — this is precisely the "shops, currencies" pattern the non-goals list names. |
| Graph retrieval mechanism | Explicit non-goals: *"A real graph database (Neo4j etc.) or vector store; the graph lives in SQLite join tables"* and "No embeddings, no fuzzy matching library" (concept canonicalization section) | GraphRAG so users can ask natural-language questions grounded in the graph | GraphRAG conventionally implies embeddings/vector retrieval (or at minimum an LLM-driven traversal layer) on top of the graph — the kind of infrastructure CLAUDE.md rules out twice, once for the graph itself and once for concept matching. |
| Knowledge graph storage | "SQLite via SQLAlchemy... No cloud, no auth, no multi-user" — the graph is two SQLite join tables (`concepts`, `concept_links`) queried directly by `GET /graph` | Considering Obsidian (vault/markdown files) as the underlying store | A different storage architecture entirely — Obsidian is file-based, not a SQL join-table model, and every existing endpoint/query in CLAUDE.md (`GET /graph`, `note_concepts`, concept canonicalization lookups) is written assuming SQLite. Swapping storage isn't additive, it changes the backend's data layer. |
| Shared/public knowledge graphs | Explicit non-goals: *"User accounts, cloud sync, multi-user support"* and "No cloud" throughout | Future idea: a professor publishes part of their graph publicly for others to use | Conflicts with the no-cloud/no-multi-user stance, but you've already scoped this as future-only, not part of the current build — flagging for completeness, not as something to resolve now. |

## Modified — same feature, different shape

| Item | CLAUDE.md shape | Brainstorm shape |
|---|---|---|
| Note input sources | "pasted-text" \| "uploaded-file" \| "youtube" — three fixed source types, each mapped straight to `POST /notes` | A screen-capture session becomes a new implicit input source, authored after-the-fact from a batch job rather than submitted directly by the user. No spec yet for how this segments into one or more `Note` rows (by time window? by topic shift? one note per session?) |
| When knowledge-graph content becomes available | Note capture is a single synchronous action (paste → summarize → graph updates in the same flow, per the golden demo path) | Screen-watched content only becomes available after the session ends and a batch job runs — a deliberate latency gap that doesn't exist anywhere else in CLAUDE.md's flow |
| Reusing captured content | Notes exist to be read (summary, flowchart, related notes) — a one-directional pipeline: capture → structure → display | Quiz/assignment generation reuses the same captured concepts/notes but generates new content *from* them — a second consumer of note data that CLAUDE.md's `Note`/`Concept` models weren't shaped with in mind (no quiz/question data model exists yet) |

## Net takeaway

Three things are fully aligned with no decision needed: the knowledge graph's
priority, the end-of-session celebration, and the streak tracker (already
planned). Everything else in this round of brainstorming either sits on top
of a capability CLAUDE.md currently rules out by name (screen observation,
currencies/shops, vector store/embeddings, multi-user cloud sharing) or
proposes a different architecture for something CLAUDE.md already committed
to (Obsidian vs. SQLite as the graph store). None of these are small
additions — each is a scope or architecture decision in its own right:

1. **Screen observation** (doomscroll detection, content tracking) — explicit non-goal.
2. **Currency/economy system** — explicit non-goal ("shops, currencies").
3. **GraphRAG / vector retrieval** — explicit non-goal ("no embeddings," "no... vector store").
4. **Obsidian as the graph store** — contradicts the SQLite join-table architecture the whole backend is written against.
5. **Shared/public graphs** — contradicts "no cloud, no multi-user" (but explicitly deferred by you already).

Before any of 1–4 becomes part of the actual plan, CLAUDE.md needs a
conscious edit (or these stay parked as a post-hackathon roadmap). Trying to
build all of this inside the same 24-hour window as the original golden demo
flow is very unlikely to leave the app in a working state at every step, which
CLAUDE.md's build order explicitly requires ("Never leave it in a broken state
overnight").
