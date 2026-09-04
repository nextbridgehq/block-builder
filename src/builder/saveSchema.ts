import type { BasePayload } from 'payload'
import type { SaveSchemaRequest, SaveSchemaResult } from './types'
import { normaliseSchema } from './normalizer'
import { validateBlockSchema } from '../validation'
import type { BlockDefinitionDoc, BlockDefinitionVersionDoc } from '../types/payload-docs'
import { isUniqueConstraintViolation } from '../utils/isUniqueConstraintViolation'

/**
 * Saves a block schema locally to the Payload CMS database.
 *
 * This function performs validation and normalization before saving. If the block definition
 * does not exist, it creates it. It then creates a new version of the schema, using optimistic
 * concurrency locking (via a unique composite index constraint) to prevent race conditions
 * if multiple users try to save the same block simultaneously.
 *
 * @param payload - The initialized Payload CMS instance.
 * @param request - The save request containing the raw schema, block slug, and metadata.
 * @returns A promise resolving to the save result, including any validation errors or warnings.
 */
export async function saveSchemaLocally(
  payload: BasePayload,
  request: SaveSchemaRequest,
): Promise<SaveSchemaResult> {
  const { blockSlug, name, description, category, schema: rawSchema, changelog } = request

  if (!/^[a-z0-9-]+$/.test(blockSlug)) {
    return {
      success: false,
      definitionId: '',
      versionId: '',
      versionNumber: 0,
      errors: [`Invalid block slug "${blockSlug}". Use only lowercase letters, numbers, and hyphens.`],
      warnings: [],
    }
  }

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

      const updates: Partial<BlockDefinitionDoc> = {}
      if (description !== undefined) updates.description = description
      if (category !== undefined) updates.category = category
      if (name !== undefined) updates.name = name

      if (Object.keys(updates).length > 0) {
        await payload.update({
          collection: 'block-definitions',
          id: definitionId,
          data: updates,
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

      // The `find` above and this `create` are not one atomic step, and
      // `block-definitions.slug` is unique -- a second writer publishing the
      // same new block in between makes this throw a raw driver duplicate-key
      // error. That race has a correct answer: adopt the definition the other
      // writer created and carry on to the version create, which has its own
      // conflict handling below.
      try {
        const created = (await payload.create({
          collection: 'block-definitions',
          data: {
            slug: blockSlug,
            name,
            description,
          },
        })) as any
        definitionId = created.id
      } catch (err: unknown) {
        if (!isUniqueConstraintViolation(err)) throw err

        const raced = await payload.find({
          collection: 'block-definitions',
          where: { slug: { equals: blockSlug } },
          limit: 1,
        })
        // No winner to adopt means the duplicate was on some other unique
        // field, so the original error is still the accurate one.
        if (raced.docs.length === 0) throw err
        definitionId = raced.docs[0].id
      }
    }

    const latestVersionRes = await payload.find({
      collection: 'block-definition-versions',
      where: { blockDefinition: { equals: definitionId } },
      limit: 1,
      sort: '-versionNumber',
    })
    let nextVersionNumber = latestVersionRes.docs.length > 0
      ? (latestVersionRes.docs[0] as unknown as { versionNumber: number }).versionNumber + 1
      : 1

    let version: BlockDefinitionVersionDoc | null = null
    let attempts = 0
    const MAX_ATTEMPTS = 5

    while (attempts < MAX_ATTEMPTS) {
      attempts++
      try {
        version = (await payload.create({
          collection: 'block-definition-versions',
          data: {
            blockDefinition: definitionId,
            versionNumber: nextVersionNumber,
            label: `v${nextVersionNumber}`,
            schema: schema as unknown as Record<string, unknown>,
            changelog: changelog ?? 'Created via Block Builder',
          },
        })) as any
        break
      } catch (err: unknown) {
        // Only a duplicate `versionIdString` means another writer took this
        // number. Anything else -- a validation failure, a dropped connection,
        // a permissions error -- must propagate untouched, or it gets retried
        // five times and then mislabelled as a concurrency conflict.
        if (!isUniqueConstraintViolation(err)) throw err

        if (attempts >= MAX_ATTEMPTS) {
          throw new Error(
            `Failed to create version after ${MAX_ATTEMPTS} attempts due to concurrency conflicts.`,
          )
        }

        // Re-read the high-water mark rather than blind-incrementing: under real
        // contention the next number may already be taken too.
        const latest = await payload.find({
          collection: 'block-definition-versions',
          where: { blockDefinition: { equals: definitionId } },
          limit: 1,
          sort: '-versionNumber',
        })
        const observed = latest.docs.length > 0
          ? (latest.docs[0] as unknown as { versionNumber: number }).versionNumber
          : nextVersionNumber
        nextVersionNumber = Math.max(observed + 1, nextVersionNumber + 1)
      }
    }

    if (!version) {
      throw new Error('Failed to create version.')
    }

    // Always pin currentVersion to the newly published version
    await payload.update({
      collection: 'block-definitions',
      id: definitionId,
      data: { currentVersion: version.id },
    })

    return {
      success: true,
      definitionId: String(definitionId),
      versionId: String(version.id),
      versionNumber: version.versionNumber ?? 0,
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
