import { describe, it, expect } from 'vitest'
import { isUniqueConstraintViolation } from '../src/utils/isUniqueConstraintViolation'

/**
 * The version-publish retry loop depends entirely on this predicate. If it
 * returns true too readily, real failures get retried five times and reported
 * as concurrency conflicts; if it returns false on a genuine duplicate,
 * concurrent publishes surface a raw driver error instead of retrying.
 */
describe('isUniqueConstraintViolation', () => {
  it('detects duplicate keys across supported database adapters', () => {
    expect(isUniqueConstraintViolation({ code: '23505' })).toBe(true) // Postgres
    expect(isUniqueConstraintViolation({ code: 11000 })).toBe(true) // MongoDB
    expect(isUniqueConstraintViolation({ code: 'ER_DUP_ENTRY' })).toBe(true) // MySQL
    expect(isUniqueConstraintViolation({ errno: 1062 })).toBe(true) // MySQL numeric
    expect(isUniqueConstraintViolation({ code: 'SQLITE_CONSTRAINT_UNIQUE' })).toBe(true)
  })

  it('finds the driver error through Payload wrapping', () => {
    expect(isUniqueConstraintViolation({ message: 'save failed', cause: { code: '23505' } })).toBe(true)
    expect(
      isUniqueConstraintViolation({ message: 'save failed', originalError: { code: 11000 } }),
    ).toBe(true)
  })

  it('falls back to a message match for unrecognised adapters', () => {
    expect(isUniqueConstraintViolation(new Error('duplicate key value violates unique constraint'))).toBe(true)
    expect(isUniqueConstraintViolation(new Error('Duplicate entry for key versionIdString'))).toBe(true)
  })

  it('does NOT match unrelated failures', () => {
    // These are the ones that previously got swallowed and mislabelled.
    expect(isUniqueConstraintViolation(new Error('ValidationError: schema.fields is required'))).toBe(false)
    expect(isUniqueConstraintViolation({ code: 'ECONNREFUSED' })).toBe(false)
    expect(isUniqueConstraintViolation({ code: '23503' })).toBe(false) // FK violation
    expect(isUniqueConstraintViolation({ code: '42501' })).toBe(false) // insufficient privilege
    expect(isUniqueConstraintViolation(null)).toBe(false)
    expect(isUniqueConstraintViolation(undefined)).toBe(false)
    expect(isUniqueConstraintViolation('boom')).toBe(false)
  })

  it('terminates on a self-referential cause chain', () => {
    const err: Record<string, unknown> = { message: 'loop' }
    err.cause = err
    expect(isUniqueConstraintViolation(err)).toBe(false)
  })
})
