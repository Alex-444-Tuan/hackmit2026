[← Privacy-gating architecture](README.md)

# Privacy messaging

## Purpose

Make sure whatever the app tells the user about this system is accurate —
not reassuring-but-false.

## Don't claim

"Zero third-party access to sensitive data" — unverifiable, and actually
false as a guarantee: the local classifier can misclassify (an unlisted study
tool gets blocked when it shouldn't be, or in principle a misconfigured
allowlist entry could let something through). Promising zero risk overstates
what a fail-closed allowlist can actually guarantee.

## Correct framing

> Screen content is filtered locally before anything is sent to our AI
> provider. By default nothing is sent unless the active app is confirmed as
> a study context; frames are deleted immediately after processing.

This is accurate to what's actually built: local-first filtering, fail-closed
default, no retention — without promising an unverifiable absolute.

## Where this belongs

`../screen-watching-brainstorm.md`'s privacy section already flags that a
consent/disclosure flow is needed before first use. This is the copy that
flow should carry — this doc doesn't introduce a new surface, it specifies
what the existing planned disclosure step should actually say.
