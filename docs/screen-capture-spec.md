# Screen Capture: Updated Project Structure & Function Spec

Synthesizes `screen-watching-brainstorm.md`, `brainstorm-vs-claude-md.md`, and
`privacy/*` into one buildable spec for the screen-watching feature, laid over
the existing `CLAUDE.md` architecture. This is a **proposal**, not an
approved build item — see "Status vs. CLAUDE.md" at the bottom before writing
any code against it.

## What's new vs. CLAUDE.md

CLAUDE.md's architecture has three parts: Electron shell, FastAPI backend,
SQLite. Screen capture adds a fourth concern — local OS introspection — which
must live in the **Electron main process**, not the backend, because it's the
only part of the stack with OS-level window access and because the privacy
model requires the classification step to never leave the device.

```
src/main/
  ├── index.ts
  ├── petWindow.ts
  └── screenWatcher.ts          # NEW — everything in this doc's "Screen function" section
                                 #   - active-window polling (local classifier)
                                 #   - allowlist gate (fail-closed)
                                 #   - screen chunk capture (desktopCapturer)
                                 #   - hands off only ALLOWED chunks to the backend

backend/app/
  ├── screen.py                 # NEW — routes: POST /screen/chunk, POST /screen/session-batch
  └── llm.py                    # + Gemini client alongside the existing Groq client

fixtures/
  └── sample-screen-session/    # NEW — canned chunks + expected doomscroll booleans, for demo/fixture mode
```

Data model additions (extends CLAUDE.md's `Note`/`NoteConcept`, not a
replacement):

- `Note.source` union gains `"screen-capture"` alongside `"pasted-text" |
  "uploaded-file" | "youtube"`.
- New table `screen_sessions` (sessionId, studySessionId, startedAt,
  endedAt) — links a `StudySession` to the batch-processed `Note`(s) it
  produced.
- No new table for raw chunks — per the retention rule below, chunks are
  never a persisted artifact.

## The screen function

Two independent consumers of the same local capture, on two different paths.
This split (real-time vs. post-session) is the core design decision from the
brainstorm and must not be collapsed into one path — the real-time path has a
hard latency budget the batch path doesn't.

### Path A — real-time doomscroll signal (feeds the pet)

1. `screenWatcher.ts` polls the active window/process (and tab URL, browser
   permitting) via OS APIs — Accessibility API on macOS, UI Automation on
   Windows. **Local only, no network call at this step.**
2. Every chunk (proposed 30s, unvalidated — needs a timed benchmark) is
   checked against the **allowlist gate** before anything is captured for
   upload:
   - Allowed (matches a study app/domain) → capture the chunk, `POST
     /screen/chunk` to the backend, which calls Gemini for a single yes/no
     doomscroll classification and deletes the chunk immediately on response.
   - Blocked (not on the allowlist) → **no chunk is ever captured or sent.**
     Emit `doomscroll = true` locally, in `screenWatcher.ts`, with no network
     call at all.
3. Either way, the resulting boolean is relayed to the pet window through the
   existing IPC path (`sendSessionState`-style push from main → pet window),
   the same no-polling, no-backend-round-trip mechanism CLAUDE.md already
   uses for mood/timer state. A `true` signal drives the pet's nudge
   chain-of-action (never a penalty — same rule as the rest of Pet behavior
   rules in CLAUDE.md).
4. Concurrency: one chunk at a time, no queue, no parallelism (POC only —
   explicitly deferred if throughput ever needs to exceed that).

### Path B — post-session content extraction (feeds the knowledge graph)

1. Runs once, after the session ends — not per chunk, not live.
2. Only **allowed** chunks (the ones that passed the gate during the session)
   are candidates for this batch job; blocked chunks were never captured and
   don't exist to process.
3. `POST /screen/session-batch` sends the session's allowed content to
   Gemini for full extraction, then runs it through the **existing**
   summarize → canonicalize → note pipeline (`llm.py` structured output →
   `concepts.py` canonicalization → `Note` row with `source:
   "screen-capture"`). No new pipeline — this is the same one text/YouTube
   notes already use.
4. Consequence to confirm before demo: "this builds on your previous note"
   will not appear live during a screen-watched session, only after it ends.

## Privacy of the screen function

Full detail in `privacy/*`; summarized here as the contract the code above
must satisfy.

| Layer | What it does | Where it runs |
|---|---|---|
| [Local classifier](privacy/local-classifier.md) | Reads active process/window/tab via OS APIs only — never pixels, never OCR | `screenWatcher.ts`, 100% local |
| [Allowlist gate](privacy/allowlist-gate.md) | Fail-closed: default is **do not send**; upload only on an explicit allowlist match. Must run and return before any chunk is captured or the Gemini call fires — a blocking precondition, not advisory | `screenWatcher.ts` |
| [Local doomscroll signal](privacy/doomscroll-signal-local.md) | Lets the nudge feature work for blocked contexts with zero upload | `screenWatcher.ts` |
| [Redaction](privacy/redaction-defense-in-depth.md) | Second layer even on allowlisted content: blur password fields and notification toasts before upload | `screenWatcher.ts`, pre-upload |
| [Data retention](privacy/data-retention.md) | Blocked chunks are never written to disk at all; allowed chunks are deleted immediately once Gemini returns | backend (`screen.py`) deletes on response; main process never persists a blocked chunk |
| [Privacy messaging](privacy/privacy-messaging.md) | User-facing copy must say "filtered locally, nothing sent unless confirmed study context, deleted immediately after processing" — never claim "zero third-party access" | consent/disclosure screen (not yet designed) |

Two open items called out in the docs that block implementation, not just
polish:

1. The allowlist needs a **user-editable settings surface** (add/remove study
   apps/domains) — not yet designed where it lives (in-app screen vs. local
   config file) or what ships as the default seed list.
2. Redaction's detection method for "this region is a password field / a
   toast" isn't specified — accessibility-tree inspection (consistent with
   the local classifier's approach) vs. a local vision heuristic, still an
   open evaluation.

## Status vs. CLAUDE.md — read before building

`brainstorm-vs-claude-md.md` already flags this precisely: **screen
observation is currently an explicit non-goal** in CLAUDE.md ("Screen
observation / detecting which other apps or sites are active... do not build
this weekend"), and CLAUDE.md's stretch distraction-nudge (step 13) was
deliberately designed around window focus/blur instead, specifically to stay
inside that non-goal.

This spec does not resolve that conflict — it makes the feature buildable
*if* the non-goal is lifted. Also unresolved, tracked in the brainstorm
comparison and out of scope for this document:

- Second LLM vendor (Gemini alongside Groq) — breaks the current
  single-vendor simplicity.
- GraphRAG / embeddings-based retrieval — CLAUDE.md rules out embeddings and
  vector stores twice (concept canonicalization, graph storage).
- Currency/economy system — explicit non-goal ("shops, currencies").
- Obsidian as the graph store — contradicts the SQLite join-table
  architecture every existing endpoint is written against.

None of these should be started until CLAUDE.md itself is edited to reflect
the decision, per its own instruction: "if something in here turns out to be
wrong, fix this file too." Until then, this doc is the reference for *how*
screen capture would work, not confirmation that it's in scope.
