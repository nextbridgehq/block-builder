import type { BasePayload } from 'payload'
import type { SaveSchemaRequest, SaveSchemaResult } from './types'
import { normaliseSchema } from './normalizer'
import { validateBlockSchema } from '../validation'

export async function saveSchemaLocally(
  payload: BasePayload,
  request: SaveSchemaRequest,
): Promise<SaveSchemaResult> {
  const { blockSlug, name, description, category, schema: rawSchema, changelog } = request

  const schema = normaliseSchema(rawSchema as Parameters<typeof normaliseSchema>[0])

  if (!schema.fields?.length) {
    return {
      success: false,
      definitionId: '',
      versionId: '',
      versionNumber: 0,
      errors: [`Block "${blockSlug}" schema has no fields. Schemas must be imported from a server-safe module (not a "use client" file).`],
      warnings: [],
    }
  }

  const validation = validateBlockSchema(schema)
  if (!validation.valid) {
    return {
      success: false,
      definitionId: '',
      versionId: '',
      versionNumber: 0,
      errors: validation.errors,
      warnings: validation.warnings,
    }
  }

  try {
    let definitionId: string | number

    const existing = await payload.find({
      collection: 'block-definitions',
      where: { slug: { equals: blockSlug } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      definitionId = existing.docs[0].id

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: Record<string, any> = {}
      if (description !== undefined) updates.description = description
      if (category !== undefined) updates.category = category
      if (name !== undefined) updates.name = name

      if (Object.keys(updates).length > 0) {
        await payload.update({
          collection: 'block-definitions',
          id: definitionId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: updates as any,
        })
      }
    } else {
      if (!name) {
        return {
          success: false,
          definitionId: '',
          versionId: '',
          versionNumber: 0,
          errors: [`Block definition "${blockSlug}" not found. Provide a "name" to create it.`],
          warnings: validation.warnings,
        }
      }

      const created = await payload.create({
        collection: 'block-definitions',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: {
          slug: blockSlug,
          name,
          description,
        } as any,
      })
      definitionId = created.id
    }

    const existingVersions = await payload.find({
      collection: 'block-definition-versions',
      where: { blockDefinition: { equals: definitionId } },
      limit: 0,
    })
    const versionNumber = existingVersions.totalDocs + 1

    const version = await payload.create({
      collection: 'block-definition-versions',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: {
        blockDefinition: definitionId,
        versionNumber,
        label: `v${versionNumber}`,
        schema: schema as unknown as Record<string, unknown>,
        changelog: changelog ?? 'Created via Block Builder',
      } as any,
    })

    // Always pin currentVersion to the newly published version
    await payload.update({
      collection: 'block-definitions',
      id: definitionId,
      data: { currentVersion: version.id } as any,
    })

    return {
      success: true,
      definitionId: String(definitionId),
      versionId: String(version.id),
      versionNumber: (version as unknown as { versionNumber?: number }).versionNumber ?? 0,
      warnings: validation.warnings,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      definitionId: '',
      versionId: '',
      versionNumber: 0,
      errors: [`Unexpected error: ${message}`],
      warnings: validation.warnings,
    }
  }
}


