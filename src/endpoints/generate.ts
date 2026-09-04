import type { PayloadHandler } from 'payload'
import { generateAllBlocks, generateIndexFile } from '../block-builder/lib/codegen'
import type { BlockDefinition } from '../block-builder/types'
import { withBuilderGuard } from './guard'
import { validateBlockSchema } from '../validation'

// The emitter builds both the exported identifier and the output filename
// straight from the slug (`export const heroSection`, `hero-section.ts`), so a
// slug that isn't identifier-safe once its `-`/`_` separators are stripped
// emits a file that cannot compile -- and one containing a path separator
// would name a file outside the output directory. `interfaceName`, when set,
// *is* the identifier, so it has to hold up on its own.
const SLUG_RE = /^[A-Za-z][A-Za-z0-9]*(?:[-_][A-Za-z0-9]+)*$/
const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/

export const generateEndpoint: PayloadHandler = withBuilderGuard(async (req) => {
  let blocks: BlockDefinition[]
  let react = false
  try {
    if (!req.json) return Response.json({ error: 'No JSON parser available' }, { status: 500 })
    const body = (await req.json()) as { blocks?: unknown; react?: boolean }
    const raw = body.blocks ?? []
    // A non-array `blocks` is a client mistake, not a server fault -- without
    // this it reaches `.flatMap` and surfaces as a 500.
    if (!Array.isArray(raw)) {
      return Response.json({ error: '"blocks" must be an array.' }, { status: 400 })
    }
    blocks = raw as BlockDefinition[]
    react = body.react === true
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // The builder UI only ever posts schemas it already validated, but this is a
  // public authenticated endpoint -- unvalidated input reaches the emitter and
  // can produce syntactically invalid TypeScript (e.g. a field named `cta-link`
  // becomes `props.cta-link`). Validate here rather than emitting broken code.
  const errors: string[] = []
  blocks.forEach((block, i) => {
    const label = block?.slug ? `"${block.slug}"` : `at index ${i}`

    if (typeof block?.slug !== 'string' || !SLUG_RE.test(block.slug)) {
      errors.push(
        `Block ${label}: "slug" must start with a letter and contain only letters, digits, and single "-" or "_" separators.`,
      )
    }

    if (
      block?.interfaceName !== undefined &&
      (typeof block.interfaceName !== 'string' || !IDENTIFIER_RE.test(block.interfaceName))
    ) {
      errors.push(`Block ${label}: "interfaceName" must be a valid TypeScript identifier.`)
    }

    const result = validateBlockSchema({ fields: block?.fields ?? [] })
    result.errors.forEach((e) => errors.push(`Block ${label}: ${e}`))
  })

  if (errors.length > 0) {
    return Response.json({ error: 'Invalid block schema', errors }, { status: 400 })
  }

  const blockOutputs = generateAllBlocks(blocks, { react })
  const indexOutput = generateIndexFile(blocks)

  const fileMap: Record<string, string> = {}
  for (const out of blockOutputs) {
    fileMap[out.filename] = out.code
  }
  fileMap[indexOutput.filename] = indexOutput.code

  return Response.json({ files: fileMap })
})
