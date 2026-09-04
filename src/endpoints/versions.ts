import type { PayloadHandler } from 'payload'
import { resolveId } from '../utils/resolveId'
import { withBuilderGuard } from './guard'

export const versionsEndpoint: PayloadHandler = withBuilderGuard(async (req) => {
  const slug = req.routeParams?.slug as string | undefined
  if (!slug) {
    return Response.json({ error: 'Slug is required' }, { status: 400 })
  }

  const defResult = await req.payload.find({
    collection: 'block-definitions',
    where: { slug: { equals: slug } },
    depth: 1,
    limit: 1,
  })

  const def = defResult.docs[0]
  if (!def) {
    return Response.json({ error: `Block definition "${slug}" not found` }, { status: 404 })
  }

  const currentVersionId = resolveId(def.currentVersion)

  const versionsResult = await req.payload.find({
    collection: 'block-definition-versions',
    where: { blockDefinition: { equals: def.id } },
    sort: '-versionNumber',
    depth: 0,
    limit: 100,
  })

  const versions = versionsResult.docs.map((v) => {
    const id = String(v.id)
    return {
      id,
      versionNumber: (v as unknown as { versionNumber: number }).versionNumber,
      label: (v as unknown as { label?: string }).label ?? `v${(v as unknown as { versionNumber: number }).versionNumber}`,
      changelog: (v as unknown as { changelog?: string }).changelog ?? '',
      createdAt: (v as unknown as { createdAt: string }).createdAt,
      isCurrent: id === currentVersionId,
    }
  })

  return Response.json({ versions })
})
