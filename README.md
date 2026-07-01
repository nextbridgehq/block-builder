# Payload Block Builder

Developed and open-sourced by [Nextbridge](https://nextbridge.com). This plugin was built to solve a real problem we kept running into: content editors needing to manage flexible page layouts without requiring a developer for every change.

---

A visual block builder plugin for Payload v3. Design your content blocks through a drag-and-drop UI, store the schemas in your database, and let editors build pages without waiting on a developer every time something needs to change.

## Use cases

- **Dynamic landing pages:** Let editors compose pages from a library of blocks (hero, features, testimonials, CTA) without any code changes.
- **Multi-tenant platforms:** Each tenant can have its own block definitions without touching shared config or triggering redeployments.
- **Marketing teams:** Give marketing full control to create, update, and reorder blocks on any page, any time.
- **Evolving content schemas:** Roll out new block versions without breaking content that was built against older ones.
- **Headless frontends:** Fetch structured block data from the Payload API and render it with any framework.

## Database compatibility

Works with all Payload-supported databases — no direct SQL, no database-specific code:

| Database | Adapter |
|---|---|
| PostgreSQL / Supabase / Neon | `@payloadcms/db-postgres` |
| SQLite / Turso / LibSQL | `@payloadcms/db-sqlite` |
| MongoDB | `@payloadcms/db-mongodb` |

---

## Quick start

### Option A — Automatic setup (recommended)

Install the package and run the init command from your project root:

```bash
pnpm add @nextbridgehq/payload-block-builder
# or: npm install @nextbridgehq/payload-block-builder

npx payload-block-builder init
```

The init command automatically:

- Creates `src/app/block-builder/page.tsx` — the builder UI page
- Creates `src/app/block-builder/layout.tsx` — standalone layout with `<html>` and `<body>` tags
- Updates `src/app/(payload)/custom.scss` — injects admin field styles
- Updates `payload.config.ts` — adds the `dynamicBlocksPlugin` import and config

Then regenerate the import map and start your dev server:

```bash
pnpm generate:importmap
pnpm dev
```

Visit `http://localhost:3000/block-builder` and you're ready to build.

> **PostgreSQL users:** Payload will automatically push the new schema tables on first startup in dev mode. If you are using migrations in production, run:
> ```bash
> pnpm payload migrate:create --name=add_block_builder
> pnpm payload migrate
> ```

---

### Option B — Manual setup

**1. Install:**

```bash
pnpm add @nextbridgehq/payload-block-builder
```

**2. Add the plugin to `payload.config.ts`:**

```ts
import { dynamicBlocksPlugin } from '@nextbridgehq/payload-block-builder'

export default buildConfig({
  plugins: [
    dynamicBlocksPlugin({
      collections: ['pages'],
    }),
  ],
})
```

**3. Create `src/app/block-builder/layout.tsx`:**

```tsx
import React from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import '@nextbridgehq/payload-block-builder/builder.css'

export const metadata = { title: 'Block Builder' }

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
```

**4. Create `src/app/block-builder/page.tsx`:**

```tsx
'use client'

import { BuilderShell } from '@nextbridgehq/payload-block-builder/client'

export default function BlockBuilderPage() {
  return <BuilderShell />
}
```

**5. Add admin field styles to `src/app/(payload)/custom.scss`:**

```scss
@import '@nextbridgehq/payload-block-builder/block-data-field.css';
@import '@nextbridgehq/payload-block-builder/schema-builder-field.css';
```

**6. Regenerate the import map and start the dev server:**

```bash
pnpm generate:importmap
pnpm dev
```

---

## Plugin options

```ts
dynamicBlocksPlugin({
  enabled?: boolean      // Disable without removing. Default: true
  collections?: string[] // Collection slugs that get the DB Layout tab. Default: []
  fieldName?: string     // Name of the layout array field. Default: 'dbLayout'
  tabLabel?: string      // Label shown on the tab in the admin UI. Default: 'DB Layout'
})
```

The `--collections` flag is also supported in the init command:

```bash
npx payload-block-builder init --collections=pages,posts
```

---

## Usage

### Creating a block

1. Open `/block-builder` in your browser.
2. Click "Add Block" and give it a name and slug.
3. Drag fields from the panel on the right onto the canvas.
4. Configure each field (label, name, required, options, etc.).
5. Click Publish. The block schema is saved to your database and a version snapshot is created.

### Using blocks in a collection

Any collection listed in the `collections` option gets a new "DB Layout" tab in the Payload admin. Editors can:

1. Click "Add Row" to add a block instance.
2. Select a block definition and the version of its schema to use.
3. Fill in the fields — they render dynamically based on the selected schema.
4. Reorder, hide, or add anchor IDs to individual block instances.
5. Save the document as normal.

### Reading block data on the frontend

```ts
const res = await fetch('/api/pages/my-page?depth=2')
const page = await res.json()

for (const block of page.dbLayout) {
  const type = block.blockDefinition.slug  // e.g. "hero"
  const fields = block.data               // { heading: '...', image: '...', ... }
  const isHidden = block.hidden
}
```

Render each block type however you like — a switch statement or a component map both work well.

---

## How it works

- **Block definitions** are stored in a `block-definitions` collection. Each document is a named block type with a slug and a list of field definitions.
- **Versions** are stored in a `block-definition-versions` collection. Every time you publish a block, a snapshot of its schema is saved as a new version.
- **Documents** in opted-in collections store a reference to the exact block version they were built against, so updating a block schema later does not break existing content.
- **The DB Layout tab** is injected automatically into each collection you list. It renders a dynamic array field where editors pick a block and version, and the field UI adjusts to match.
- **Four internal API endpoints** power the builder UI and the admin field components. You do not need to call them directly.

---

## Supported field types

These field types are available in the block builder and render correctly in the admin field UI:

| Type | Description |
|---|---|
| `text` | Single-line text input |
| `textarea` | Multi-line text input |
| `number` | Numeric input |
| `email` | Email address |
| `date` | Date picker |
| `checkbox` | Boolean toggle |
| `select` | Dropdown with custom options |
| `radio` | Radio button group with custom options |
| `upload` | File / image picker (from the media collection) |
| `relationship` | Document picker from any collection |
| `json` | Raw JSON data |

---

## Using `dbLayoutField` directly

If you prefer not to use the plugin's `collections` option, you can add the layout tab manually to any collection:

```ts
import { dbLayoutField } from '@nextbridgehq/payload-block-builder'

export const Pages: CollectionConfig = {
  slug: 'pages',
  fields: [
    {
      type: 'tabs',
      tabs: [
        { label: 'Content', fields: [] },
        dbLayoutField(),                         // fieldName='dbLayout', tab label='DB Layout'
        dbLayoutField('heroBlocks', 'Hero'),     // custom field name and tab label
      ],
    },
  ],
}
```

---

## CSS imports reference

| Import path | Purpose |
|---|---|
| `@nextbridgehq/payload-block-builder/builder.css` | Block Builder UI page styles |
| `@nextbridgehq/payload-block-builder/block-data-field.css` | DB Layout field styles in admin |
| `@nextbridgehq/payload-block-builder/schema-builder-field.css` | Schema Builder field styles in admin |

---

## License

MIT © [Nextbridge](https://nextbridge.com)
