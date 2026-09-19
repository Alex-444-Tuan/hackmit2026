import { describe, it, expect, vi } from 'vitest'
import { isAllowed, DEFAULT_ALLOWLIST } from '../allowlist'
import { classifyChunk, evaluateChunk, runScreenWatcherTick } from '../screenWatcher'

describe('allowlist', () => {
  it('matches a known study app case-insensitively', () => {
    expect(isAllowed('Notion', DEFAULT_ALLOWLIST)).toBe(true)
  })

  it('fails closed on an unrecognized app', () => {
    expect(isAllowed('random-unknown-app', DEFAULT_ALLOWLIST)).toBe(false)
  })

  it('fails closed on empty input', () => {
    expect(isAllowed('', DEFAULT_ALLOWLIST)).toBe(false)
  })
})

describe('classifyChunk', () => {
  it('classifies an allowlisted process as allowed', () => {
    expect(classifyChunk({ processName: 'notion' })).toBe('allowed')
  })

  it('classifies an unlisted process as blocked (fail-closed)', () => {
    expect(classifyChunk({ processName: 'some-random-game' })).toBe('blocked')
  })

  it('classifies an empty process name as blocked (fail-closed)', () => {
    expect(classifyChunk({ processName: '' })).toBe('blocked')
  })

  it('classifies a tab URL not on the allowlist as blocked even if the browser itself is allowlisted', () => {
    expect(classifyChunk({ processName: 'chrome', tabUrl: 'https://tiktok.com/foo' })).toBe('blocked')
  })

  it('classifies an allowlisted tab URL as allowed', () => {
    expect(classifyChunk({ processName: 'chrome', tabUrl: 'https://docs.google.com/document/1' })).toBe('allowed')
  })
})

describe('evaluateChunk', () => {
  it('never sets doomscroll on an allowed chunk locally (backend decides)', () => {
    const result = evaluateChunk({ processName: 'notion' })
    expect(result.decision).toBe('allowed')
    expect(result.doomscroll).toBeNull()
  })

  it('sets doomscroll true on a blocked chunk with zero network call', () => {
    const result = evaluateChunk({ processName: 'some-random-game' })
    expect(result.decision).toBe('blocked')
    expect(result.doomscroll).toBe(true)
  })
})

describe('runScreenWatcherTick', () => {
  it('never calls postChunk for a blocked context', async () => {
    const postChunk = vi.fn()
    const doomscroll = await runScreenWatcherTick({ processName: 'some-random-game' }, postChunk)
    expect(postChunk).not.toHaveBeenCalled()
    expect(doomscroll).toBe(true)
  })

  it('calls postChunk only for an allowed context and returns its result', async () => {
    const postChunk = vi.fn().mockResolvedValue({ doomscroll: false })
    const doomscroll = await runScreenWatcherTick({ processName: 'notion' }, postChunk)
    expect(postChunk).toHaveBeenCalledTimes(1)
    expect(doomscroll).toBe(false)
  })

  it('propagates a true doomscroll result from the backend for an allowed context', async () => {
    const postChunk = vi.fn().mockResolvedValue({ doomscroll: true })
    const doomscroll = await runScreenWatcherTick({ processName: 'notion' }, postChunk)
    expect(doomscroll).toBe(true)
  })
})
