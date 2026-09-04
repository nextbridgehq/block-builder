import { describe, it, expect } from 'vitest'
import { generateAllBlocks, generateBlockOutput, generateReactComponent } from '../src/block-builder/lib/codegen'
import type { BlockDefinition, FieldDefinition } from '../src/block-builder/types'

describe('generateBlockOutput', () => {
  it('emits a tabs array with named and unnamed tabs, and omits name on row/tabs/collapsible', () => {
    const block: BlockDefinition = {
      id: 'b1',
      slug: 'hero',
      interfaceName: 'Hero',
      fields: [
        {
          id: 'f1',
          type: 'row',
          name: 'rowField',
          fields: [
            { id: 'f2', type: 'text', name: 'heading', label: 'Heading' },
          ],
        },
        {
          id: 'f3',
          type: 'tabs',
          name: 'tabsField',
          tabs: [
            {
              id: 't1',
              name: 'content',
              label: 'Content',
              fields: [{ id: 'f4', type: 'text', name: 'body' }],
            },
            {
              id: 't2',
              label: 'Meta',
              fields: [{ id: 'f5', type: 'text', name: 'metaTitle' }],
            },
          ],
        },
      ],
    }

    const { code } = generateBlockOutput(block)

    // row/tabs must not emit `name:` for themselves
    expect(code).not.toMatch(/name:\s*"rowField"/)
    expect(code).not.toMatch(/name:\s*"tabsField"/)

    // tabs array must actually be present
    expect(code).toMatch(/tabs:\s*\[/)
    expect(code).toContain('name: "content"')
    expect(code).toContain('label: "Content"')
    expect(code).toContain('label: "Meta"')
    // unnamed tab must not get a name
    expect(code).not.toMatch(/name:\s*"Meta"/)

    // nested field names inside the row/tabs must still appear
    expect(code).toContain('name: "heading"')
    expect(code).toContain('name: "body"')
    expect(code).toContain('name: "metaTitle"')
  })

  it('emits unquoted numeric and boolean defaultValue', () => {
    const block: BlockDefinition = {
      id: 'b2',
      slug: 'settings',
      fields: [
        { id: 'f1', type: 'number', name: 'count', defaultValue: 5 },
        { id: 'f2', type: 'checkbox', name: 'enabled', defaultValue: true },
      ],
    }

    const { code } = generateBlockOutput(block)
    expect(code).toContain('defaultValue: 5')
    expect(code).not.toContain('defaultValue: "5"')
    expect(code).toContain('defaultValue: true')
    expect(code).not.toContain('defaultValue: "true"')
  })
})

describe('generateReactComponent', () => {
  it('flattens row/collapsible children and only nests named tabs', () => {
    const block: BlockDefinition = {
      id: 'b3',
      slug: 'hero',
      interfaceName: 'Hero',
      fields: [
        {
          id: 'f1',
          type: 'row',
          name: 'rowField',
          fields: [{ id: 'f2', type: 'text', name: 'heading' }],
        },
        {
          id: 'f3',
          type: 'tabs',
          name: 'tabsField',
          tabs: [
            {
              id: 't1',
              name: 'content',
              label: 'Content',
              fields: [{ id: 'f4', type: 'text', name: 'body' }],
            },
            {
              id: 't2',
              label: 'Meta',
              fields: [{ id: 'f5', type: 'text', name: 'metaTitle' }],
            },
          ],
        },
      ],
    }

    const { code } = generateReactComponent(block)

    // flattened: heading (from row) and metaTitle (from unnamed tab) are top-level props
    expect(code).toContain('heading: string')
    expect(code).toContain('metaTitle: string')
    // named tab nests its own object type keyed by the tab name
    expect(code).toMatch(/content:\s*\{\s*body:\s*string\s*\}/)
    // the container fields themselves are never props
    expect(code).not.toContain('rowField:')
    expect(code).not.toContain('tabsField:')
  })
})

describe('generateBlockOutput — Payload type mapping', () => {
  // These are the assertions that were missing: the previous suite checked
  // names, labels and structure, but never the emitted `type:` string, so
  // `type: 'richtext'` (not a Payload type) passed unnoticed.
  it('translates schema type names to real Payload field types', () => {
    const block: BlockDefinition = {
      id: 'b',
      slug: 'mixed',
      fields: [
        { id: '1', type: 'richtext', name: 'body' },
        { id: '2', type: 'image', name: 'photo' },
        { id: '3', type: 'file', name: 'attachment' },
        { id: '4', type: 'multiselect', name: 'tags', options: [{ label: 'A', value: 'a' }] },
        { id: '5', type: 'url', name: 'link' },
        { id: '6', type: 'color', name: 'accent' },
        { id: '7', type: 'text', name: 'heading' },
      ],
    }

    const { code } = generateBlockOutput(block)

    expect(code).toContain("type: 'richText'")
    expect(code).not.toContain("type: 'richtext'")

    // image and file both become Payload `upload`
    expect(code).not.toContain("type: 'image'")
    expect(code).not.toContain("type: 'file'")
    expect(code.match(/type: 'upload'/g)).toHaveLength(2)

    // multiselect collapses to select + hasMany
    expect(code).not.toContain("type: 'multiselect'")
    expect(code).toContain('hasMany: true')

    // url/color have no Payload equivalent and fall back to text
    expect(code).not.toContain("type: 'url'")
    expect(code).not.toContain("type: 'color'")
    expect(code.match(/type: 'text'/g)).toHaveLength(3)
  })

  it('gives upload fields a relationTo, defaulting to media', () => {
    const block: BlockDefinition = {
      id: 'b',
      slug: 'media-block',
      fields: [
        { id: '1', type: 'image', name: 'hero' },
        { id: '2', type: 'file', name: 'brochure', collection: 'documents' },
      ],
    }

    const { code } = generateBlockOutput(block)
    expect(code).toContain('relationTo: "media"')
    expect(code).toContain('relationTo: "documents"')
  })

  it('imports lexicalEditor when the only richtext field is inside a tab', () => {
    const block: BlockDefinition = {
      id: 'b',
      slug: 'tabbed',
      fields: [
        {
          id: '1',
          type: 'tabs',
          name: 'tabsField',
          tabs: [{ id: 't', label: 'Content', fields: [{ id: '2', type: 'richtext', name: 'body' }] }],
        },
      ],
    }

    const { code } = generateBlockOutput(block)
    expect(code).toContain('lexicalEditor({})')
    expect(code).toContain("import { lexicalEditor } from '@payloadcms/richtext-lexical'")
  })

  it('imports lexicalEditor for richtext nested in a group', () => {
    const block: BlockDefinition = {
      id: 'b',
      slug: 'grouped',
      fields: [
        { id: '1', type: 'group', name: 'seo', fields: [{ id: '2', type: 'richtext', name: 'body' }] },
      ],
    }

    const { code } = generateBlockOutput(block)
    expect(code).toContain("import { lexicalEditor } from '@payloadcms/richtext-lexical'")
  })

  it('omits the lexical import when no richtext field exists anywhere', () => {
    const block: BlockDefinition = {
      id: 'b',
      slug: 'plain',
      fields: [{ id: '1', type: 'text', name: 'heading' }],
    }

    const { code } = generateBlockOutput(block)
    expect(code).not.toContain('@payloadcms/richtext-lexical')
    expect(code).not.toContain('lexicalEditor')
  })
})

describe('generateAllBlocks', () => {
  const blocks: BlockDefinition[] = [
    { id: 'b', slug: 'hero', interfaceName: 'Hero', fields: [{ id: '1', type: 'text', name: 'title' }] },
  ]

  it('emits one file per block by default', () => {
    const out = generateAllBlocks(blocks)
    expect(out).toHaveLength(1)
    expect(out[0].filename).toBe('hero.ts')
  })

  it('emits the React stub only when explicitly requested', () => {
    const out = generateAllBlocks(blocks, { react: true })
    expect(out.map((o) => o.filename)).toEqual(['hero.ts', 'Hero.tsx'])
  })
})

describe('generateBlockOutput - keys Payload omits from structural fields', () => {
  const wrap = (field: FieldDefinition) =>
    generateBlockOutput({ id: 'b', slug: 'demo', fields: [field] }).code

  it('drops `label` on a row, which RowField has no such property for', () => {
    const code = wrap({
      id: 'f1',
      type: 'row',
      name: 'rowField',
      label: 'Row Field',
      fields: [{ id: 'f2', type: 'text', name: 'heading' }],
    })
    expect(code).not.toMatch(/label:\s*"Row Field"/)
  })

  it('keeps `label` on a collapsible, where Payload requires it', () => {
    const code = wrap({
      id: 'f1',
      type: 'collapsible',
      name: 'advanced',
      label: 'Advanced',
      fields: [{ id: 'f2', type: 'checkbox', name: 'debug' }],
    })
    expect(code).toContain('label: "Advanced"')
  })

  it('drops `localized` on row, tabs and collapsible', () => {
    const row = wrap({
      id: 'f1', type: 'row', name: 'r', localized: true,
      fields: [{ id: 'f2', type: 'text', name: 'heading' }],
    })
    const collapsible = wrap({
      id: 'f1', type: 'collapsible', name: 'c', label: 'C', localized: true,
      fields: [{ id: 'f2', type: 'text', name: 'heading' }],
    })
    const tabs = wrap({
      id: 'f1', type: 'tabs', name: 't', localized: true,
      tabs: [{ id: 't1', label: 'One', fields: [{ id: 'f2', type: 'text', name: 'heading' }] }],
    })
    for (const code of [row, collapsible, tabs]) {
      expect(code).not.toContain('localized: true')
    }
  })

  it('still emits `localized` on a data-bearing field', () => {
    expect(wrap({ id: 'f1', type: 'text', name: 'heading', localized: true }))
      .toContain('localized: true')
  })

  it('drops `admin.description` on row and tabs, which omit it', () => {
    const row = wrap({
      id: 'f1', type: 'row', name: 'r', admin: { description: 'nope' },
      fields: [{ id: 'f2', type: 'text', name: 'heading' }],
    })
    const collapsible = wrap({
      id: 'f1', type: 'collapsible', name: 'c', label: 'C', admin: { description: 'kept' },
      fields: [{ id: 'f2', type: 'text', name: 'heading' }],
    })
    expect(row).not.toContain('nope')
    expect(collapsible).toContain('description: "kept"')
  })
})

describe('generateBlockOutput - empty containers', () => {
  const wrap = (field: FieldDefinition) =>
    generateBlockOutput({ id: 'b', slug: 'demo', fields: [field] }).code

  // A container Payload can't find its child key on does not compile, and Code
  // Preview renders whatever the emitter produces without validating it first.
  it.each(['array', 'group', 'row', 'collapsible'] as const)(
    'emits `fields: []` for an empty %s',
    (type) => {
      const code = wrap({ id: 'f1', type, name: 'container', label: 'Container', fields: [] })
      expect(code).toContain('fields: []')
    },
  )

  it('emits `fields: []` for a container with no `fields` property at all', () => {
    expect(wrap({ id: 'f1', type: 'group', name: 'container' })).toContain('fields: []')
  })

  it('emits `tabs: []` for a tabs field with no tabs, and `fields: []` for an empty tab', () => {
    expect(wrap({ id: 'f1', type: 'tabs', name: 'container', tabs: [] })).toContain('tabs: []')
    const oneEmptyTab = wrap({
      id: 'f1', type: 'tabs', name: 'container',
      tabs: [{ id: 't1', label: 'One', fields: [] }],
    })
    expect(oneEmptyTab).toContain('fields: []')
  })

  it('emits the required `blocks` key for a blocks field', () => {
    expect(wrap({ id: 'f1', type: 'blocks', name: 'sections' })).toContain('blocks: []')
  })

  it('leaves a leaf field without a `fields` key', () => {
    // Only the Block's own `fields:` should appear -- not one on the text field.
    const code = wrap({ id: 'f1', type: 'text', name: 'heading' })
    expect(code.match(/fields:/g)).toHaveLength(1)
  })
})
