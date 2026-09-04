import type { CollectionConfig } from 'payload'
import { authenticated } from '../access/authenticated'

export const BlockDefinitionVersions: CollectionConfig = {
  slug: 'block-definition-versions',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['blockDefinition', 'versionNumber', 'label', 'createdAt'],
    group: 'Dynamic Blocks',
    hidden: true,
  },
  access: {
    create: authenticated,
    read: authenticated,
    update: () => false,
    delete: authenticated,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data?.blockDefinition && data?.versionNumber) {
          const bd = typeof data.blockDefinition === 'object' && data.blockDefinition !== null
            ? (data.blockDefinition as Record<string, unknown>).id
            : data.blockDefinition
          data.versionIdString = `${bd}_${data.versionNumber}`
        }
        return data
      }
    ]
  },
  fields: [
    {
      name: 'blockDefinition',
      type: 'relationship',
      relationTo: 'block-definitions',
      required: true,
      admin: { description: 'Which block type this version belongs to.' },
    },
    {
      name: 'versionNumber',
      type: 'number',
      required: true,
      admin: { description: 'Monotonically increasing integer, e.g. 1, 2, 3.' },
    },
    {
      name: 'label',
      type: 'text',
      required: false,
      admin: { description: 'Optional display name, e.g. "v2 - added hero image".' },
    },
    {
      name: 'schema',
      type: 'json',
      required: true,
      admin: {
        description:
          'JSON object with a "fields" array of BlockFieldDefinition objects. Use the visual editor below to build the schema.',
        components: {
          Field: '@nextbridgehq/payload-block-builder/client#SchemaBuilderField',
        },
      },
    },
    {
      name: 'changelog',
      type: 'textarea',
      required: false,
      admin: { description: 'Notes on what changed in this version.' },
    },
    {
      name: 'versionIdString',
      type: 'text',
      unique: true,
      admin: { hidden: true },
    },
  ],
}



