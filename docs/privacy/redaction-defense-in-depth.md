[← Privacy-gating architecture](README.md)

# Defense-in-depth redaction

## Purpose

A second layer of protection for content that already passed the
[allowlist gate](allowlist-gate.md) — not a replacement for it. The allowlist
decides *whether* a chunk uploads at all; this decides what's still hidden
*within* an upload that's already been permitted.

## Behavior

Even for allowlisted apps/tabs, redact or blur fixed high-risk UI regions
before upload where feasible:

- Password fields
- Notification/toast popups (which can surface unrelated personal content —
  a DM preview, an email subject line — even inside an otherwise study-safe
  app)

## Why this exists separately from the allowlist

An allowlisted app can still transiently show sensitive content the user
didn't intend to share (a toast notification popping up while they're in
Notion, a password manager autofill prompt). The allowlist gate can't catch
this because it only looks at app/tab identity, not what's currently
rendered inside that app. This layer is scoped narrowly to fixed,
recognizable UI patterns — not general content moderation.

## Open question

Detection method for "this region is a password field" or "this region is a
toast" isn't specified yet. Options to evaluate later: OS-level accessibility
tree inspection (consistent with the local-classifier approach — reading UI
structure rather than pixels), vs. a lightweight local vision heuristic on
fixed screen regions. Needs its own spec before this is buildable.
