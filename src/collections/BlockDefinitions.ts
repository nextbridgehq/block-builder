import type { CollectionConfig } from 'payload'
import { authenticated } from '../access/authenticated'

export const BlockDefinitions: CollectionConfig = {
  slug: 'block-definitions',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'currentVersion', 'updatedAt'],
    group: 'Dynamic Blocks',
    hidden: true,
  },
  access: {
    create: authenticated,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'Human-readable label, e.g. "Hero Section"' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'Machine identifier, e.g. "hero-section". Should not change after creation.' },
    },
    {
      name: 'description',
      type: 'textarea',
      required: false,
    },
    {
      name: 'currentVersion',
      type: 'relationship',
      relationTo: 'block-definition-versions',
      required: false,
      admin: {
        description: 'The active schema version used when editors add a new instance of this block.',
      },
    },
    {
      name: 'editInBuilderButton',
      type: 'ui',
      admin: {
        components: {
          Field: '@nextbridgehq/payload-block-builder/client#EditInBuilderButton',
        },
      },
    },
  ],
}



