import { describe, it, expect } from 'vitest'
import { normaliseSchema } from '../src/builder/normalizer'
import type { RawSchemaInput } from '../src/builder/types'

describe('normaliseSchema', () => {
  it('strips invalid properties and enforces defaults', () => {
    const raw: RawSchemaInput = {
      layout: 'invalid-layout',
      // @ts-expect-error - testing invalid property
      foo: 'bar',
      fields: [
        {
          name: '  title  ',
          // @ts-expect-error - testing invalid type fallback
          type: 'magical-unknown-type',
          label: 'Title',
          invalidProp: true,
        },
        {
          name: 'count',
          type: 'number',
          min: '10', // Should be converted to number
          max: '100', // Should be converted to number
        }
      ],
    }

    const result = normaliseSchema(raw)

    // Layout should fallback to default
    expect(result.layout).toBe('default')

    // Extraneous properties on schema should not be copied
    expect((result as any).foo).toBeUndefined()

    // Field 1: text fallback, name trimmed
    expect(result.fields[0].name).toBe('title')
    expect(result.fields[0].type).toBe('text')
    expect((result.fields[0] as any).invalidProp).toBeUndefined()

    // Field 2: number casting
    expect(result.fields[1].name).toBe('count')
    expect(result.fields[1].type).toBe('number')
    if (result.fields[1].type === 'number') {
      expect(result.fields[1].min).toBe(10)
      expect(result.fields[1].max).toBe(100)
    }
  })

  it('recursively normalises nested array and group fields', () => {
    const raw: RawSchemaInput = {
      fields: [
        {
          name: 'items',
          type: 'array',
          fields: [
            {
              name: 'subName',
              type: 'text',
              required: true
            }
          ]
        },
        {
          name: 'settings',
          type: 'group',
          fields: [
            {
              name: 'enabled',
              type: 'checkbox',
              defaultValue: 1 // Truthy casting
            }
          ]
        }
      ]
    }

    const result = normaliseSchema(raw)

    expect(result.fields[0].type).toBe('array')
    if (result.fields[0].type === 'array') {
      expect(result.fields[0].fields[0].name).toBe('subName')
      expect(result.fields[0].fields[0].type).toBe('text')
      expect(result.fields[0].fields[0].required).toBe(true)
    }

    expect(result.fields[1].type).toBe('group')
    if (result.fields[1].type === 'group') {
      expect(result.fields[1].fields[0].name).toBe('enabled')
      expect(result.fields[1].fields[0].type).toBe('checkbox')
      expect(result.fields[1].fields[0].defaultValue).toBe(true)
    }
  })

  it('normalises select options', () => {
    const raw: RawSchemaInput = {
      fields: [
        {
          name: 'status',
          type: 'select',
          options: [
            'Draft', // string option
            { label: 'Published', value: 'pub' }, // object option
            { value: 'archived' } // object missing label
          ]
        }
      ]
    }

    const result = normaliseSchema(raw)

    expect(result.fields[0].type).toBe('select')
    if (result.fields[0].type === 'select') {
      expect(result.fields[0].options).toEqual([
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'pub' },
        { label: 'archived', value: 'archived' },
      ])
    }
  })

  it('recursively normalises row and collapsible fields', () => {
    const raw: RawSchemaInput = {
      fields: [
        {
          name: 'nameRow',
          type: 'row',
          fields: [
            { name: 'firstName', type: 'text' },
            { name: 'lastName', type: 'text' },
          ],
        },
        {
          name: 'advanced',
          type: 'collapsible',
          // @ts-expect-error - testing raw shape
          label: 'Advanced Settings',
          fields: [{ name: 'flag', type: 'checkbox' }],
        },
      ],
    }

    const result = normaliseSchema(raw)

    expect(result.fields[0].type).toBe('row')
    if (result.fields[0].type === 'row') {
      expect(result.fields[0].fields.map((f) => f.name)).toEqual(['firstName', 'lastName'])
    }

    expect(result.fields[1].type).toBe('collapsible')
    if (result.fields[1].type === 'collapsible') {
      expect(result.fields[1].label).toBe('Advanced Settings')
      expect(result.fields[1].fields[0].name).toBe('flag')
    }
  })

  it('normalises tabs fields, including nested fields per tab', () => {
    const raw: RawSchemaInput = {
      fields: [
        {
          name: 'sections',
          type: 'tabs',
          // @ts-expect-error - testing raw shape
          tabs: [
            {
              label: 'Content',
              name: 'content',
              fields: [{ name: 'heading', type: 'text' }],
            },
            {
              label: 'SEO',
              // no `name` -- unnamed tab, fields stay flat
              fields: [{ name: 'metaTitle', type: 'text' }],
            },
          ],
        },
      ],
    }

    const result = normaliseSchema(raw)

    expect(result.fields[0].type).toBe('tabs')
    if (result.fields[0].type === 'tabs') {
      expect(result.fields[0].tabs).toHaveLength(2)
      expect(result.fields[0].tabs[0].name).toBe('content')
      expect(result.fields[0].tabs[0].fields[0].name).toBe('heading')
      expect(result.fields[0].tabs[1].name).toBeUndefined()
      expect(result.fields[0].tabs[1].fields[0].name).toBe('metaTitle')
    }
  })
})

describe('normaliseSchema - properties the builder can set', () => {
  const first = (field: Record<string, unknown>) =>
    normaliseSchema({ fields: [field] } as unknown as RawSchemaInput).fields[0] as unknown as Record<
      string,
      unknown
    >

  it('keeps `unique` and `localized`, which apply to every field type', () => {
    const f = first({ name: 'heading', type: 'text', unique: true, localized: true })
    expect(f.unique).toBe(true)
    expect(f.localized).toBe(true)
  })

  it.each(['richtext', 'email', 'url', 'color', 'date'] as const)(
    'keeps `defaultValue` on a %s field',
    (type) => {
      expect(first({ name: 'value', type, defaultValue: 'seed' }).defaultValue).toBe('seed')
    },
  )

  it.each(['image', 'file'] as const)('keeps `collection` on a %s field', (type) => {
    expect(first({ name: 'asset', type, collection: 'documents' }).collection).toBe('documents')
  })

  it('does not invent values that were never provided', () => {
    const f = first({ name: 'heading', type: 'text' })
    expect(f).not.toHaveProperty('unique')
    expect(f).not.toHaveProperty('localized')
    expect(f).not.toHaveProperty('defaultValue')
  })
})
