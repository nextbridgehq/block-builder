/**
 * Generates a RFC 4122 v4 UUID.
 *
 * Replaces the `uuid` package: `crypto.randomUUID()` is available in every
 * runtime this plugin supports (Node 19+, and all browsers matching Payload's
 * admin baseline), so shipping a dependency for one function is avoidable
 * weight in a package other people install.
 *
 * The fallback covers the one real gap -- `crypto.randomUUID` is only exposed on
 * `window` in secure contexts, so a plain-HTTP `http://192.168.x.x:3000` admin
 * session would otherwise throw. It uses `getRandomValues` for real entropy and
 * sets the version/variant bits by hand.
 */
export function uuidv4(): string {
  const c: Crypto | undefined = globalThis.crypto

  if (typeof c?.randomUUID === 'function') {
    return c.randomUUID()
  }

  if (typeof c?.getRandomValues === 'function') {
    const bytes = c.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10xx
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  throw new Error(
    'No cryptographic random source available. `crypto.randomUUID` requires a secure context (HTTPS or localhost).',
  )
}
