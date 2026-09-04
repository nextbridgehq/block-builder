import { describe, it, expect } from 'vitest'
import type { PayloadRequest } from 'payload'
import { generateEndpoint } from '../src/endpoints/generate'
import { BUILDER_HEADER } from '../src/endpoints/guard'

/**
 * `/block-builder/generate` is a public authenticated endpoint, not just the
 * builder UI's private back door -- whatever it is handed goes straight into the
 * emitter, which builds an exported identifier and an output filename out of the
 * slug. Anything it lets through it will happily emit as broken TypeScript.
 */
function req(body: unknown): PayloadRequest {
  return {
    user: { id: 'u1' },
    headers: new Headers({ [BUILDER_HEADER]: '1' }),
    json: async () => body,
  } as unknown as PayloadRequest
}

const call = async (body: unknown) => {
  const res = (await generateEndpoint(req(body))) as Response
  return { status: res.status, json: (await res.json()) as Record<string, unknown> }
}

const block = (overrides: Record<string, unknown>) => ({
  id: 'b1',
  slug: 'hero',
  fields: [{ id: 'f1', type: 'text', name: 'heading' }],
  ...overrides,
})

describe('generateEndpoint - request shape', () => {
  it('rejects a non-array `blocks` with a 400 rather than throwing a 500', async () => {
    const { status, json } = await call({ blocks: {} })
    expect(status).toBe(400)
    expect(String(json.error)).toContain('must be an array')
  })

  it('treats a missing `blocks` as empty', async () => {
    const { status } = await call({})
    expect(status).toBe(200)
  })
})

describe('generateEndpoint - slug validation', () => {
  it.each(['hero section', 'hero!', '2cool', '', 'hero-', '../escape', 'hero/section'])(
    'rejects the slug %j, which cannot become an identifier or a safe filename',
    async (slug) => {
      const { status, json } = await call({ blocks: [block({ slug })] })
      expect(status).toBe(400)
      expect(JSON.stringify(json.errors)).toContain('slug')
    },
  )

  it.each(['hero', 'hero-section', 'hero_section', 'myBlock'])(
    'accepts the slug %j',
    async (slug) => {
      const { status } = await call({ blocks: [block({ slug })] })
      expect(status).toBe(200)
    },
  )

  it('rejects an interfaceName that is not a valid identifier', async () => {
    const { status, json } = await call({ blocks: [block({ interfaceName: 'Hero Section' })] })
    expect(status).toBe(400)
    expect(JSON.stringify(json.errors)).toContain('interfaceName')
  })

  it('emits a file per block once the input checks out', async () => {
    const { status, json } = await call({ blocks: [block({})] })
    expect(status).toBe(200)
    const files = json.files as Record<string, string>
    expect(Object.keys(files)).toContain('hero.ts')
    expect(files['hero.ts']).toContain('export const hero: Block')
  })
})
