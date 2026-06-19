#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

const PAGE_CONTENT = `'use client'

import { BuilderShell } from '@nextbridgehq/payload-block-builder/client'

export default function BlockBuilderPage() {
  return <BuilderShell />
}
`

const LAYOUT_CONTENT = `import React from 'react'
import '@nextbridgehq/payload-block-builder/builder.css'

export const metadata = {
  title: 'Block Builder',
}

export default function BlockBuilderLayout({ children }: { children: React.ReactNode }) {
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

function main() {
  const appDir = findAppDir()

  if (!appDir) {
    console.error('Could not find app directory. Make sure you are in the root of a Next.js project.')
    process.exit(1)
  }

  // Create block-builder route files
  const builderDir = path.join(appDir, 'block-builder')
  if (!fs.existsSync(builderDir)) {
    fs.mkdirSync(builderDir, { recursive: true })
  }

  const pagePath = path.join(builderDir, 'page.tsx')
  const layoutPath = path.join(builderDir, 'layout.tsx')

  if (fs.existsSync(pagePath)) {
    console.log(`Skipped: ${pagePath} already exists`)
  } else {
    fs.writeFileSync(pagePath, PAGE_CONTENT)
    console.log(`Created: ${pagePath}`)
  }

  if (fs.existsSync(layoutPath)) {
    console.log(`Skipped: ${layoutPath} already exists`)
  } else {
    fs.writeFileSync(layoutPath, LAYOUT_CONTENT)
    console.log(`Created: ${layoutPath}`)
  }

  // Inject admin field CSS into (payload)/custom.scss if it exists
  const payloadRouteDir = path.join(appDir, '(payload)')
  const customScssPath = path.join(payloadRouteDir, 'custom.scss')

  if (fs.existsSync(customScssPath)) {
    const existing = fs.readFileSync(customScssPath, 'utf8')
    if (!existing.includes('@nextbridgehq/payload-block-builder')) {
      fs.appendFileSync(customScssPath, '\n' + CUSTOM_SCSS_IMPORTS)
      console.log(`Updated: ${customScssPath} (added admin field styles)`)
    } else {
      console.log(`Skipped: ${customScssPath} already has block-builder imports`)
    }
  }

  console.log('\nDone! Visit /block-builder in your browser.')
}

main()
