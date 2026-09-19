// Local-only screen-watching logic: active-window classification and the
// fail-closed allowlist gate. Everything here runs 100% in the Electron main
// process. Never pixels, never OCR — just process/tab identity. See
// docs/screen-capture-spec.md and docs/privacy/* for the contract this file
// must satisfy.
import { isAllowed, DEFAULT_ALLOWLIST } from './allowlist'

export interface ActiveWindow {
  processName: string
  tabUrl?: string
}

/**
 * Fail-closed: an empty processName, or a processName/tabUrl not on the
 * allowlist, is always 'blocked'. There is no default-allow path.
 */
export function classifyChunk(activeWindow: ActiveWindow, allowlist: string[] = DEFAULT_ALLOWLIST): 'allowed' | 'blocked' {
  if (!activeWindow.processName) return 'blocked'
  if (activeWindow.tabUrl) {
    return isAllowed(activeWindow.tabUrl, allowlist) ? 'allowed' : 'blocked'
  }
  return isAllowed(activeWindow.processName, allowlist) ? 'allowed' : 'blocked'
}

/**
 * For a blocked context, the doomscroll signal is `true`, computed locally
 * with zero network call — this is what lets the pet's nudge work without
 * ever uploading anything. For an allowed context, doomscroll classification
 * is a real Gemini call the backend makes (POST /screen/chunk), so it's
 * `null` here rather than guessed locally.
 */
export function evaluateChunk(
  activeWindow: ActiveWindow,
  allowlist: string[] = DEFAULT_ALLOWLIST
): { decision: 'allowed' | 'blocked'; doomscroll: boolean | null } {
  const decision = classifyChunk(activeWindow, allowlist)
  return { decision, doomscroll: decision === 'blocked' ? true : null }
}

/**
 * One tick of the real-time watcher: evaluates the gate, and only calls
 * postChunk (the network boundary) when the context is allowed. A blocked
 * context never reaches postChunk at all — the doomscroll signal for it is
 * returned immediately, synchronously computed, with no await.
 */
export async function runScreenWatcherTick(
  activeWindow: ActiveWindow,
  postChunk: (sessionId: string, content: string) => Promise<{ doomscroll: boolean }>,
  sessionId = 'current'
): Promise<boolean> {
  const { decision, doomscroll } = evaluateChunk(activeWindow)
  if (decision === 'blocked') {
    return doomscroll as boolean
  }
  const result = await postChunk(sessionId, JSON.stringify(activeWindow))
  return result.doomscroll
}
