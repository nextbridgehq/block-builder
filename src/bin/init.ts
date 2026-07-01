import fs from 'fs'
import path from 'path'

const PAGE_CONTENT = `'use client'

import { BuilderShell } from '@nextbridgehq/payload-block-builder/client'

export default function BlockBuilderPage() {
  return <BuilderShell />
}
`

const LAYOUT_CONTENT = `import React from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import '@nextbridgehq/payload-block-builder/builder.css'

export const metadata = {
  title: 'Block Builder',
}

export default async function BlockBuilderLayout({ children }: { children: React.ReactNode }) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) redirect('/admin/login')

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, height: '100vh', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  )
}
`

const CUSTOM_SCSS_IMPORTS = `@import '@nextbridgehq/payload-block-builder/block-data-field.css';
@import '@nextbridgehq/payload-block-builder/schema-builder-field.css';
`

function findAppDir(): string | null {
  const candidates = [
    path.join(process.cwd(), 'src', 'app'),
    path.join(process.cwd(), 'app'),
  ]
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir
  }
  return null
}

function findPayloadConfig(): string | null {
  const candidates = [
    path.join(process.cwd(), 'src', 'payload.config.ts'),
    path.join(process.cwd(), 'payload.config.ts'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return null
}

function detectDbAdapter(content: string): 'postgres' | 'sqlite' | 'other' {
  if (/postgresAdapter|db-postgres/.test(content)) return 'postgres'
  if (/sqliteAdapter|db-sqlite/.test(content)) return 'sqlite'
  return 'other'
}

function findClosingBracket(content: string, openPos: number): number {
  let depth = 0
  for (let i = openPos; i < content.length; i++) {
    if (content[i] === '[') depth++
    else if (content[i] === ']') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function addImport(content: string): string {
  const newImport = `import { dynamicBlocksPlugin } from '@nextbridgehq/payload-block-builder'`
  // Find the last "from '...'" line (handles both single-line and multi-line imports)
  const lastFromRegex = /^.*from\s+['"][^'"]+['"]\s*;?\s*$/gm
  let lastMatch: RegExpExecArray | null = null
  let m: RegExpExecArray | null
  while ((m = lastFromRegex.exec(content)) !== null) lastMatch = m
  if (!lastMatch) return newImport + '\n' + content
  const insertPos = lastMatch.index + lastMatch[0].length
  return content.slice(0, insertPos) + '\n' + newImport + '\n' + content.slice(insertPos)
}

function insertIntoPluginsArray(content: string, collectionsArg: string): string | null {
  const pluginsMatch = /\bplugins\s*:\s*\[/.exec(content)
  if (!pluginsMatch) return null
  const openPos = content.indexOf('[', pluginsMatch.index)
  const closePos = findClosingBracket(content, openPos)
  if (closePos === -1) return null

  // Detect indent of the 'plugins:' key itself
  const beforePlugins = content.slice(0, pluginsMatch.index)
  const pluginsLineStart = beforePlugins.lastIndexOf('\n') + 1
  const outerIndent = content.slice(pluginsLineStart, pluginsMatch.index).match(/^([ \t]*)/)?.[1] ?? '  '
  const entryIndent = outerIndent + '  '

  // Find last newline before ]
  const beforeClose = content.slice(0, closePos)
  const prevNL = beforeClose.lastIndexOf('\n')

  const isSingleLine = prevNL < openPos
  const newEntry = `${entryIndent}dynamicBlocksPlugin({ collections: [${collectionsArg}] }),`

  if (isSingleLine) {
    // plugins: [] — expand to multi-line
    return (
      content.slice(0, openPos + 1) +
      '\n' + newEntry + '\n' + outerIndent +
      content.slice(closePos)
    )
  } else {
    // multi-line array — insert before the closing ] line
    return content.slice(0, prevNL + 1) + newEntry + '\n' + content.slice(prevNL + 1)
  }
}

function injectPluginsBlock(content: string, collectionsArg: string): string | null {
  // Insert after the collections: [...] block
  const collMatch = /\bcollections\s*:\s*\[/.exec(content)
  if (!collMatch) return null
  const collOpen = content.indexOf('[', collMatch.index)
  const collClose = findClosingBracket(content, collOpen)
  if (collClose === -1) return null
  const afterCollLine = content.indexOf('\n', collClose)
  if (afterCollLine === -1) return null

  // Detect outer indent from 'collections:' key
  const beforeColl = content.slice(0, collMatch.index)
  const collLineStart = beforeColl.lastIndexOf('\n') + 1
  const outerIndent = beforeColl.slice(collLineStart).match(/^([ \t]*)/)?.[1] ?? '  '
  const entryIndent = outerIndent + '  '

  const pluginsBlock = `${outerIndent}plugins: [\n${entryIndent}dynamicBlocksPlugin({ collections: [${collectionsArg}] }),\n${outerIndent}],`
  return content.slice(0, afterCollLine) + '\n' + pluginsBlock + content.slice(afterCollLine)
}

function modifyPayloadConfig(configPath: string, collectionsArg: string): void {
  let content: string
  try {
    content = fs.readFileSync(configPath, 'utf8')
  } catch (err) {
    console.error(`Error: Could not read ${configPath}: ${(err as NodeJS.ErrnoException).message}`)
    process.exit(1)
  }

  if (content.includes('dynamicBlocksPlugin')) {
    console.log(`Skipped: dynamicBlocksPlugin already present in ${configPath}`)
    return
  }

  content = addImport(content)

  // Use comment-stripped version only for pattern detection
  const noComments = content.replace(/\/\/[^\n]*/g, '')
  const hasPluginsArray = /\bplugins\s*:\s*\[/.test(noComments)
  const hasPluginsShorthand = /^\s*plugins\s*,/m.test(noComments)

  function writeConfig(data: string): void {
    try {
      fs.writeFileSync(configPath, data, 'utf8')
    } catch (err) {
      console.error(`Error: Could not write ${configPath}: ${(err as NodeJS.ErrnoException).message}`)
      process.exit(1)
    }
  }

  if (hasPluginsShorthand && !hasPluginsArray) {
    // plugins is imported from another file — add import only
    writeConfig(content)
    console.log(`Updated: ${configPath} (added import)`)
    console.log(`  Note: 'plugins' is imported from another file.`)
    console.log(`  Add dynamicBlocksPlugin({ collections: ['pages'] }) to that file manually.`)
    return
  }

  let result: string | null = null
  if (hasPluginsArray) {
    result = insertIntoPluginsArray(content, collectionsArg)
  } else {
    result = injectPluginsBlock(content, collectionsArg)
  }

  if (result === null) {
    writeConfig(content)
    console.log(`Updated: ${configPath} (added import only)`)
    console.log(`  Could not auto-detect plugins array. Add manually:`)
    console.log(`  plugins: [ dynamicBlocksPlugin({ collections: [${collectionsArg}] }) ]`)
    return
  }

  writeConfig(result)
  console.log(`Updated: ${configPath} (added dynamicBlocksPlugin)`)
}

function printNextSteps(dbAdapter: 'postgres' | 'sqlite' | 'other'): void {
  console.log('\n--- Next Steps ---')
  console.log('1. Regenerate the Payload import map:')
  console.log('     pnpm generate:importmap')
  if (dbAdapter === 'postgres') {
    console.log('\n2. PostgreSQL detected. Start the dev server — Payload will auto-push schema:')
    console.log('     pnpm dev')
    console.log('\n   Or if you prefer migrations:')
    console.log('     pnpm payload migrate:create --name=add_block_builder')
    console.log('     pnpm payload migrate')
  } else if (dbAdapter === 'sqlite') {
    console.log('\n2. Start the dev server — Payload will auto-migrate SQLite:')
    console.log('     pnpm dev')
  } else {
    console.log('\n2. Start the dev server:')
    console.log('     pnpm dev')
  }
  console.log('\nThen visit: http://localhost:3000/block-builder')
  console.log('------------------')
}

function main() {
  // Parse --collections flag
  const args = process.argv.slice(2)
  const collectionsFlag = args.find(a => a.startsWith('--collections='))
  const rawCollections = collectionsFlag
    ? collectionsFlag.replace('--collections=', '').split(',').map(s => s.trim())
    : ['pages']
  const invalidSlugs = rawCollections.filter(c => !/^[a-z0-9_-]+$/i.test(c))
  if (invalidSlugs.length > 0) {
    console.error(`Error: Invalid collection slug(s): ${invalidSlugs.join(', ')}`)
    console.error('Collection slugs may only contain letters, numbers, hyphens, and underscores.')
    process.exit(1)
  }
  const collectionsValue = rawCollections
  const collectionsArg = collectionsValue.map(c => `'${c}'`).join(', ')

  const appDir = findAppDir()

  if (!appDir) {
    console.error('Could not find app directory. Make sure you are in the root of a Next.js project.')
    process.exit(1)
  }

  // Create block-builder route files
  const builderDir = path.join(appDir, 'block-builder')
  try {
    if (!fs.existsSync(builderDir)) {
      fs.mkdirSync(builderDir, { recursive: true })
    }
  } catch (err) {
    console.error(`Error: Could not create directory ${builderDir}: ${(err as NodeJS.ErrnoException).message}`)
    process.exit(1)
  }

  const pagePath = path.join(builderDir, 'page.tsx')
  const layoutPath = path.join(builderDir, 'layout.tsx')

  if (fs.existsSync(pagePath)) {
    console.log(`Skipped: ${pagePath} already exists`)
  } else {
    try {
      fs.writeFileSync(pagePath, PAGE_CONTENT)
      console.log(`Created: ${pagePath}`)
    } catch (err) {
      console.error(`Error: Could not write ${pagePath}: ${(err as NodeJS.ErrnoException).message}`)
      process.exit(1)
    }
  }

  if (fs.existsSync(layoutPath)) {
    console.log(`Skipped: ${layoutPath} already exists`)
  } else {
    try {
      fs.writeFileSync(layoutPath, LAYOUT_CONTENT)
      console.log(`Created: ${layoutPath}`)
    } catch (err) {
      console.error(`Error: Could not write ${layoutPath}: ${(err as NodeJS.ErrnoException).message}`)
      process.exit(1)
    }
  }

  // Inject admin field CSS into (payload)/custom.scss if it exists
  const payloadRouteDir = path.join(appDir, '(payload)')
  const customScssPath = path.join(payloadRouteDir, 'custom.scss')

  if (fs.existsSync(customScssPath)) {
    try {
      const existing = fs.readFileSync(customScssPath, 'utf8')
      if (!existing.includes('@nextbridgehq/payload-block-builder')) {
        fs.appendFileSync(customScssPath, '\n' + CUSTOM_SCSS_IMPORTS)
        console.log(`Updated: ${customScssPath} (added admin field styles)`)
      } else {
        console.log(`Skipped: ${customScssPath} already has block-builder imports`)
      }
    } catch (err) {
      console.error(`Error: Could not update ${customScssPath}: ${(err as NodeJS.ErrnoException).message}`)
      process.exit(1)
    }
  }

  // Modify payload.config.ts
  const configPath = findPayloadConfig()
  if (!configPath) {
    console.log('\nNote: payload.config.ts not found. Add the plugin manually:')
    console.log(`  import { dynamicBlocksPlugin } from '@nextbridgehq/payload-block-builder'`)
    console.log(`  plugins: [ dynamicBlocksPlugin({ collections: [${collectionsArg}] }) ]`)
    printNextSteps('other')
  } else {
    const dbAdapter = detectDbAdapter(fs.readFileSync(configPath, 'utf8'))
    modifyPayloadConfig(configPath, collectionsArg)
    printNextSteps(dbAdapter)
  }
}

main()
