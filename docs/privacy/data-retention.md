[← Privacy-gating architecture](README.md)

# Data retention

## Purpose

Minimize what's kept, regardless of which path a chunk took.

## Rule

Raw video chunks are never persisted beyond the moment they're needed:

- **Blocked chunks** (allowlist gate said no) — never even temporarily
  stored; the local classifier's decision doesn't require the chunk itself
  to be written to disk at all.
- **Allowed chunks** (uploaded to Gemini) — deleted immediately once Gemini
  returns a result.

Only the **derived** output persists — the boolean signal, or extracted
text/concepts for the knowledge graph. Raw frames/video are never the
long-term artifact.

## Applies to

Both the real-time doomscroll path and the post-session batch content-extraction
job described in `../screen-watching-brainstorm.md` — the batch job operates
on the session's recording, but whatever that recording is (if it's retained
at all pending the batch run) is deleted once the batch job's derived output
(notes/concepts) is produced, not kept alongside it.

## Open question

Whether the post-session batch job requires the full session recording to be
held on disk temporarily (until the batch job runs) or whether chunks can be
processed and discarded incrementally even before the session ends, with only
derived per-chunk output accumulated for the batch job to work from. The
latter is more consistent with this retention rule but needs to be checked
against whatever the batch job's actual input requirements turn out to be.
