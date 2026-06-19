import type { PayloadHandler } from 'payload'
import { schemaToBuilderBlock } from '../block-builder/lib/schemaToBuilderBlock'
import type { BlockSchema } from '../validation/types'
import type { RawFieldInput } from '../builder/types'

export const loadEndpoint: PayloadHandler = async (req) => {
  if (!req.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  const name = (def as unknown as { name?: string }).name ?? slug

  // Resolve current version ID for isCurrent flag
  const currentVersionId =
    def.currentVersion && typeof def.currentVersion === 'object'
      ? String((def.currentVersion as { id: unknown }).id)
      : typeof def.currentVersion === 'string' || typeof def.currentVersion === 'number'
        ? String(def.currentVersion)
        : null

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
    } catch {
      return Response.json({ error: `Version "${requestedVersionId}" not found` }, { status: 404 })
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

  // No versions exist at all â€" return empty block so builder starts blank
  if (!version) {
    const block = schemaToBuilderBlock(slug, name, {}, [])
    return Response.json({ block, versionId: null, versionNumber: null, isCurrent: true })
  }

  const versionId = String(version.id)
  const schema = version.schema as BlockSchema | undefined
  const schemaFields = schema
    ? Array.isArray(schema) ? schema : (schema as { fields?: unknown[] }).fields ?? []
    : []
  const labels = (version.labels as { singular?: string; plural?: string } | undefined) ?? {}
  const versionNumber = version.versionNumber as number | undefined

  const block = schemaToBuilderBlock(slug, name, labels, schemaFields as unknown as RawFieldInput[])

  return Response.json({
    block,
    versionId,
    versionNumber: versionNumber ?? null,
    isCurrent: versionId === currentVersionId,
  })
}


