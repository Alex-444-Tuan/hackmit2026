// Default seed list for the fail-closed allowlist gate. Where this list's
// user-editable settings surface lives (in-app screen vs. local config file)
// is still an open item per CLAUDE.md's "Screen capture" section — this
// hardcoded default lets the gate logic ship now without blocking on that
// decision. Swap this export for a settings-backed list later without
// touching screenWatcher.ts.
export const DEFAULT_ALLOWLIST: string[] = [
  'notion',
  'notion.so',
  'obsidian',
  'khanacademy.org',
  'coursera.org',
  'youtube.com', // study-context gating for this domain happens at the transcript/link level, not here
  'docs.google.com',
  'wikipedia.org',
  'chatgpt.com',
  'claude.ai'
]

/**
 * Fail-closed: empty/unrecognized input is never allowed. This is the
 * blocking precondition the privacy spec requires — it must return before
 * any chunk is captured or sent anywhere.
 */
export function isAllowed(processNameOrDomain: string, allowlist: string[] = DEFAULT_ALLOWLIST): boolean {
  const normalized = processNameOrDomain.trim().toLowerCase()
  if (!normalized) return false
  return allowlist.some((entry) => normalized === entry || normalized.includes(entry))
}
