# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.2.0 - 2026-09-03

### Added

- **Live Preview** — a self-contained, zero-config panel that renders a block's schema as a mock form while it's being designed. Shows each field's label, accurate type-specific placeholder, and its resolved data-access slug (dot-notation for Group nesting, `[]` for Array rows, tab-name prefix for named Tabs — matching exactly how the runtime renderer stores the data).
- **Layout fields** — `row`, `tabs`, `collapsible`, plus full builder support for `group` and `array` — nestable, drillable ("Edit Fields"), and rendered correctly at runtime (Row/Collapsible flatten their children's data into the parent; named Tabs nest under the tab name, unnamed Tabs flatten).
- **JSON Import / Export** — export any block's schema to a `.json` file, or import a hand-authored or previously-exported one back into the builder.
- **Version history & restore** — browse a block's publish history, view any past version read-only, or restore it as a new version.
- **Concurrency-safe version publishing** — version numbers are assigned via a retry loop against a database-level unique constraint (only on a genuine unique-constraint violation — Postgres, MySQL, MongoDB, and SQLite are recognised — and re-reading the high-water mark rather than blind-incrementing), eliminating a prior count-then-insert race condition. A second, related race — two writers publishing the same *new* block colliding on its slug — is also handled: the loser now adopts the definition the winner created instead of surfacing a raw driver error.
- **CSRF protection** — all four internal API endpoints (`load`, `save`, `versions`, `generate`) require an authenticated session and an `X-Block-Builder: 1` header, shared via a single `withBuilderGuard` wrapper.
- **Reserved field-name validation** — publishing a schema with a field named `id`, `createdAt`, `updatedAt`, `blockType`, or `blockName` is rejected, correctly scoped to the object Payload actually stores it in (see "Fixed" below for the nesting-aware version of this check).
- **Slug format validation** — block slugs are validated against `^[a-z0-9-]+$` before saving; the `/block-builder/generate` endpoint separately validates slug and `interfaceName` identifier-safety before generating code.
- **Automated test suite** — 114 tests (up from 0), including a golden-file snapshot covering every supported field type's generated output, plus coverage thresholds via `@vitest/coverage-v8` (`npm run test:coverage`).
- **Admin UX** — a Block Builder shortcut in the admin nav sidebar, an "Edit in Builder" button on each block definition, and a breadcrumb that jumps directly to any ancestor level when clicked.
- **`npm run check:encoding`** plus a CI workflow (typecheck → test → build → encoding check), `.gitattributes`, and `.editorconfig`, so stray UTF-8 BOMs and mojibake can't regress silently again.
- ErrorBoundary gained a "Reset builder state" action that clears persisted local state — "Try again" alone re-threw immediately when the cause was a corrupt persisted store.

### Fixed

- Generated code for Tabs fields was missing its `tabs: [...]` array entirely, producing broken/unusable output for any block using a Tabs field.
- Generated code for Row, Tabs, and Collapsible fields emitted an invalid `name` property, and Row additionally emitted `label`/`localized`/`admin.description` — Payload's own field types explicitly disallow all of these on the relevant type, so the generated code failed to type-check.
- Generated field types didn't match Payload's own vocabulary: `richtext`, `image`, `file`, `multiselect`, `url`, and `color` are this project's storage vocabulary, not Payload's — they're now translated at emit time to `richText`, `upload` (+ required `relationTo`, defaulting to `media`), `select` + `hasMany`, and `text` respectively. A block containing a single richtext field — the most common first block — previously generated code that would not compile.
- An empty Array/Group/Row/Collapsible emitted no `fields:` key at all, which Payload requires even when empty; `tabs`/`blocks` had the same gap for their own required key.
- `lexicalEditor` was called but not imported when the only richtext field lived inside a Tab — the import detector recursed `fields` but not `tabs[].fields`.
- The generated React component stub referenced non-existent props (`props.rowField`, `props.tabsField`) for Row/Collapsible/unnamed-Tab fields, which flatten their children into the parent rather than holding data under their own name.
- Number field default values were saved and generated as strings (`defaultValue: "5"`) instead of numbers; checkbox defaults were miscoerced (`Boolean("false")` evaluates to `true`), with no way to explicitly set `false`.
- The normaliser's allowlist silently dropped fields on publish: `unique`/`localized` (settable on every type), `defaultValue` on richtext/email/url/color/date, and `collection` on image/file vanished on save and were gone after the next reload. They now round-trip.
- The field-type dropdown in the config panel had no entry for Row/Tabs/Collapsible/Array/Group/multiselect/url/color/blocks, so it rendered blank for any of these — including any type a JSON import could introduce that the palette itself doesn't offer.
- Reserved-name and duplicate-name checks only applied at the top level, and duplicate-name checking reset at every container boundary — so a field named `id` inside a Row collided with Payload's own injected `id` exactly as one at the root would, but passed validation anyway (Row/Collapsible/unnamed-Tabs share the enclosing level's namespace since Payload flattens their data into it; Array opens a fresh row namespace with its own injected `id`; Group and named Tabs open an entirely fresh namespace). A named Tab's own name now also competes in the namespace it nests into.
- Switching, adding, or removing a block while drilled into a nested field's contents left the drill-down path stale, leaving the canvas showing empty until manually backed out.
- Duplicating a block only regenerated IDs for its top-level fields — nested fields inside Group/Array/Row/Tabs/Collapsible kept the original block's IDs, causing collisions. Separately, the duplicated slug (`<slug>Copy`) contained an uppercase letter that the save-time slug validator rejects; it's now `<slug>-copy`.
- Breadcrumbs resolved every segment against the top-level field list, so anything below depth 1 displayed as a placeholder and clicking any crumb only moved up one level regardless of which one was clicked. Each segment now resolves at its own nesting level, and clicking jumps directly there.
- `getTargetFields` mutated store state (lazily creating a missing `fields` array) even when called from a component render body outside any store action — split into a pure reader (`getTargetFields`, safe during render) and a mutating variant used only inside actions.
- Publishing a newly added block refreshed the *previous* active block's version list instead of the new one, because the shell tracked `activeSlug` rather than the slug just published; selecting an entry from that stale list could silently replace the new block's contents. The publish now reports the slug it saved under and the shell adopts it.
- `/block-builder/generate` accepted arbitrary input and could silently emit syntactically invalid TypeScript (e.g. a field name containing a hyphen); it now validates the full schema, slug, and `interfaceName` before generating, returning a 400 with details instead.
- JSON import minted new field IDs via `crypto.randomUUID` directly in one spot instead of the shared `uuidv4()` helper, reintroducing the non-secure-context gap the helper exists to close.
- `aria-roledescription` on the sortable field card was declared before dnd-kit's `{...attributes}` spread and silently discarded.
- Stripped stray UTF-8 BOMs from 32 source files and repaired mojibake in 13 (~4,300 corrupted characters, including two CSS files that ship to npm).

### Changed

- Unified the field-type system: the block builder's internal `FieldType` now re-exports directly from the single validation schema, removing a lossy builder↔schema translation layer (`schemaToBuilderBlock.ts`, `mapToSaveRequest.ts` deleted).
- Renamed the builder's internal `relationTo` property to `collection` (Payload's own generated field keyword is unaffected).
- `richtext`/`image`/`file` replace the former `radio`/`upload` field types in the palette.
- `generateAllBlocks()` returns one file per block by default; pass `{ react: true }` to also emit a typed `.tsx` component stub per block (previously always emitted, which is also why Code Preview always showed it).
- The `uuid` dependency was removed in favour of `crypto.randomUUID()`, with a `getRandomValues` fallback for non-secure-context admin sessions.
- `strict: true` is enabled in `tsconfig.json`.
- The 403 response on the internal endpoints no longer claims a missing "CSRF token" (there is no token — the header works by forcing a CORS preflight) and instead names the header that's required.

## 0.1.9 - 2026-07-03

- README overhaul, `BlockVersionSync` admin component, canvas fixes.

## 0.1.8 - 2026-07-01

- Enhanced `init` CLI (auto-detects app dir, injects plugin config, admin field CSS, and Postgres/SQLite-aware next steps).
- Auth guard added to the generated Block Builder layout (`redirect('/admin/login')` when unauthenticated).
- `BlockDataField` admin component improvements.
- Admin field CSS auto-injection into `custom.scss`.
- Automatic Block Builder nav link injection into the admin sidebar.
- Removed the Tailwind dependency from `builder.css`.
- Fixed a source-encoding corruption issue.

## 0.1.2 - 2026-06-19

- Added a `'use client'` banner to the client bundle.

## 0.1.1 - 2026-06-19

- Fixed the `repository` URL format for npm.
- Added author info; updated license copyright to NEXTBRIDGE LIMITED.

## 0.1.0 - 2026-06-19

- Initial release.
