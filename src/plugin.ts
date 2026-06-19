import type { Config, Plugin, TabsField, Tab } from 'payload'
import { randomUUID } from 'crypto'
import { BlockDefinitions } from './collections/BlockDefinitions'
import { BlockDefinitionVersions } from './collections/BlockDefinitionVersions'
import { dbLayoutField } from './fields/dbLayoutField'
import { generateEndpoint } from './endpoints/generate'
import { loadEndpoint } from './endpoints/load'
import { saveEndpoint } from './endpoints/save'
import { versionsEndpoint } from './endpoints/versions'

export interface DynamicBlocksPluginOptions {
  enabled?: boolean
  collections?: string[]
  fieldName?: string
  tabLabel?: string
}

export const dynamicBlocksPlugin = (options: DynamicBlocksPluginOptions = {}): Plugin => {
  return (incomingConfig: Config): Config => {
    const {
      enabled = true,
      collections: targetCollections = [],
      fieldName = 'dbLayout',
      tabLabel = 'DB Layout',
    } = options

    if (!enabled) return incomingConfig

    const config: Config = { ...incomingConfig }

    // â”€â”€ Register collections â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    config.collections = [
      ...(config.collections ?? []),
      BlockDefinitions,
      BlockDefinitionVersions,
    ]

    // â”€â”€ Register endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    config.endpoints = [
      ...(config.endpoints ?? []),
      {
        path: '/block-builder/generate',
        method: 'post',
        handler: generateEndpoint,
      },
      {
        path: '/block-builder/load/:slug',
        method: 'get',
        handler: loadEndpoint,
      },
      {
        path: '/blocks/save',
        method: 'post',
        handler: saveEndpoint,
      },
      {
        path: '/block-builder/versions/:slug',
        method: 'get',
        handler: versionsEndpoint,
      },
    ]

    // â”€â”€ Inject dbLayout tab into target collections â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (targetCollections.length > 0) {
      config.collections = config.collections.map((collection) => {
        if (!targetCollections.includes(collection.slug)) return collection

        const layoutTab = dbLayoutField(fieldName, tabLabel)

        // Find an existing tabs field and add our tab to it
        const existingTabsIdx = collection.fields.findIndex((f) => f.type === 'tabs')
        if (existingTabsIdx !== -1) {
          const existingTabs = collection.fields[existingTabsIdx] as TabsField
          return {
            ...collection,
            fields: collection.fields.map((f, i) =>
              i === existingTabsIdx
                ? ({
                    ...existingTabs,
                    tabs: [...existingTabs.tabs, layoutTab as Tab],
                  } as TabsField)
                : f,
            ),
          }
        }

        // No tabs field found â€” append the tab inside a new tabs field
        return {
          ...collection,
          fields: [
            ...collection.fields,
            {
              type: 'tabs' as const,
              tabs: [layoutTab as Tab],
            },
          ],
        }
      })

      // Inject beforeChange hook to auto-assign instanceId
      config.collections = config.collections.map((collection) => {
        if (!targetCollections.includes(collection.slug)) return collection

        const existingHooks = collection.hooks?.beforeChange ?? []
        return {
          ...collection,
          hooks: {
            ...collection.hooks,
            beforeChange: [
              ...existingHooks,
              ({ data }: { data: Record<string, unknown> }) => {
                if (Array.isArray(data[fieldName])) {
                  data[fieldName] = (data[fieldName] as Array<Record<string, unknown>>).map((row) =>
                    row.instanceId ? row : { ...row, instanceId: randomUUID() },
                  )
                }
                return data
              },
            ],
          },
        }
      })
    }

    return config
  }
}


