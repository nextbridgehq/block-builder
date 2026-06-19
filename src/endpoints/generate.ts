import type { PayloadHandler } from 'payload'
import { generateAllBlocks, generateIndexFile } from '../block-builder/lib/codegen'
import type { BlockDefinition } from '../block-builder/types'

export const generateEndpoint: PayloadHandler = async (req) => {
  if (!req.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let blocks: BlockDefinition[]
  try {
    if (!req.json) return Response.json({ error: 'No JSON parser available' }, { status: 500 })
    const body = (await req.json()) as { blocks?: BlockDefinition[] }
    blocks = body.blocks ?? []
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const blockOutputs = generateAllBlocks(blocks)
  const indexOutput = generateIndexFile(blocks)

  const fileMap: Record<string, string> = {}
  for (const out of blockOutputs) {
    fileMap[out.filename] = out.code
  }
  fileMap[indexOutput.filename] = indexOutput.code

  return Response.json({ files: fileMap })
}


