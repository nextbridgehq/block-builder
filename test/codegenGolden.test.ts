import { describe, it, expect } from 'vitest'
import { generateBlockOutput, generateReactComponent } from '../src/block-builder/lib/codegen'
import type { BlockDefinition } from '../src/block-builder/types'

/**
 * Golden-file coverage for the emitter.
 *
 * Substring assertions only check the lines someone remembered to write an
 * assertion for -- which is exactly how `type: 'richtext'` shipped past a suite
 * that tested names, labels and structure. Snapshotting the *whole* emitted
 * block means any change to any field type shows up as a visible diff, whether
 * or not anyone thought to assert on it.
 *
 * Update with `npx vitest -u` and read the diff before accepting it.
 */
const kitchenSink: BlockDefinition = {
  id: 'block',
  slug: 'kitchen-sink',
  interfaceName: 'KitchenSink',
  labels: { singular: 'Kitchen Sink', plural: 'Kitchen Sinks' },
  fields: [
    { id: '01', type: 'text', name: 'heading', label: 'Heading', required: true },
    { id: '02', type: 'textarea', name: 'summary' },
    { id: '03', type: 'richtext', name: 'body' },
    { id: '04', type: 'number', name: 'order', defaultValue: 5 },
    { id: '05', type: 'email', name: 'contact' },
    { id: '06', type: 'date', name: 'publishedAt' },
    { id: '07', type: 'checkbox', name: 'featured', defaultValue: true },
    {
      id: '08',
      type: 'select',
      name: 'variant',
      options: [
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
      ],
    },
    {
      id: '09',
      type: 'multiselect',
      name: 'tags',
      options: [{ label: 'News', value: 'news' }],
    },
    { id: '10', type: 'image', name: 'hero' },
    { id: '11', type: 'file', name: 'brochure', collection: 'documents' },
    { id: '12', type: 'relationship', name: 'author', collection: 'users', hasMany: false },
    { id: '13', type: 'json', name: 'rawConfig' },
    { id: '14', type: 'url', name: 'externalLink' },
    { id: '15', type: 'color', name: 'accent' },
    {
      id: '16',
      type: 'group',
      name: 'cta',
      fields: [
        { id: '16a', type: 'text', name: 'label' },
        { id: '16b', type: 'url', name: 'href' },
      ],
    },
    {
      id: '17',
      type: 'array',
      name: 'items',
      minRows: 1,
      maxRows: 10,
      fields: [{ id: '17a', type: 'text', name: 'title' }],
    },
    {
      id: '18',
      type: 'row',
      name: 'rowContainer',
      fields: [
        { id: '18a', type: 'text', name: 'left' },
        { id: '18b', type: 'text', name: 'right' },
      ],
    },
    {
      id: '19',
      type: 'collapsible',
      name: 'advancedContainer',
      label: 'Advanced',
      fields: [{ id: '19a', type: 'checkbox', name: 'debug' }],
    },
    {
      id: '20',
      type: 'tabs',
      name: 'tabsContainer',
      tabs: [
        { id: 't1', name: 'seo', label: 'SEO', fields: [{ id: '20a', type: 'text', name: 'metaTitle' }] },
        { id: 't2', label: 'Notes', fields: [{ id: '20b', type: 'textarea', name: 'internalNote' }] },
      ],
    },
  ],
}

describe('codegen golden file', () => {
  it('emits a stable Payload Block config for every supported field type', () => {
    expect(generateBlockOutput(kitchenSink).code).toMatchSnapshot()
  })

  it('emits a stable React component stub', () => {
    expect(generateReactComponent(kitchenSink).code).toMatchSnapshot()
  })

  it('never emits a schema-only type name in the generated config', () => {
    const { code } = generateBlockOutput(kitchenSink)
    // These exist in our storage vocabulary but are not Payload field types.
    for (const schemaOnly of ['richtext', 'image', 'file', 'multiselect', 'url', 'color']) {
      expect(code, `"${schemaOnly}" leaked into generated config`).not.toContain(
        `type: '${schemaOnly}'`,
      )
    }
  })
})
