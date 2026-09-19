[← Privacy-gating architecture](README.md)

# Local classifier

## Purpose

Determine what the user is currently looking at — app and, where relevant,
browser tab — entirely on-device, before any decision is made about whether
to upload anything.

## Method

Use OS-level window/process APIs, **not** pixel cropping or OCR of a fixed
screen region to guess the active tab. OCR-on-crop is fragile (breaks on
layout changes, different resolutions, window resizing) and is itself extra
image analysis of potentially sensitive pixels — the opposite of what this
layer is for.

- **macOS**: Accessibility API for the frontmost process name and window
  title. For browsers, either the Accessibility API's ability to read the
  active tab's URL/title, or browser extension messaging if Accessibility
  access proves unreliable per-browser.
- **Windows**: UI Automation for the foreground process name and window
  title. Same browser caveat — tab URL likely needs extension messaging
  rather than relying on UI Automation alone.

## Output

A small local struct, not sent anywhere yet:

```
{ processName, windowTitle, tabUrl? }
```

This is handed to the [allowlist gate](allowlist-gate.md), which makes the
actual send/don't-send decision.

## Constraints

- No network call in this step, ever. This has to be true even if the
  allowlist gate later decides to allow upload — classification itself is
  fully local.
- Must run fast enough to gate every chunk in the real-time doomscroll path
  (see `../screen-watching-brainstorm.md`'s real-time signal design) without
  becoming the bottleneck that path was designed to avoid.

## Open question

Is window-title-level classification enough for v1, or does the allowlist
need real tab-URL granularity (e.g. distinguishing a study Google Doc from a
personal one, or a course platform from a social site open in the same
browser)? A browser extension component adds real build cost — worth
deciding deliberately rather than defaulting into it.
