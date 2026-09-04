import type { PayloadHandler } from 'payload'
import type { BlockSchema } from '../validation/types'
import type { BlockDefinition, FieldDefinition } from '../block-builder/types'
import { uuidv4 } from '../utils/uuid'
import { resolveId } from '../utils/resolveId'
import { withBuilderGuard } from './guard'

// The persisted `BlockField` schema has no `id` per field (see validation/types.ts
// BaseField) -- ids are a block-builder UI-only concept used for React keys and
// drag-and-drop. Assign fresh ones recursively when bridging into `FieldDefinition[]`.
export function assignFieldIds(fields: unknown): FieldDefinition[] {
  if (!Array.isArray(fields)) return []
  return fields.map((field) => {
    const f = { ...(field as FieldDefinition), id: uuidv4() }
    if (Array.isArray(f.fields)) f.fields = assignFieldIds(f.fields)
    if (Array.isArray(f.tabs)) {
      f.tabs = f.tabs.map((tab) => ({ ...tab, fields: assignFieldIds(tab.fields) }))
    }
    return f
  })
}

export const loadEndpoint: PayloadHandler = withBuilderGuard(async (req) => {
  const slug = req.routeParams?.slug as string | undefined
  if (!slug) {
    return Response.json({ error: 'Slug is required' }, { status: 400 })
  }

  // Optional: load a specific version by ID
  const requestedVersionId = req.url
    ? new URL(req.url).searchParams.get('versionId')
    : null

  const result = await req.payload.find({
    collection: 'block-definitions',
    where: { slug: { equals: slug } },
    depth: 2,
    limit: 1,
  })

  const def = result.docs[0]
  if (!def) {
    return Response.json({ error: `Block definition "${slug}" not found` }, { status: 404 })
  }

  const currentVersionId = resolveId(def.currentVersion)

  let version: Record<string, unknown> | null = null

  if (requestedVersionId) {
    // Load a specific version by ID
    try {
      const v = await req.payload.findByID({
        collection: 'block-definition-versions',
        id: requestedVersionId,
        depth: 0,
      })
      version = v as unknown as Record<string, unknown>
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'NotFound') {
        return Response.json({ error: `Version "${requestedVersionId}" not found` }, { status: 404 })
      }
      return Response.json({ error: `Failed to load version "${requestedVersionId}"` }, { status: 500 })
    }
  } else if (def.currentVersion && typeof def.currentVersion === 'object') {
    version = def.currentVersion as unknown as Record<string, unknown>
  } else {
    // Fall back to latest version by number
    const latestResult = await req.payload.find({
      collection: 'block-definition-versions',
      where: { blockDefinition: { equals: def.id } },
      sort: '-versionNumber',
      depth: 0,
      limit: 1,
    })
    version = (latestResult.docs[0] as unknown as Record<string, unknown>) ?? null
  }

  function slugToInterfaceName(s: string) {
    return s.split(/[-_]/).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')
  }

  // No versions exist at all -- return empty block so builder starts blank
  if (!version) {
    const block: BlockDefinition = { id: uuidv4(), slug, interfaceName: slugToInterfaceName(slug), labels: {}, fields: [] }
    return Response.json({ block, versionId: null, versionNumber: null, isCurrent: true })
  }

  const versionId = String(version.id)
  const schema = version.schema as BlockSchema | undefined
  const schemaFields = schema
    ? Array.isArray(schema) ? schema : (schema as { fields?: unknown[] }).fields ?? []
    : []
  const labels = (version.labels as { singular?: string; plural?: string } | undefined) ?? {}
  const versionNumber = version.versionNumber as number | undefined

  const block: BlockDefinition = {
    id: uuidv4(),
    slug,
    interfaceName: slugToInterfaceName(slug),
    labels,
    fields: assignFieldIds(schemaFields),
  }

  return Response.json({
    block,
    versionId,
    versionNumber: versionNumber ?? null,
    isCurrent: versionId === currentVersionId,
  })
})
