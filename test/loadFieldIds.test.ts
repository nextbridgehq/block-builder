import { describe, it, expect } from 'vitest'
import { assignFieldIds } from '../src/endpoints/load'
import { normaliseSchema } from '../src/builder/normalizer'
import type { FieldDefinition } from '../src/block-builder/types'

/**
 * Persisted schemas carry no per-field `id` -- the normalizer strips it. The
 * builder keys React lists, dnd-kit sortables, and every store lookup on
 * `field.id`, so if any field comes back without one, `find(f => f.id === x)`
 * matches the first field with an undefined id and edits target the wrong row.
 */
function collectIds(fields: FieldDefinition[]): (string | undefined)[] {
  const out: (string | undefined)[] = []
  for (const f of fields) {
    out.push(f.id)
    if (f.fields) out.push(...collectIds(f.fields))
    if (f.tabs) for (const t of f.tabs) out.push(...collectIds(t.fields ?? []))
  }
  return out
}

describe('assignFieldIds', () => {
  it('assigns a unique id to every field, including nested and tab children', () => {
    const stored = normaliseSchema({
      fields: [
        { name: 'title', type: 'text' },
        {
          name: 'items',
          type: 'array',
          fields: [
            { name: 'label', type: 'text' },
            { name: 'inner', type: 'group', fields: [{ name: 'deep', type: 'text' }] },
          ],
        },
        {
          name: 'meta',
          type: 'tabs',
          tabs: [
            { label: 'SEO', name: 'seo', fields: [{ name: 'metaTitle', type: 'text' }] },
            { label: 'Other', fields: [{ name: 'note', type: 'textarea' }] },
          ],
        },
      ],
    } as never)

    // Precondition: what we persist genuinely has no ids.
    expect(collectIds(stored.fields as unknown as FieldDefinition[]).every((id) => id === undefined)).toBe(true)

    const ids = collectIds(assignFieldIds(stored.fields))

    // Derived from the tree rather than hand-counted, so adding a field to the
    // fixture can't silently weaken the assertion.
    const expectedCount = collectIds(stored.fields as unknown as FieldDefinition[]).length
    expect(expectedCount).toBe(8)
    expect(ids).toHaveLength(expectedCount)
    expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('returns an empty array for non-array input', () => {
    expect(assignFieldIds(undefined)).toEqual([])
    expect(assignFieldIds(null)).toEqual([])
    expect(assignFieldIds('nope')).toEqual([])
  })

  it('preserves all non-id field properties', () => {
    const [field] = assignFieldIds([
      { name: 'title', type: 'text', label: 'Title', required: true },
    ])
    expect(field.name).toBe('title')
    expect(field.type).toBe('text')
    expect(field.label).toBe('Title')
    expect(field.required).toBe(true)
  })
})
