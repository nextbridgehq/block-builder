import { describe, it, expect } from 'vitest'
import { validateBlockSchema } from '../src/validation/schemaValidator'

describe('validateBlockSchema', () => {
  it('returns valid for a correctly formatted schema', () => {
    const validSchema = {
      layout: 'default',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Title',
          required: true
        }
      ]
    }

    const result = validateBlockSchema(validSchema)
    expect(result.valid).toBe(true)
    expect(result.errors.length).toBe(0)
  })

  it('rejects schemas missing the fields array', () => {
    const invalidSchema = {
      layout: 'default'
    }

    const result = validateBlockSchema(invalidSchema)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Schema must have a "fields" array.')
  })

  it('warns when fields array is empty', () => {
    const emptySchema = {
      fields: []
    }

    const result = validateBlockSchema(emptySchema)
    expect(result.valid).toBe(true) // Currently valid, just a warning
    expect(result.warnings).toContain('Schema has no fields defined.')
  })

  it('rejects invalid layout values', () => {
    const invalidLayoutSchema = {
      layout: 'grid',
      fields: [{ name: 'text', type: 'text' }]
    }

    const result = validateBlockSchema(invalidLayoutSchema)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('schema.layout must be one of: "default", "sidebar", "tabs".')
  })

  it('rejects invalid field names', () => {
    const invalidNamesSchema = {
      fields: [
        { name: '123invalid', type: 'text' },
        { name: 'invalid-name!', type: 'text' }
      ]
    }

    const result = validateBlockSchema(invalidNamesSchema)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('123invalid'))).toBe(true)
    expect(result.errors.some(e => e.includes('invalid-name!'))).toBe(true)
  })

  it('rejects duplicate field names', () => {
    const duplicateSchema = {
      fields: [
        { name: 'duplicate', type: 'text' },
        { name: 'duplicate', type: 'number' }
      ]
    }

    const result = validateBlockSchema(duplicateSchema)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('schema.fields: duplicate field name "duplicate".')
  })

  it('rejects Payload CMS reserved field names', () => {
    const reservedSchema = {
      fields: [
        { name: 'id', type: 'text' },
        { name: 'blockType', type: 'text' }
      ]
    }

    const result = validateBlockSchema(reservedSchema)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('schema.fields: field name "id" is a reserved word in Payload CMS.')
    expect(result.errors).toContain('schema.fields: field name "blockType" is a reserved word in Payload CMS.')
  })

  it('rejects invalid field types', () => {
    const invalidTypeSchema = {
      fields: [
        { name: 'field', type: 'magicalType' }
      ]
    }

    const result = validateBlockSchema(invalidTypeSchema)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('schema.fields[0]: unknown field type "magicalType".')
  })

  it('validates min and max on number fields', () => {
    const numberSchema = {
      fields: [
        { name: 'count', type: 'number', min: 100, max: 10 }
      ]
    }

    const result = validateBlockSchema(numberSchema)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('schema.fields[0]: "min" (100) must be <= "max" (10).')
  })

  it('requires select fields to have options', () => {
    const selectSchema = {
      fields: [
        { name: 'status', type: 'select', options: [] }
      ]
    }

    const result = validateBlockSchema(selectSchema)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('schema.fields[0]: "select" fields must have a non-empty "options" array.')
  })

  it('accepts row and collapsible fields and recurses into their fields', () => {
    const rowSchema = {
      fields: [
        {
          name: 'nameRow',
          type: 'row',
          fields: [{ name: 'first', type: 'text' }],
        },
        {
          name: 'advanced',
          type: 'collapsible',
          label: 'Advanced',
          fields: [{ name: 'flag', type: 'checkbox' }],
        },
      ],
    }

    const result = validateBlockSchema(rowSchema)
    expect(result.valid).toBe(true)
  })

  it('rejects a row field with an empty fields array', () => {
    const rowSchema = {
      fields: [{ name: 'nameRow', type: 'row', fields: [] }],
    }

    const result = validateBlockSchema(rowSchema)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('schema.fields[0]: "row" fields must have a non-empty "fields" array.')
  })

  it('validates tabs fields, recursing into each tab and requiring a label', () => {
    const tabsSchema = {
      fields: [
        {
          name: 'sections',
          type: 'tabs',
          tabs: [
            { label: 'Content', fields: [{ name: 'heading', type: 'text' }] },
            { fields: [{ name: 'metaTitle', type: 'text' }] }, // missing label
          ],
        },
      ],
    }

    const result = validateBlockSchema(tabsSchema)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('schema.fields[0].tabs[1]: "label" is required.')
  })

  it('rejects a tabs field with no tabs', () => {
    const tabsSchema = {
      fields: [{ name: 'sections', type: 'tabs', tabs: [] }],
    }

    const result = validateBlockSchema(tabsSchema)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('schema.fields[0]: "tabs" fields must have a non-empty "tabs" array.')
  })
})

describe('reserved field names', () => {
  const wrap = (fields: unknown[]) => validateBlockSchema({ fields })

  it('rejects Payload-injected keys at the block root', () => {
    for (const name of ['id', 'createdAt', 'updatedAt', 'blockType', 'blockName']) {
      const result = wrap([{ name, type: 'text' }])
      expect(result.valid, `expected "${name}" to be rejected`).toBe(false)
      expect(result.errors.join(' ')).toContain('reserved word')
    }
  })

  it('rejects a user-defined "id" inside an array, which Payload also injects', () => {
    const result = wrap([
      { name: 'items', type: 'array', fields: [{ name: 'id', type: 'text' }] },
    ])
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('reserved word')
  })

  it('allows "id" inside a group, where Payload injects nothing', () => {
    const result = wrap([
      { name: 'meta', type: 'group', fields: [{ name: 'id', type: 'text' }] },
    ])
    expect(result.errors.join(' ')).not.toContain('reserved word')
  })

  it('allows block-root-only reserved names deeper in the tree', () => {
    const result = wrap([
      { name: 'meta', type: 'group', fields: [{ name: 'blockType', type: 'text' }] },
    ])
    expect(result.errors.join(' ')).not.toContain('reserved word')
  })
})

describe('validateBlockSchema - reserved names across flattening containers', () => {
  const wrap = (fields: unknown[]) => validateBlockSchema({ fields })
  const reserved = (fields: unknown[]) => wrap(fields).errors.join(' ').includes('reserved word')

  // `row` and `collapsible` are presentational: their children are stored in the
  // surrounding object, so they collide with whatever Payload injects there.
  it('rejects "id" inside a top-level row', () => {
    expect(reserved([
      { name: 'r', type: 'row', fields: [{ name: 'id', type: 'text' }] },
    ])).toBe(true)
  })

  it('rejects "blockType" inside a top-level collapsible', () => {
    expect(reserved([
      { name: 'c', type: 'collapsible', label: 'C', fields: [{ name: 'blockType', type: 'text' }] },
    ])).toBe(true)
  })

  it('rejects "id" inside a row nested in an array row', () => {
    expect(reserved([
      {
        name: 'items',
        type: 'array',
        fields: [{ name: 'r', type: 'row', fields: [{ name: 'id', type: 'text' }] }],
      },
    ])).toBe(true)
  })

  it('rejects "id" inside an unnamed tab at the block root', () => {
    expect(reserved([
      { name: 't', type: 'tabs', tabs: [{ label: 'One', fields: [{ name: 'id', type: 'text' }] }] },
    ])).toBe(true)
  })

  it('allows "id" inside a named tab, which nests its own object', () => {
    expect(reserved([
      {
        name: 't',
        type: 'tabs',
        tabs: [{ name: 'seo', label: 'SEO', fields: [{ name: 'id', type: 'text' }] }],
      },
    ])).toBe(false)
  })

  it('allows "id" inside a group nested in a row, which opens a fresh object', () => {
    expect(reserved([
      {
        name: 'r',
        type: 'row',
        fields: [{ name: 'meta', type: 'group', fields: [{ name: 'id', type: 'text' }] }],
      },
    ])).toBe(false)
  })

  it('still allows "createdAt" inside an array row, where only "id" is injected', () => {
    expect(reserved([
      { name: 'items', type: 'array', fields: [{ name: 'createdAt', type: 'text' }] },
    ])).toBe(false)
  })
})

describe('validateBlockSchema - one namespace per stored object', () => {
  const wrap = (fields: unknown[]) => validateBlockSchema({ fields })
  const duplicate = (fields: unknown[]) =>
    wrap(fields).errors.join(' ').includes('duplicate field name')
  const reserved = (fields: unknown[]) =>
    wrap(fields).errors.join(' ').includes('reserved word')

  const row = (name: string, fields: unknown[]) => ({ name, type: 'row', fields })
  const text = (name: string) => ({ name, type: 'text' })

  // Payload stores a Row's children beside the Row's siblings, not under it, so
  // the two share one set of keys -- checking each `fields` array in isolation
  // let a genuine collision through.
  it('rejects a name shared between a root field and a field inside a Row', () => {
    expect(duplicate([text('heading'), row('r', [text('heading')])])).toBe(true)
  })

  it('rejects the same name in two sibling Rows', () => {
    expect(duplicate([row('r1', [text('heading')]), row('r2', [text('heading')])])).toBe(true)
  })

  it('rejects a name shared across a Collapsible boundary', () => {
    expect(duplicate([
      text('heading'),
      { name: 'c', type: 'collapsible', label: 'C', fields: [text('heading')] },
    ])).toBe(true)
  })

  it('rejects a name shared with an unnamed tab s children', () => {
    expect(duplicate([
      text('heading'),
      { name: 't', type: 'tabs', tabs: [{ label: 'One', fields: [text('heading')] }] },
    ])).toBe(true)
  })

  it('rejects a named tab whose name collides with a sibling field', () => {
    expect(duplicate([
      text('seo'),
      { name: 't', type: 'tabs', tabs: [{ name: 'seo', label: 'SEO', fields: [text('metaTitle')] }] },
    ])).toBe(true)
  })

  it('allows the same name inside a Group, which opens its own object', () => {
    expect(duplicate([text('heading'), { name: 'meta', type: 'group', fields: [text('heading')] }]))
      .toBe(false)
  })

  it('allows the same name inside an Array row', () => {
    expect(duplicate([text('heading'), { name: 'items', type: 'array', fields: [text('heading')] }]))
      .toBe(false)
  })

  it('allows the same name inside a named tab', () => {
    expect(duplicate([
      text('heading'),
      { name: 't', type: 'tabs', tabs: [{ name: 'seo', label: 'SEO', fields: [text('heading')] }] },
    ])).toBe(false)
  })

  // `row`, `tabs` and `collapsible` are emitted without a name at all, so theirs
  // is a builder-only handle that cannot collide with anything.
  it('allows two Rows carrying the default `rowField` name', () => {
    expect(duplicate([row('rowField', [text('left')]), row('rowField', [text('right')])])).toBe(false)
  })

  it('allows a Row to be named after a sibling field', () => {
    expect(duplicate([text('heading'), row('heading', [text('left')])])).toBe(false)
  })

  it('allows a Row named after a key Payload injects', () => {
    expect(reserved([row('id', [text('left')])])).toBe(false)
  })
})
