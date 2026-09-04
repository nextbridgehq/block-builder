'use client'

import React, { useState } from 'react'
import {
  Type, AlignLeft, AlignJustify, Hash, Mail, Calendar, CheckSquare,
  ChevronDown, Upload, Image as ImageIcon, Link as LinkIcon, Braces,
  List, Box, Columns, Folder, LayoutTemplate,
  type LucideIcon,
} from 'lucide-react'
import { useBuilderStore } from '../../store/builder.store'
import type { FieldDefinition } from '../../types'

// ─── Self-contained field preview ────────────────────────────────────────────
//
// No external URL or consumer-side integration required: this renders a mock
// form directly from the field definitions in the store, updating live as the
// schema is edited. It previews the *shape* of the block, not a real page --
// there is no way to know what a "Hero" block should look like visually
// without the consumer's own frontend components, so this focuses on what the
// builder actually knows: field types, labels, slugs, and structure.

const TYPE_ICON: Record<string, LucideIcon> = {
  text: Type,
  textarea: AlignLeft,
  richtext: AlignJustify,
  number: Hash,
  email: Mail,
  url: LinkIcon,
  date: Calendar,
  checkbox: CheckSquare,
  select: ChevronDown,
  image: ImageIcon,
  file: Upload,
  relationship: LinkIcon,
  json: Braces,
  array: List,
  group: Box,
  row: Columns,
  tabs: Folder,
  collapsible: ChevronDown,
}

function TypeIcon({ type }: { type: string }) {
  const Icon = TYPE_ICON[type] ?? Type
  return <Icon size={13} strokeWidth={1.75} />
}

function fieldDisplayLabel(field: FieldDefinition): string {
  return field.label || field.name || 'Untitled field'
}

// The dot-notation key a frontend integration would actually read this field's
// value from -- not just the field's own name. `prefix` is the accessor path
// built up by ancestors as we recurse (see PreviewField's `prefix` param):
// Group/Array nest their children's data under their own name (Array adds a
// trailing `[]` to signal "one entry per row"); Row/Collapsible/unnamed-Tabs
// are presentational and flatten their children into the same prefix they
// received, matching real Payload behaviour (and BlockDataField's renderer).
function fullFieldPath(field: FieldDefinition, prefix: string): string {
  const name = field.name || '—'
  return prefix ? `${prefix}.${name}` : name
}

// Realistic placeholder text per field type -- respects an explicit
// `admin.placeholder` set on the field (the real, author-configured value)
// before falling back to a type-appropriate example.
function fieldPlaceholder(field: FieldDefinition): string {
  if (field.admin?.placeholder) return field.admin.placeholder
  switch (field.type) {
    case 'email':
      return 'name@example.com'
    case 'url':
      return 'https://example.com'
    case 'textarea':
    case 'richtext':
      return `Write ${fieldDisplayLabel(field).toLowerCase()} here…`
    case 'text':
    default:
      return `Enter ${fieldDisplayLabel(field).toLowerCase()}`
  }
}

function pluralize(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

function FieldMeta({ field, path }: { field: FieldDefinition; path: string | null }) {
  return (
    <div className="bb-preview-field__meta">
      {path !== null && <code className="bb-preview-field__slug">{path}</code>}
      <span className="bb-preview-field__badge">{field.type}</span>
    </div>
  )
}

function FieldHead({ field, prefix }: { field: FieldDefinition; prefix: string }) {
  return (
    <div className="bb-preview-field__head">
      <span className="bb-preview-field__icon"><TypeIcon type={field.type} /></span>
      <div className="bb-preview-field__headtext">
        <span className="bb-preview-field__label">
          {fieldDisplayLabel(field)}
          {field.required && <span className="bb-preview-field__required">*</span>}
        </span>
        <FieldMeta field={field} path={fullFieldPath(field, prefix)} />
      </div>
    </div>
  )
}

function PreviewField({ field, prefix = '' }: { field: FieldDefinition; prefix?: string }) {
  switch (field.type) {
    case 'text':
    case 'url':
    case 'email':
      return (
        <div className="bb-preview-field">
          <FieldHead field={field} prefix={prefix} />
          <input className="bb-preview-input" disabled placeholder={fieldPlaceholder(field)} />
        </div>
      )

    case 'textarea':
    case 'richtext':
      return (
        <div className="bb-preview-field">
          <FieldHead field={field} prefix={prefix} />
          <textarea className="bb-preview-textarea" disabled rows={3} placeholder={fieldPlaceholder(field)} />
        </div>
      )

    case 'number':
      return (
        <div className="bb-preview-field">
          <FieldHead field={field} prefix={prefix} />
          <input className="bb-preview-input" type="number" disabled placeholder={field.admin?.placeholder ?? '0'} />
        </div>
      )

    case 'date':
      return (
        <div className="bb-preview-field">
          <FieldHead field={field} prefix={prefix} />
          <input className="bb-preview-input" type="date" disabled />
        </div>
      )

    case 'checkbox':
      return (
        <div className="bb-preview-field">
          <label className="bb-preview-checkbox">
            <input type="checkbox" className="bb-preview-checkbox__input" disabled />
            <span className="bb-preview-field__icon"><TypeIcon type={field.type} /></span>
            <div className="bb-preview-field__headtext">
              <span className="bb-preview-field__label">
                {fieldDisplayLabel(field)}
                {field.required && <span className="bb-preview-field__required">*</span>}
              </span>
              <FieldMeta field={field} path={fullFieldPath(field, prefix)} />
            </div>
          </label>
        </div>
      )

    case 'select':
      return (
        <div className="bb-preview-field">
          <FieldHead field={field} prefix={prefix} />
          <select className="bb-preview-select" disabled>
            <option>{field.options?.[0]?.label ?? 'Select an option'}</option>
          </select>
        </div>
      )

    case 'json':
      return (
        <div className="bb-preview-field">
          <FieldHead field={field} prefix={prefix} />
          <div className="bb-preview-placeholder">Raw JSON data</div>
        </div>
      )

    case 'image':
    case 'file':
      return (
        <div className="bb-preview-field">
          <FieldHead field={field} prefix={prefix} />
          <div className="bb-preview-placeholder bb-preview-placeholder--upload">
            <TypeIcon type={field.type} />
            {field.type === 'image' ? 'Image upload' : 'File upload'}
          </div>
        </div>
      )

    case 'relationship':
      return (
        <div className="bb-preview-field">
          <FieldHead field={field} prefix={prefix} />
          <div className="bb-preview-placeholder bb-preview-placeholder--upload">
            <TypeIcon type={field.type} />
            {field.collection ? `Linked to “${field.collection}”` : 'No collection set'}
            {field.hasMany ? ' · multiple' : ''}
          </div>
        </div>
      )

    case 'array': {
      const ownPath = fullFieldPath(field, prefix)
      return (
        <PreviewGroup field={field} ownPath={ownPath} sublabel={`repeating · ${pluralize(field.fields?.length ?? 0, 'field')} per row`}>
          {(field.fields ?? []).map((f) => <PreviewField key={f.id} field={f} prefix={`${ownPath}[]`} />)}
        </PreviewGroup>
      )
    }

    case 'group': {
      const ownPath = fullFieldPath(field, prefix)
      return (
        <PreviewGroup field={field} ownPath={ownPath}>
          {(field.fields ?? []).map((f) => <PreviewField key={f.id} field={f} prefix={ownPath} />)}
        </PreviewGroup>
      )
    }

    case 'collapsible':
      // Presentational only -- Payload flattens its children into the parent,
      // so it has no accessor path of its own (see fullFieldPath's docstring).
      return (
        <PreviewGroup field={field} ownPath={null}>
          {(field.fields ?? []).map((f) => <PreviewField key={f.id} field={f} prefix={prefix} />)}
        </PreviewGroup>
      )

    case 'row':
      return (
        <div className="bb-preview-row">
          {(field.fields ?? []).map((f) => <PreviewField key={f.id} field={f} prefix={prefix} />)}
        </div>
      )

    case 'tabs':
      return <PreviewTabs field={field} prefix={prefix} />

    default:
      return (
        <div className="bb-preview-field">
          <FieldHead field={field} prefix={prefix} />
          <div className="bb-preview-placeholder">Unsupported preview for “{field.type}”</div>
        </div>
      )
  }
}

function PreviewGroup({ field, ownPath, sublabel, children }: { field: FieldDefinition; ownPath: string | null; sublabel?: string; children: React.ReactNode }) {
  return (
    <div className="bb-preview-group">
      <div className="bb-preview-group__header">
        <span className="bb-preview-field__icon"><TypeIcon type={field.type} /></span>
        <div className="bb-preview-field__headtext">
          <span className="bb-preview-field__label">
            {fieldDisplayLabel(field)}
            {sublabel && <span className="bb-preview-group__sublabel">{sublabel}</span>}
          </span>
          <FieldMeta field={field} path={ownPath} />
        </div>
      </div>
      <div className="bb-preview-group__body">
        {React.Children.count(children) > 0 ? children : (
          <div className="bb-preview-placeholder">No fields inside yet</div>
        )}
      </div>
    </div>
  )
}

function PreviewTabs({ field, prefix }: { field: FieldDefinition; prefix: string }) {
  const [active, setActive] = useState(0)
  const tabs = field.tabs ?? []
  const tab = tabs[active]
  // Named tabs nest their fields' data under the tab name; unnamed tabs are
  // presentational and flatten straight into whatever the Tabs field itself received.
  const tabPrefix = tab?.name ? (prefix ? `${prefix}.${tab.name}` : tab.name) : prefix

  return (
    <div className="bb-preview-group">
      <div className="bb-preview-group__header">
        <span className="bb-preview-field__icon"><TypeIcon type={field.type} /></span>
        <div className="bb-preview-field__headtext">
          <span className="bb-preview-field__label">{fieldDisplayLabel(field)}</span>
          <FieldMeta field={field} path={null} />
        </div>
      </div>
      <div className="bb-preview-tabs__list">
        {tabs.length === 0 && <span className="bb-preview-placeholder" style={{ margin: 8 }}>No tabs yet</span>}
        {tabs.map((t, i) => (
          <button
            key={t.id ?? i}
            type="button"
            className={`bb-preview-tabs__tab${i === active ? ' bb-preview-tabs__tab--active' : ''}`}
            onClick={() => setActive(i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab && (
        <div className="bb-preview-group__body">
          {tab.name && (
            <div className="bb-preview-tabs__path">
              Nested under <code className="bb-preview-field__slug">{tabPrefix}</code>
            </div>
          )}
          {(tab.fields ?? []).length > 0
            ? (tab.fields ?? []).map((f) => <PreviewField key={f.id} field={f} prefix={tabPrefix} />)
            : <div className="bb-preview-placeholder">No fields inside yet</div>}
        </div>
      )}
    </div>
  )
}

export function LivePreview() {
  const activeBlockId = useBuilderStore((s) => s.activeBlockId)
  const blocks = useBuilderStore((s) => s.blocks)
  const block = blocks.find((b) => b.id === activeBlockId)

  if (!block || block.fields.length === 0) {
    return (
      <div className="bb-live-preview bb-live-preview--empty">
        <LayoutTemplate size={32} strokeWidth={1.5} color="var(--bb-text-subtle)" style={{ marginBottom: 16 }} />
        <p style={{ fontWeight: 600, marginBottom: 8, color: 'var(--bb-text)' }}>Nothing to preview yet</p>
        <p style={{ fontSize: 12, color: 'var(--bb-text-subtle)', textAlign: 'center', maxWidth: 260 }}>
          Add fields from the palette on the left — this panel updates live as you build.
        </p>
      </div>
    )
  }

  return (
    <div className="bb-live-preview">
      <div className="bb-live-preview__header">
        <span className="bb-live-preview__title">Live Preview</span>
        <span className="bb-live-preview__meta">{block.labels?.singular ?? block.slug} · {pluralize(block.fields.length, 'field')}</span>
      </div>
      <div className="bb-live-preview__body">
        <div className="bb-live-preview__page">
          {block.fields.map((field) => <PreviewField key={field.id} field={field} />)}
        </div>
      </div>
    </div>
  )
}
