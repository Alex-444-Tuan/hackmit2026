[← Privacy-gating architecture](README.md)

# Allowlist gate

## Purpose

The single choke point that decides whether a screen chunk is allowed to
leave the device. Everything else in this folder feeds into or depends on
this gate.

## Fail-closed, not a blocklist

- Default behavior is **do not send**.
- Upload is permitted only when the [local classifier's](local-classifier.md)
  output matches an explicit allowlist entry (study domains/apps — Google
  Docs, Notion, PDF readers, course platforms, etc.).
- Deliberately **not** a blocklist of "personal" apps. A blocklist has to
  anticipate every sensitive app/site in advance; an unknown or brand-new
  app/service would slip through undetected and get uploaded by default.
  An allowlist fails safe: anything not explicitly recognized as study
  context is blocked by default, including apps the classifier has simply
  never seen before.

## User-editable config surface

The allowlist needs to be user-editable (add/remove study apps and domains),
since a fixed list can't anticipate every course platform or note-taking tool
a given user relies on. Needs a settings surface — not yet designed where
this lives (in-app settings screen vs. a local config file) or what the
default seed list should ship with.

## Integration point

This gate must run and return its boolean **before** the existing
chunk-upload-to-Gemini call fires — a hard sequencing requirement, not a
parallel check. If the gate call races the upload call, or the upload path
has any way to fire without first consulting the gate, the entire privacy
design fails regardless of how correct the gate's logic is. Whatever
implements the real-time chunking pipeline (see
`../screen-watching-brainstorm.md`) needs the gate call wired in as a
blocking precondition on every chunk, not an advisory signal.

## Output

A boolean decision per chunk:

- **Allowed** → proceed to normal upload path (chunk sent to Gemini for
  classification/content extraction, per the existing real-time/post-session
  split in the main brainstorm doc).
- **Blocked** → no upload for this chunk. Falls through to the
  [local doomscroll signal](doomscroll-signal-local.md) instead.
