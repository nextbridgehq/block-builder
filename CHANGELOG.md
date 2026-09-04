# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.2.0 - 2026-09-03

### Added

- Live Preview panel — shows each field's label, placeholder, and resolved data-access slug while designing a block
- Layout fields — Row, Tabs, Collapsible, Group, Array — nestable and drillable
- JSON Import/Export for block schemas
- Version history with restore
- Concurrency-safe version publishing (no more duplicate version numbers under concurrent publishes)
- CSRF protection on internal API endpoints
- Reserved field-name and slug format validation
- Automated test suite (114 tests) with coverage thresholds and CI
- Admin UX improvements — nav sidebar shortcut, "Edit in Builder" button, clickable breadcrumbs

### Fixed

- Generated code for Tabs/Row/Collapsible fields was broken or failed to type-check
- Generated field types now correctly map to Payload's vocabulary (richText, upload, select, etc.)
- Various validation, duplicate-ID, and stale-state bugs in the builder
- Security fix: SSRF/host-confusion vulnerability in the `fast-uri` dependency
- Cleaned up stray encoding corruption across source files

### Changed

- Unified internal field-type system with the validation schema
- Renamed internal `relationTo` property to `collection`
- Replaced `radio`/`upload` with `richtext`/`image`/`file` in the palette
- Removed the `uuid` dependency in favor of `crypto.randomUUID()`

## 0.1.0 - 2026-06-19

- Initial release
- `init` CLI: auto-detects app dir, injects plugin config, admin field CSS, Postgres/SQLite-aware next steps
- Auth guard on the generated Block Builder layout
- Admin field CSS auto-injection, automatic nav link injection, `BlockDataField`/`BlockVersionSync` admin components
- README overhaul and canvas fixes
- Removed the Tailwind dependency from `builder.css`
- Fixed source-encoding corruption, `repository` URL format, and author/license info
