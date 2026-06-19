# Payload Block Builder


A visual block builder plugin for Payload v3. Design your content blocks through a drag-and-drop UI, store the schemas in your database, and let editors build pages without waiting on a developer every time something needs to change.

## Use cases

- **Dynamic landing pages:** Let editors compose pages from a library of blocks (hero, features, testimonials, CTA) without any code changes.
- **Multi-tenant platforms:** Each tenant can have its own block definitions without touching shared config or triggering redeployments.
- **Marketing teams:** Give marketing full control to create, update, and reorder blocks on any page, any time.
- **Evolving content schemas:** Roll out new block versions without breaking content that was built against older ones.
- **Headless frontends:** Fetch structured block data from the Payload API and render it with any framework.

## Quick start

1. Install the plugin:

```bash
npm install @nextbridgehq/payload-block-builder
```

2. Add the plugin to your `payload.config.ts`:

```ts
import { dynamicBlocksPlugin } from '@nextbridgehq/payload-block-builder'

export default buildConfig({
  plugins: [
    dynamicBlocksPlugin({
      collections: ['pages', 'posts'],
    }),
  ],
})
```

3. Create a page in your Next.js app to host the builder UI:

```tsx
// app/block-builder/page.tsx
import { BuilderShell } from '@nextbridgehq/payload-block-builder/client'
import '@nextbridgehq/payload-block-builder/builder.css'

export default function BlockBuilderPage() {
  return <BuilderShell />
}
```

4. If you're on a SQL database, run the migration:

```bash
npx payload migrate:create
npx payload migrate:run
```

MongoDB users can skip this step.

Visit `/block-builder` in your browser and you're in.

## Usage

### Creating a block

1. Open `/block-builder` in your browser.
2. Click "Add Block" and give it a name and slug.
3. Drag fields from the panel on the right onto the canvas.
4. Configure each field (label, name, required, options, etc.).
5. Hit Publish. The block is saved to your database and a version snapshot is created.

### Using blocks in a collection

Any collection you listed in `collections` gets a new "DB Layout" tab in the Payload admin. Editors can:

1. Click "Add Row" to add a block.
2. Select a block definition and the version of its schema to use.
3. Fill in the fields. They render dynamically based on the selected schema.
4. Reorder, hide, or add anchor IDs to individual blocks.
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

From there it's just a switch or a component map. Render each block type however you like.

## Options

```ts
dynamicBlocksPlugin({
  enabled?: boolean      // disable without removing. Default: true
  collections?: string[] // which collection slugs get the DB Layout tab. Default: []
  fieldName?: string     // name of the layout array field. Default: 'dbLayout'
  tabLabel?: string      // label shown on the tab in the admin. Default: 'DB Layout'
})
```

## How it works

- **Block definitions** are stored in a `block-definitions` collection. Each document is a named block type with a slug, labels, and a list of field definitions.
- **Versions** are stored in a `block-definition-versions` collection. Every time you publish a block in the builder, a snapshot of its current schema is saved as a new version.
- **Documents** in your opted-in collections store a reference to the exact block version they were built against, so updating a block's schema later won't break existing content.
- **The DB Layout tab** is injected automatically on each collection you list. It renders a dynamic array field where editors pick a block and version, and the field data UI adjusts to match the selected schema.
- **Four internal API endpoints** power the builder UI and the `BlockDataField` admin component. You don't need to call them yourself.

## Requirements

- Payload v3
- Next.js 14+
- Any Payload-supported database (PostgreSQL, MongoDB, SQLite)
