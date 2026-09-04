import { describe, it, expect } from 'vitest'
import { resolveId } from '../src/utils/resolveId'
import { uuidv4 } from '../src/utils/uuid'

describe('resolveId', () => {
  it('handles every shape Payload returns for a relationship value', () => {
    // depth: 0 returns the raw id; depth > 0 returns the populated document.
    expect(resolveId('abc123')).toBe('abc123')
    expect(resolveId(42)).toBe('42')
    expect(resolveId({ id: 'doc-1', slug: 'hero' })).toBe('doc-1')
    expect(resolveId({ id: 7 })).toBe('7')
  })

  it('returns null when there is no resolvable id', () => {
    expect(resolveId(null)).toBeNull()
    expect(resolveId(undefined)).toBeNull()
    expect(resolveId({})).toBeNull()
    expect(resolveId({ slug: 'no-id-here' })).toBeNull()
  })
})

describe('uuidv4', () => {
  it('produces a well-formed v4 uuid', () => {
    const id = uuidv4()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('does not collide across many calls', () => {
    const ids = new Set(Array.from({ length: 2000 }, () => uuidv4()))
    expect(ids.size).toBe(2000)
  })

  it('falls back to getRandomValues when randomUUID is unavailable', () => {
    // Reproduces a non-secure-context admin session (plain-HTTP LAN address),
    // where crypto.randomUUID is not exposed but getRandomValues is.
    const real = globalThis.crypto
    const stub = {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = (i * 37) % 256
        return arr
      },
    }
    Object.defineProperty(globalThis, 'crypto', { value: stub, configurable: true })
    try {
      expect(uuidv4()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      )
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: real, configurable: true })
    }
  })

  it('throws a clear error when no random source exists at all', () => {
    const real = globalThis.crypto
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true })
    try {
      expect(() => uuidv4()).toThrow(/secure context/i)
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: real, configurable: true })
    }
  })
})
