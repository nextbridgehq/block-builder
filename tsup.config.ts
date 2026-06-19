import { defineConfig } from 'tsup'

export default defineConfig([
  // Server-side barrel (plugin factory, types, collections, fields, endpoints)
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: false,
    outDir: 'dist',
    external: [
      'payload',
      'react',
      'react-dom',
      'next',
      '@payloadcms/ui',
      '@payloadcms/db-postgres',
      '@payloadcms/next',
      '@payloadcms/richtext-lexical',
    ],
  },
  // CLI init script
  {
    entry: { 'bin/init': 'src/bin/init.ts' },
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: false,
    outDir: 'dist',
    external: [],
    banner: { js: '#!/usr/bin/env node' },
  },
  // Client-side barrel (UI components — BlockDataField, SchemaBuilderField, BuilderShell, etc.)
  {
    entry: { client: 'src/client.ts' },
    format: ['esm', 'cjs'],
    dts: { resolve: ['immer'] },
    splitting: false,
    sourcemap: false,
    outDir: 'dist',
    banner: { js: "'use client'" },
    external: [
      'payload',
      'react',
      'react-dom',
      'next',
      '@payloadcms/ui',
      '@payloadcms/db-postgres',
      '@payloadcms/next',
      '@payloadcms/richtext-lexical',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities',
      '@dnd-kit/modifiers',
    ],
  },
])
