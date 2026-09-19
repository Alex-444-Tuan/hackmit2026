# Privacy-Gating Architecture (Screen Watching)

Elaborates on the "Privacy & security" note in
[`../screen-watching-brainstorm.md`](../screen-watching-brainstorm.md) (the
source of truth for the screen-watching feature as a whole — not edited here).
This folder is design detail for that one section only: how to make sure
sensitive screen content never leaves the device.

Status: design spec from an outside discussion, not yet built. Assumes
screen watching itself gets built, which is still an open scope question —
see `../brainstorm-vs-claude-md.md`.

## Core principle

Classify locally, before upload, fail-closed. The app decides what's
study-relevant using OS-level window/tab info — never by inspecting pixels —
and defaults to blocking upload unless the active context is explicitly
allowlisted. Nothing raw is kept once a decision is made.

## Core functions

1. [Local classifier](local-classifier.md) — reads active window/process/tab
   info via OS APIs, 100% local, no network call.
2. [Allowlist gate](allowlist-gate.md) — fail-closed decision: only an
   explicit match permits upload; the integration point that must run before
   any Gemini call.
3. [Local doomscroll signal](doomscroll-signal-local.md) — emits the
   doomscroll boolean for non-allowlisted contexts without uploading anything.
4. [Defense-in-depth redaction](redaction-defense-in-depth.md) — blurs
   high-risk UI regions even on allowlisted content, as a second layer.
5. [Data retention](data-retention.md) — raw frames/chunks are never
   persisted past the processing decision.
6. [Privacy messaging](privacy-messaging.md) — what the app is and isn't
   allowed to claim about this to the user.
