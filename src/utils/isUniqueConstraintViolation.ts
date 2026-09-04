/**
 * Detects a duplicate-key error across the database adapters Payload supports.
 *
 * Payload does not normalise driver errors, so the shape differs per adapter:
 *  - Postgres (`pg`)          -> `err.code === '23505'`
 *  - MySQL / MariaDB          -> `err.code === 'ER_DUP_ENTRY'` or `errno 1062`
 *  - MongoDB                  -> `err.code === 11000`
 *  - SQLite (better-sqlite3)  -> `err.code` starts with `SQLITE_CONSTRAINT`
 *
 * Payload also wraps some driver errors, so the original is looked for on
 * `cause` and `originalError` before falling back to a message match. The
 * message check is last and deliberately narrow -- it exists so an unrecognised
 * adapter still retries rather than surfacing a duplicate-key error to the user,
 * not as the primary signal.
 */
export function isUniqueConstraintViolation(err: unknown): boolean {
  for (const candidate of unwrap(err)) {
    if (!candidate || typeof candidate !== 'object') continue

    const e = candidate as { code?: unknown; errno?: unknown; name?: unknown; message?: unknown }
    const code = typeof e.code === 'string' || typeof e.code === 'number' ? String(e.code) : ''

    if (code === '23505') return true // Postgres unique_violation
    if (code === '11000' || code === '11001') return true // MongoDB duplicate key
    if (code === 'ER_DUP_ENTRY') return true // MySQL / MariaDB
    if (code.startsWith('SQLITE_CONSTRAINT')) return true // SQLite
    if (e.errno === 1062) return true // MySQL numeric errno
    if (e.name === 'MongoServerError' && code === '11000') return true

    const message = typeof e.message === 'string' ? e.message.toLowerCase() : ''
    if (
      message.includes('duplicate key') ||
      message.includes('unique constraint') ||
      message.includes('duplicate entry')
    ) {
      return true
    }
  }

  return false
}

/** Yields the error plus any nested original error, depth-limited. */
function unwrap(err: unknown): unknown[] {
  const seen: unknown[] = []
  let current = err
  for (let depth = 0; depth < 5 && current; depth++) {
    if (seen.includes(current)) break
    seen.push(current)
    const next = current as { cause?: unknown; originalError?: unknown }
    current = next.cause ?? next.originalError
  }
  return seen
}
