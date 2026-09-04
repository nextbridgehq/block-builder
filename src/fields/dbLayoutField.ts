import type { Tab } from 'payload'

export function dbLayoutField(fieldName: string = 'dbLayout', tabLabel: string = 'DB Layout'): Tab {
  return {
    label: tabLabel,
    fields: [
      {
        name: fieldName,
        type: 'array',
        label: 'DB Layout Blocks',
        admin: {
          description:
            'Dynamic blocks rendered on this page. Add blocks, select a block definition and version, then fill in the data fields that appear.',
          initCollapsed: true,
        },
        fields: [
          {
            type: 'row',
            fields: [
              {
                name: 'blockDefinition',
                type: 'relationship',
                relationTo: 'block-definitions',
                required: true,
                admin: {
                  description: 'Which block type to use.',
                  width: '50%',
                  components: {
                    afterInput: ['@nextbridgehq/payload-block-builder/client#BlockVersionSync'],
                  },
                },
              },
              {
                name: 'blockVersion',
                type: 'relationship',
                relationTo: 'block-definition-versions',
                required: true,
                filterOptions: ({ siblingData }) => {
                  const def = (siblingData as Record<string, unknown>)?.blockDefinition
                  if (!def) return false
                  const defId = def && typeof def === 'object' ? (def as Record<string, unknown>).id : def
                  if (!defId) return false
                  return { blockDefinition: { equals: defId } }
                },
                admin: { description: 'Which schema version to use.', width: '50%' },
              },
            ],
          },
          {
            name: 'instanceId',
            type: 'text',
            admin: {
              hidden: true,
              readOnly: true,
              description: 'Auto-assigned unique ID for this block instance.',
            },
          },
          {
            name: 'label',
            type: 'text',
            admin: {
              description: 'Optional label to identify this block in the list.',
            },
          },
          {
            name: 'data',
            type: 'json',
            admin: {
              description: 'Block field data. Automatically populated from the selected schema.',
              components: {
                Field: '@nextbridgehq/payload-block-builder/client#BlockDataField',
              },
            },
          },
          {
            name: 'hidden',
            type: 'checkbox',
            defaultValue: false,
            admin: { description: 'Hide this block on the frontend.' },
          },
          {
            name: 'anchor',
            type: 'text',
            admin: { description: 'Optional HTML anchor ID for deep-linking.' },
          },
        ],
      },
    ],
  }
}



