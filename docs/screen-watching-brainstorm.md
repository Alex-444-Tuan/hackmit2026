# Screen Watching, Doomscroll Detection & Pet Notifications — Brainstorm

Raw ideas, organized. This document is scoped to your thoughts only — no comparison
against the existing CLAUDE.md here (see `brainstorm-vs-claude-md.md` for that).

## Goal

Watch the user's screen during a study session to power two things: knowledge
graph content and a doomscroll-detection signal that drives pet notifications.

## Model: Gemini video understanding

Using https://ai.google.dev/gemini-api/docs/video-understanding

Verified against the docs (2026-09-17, re-check before building — docs move):

- Default sampling is **1 FPS**, but it's configurable via an `fps` param (e.g.
  `fps: 0.5` = 1 frame every 2s). Not hard-locked to 1 FPS.
- Two processing modes:
  - **Static mode**: best for short clips (<5 min), frame-level precision across
    the whole clip. Likely fit for short doomscroll chunks.
  - **Agentic mode**: better for long-form video — ~7% higher quality, up to 88%
    more token-efficient on long content. Not the fit for short real-time chunks.
- No published numbers for processing time of a 30s clip vs a 5-min clip — needs
  an actual timed benchmark before picking a chunk length.
- For long-running calls, docs recommend `stream=True` or `background=True` to
  avoid timeouts.

## Two consumers of the same screen feed

1. **Content tracking** — what the user is actually studying — feeds the
   knowledge graph.
2. **Doomscroll detection** — is the user off-task — feeds the pet's
   notification/nudge chain.

These two jobs run on different paths (real-time vs. post-session), not the same one.

## Real-time doomscroll signal

- **Chunking**: cut the live screen recording into fixed-length chunks (30s
  proposed, unvalidated — needs benchmarking) and feed each chunk to the model
  as it completes.
- **Design constraint**: the real-time path must finish processing a chunk
  faster than the chunk's own duration, or chunks back up and the pipeline
  falls behind live video. This is why this path should do the absolute
  minimum — a single yes/no classification, nothing else.
- **Signal shape (v1)**: boolean per chunk — `true` = doomscrolling detected,
  `false` = on-task. Simplest possible contract; richer shapes (confidence
  score, distraction category) are a later refinement.
- **Concurrency (POC)**: process one chunk at a time, no parallelism, no queue.
  Note for future: once chunk throughput needs to exceed one-at-a-time (model
  slower than chunk length, or multiple concurrent sessions), build a real
  queue/worker system. Explicitly out of scope for POC.
- **Open question**: actual chunk length is a guess — resolve with a timed
  benchmark against the Gemini API.

## Deferred: full content processing (post-session batch job)

- Full content extraction (what was studied, in enough detail to feed the
  knowledge graph) happens **after the session ends**, as one batch job over
  the whole session's recording — not in the real-time per-chunk path.
- Rationale: isolates the two jobs completely. The real-time path only ever
  answers "doomscrolling y/n" and stays fast; the heavier, higher-latency
  content-understanding work runs later with no real-time pressure.
- Consequence: during-session content isn't visible in the knowledge graph
  until the session ends. Worth confirming this is fine once the UI is mocked
  up — does "this builds on your previous note" need to fire live, or is
  post-session okay?

## Pet chain-of-action system

- **End-of-session celebration** — cheer up the user when a session finishes.
  Core.
- **Doomscroll nudge** — a `true` doomscroll signal triggers a pet
  chain-of-action to notify the user and pull attention back to studying.
- **Pet voice** — give the pet audio/voice as part of its notification and
  celebration actions.
- **Resting action** (future, after core is done) — a pet animation/action for
  break periods within a study session, distinct from studying and celebrating.

### Future development: rendering the pet with no latency

Current plan (per CLAUDE.md) is already a reasonable low-latency baseline —
the pet lives in its own always-on-top Electron `BrowserWindow`, and mood/state
is pushed directly from the main window through the main process to the pet
window via IPC (`sendSessionState` → relay → `onSessionState`) with **no
polling and no backend round-trip**. That part shouldn't need revisiting.

What's not yet solved, and worth real investigation later:

- **Animation smoothness, not just state-sync speed.** IPC push latency is
  already near-instant; the actual risk to "no latency" is dropped/janky
  frames during the pet's own animations (studying/celebrating/nudge/voice
  reactions), not the state update itself.
  - Prefer compositor-only CSS properties (`transform`, `opacity`) for pet
    animation over properties that trigger layout/paint (`top`, `left`,
    `width`, `height`).
  - Consider `requestAnimationFrame`-driven canvas rendering instead of
    React re-renders per animation frame if class-swapped CSS ever looks
    janky — avoids virtual-DOM diffing overhead on every frame.
  - Consider Rive or Lottie for the pet's actual animation asset if/when
    CSS/emoji polish isn't enough — both render on canvas/WebGL and are
    built for this exact "smooth small animated character" case. Note this
    is in tension with CLAUDE.md's current "no image assets" simplicity
    choice — a deliberate tradeoff to make later, not now.
- **Transparent always-on-top window compositing cost.** Frameless,
  transparent, always-on-top windows can be more expensive for the OS
  compositor than an opaque window, depending on platform/GPU. Worth an
  actual before/after benchmark (CPU/GPU usage, frame timing) on both macOS
  and Windows before assuming it's free — this is a cross-platform app and
  the two platforms' compositors behave differently.
- **Electron's baseline overhead.** Electron bundles a full Chromium
  renderer per window, which is heavier than it needs to be for a small
  always-on-top widget. Not worth changing for the hackathon build (it's the
  locked-in stack), but worth a note for later: a lighter-weight shell for
  just the pet window (e.g. Tauri's WebView-based renderer instead of a
  bundled Chromium, or a small native overlay per OS) could lower baseline
  memory/CPU and possibly rendering latency. This is a real architecture
  change, not a tweak — evaluate only if the Electron pet window turns out
  to be measurably janky in practice, don't pre-optimize.
- **Background throttling.** CLAUDE.md already flags this for the session
  timer (Chromium throttles `setInterval` when a window is hidden/minimized)
  — the same throttling risk applies to the pet window's own animation loop
  if it's ever minimized/hidden, so the same "derive from timestamps, don't
  rely on tick counting" principle likely applies to any pet animation timing
  too, not just the countdown.

## Knowledge graph

- The biggest feature, wants the most build time on it.
- Screen-watched content (from the post-session batch job) feeds into the
  knowledge graph, same destination as any other captured note.
- Reference point: **OpenClaw** (https://openclaw.ai/) — an open-source,
  local-first AI assistant with persistent memory across conversations, and
  system-level access (files, web, Obsidian, Gmail, GitHub, etc.). The idea
  being borrowed isn't the agent/automation part, it's the "assistant that
  has persistent, personal memory and can be asked about it" shape.
- **GraphRAG on top of the knowledge graph**: once the graph exists, build a
  retrieval layer so the user can ask natural-language questions and get
  answers grounded in their own captured notes/concepts — i.e. the graph
  becomes queryable by an assistant, not just browsable visually.
- **Storage**: considering **Obsidian** as the underlying store for the
  knowledge graph (its vault/markdown/link model maps naturally onto notes +
  concept links). Noting this as a real option to evaluate, not a decision yet.
- **Quiz/assignment generation**: use the knowledge graph's concepts and notes
  to generate quizzes and assignments, so users can revisit and re-learn
  material they've already captured, reinforcing understanding over time.

## Streak, progression & economy

- **Streak tracker**: studying on multiple distinct days builds a longer
  streak — a visible, persistent measure of consistency.
- **Economy/currency system**: a virtual currency the user earns (presumably
  through study sessions/streaks) and spends on:
  - opening "chests" (loot-box-style unlocks)
  - new skins for the pet
  - new skins/themes for the pet's study area
  - new animations for the doomscroll-reminder nudge
- This is presented as a bigger system than a single cosmetic — a full
  buy/unlock economy layered on top of the existing pet.

## Future development note: shared/public knowledge graphs

Not for the current build — explicitly flagged as a later idea. The concept:
let a user share part of their knowledge graph publicly. Example given: a
professor builds and releases their own knowledge graph, and other users can
benefit from that as a rich, reliable, expert-curated source rather than only
their own captured notes. This implies some future public/shared graph
namespace distinct from a single local user's private graph.

## Privacy & security

Screen capture of a user's device is legally sensitive. If the app isn't
provably secure about what it sees and stores, the feature is a liability, not
a differentiator. This needs its own dedicated security-focused development
effort — not an afterthought bolted on at the end.

Detailed design (local classification before upload, fail-closed allowlist,
retention rules, user-facing copy): see
[`privacy/README.md`](privacy/README.md).

## Open questions

1. What chunk length actually works — needs a timed benchmark, not a guess.
2. Pet voice: recorded clips or TTS.
3. Does the knowledge graph need live (during-session) updates, or is
   post-session batch acceptable for the demo narrative?
4. Concrete privacy/security requirements (retention, consent, what's stored
   vs. ephemeral) — noted as a priority, not yet spec'd.
5. Obsidian vs. a custom store for the knowledge graph — needs an evaluation,
   not yet a decision.
6. What retrieval approach GraphRAG actually uses here (embeddings + vector
   search? pure graph traversal? hybrid?) — not yet specified.
7. What currency is earned from / how much things cost — economy isn't
   designed yet, just the existence of one.
