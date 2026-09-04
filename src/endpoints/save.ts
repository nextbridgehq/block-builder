import type { PayloadHandler } from 'payload'
import type { SaveSchemaRequest } from '../builder/types'
import { saveSchemaLocally } from '../builder/saveSchema'
import { withBuilderGuard } from './guard'

export const saveEndpoint: PayloadHandler = withBuilderGuard(async (req) => {
  let body: SaveSchemaRequest
  try {
    if (!req.json) return Response.json({ error: 'No JSON parser available' }, { status: 500 })
    body = (await req.json()) as SaveSchemaRequest
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.blockSlug) {
    return Response.json({ error: 'blockSlug is required' }, { status: 400 })
  }

  const result = await saveSchemaLocally(req.payload, body)
  return Response.json(result, { status: result.success ? 200 : 422 })
})
