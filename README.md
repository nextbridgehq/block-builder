# Payload Block Builder

[![npm version](https://img.shields.io/npm/v/@nextbridgehq/payload-block-builder.svg)](https://www.npmjs.com/package/@nextbridgehq/payload-block-builder)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Payload CMS](https://img.shields.io/badge/Payload-v3-blue.svg)](https://payloadcms.com)

> A visual block builder plugin for Payload CMS v3. Design content blocks through a drag-and-drop UI, store schemas in your database, and let editors build pages without waiting on a developer.

Developed and open-sourced by [Nextbridge](https://nextbridge.com).

[GitHub](https://github.com/nextbridgehq/block-builder) · [Releases](https://github.com/nextbridgehq/block-builder/releases) · [Issues](https://github.com/nextbridgehq/block-builder/issues) · [Changelog](./CHANGELOG.md) · [Payload CMS](https://payloadcms.com)

## Screenshots

![Block Builder canvas](https://raw.githubusercontent.com/nextbridgehq/block-builder/main/docs/screenshots/canvas.png)
![Schema builder field](https://raw.githubusercontent.com/nextbridgehq/block-builder/main/docs/screenshots/schema-builder.png)
![DB Layout tab on a collection](https://raw.githubusercontent.com/nextbridgehq/block-builder/main/docs/screenshots/db-layout-tab.png)

---

## 🎯 The Problem

Content editors need to manage flexible page layouts — but every new block type or layout change requires a developer to update code, redeploy, and migrate. This creates bottlenecks, slows down marketing teams, and turns simple content tasks into engineering tickets.

## 💡 The Solution

Payload Block Builder moves block schema definitions from code into your database. Editors design blocks visually, publish them instantly, and use them across any collection — all without touching code or triggering deployments.

---

## ✨ Features

- **Visual drag-and-drop block designer** — No code required to create new block types
- **Database-stored schemas** — Block definitions live in your DB, not your codebase
- **Version snapshots with restore** — Every publish creates an immutable, concurrency-safe version; browse history, view any past version read-only, or restore it as a new version — existing content never breaks
- **Collection integration** — Adds a "DB Layout" tab to any collection with one line of config, plus a nav-sidebar shortcut and an "Edit in Builder" button on each block definition
- **16 field types**, including layout containers — text, textarea, number, email, date, checkbox, select, image, file, relationship, json, and the Row / Group / Array / Tabs / Collapsible layout fields for structuring and nesting a block's own fields
- **Live Preview** — A self-contained, zero-config panel that renders a block's schema as a mock form as you build it — labels, field slugs (the exact JSON path a frontend integration should read, including array/group nesting and named-tab keys), and realistic placeholders per field type. No external URL or frontend receiver needed.
- **JSON Import / Export** — Export any block's schema to a `.json` file, or import a hand-authored or previously-exported one back into the builder
- **Multi-tenant ready** — Each tenant can have its own block definitions without shared config changes
- **Framework agnostic frontend** — Fetch structured JSON and render with React, Vue, Svelte, or anything else
- **Automatic init command** — Get up and running in under 2 minutes
- **Works with all Payload databases** — PostgreSQL, SQLite, MongoDB — no database-specific code

---

## 🚀 Quick Start

### Option A — Automatic Setup (Recommended)

```bash
# Install
pnpm add @nextbridgehq/payload-block-builder
# or: npm install @nextbridgehq/payload-block-builder

# Initialize
npx payload-block-builder init
```

The init command automatically:

| What it does | File |
|---|---|
| Creates the builder UI page | `src/app/block-builder/page.tsx` |
| Creates a standalone layout | `src/app/block-builder/layout.tsx` |
| Injects admin field styles | `src/app/(payload)/custom.scss` |
| Adds plugin config | `payload.config.ts` |

Then regenerate the import map and start your dev server:

```bash
pnpm generate:importmap
pnpm dev
```

Visit `https://your-domain.com/block-builder` and you're ready to build.

<details>
<summary><strong>Option B — Manual Setup</strong></summary>

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

</details>

---

## Upgrading from 0.1.x

**0.2.0 changes the database schema.** The `block-definition-versions`
collection gains a `versionIdString` column with a unique index — this is what
makes concurrent publishing safe, replacing the previous count-then-insert
version numbering that could hand out the same number twice.

Run a migration before deploying:

```bash
pnpm payload migrate:create --name=block_builder_0_2_0
pnpm payload migrate
```

In dev mode Payload pushes the column automatically; **production will not start
correctly without the migration.**

Notes:

- Existing version rows are backfilled with `NULL`, which the unique index
  permits. Historical versions are readable and restorable as before, but the
  uniqueness guarantee only applies to versions published from 0.2.0 onward.
- MongoDB users need no migration.

### Other breaking changes in 0.2.0

| Change | Impact |
| --- | --- |
| Internal endpoints require an `X-Block-Builder: 1` header | Only affects code calling `/api/blocks/*` directly. The builder UI and admin components send it already. |
| `generateAllBlocks()` returns one file per block again | Pass `{ react: true }` to also emit the `.tsx` component stub, which 0.2.0-beta emitted unconditionally. |
| Field-type vocabulary unified | The builder now uses `richtext`, `image`, `file`, and `collection` internally, matching the stored schema. Generated Payload config is unaffected — it is translated at emit time to `richText`, `upload`, and `relationTo`. |
| `radio` and `upload` removed from the palette | Use `select` and `image`/`file`. Existing schemas still load. |

> **PostgreSQL users:** Payload will automatically push new schema tables on first startup in dev mode. For production migrations:
>
> ```bash
> pnpm payload migrate:create --name=add_block_builder
> pnpm payload migrate
> ```

---

## ⚙️ Configuration Options

```ts
dynamicBlocksPlugin({
  enabled?: boolean,       // Disable without removing. Default: true
  collections?: string[],  // Collection slugs that get the DB Layout tab. Default: []
  fieldName?: string,      // Name of the layout array field. Default: 'dbLayout'
  tabLabel?: string,       // Label shown on the tab in the admin UI. Default: 'DB Layout'
})
```

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | Toggle the plugin on/off without removing it from config |
| `collections` | `string[]` | `[]` | Collection slugs that receive the DB Layout tab |
| `fieldName` | `string` | `'dbLayout'` | The field name for the layout array stored on documents |
| `tabLabel` | `string` | `'DB Layout'` | Label displayed on the tab in the Payload admin UI |

The `--collections` flag is also supported in the init command:

```bash
npx payload-block-builder init --collections=pages,posts
```

---

## 📖 Usage

### Creating a Block

1. Open `/block-builder` in your browser (also reachable from the admin sidebar and via the "Edit in Builder" button on any block definition).
2. Click "Add Block" and give it a name and slug.
3. Drag fields from the panel on the left onto the canvas — including layout fields (Row, Group, Array, Tabs, Collapsible) to nest and structure fields; use each layout field's "Edit Fields" button to drill into its contents.
4. Configure each field (label, name, required, options, etc.) in the panel on the right.
5. Open **Live Preview** at any time to see a mock rendering of the block's current shape, with each field's exact data path.
6. Click Publish — the block schema is validated and saved to your database, and a new immutable version snapshot is created.
7. Use **Import JSON** / **Export JSON** in the toolbar to move a block's schema in or out as a file — handy for backups, sharing a schema between projects, or hand-authoring one.

### Using Blocks in a Collection

Any collection listed in the `collections` option gets a new "DB Layout" tab in the Payload admin. Editors can:

1. Click "Add Row" to add a block instance.
2. Select a block definition — its current version is auto-selected, or pick a specific version manually.
3. Fill in the fields — they render dynamically based on the selected schema.
4. Reorder, hide, or add anchor IDs to individual block instances.
5. Save the document as normal.

### Live Preview

The Live Preview panel (toggled from the builder's toolbar) renders the *shape* of a block being designed — not a real page, since the builder has no way to know what a "Hero" block should look like on your actual frontend. For each field it shows:

- The field's label and, right beside it, its **slug** — the exact key a frontend integration reads. For a top-level field this is just its name (`heading`); for a field nested in a Group it's dot-prefixed (`cta.label`); for one inside an Array it gets a trailing `[]` (`items[].title`); for a field inside a *named* Tab it's prefixed by the tab's name (`seo.metaTitle`). Row, Collapsible, and unnamed Tabs are presentation-only in Payload and flatten their children into the surrounding data — so they never show a slug of their own, and their children inherit whatever prefix they themselves received.
- A realistic, type-appropriate placeholder (respecting an explicit `admin.placeholder` if one is set).

### Reading Block Data on the Frontend

```ts
const res = await fetch('/api/pages/my-page?depth=2')
const page = await res.json()

for (const block of page.dbLayout) {
  const type = block.blockDefinition.slug   // e.g. "hero"
  const fields = block.data                 // { heading: '...', image: '...', ... }
  const isHidden = block.hidden
  const anchor = block.anchor
}
```

### Example: React Component Map

```tsx
const blockComponents = {
  hero: HeroBlock,
  features: FeaturesBlock,
  testimonials: TestimonialsBlock,
  cta: CTABlock,
}

function PageRenderer({ blocks }) {
  return (
    <>
      {blocks
        .filter((block) => !block.hidden)
        .map((block, i) => {
          const Component = blockComponents[block.blockDefinition.slug]
          if (!Component) return null
          return (
            <section key={block.instanceId ?? i} id={block.anchor || undefined}>
              <Component {...block.data} />
            </section>
          )
        })}
    </>
  )
}
```

---

## 🧩 Supported Field Types

| Category | Types |
|---|---|
| Basic | `text`, `textarea`, `number`, `email`, `date`, `checkbox` |
| Choice | `select` (custom label/value options) |
| Media | `image`, `file` |
| Relational | `relationship` (link to any collection, optionally `hasMany`) |
| Layout | `array`, `group`, `row`, `tabs`, `collapsible` |
| Advanced | `json` (raw JSON data) |

**Layout fields** structure and nest a block's other fields rather than holding a value themselves:

| Type | Behavior |
|---|---|
| `group` | Nests its fields' data under its own name (`group.field`) |
| `array` | A repeating list of fields; each row's data lives under the array's name (`items[].field`) |
| `row` | Presentation only — lays its fields out horizontally; their data flattens into the parent, no nesting |
| `collapsible` | Presentation only — an expandable section; its fields also flatten into the parent |
| `tabs` | A tab strip; a *named* tab nests its fields under the tab's name, an *unnamed* tab flattens into the parent |

Live Preview shows the exact resolved data path for every field, including through nested layout fields — see the Live Preview section above.

---

## 🗺️ Use Cases

| Use Case | How It Helps |
|---|---|
| Dynamic landing pages | Editors compose pages from a library of blocks (hero, features, testimonials, CTA) without code changes |
| Multi-tenant platforms | Each tenant gets its own block definitions without touching shared config or triggering redeployments |
| Marketing teams | Full control to create, update, and reorder blocks on any page, any time |
| Evolving content schemas | Roll out new block versions without breaking content built against older ones |
| Headless frontends | Fetch structured block data from the Payload API and render with any framework |

---

## 📋 Compatibility

| Requirement | Version |
|---|---|
| Payload CMS | v3.x |
| Node.js | ≥ 18 |
| Next.js | ≥ 14 |

### Database Support

| Database | Adapter |
|---|---|
| PostgreSQL / Supabase / Neon | `@payloadcms/db-postgres` |
| SQLite / Turso / LibSQL | `@payloadcms/db-sqlite` |
| MongoDB | `@payloadcms/db-mongodb` |

---

## 🔧 Advanced Usage

### Using `dbLayoutField` Directly

If you prefer not to use the plugin's `collections` option, you can add the layout tab manually to any collection:

```ts
import { dbLayoutField } from '@nextbridgehq/payload-block-builder'

export const Pages: CollectionConfig = {
  slug: 'pages',
  fields: [
    {
      type: 'tabs',
      tabs: [
        { label: 'Content', fields: [/* your fields */] },
        dbLayoutField(),                           // fieldName='dbLayout', tab label='DB Layout'
        dbLayoutField('heroBlocks', 'Hero'),       // custom field name and tab label
      ],
    },
  ],
}
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Block Builder UI                  │
│            /block-builder (drag & drop)             │
└──────────────────────────┬──────────────────────────┘
                           │ Publish
                           ▼
┌─────────────────────────────────────────────────────┐
│            block-definitions collection             │
│          (name, slug, field definitions)            │
└──────────────────────────┬──────────────────────────┘
                           │ Snapshot
                           ▼
┌─────────────────────────────────────────────────────┐
│        block-definition-versions collection         │
│      (immutable schema snapshots per publish)       │
└──────────────────────────┬──────────────────────────┘
                           │ Referenced by
                           ▼
┌─────────────────────────────────────────────────────┐
│           Your Collection (e.g. "pages")            │
│   dbLayout: [{ blockDefinition, version, data }]    │
└─────────────────────────────────────────────────────┘
```

Key design decisions:

- Block definitions are stored in a `block-definitions` collection. Each document is a named block type with a slug and a list of field definitions.
- Versions are stored in a `block-definition-versions` collection. Every publish creates an immutable snapshot; version numbers are assigned with a retry loop against a unique constraint, so concurrent publishes from two editors can never collide.
- Documents in opted-in collections store a reference to the exact block version they were built against — updating a block schema later does not break existing content.
- The DB Layout tab is injected automatically into each collection you list. It renders a dynamic array field where editors pick a block and version.
- Four internal API endpoints power the builder UI and admin field components — each requires an authenticated Payload session and a `X-Block-Builder: 1` header (CSRF protection). You do not need to call them directly.

---

## 📦 CSS Imports Reference

| Import path | Purpose |
|---|---|
| `@nextbridgehq/payload-block-builder/builder.css` | Block Builder UI page styles |
| `@nextbridgehq/payload-block-builder/block-data-field.css` | DB Layout field styles in admin |
| `@nextbridgehq/payload-block-builder/schema-builder-field.css` | Schema Builder field styles in admin |

---

## 🧪 Testing

The package ships a Vitest suite (114 tests, including a golden-file snapshot of generated code per field type) covering schema normalization, validation, and code generation:

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage thresholds
npm run check:encoding # scan for stray UTF-8 BOMs / mojibake
```

CI (`.github/workflows/ci.yml`) runs typecheck → test → build → encoding check on every push.

---

## 📝 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the full history. Latest release:

**0.2.0** — Live Preview, Layout fields (Row/Group/Array/Tabs/Collapsible), JSON Import/Export, version history & restore, concurrency-safe publishing, CSRF protection, a 114-test suite with CI, and a large batch of correctness fixes (generated-code compilation, nested-field validation, breadcrumb navigation, and more — see CHANGELOG.md for the full list).

---

## 🤝 Contributing

Contributions are welcome! Please see our Contributing Guide for details.

- Fork the repository
- Create your feature branch (`git checkout -b feature/amazing-feature`)
- Commit your changes (`git commit -m 'Add amazing feature'`)
- Push to the branch (`git push origin feature/amazing-feature`)
- Open a Pull Request

---

## 📄 License

MIT © [Nextbridge](https://nextbridge.com)

---

Built and maintained by **[Nextbridge](https://nextbridge.com)** — If Payload Block Builder helped you ship content blocks without waiting on a developer, a ⭐ would mean a lot — it helps other developers discover Payload Block Builder.
