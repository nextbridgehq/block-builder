import { describe, it, expect, vi } from 'vitest'
import type { BasePayload } from 'payload'
import { saveSchemaLocally } from '../src/builder/saveSchema'
import type { SaveSchemaRequest } from '../src/builder/types'

const request = (overrides: Partial<SaveSchemaRequest> = {}): SaveSchemaRequest =>
  ({
    blockSlug: 'hero',
    name: 'Hero',
    schema: { fields: [{ name: 'heading', type: 'text' }] },
    ...overrides,
  }) as SaveSchemaRequest

type MockOptions = {
  /** Version numbers already in the database. */
  existingVersions?: number[]
  /** Thrown by `create` on the versions collection, one per call. */
  createErrors?: (unknown | null)[]
  /** `false` sends saveSchemaLocally down the create-the-definition path. */
  existingDefinition?: boolean
  /** Thrown by `create` on the definitions collection, one per call. */
  definitionCreateErrors?: (unknown | null)[]
  /**
   * A definition another writer inserted between our lookup and our create.
   * Only the *second* lookup sees it, which is exactly the race being tested.
   */
  racedDefinition?: { id: string; slug: string } | null
}

/**
 * Minimal Payload stand-in: just enough surface for saveSchemaLocally. Real
 * Payload is not importable in a unit test, and a database container to prove a
 * retry branch would be far more machinery than the branch is worth.
 */
function mockPayload({
  existingVersions = [],
  createErrors = [],
  existingDefinition = true,
  definitionCreateErrors = [],
  racedDefinition = null,
}: MockOptions = {}) {
  const versions = [...existingVersions]
  let createCall = 0
  let definitionCreateCall = 0
  let definitionLookups = 0

  const findVersions = vi.fn(async () => ({
    docs: versions.length
      ? [{ id: 'v', versionNumber: Math.max(...versions) }]
      : [],
  }))

  const payload = {
    find: vi.fn(async ({ collection }: { collection: string }) => {
      if (collection === 'block-definitions') {
        definitionLookups++
        if (existingDefinition) return { docs: [{ id: 'def-1', slug: 'hero' }] }
        return { docs: definitionLookups > 1 && racedDefinition ? [racedDefinition] : [] }
      }
      return findVersions()
    }),
    create: vi.fn(async ({ collection, data }: { collection: string; data: Record<string, unknown> }) => {
      if (collection !== 'block-definition-versions') {
        const defErr = definitionCreateErrors[definitionCreateCall++]
        if (defErr) throw defErr
        return { id: 'def-1' }
      }
      const err = createErrors[createCall++]
      if (err) throw err
      const versionNumber = data.versionNumber as number
      versions.push(versionNumber)
      return { id: `ver-${versionNumber}`, versionNumber }
    }),
    update: vi.fn(async () => ({ id: 'def-1' })),
  }

  return { payload: payload as unknown as BasePayload, spies: payload, findVersions }
}

describe('saveSchemaLocally — version numbering', () => {
  it('starts at 1 when no versions exist', async () => {
    const { payload } = mockPayload()
    const result = await saveSchemaLocally(payload, request())
    expect(result.success).toBe(true)
    expect(result.versionNumber).toBe(1)
  })

  it('takes max + 1, not count + 1, so deletions cannot reuse a number', async () => {
    // v1 and v2 were deleted; a count-based scheme would hand out 2 again.
    const { payload } = mockPayload({ existingVersions: [3] })
    const result = await saveSchemaLocally(payload, request())
    expect(result.versionNumber).toBe(4)
  })

  it('rejects a slug that is not lowercase-kebab before touching the database', async () => {
    const { payload, spies } = mockPayload()
    const result = await saveSchemaLocally(payload, request({ blockSlug: 'HeroCopy' }))
    expect(result.success).toBe(false)
    expect(result.errors?.[0]).toMatch(/Invalid block slug/)
    expect(spies.create).not.toHaveBeenCalled()
  })
})

describe('saveSchemaLocally — retry behaviour', () => {
  it('retries on a duplicate-key error and succeeds with the next number', async () => {
    const { payload, spies } = mockPayload({
      existingVersions: [1],
      createErrors: [{ code: '23505', message: 'duplicate key' }],
    })

    const result = await saveSchemaLocally(payload, request())

    expect(result.success).toBe(true)
    expect(result.versionNumber).toBe(3) // 2 was taken by the other writer
    expect(spies.create).toHaveBeenCalledTimes(2)
  })

  it('propagates a non-duplicate error instead of mislabelling it', async () => {
    // This is the regression the previous blanket `catch` caused: a validation
    // failure was retried five times and then surfaced as a concurrency
    // conflict, sending anyone debugging it in entirely the wrong direction.
    const validationError = Object.assign(new Error('ValidationError: schema is invalid'), {
      code: 'VALIDATION',
    })
    const { payload, spies } = mockPayload({ createErrors: [validationError] })

    // saveSchemaLocally converts throws into a failed result rather than
    // rejecting, so assert on the surfaced message.
    const result = await saveSchemaLocally(payload, request())

    expect(result.success).toBe(false)
    expect(result.errors?.join(' ')).toContain('ValidationError')
    expect(result.errors?.join(' ')).not.toContain('concurrency')
    expect(spies.create).toHaveBeenCalledTimes(1) // no pointless retries
  })

  it('gives up with a concurrency message after exhausting attempts', async () => {
    const dup = { code: '23505', message: 'duplicate key' }
    const { payload, spies } = mockPayload({
      createErrors: [dup, dup, dup, dup, dup],
    })

    const result = await saveSchemaLocally(payload, request())

    expect(result.success).toBe(false)
    expect(result.errors?.join(' ')).toContain('concurrency conflicts')
    expect(spies.create).toHaveBeenCalledTimes(5)
  })
})

describe('saveSchemaLocally - concurrent creation of the same definition', () => {
  // `block-definitions.slug` is unique and the find-then-create around it is not
  // atomic, so two writers publishing the same new block at once means one of
  // them gets a raw driver duplicate-key error back.
  const duplicate = Object.assign(
    new Error('duplicate key value violates unique constraint'),
    { code: '23505' },
  )

  it('adopts the definition the other writer created', async () => {
    const { payload } = mockPayload({
      existingDefinition: false,
      definitionCreateErrors: [duplicate],
      racedDefinition: { id: 'def-2', slug: 'hero' },
    })

    const result = await saveSchemaLocally(payload, request())

    expect(result.success).toBe(true)
    expect(result.definitionId).toBe('def-2')
    expect(result.errors ?? []).toEqual([])
  })

  it('propagates a non-duplicate definition error untouched', async () => {
    const { payload } = mockPayload({
      existingDefinition: false,
      definitionCreateErrors: [new Error('database is read-only')],
    })

    const result = await saveSchemaLocally(payload, request())

    expect(result.success).toBe(false)
    expect(result.errors?.join(' ')).toContain('database is read-only')
  })

  it('rethrows when the duplicate was on some other unique field', async () => {
    // Nothing to adopt means the collision was not on `slug`, so swallowing the
    // error would hide the real cause.
    const { payload } = mockPayload({
      existingDefinition: false,
      definitionCreateErrors: [duplicate],
      racedDefinition: null,
    })

    const result = await saveSchemaLocally(payload, request())

    expect(result.success).toBe(false)
    expect(result.errors?.join(' ')).toContain('duplicate key')
  })
})
