[← Privacy-gating architecture](README.md)

# Local doomscroll signal (no upload path)

## Purpose

Let the doomscroll-nudge feature work for non-study contexts without ever
uploading the content that triggered it.

## Behavior

When the [allowlist gate](allowlist-gate.md) blocks a chunk (active app/tab
isn't on the allowlist):

- Emit `doomscroll = true` **locally**, for that timestamp.
- This feeds the pet-nudge chain-of-action described in
  `../screen-watching-brainstorm.md`, exactly as the real-time signal was
  already designed to.
- No frame or video data for that timestamp is uploaded, at all — the
  boolean is derived purely from the local classifier + allowlist match, not
  from Gemini's analysis of the content.

When the gate allows a chunk (active app/tab is on the allowlist):

- Proceed to the normal upload path — chunk goes to Gemini for
  doomscroll/content classification as already designed.

## Relationship to the existing real-time signal design

`../screen-watching-brainstorm.md` already describes a real-time chunk-by-chunk
doomscroll boolean produced by Gemini. This gate sits **in front of** that
pipeline as an additional, cheaper, fully-local decision point: most
off-task time (social media, unrelated browsing) never needs to reach Gemini
at all, since the local classifier already knows it's not an allowlisted
study context. Gemini's chunk analysis is now only needed to catch
in-app distraction *within* an allowlisted context (if that's ever a goal) —
worth deciding whether that's in scope or whether the local gate alone is
sufficient for v1.
