import type { PayloadHandler } from 'payload'
import type { SaveSchemaRequest } from '../builder/types'
import { saveSchemaLocally } from '../builder/saveSchema'

export const saveEndpoint: PayloadHandler = async (req) => {
  if (!req.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
}


