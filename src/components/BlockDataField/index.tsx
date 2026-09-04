'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useField, useFormFields, useListDrawer } from '@payloadcms/ui'
import type { BlockFieldDefinition } from '../../validation/types'

// ─── MediaPicker ──────────────────────────────────────────────────────────────

interface MediaValue {
  id: string | number
  filename?: string
  url?: string
  alt?: string
}

interface MediaPickerProps {
  label: string
  required?: boolean
  value: unknown
  onChange: (val: unknown) => void
}

function MediaPicker({ label, required, value, onChange }: MediaPickerProps) {
  const changeRef = useRef(onChange)
  const closeRef = useRef<() => void>(() => {})
  useEffect(() => { changeRef.current = onChange })

  const handleSelect = useCallback(
    ({ docID, doc }: { docID: string; doc: Record<string, unknown> }) => {
      changeRef.current({
        id: docID,
        filename: doc?.filename ?? null,
        url: doc?.url ?? null,
        alt: doc?.alt ?? null,
      })
      closeRef.current()
    },
    [],
  )

  const [ListDrawer, ListDrawerToggler, { closeDrawer }] = useListDrawer({
    collectionSlugs: ['media'],
  })
  closeRef.current = closeDrawer

  const media = value && typeof value === 'object' ? (value as MediaValue) : null
  const mediaId = media?.id ?? (typeof value === 'string' || typeof value === 'number' ? value : null)

  return (
    <div className="bdf-field">
      <label className="bdf-label">
        {label}
        {required && <span className="bdf-required">*</span>}
      </label>

      <div className="bdf-upload-area">
        {mediaId ? (
          <div className="bdf-upload-selected">
            {media?.url ? (
              <img src={media.url as string} alt={(media.alt as string | null | undefined) ?? ''} className="bdf-thumb" />
            ) : (
              <div className="bdf-thumb-placeholder">[img]</div>
            )}
            <span className="bdf-upload-name">
              {media?.filename ? String(media.filename) : `ID: ${String(mediaId)}`}
            </span>
            <div className="bdf-upload-actions">
              <ListDrawerToggler className="bdf-upload-btn">
                Change
              </ListDrawerToggler>
              <button
                type="button"
                className="bdf-icon-btn bdf-icon-btn--danger"
                title="Remove media"
                onClick={() => onChange(null)}
              >
                x
              </button>
            </div>
          </div>
        ) : (
          <ListDrawerToggler className="bdf-upload-btn">
            Choose from Media Library
          </ListDrawerToggler>
        )}
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ListDrawer onSelect={handleSelect as any} />
    </div>
  )
}

// ─── RelationshipPicker ───────────────────────────────────────────────────────

type RelDoc = { id: string | number; title: string | null }

interface RelationshipPickerProps {
  label: string
  required?: boolean
  collection: string
  hasMany?: boolean
  value: unknown
  onChange: (val: unknown) => void
}

function toRelDoc(v: unknown): RelDoc | null {
  if (!v) return null
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (!o.id) return null
    return { id: o.id as string | number, title: o.title ? String(o.title) : null }
  }
  if (typeof v === 'string' || typeof v === 'number') return { id: v, title: null }
  return null
}

function RelationshipPicker({ label, required, collection, hasMany = false, value, onChange }: RelationshipPickerProps) {
  const changeRef = useRef(onChange)
  const closeRef = useRef<() => void>(() => {})
  useEffect(() => { changeRef.current = onChange })

  const items: RelDoc[] = hasMany
    ? (Array.isArray(value) ? (value as unknown[]).map(toRelDoc).filter(Boolean) as RelDoc[] : [])
    : (() => { const d = toRelDoc(value); return d ? [d] : [] })()

  const itemsRef = useRef<RelDoc[]>(items)
  useEffect(() => { itemsRef.current = items })

  const handleSelect = useCallback(
    ({ docID, doc }: { docID: string; doc: Record<string, unknown> }) => {
      const title = String(doc?.title ?? doc?.name ?? doc?.slug ?? '') || null
      const entry: RelDoc = { id: docID, title }
      if (hasMany) {
        const alreadyExists = itemsRef.current.some((i) => String(i.id) === String(docID))
        if (!alreadyExists) changeRef.current([...itemsRef.current, entry])
      } else {
        changeRef.current(entry)
        closeRef.current()
      }
    },
    [hasMany],
  )

  const [ListDrawer, ListDrawerToggler, { closeDrawer, openDrawer }] = useListDrawer({
    collectionSlugs: [collection],
  })
  closeRef.current = closeDrawer

  const [fetchedTitles, setFetchedTitles] = useState<Record<string, string>>({})
  const fetchingRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const missing = items.filter(
      (i) => !i.title && !fetchedTitles[String(i.id)] && !fetchingRef.current.has(String(i.id)),
    )
    if (missing.length === 0) return
    missing.forEach((item) => {
      const idStr = String(item.id)
      fetchingRef.current.add(idStr)
      fetch(`/api/${collection}/${idStr}?depth=0`, { credentials: 'same-origin' })
        .then((r) => (r.ok ? r.json() : null))
        .then((doc: Record<string, unknown> | null) => {
          if (doc) {
            const t = doc.title ?? doc.name ?? doc.slug ?? null
            if (t) setFetchedTitles((prev) => ({ ...prev, [idStr]: String(t) }))
          }
        })
        .catch((err) => {
          console.error('[Block Builder] Failed to load relation title:', err)
          fetchingRef.current.delete(idStr)
        })
    })
  }, [items, collection])

  function getTitle(item: RelDoc) {
    return item.title ?? fetchedTitles[String(item.id)] ?? `ID: ${String(item.id)}`
  }

  function clearOne(e: React.MouseEvent, id: string | number) {
    e.stopPropagation()
    if (hasMany) onChange(items.filter((i) => String(i.id) !== String(id)))
    else onChange(null)
  }

  return (
    <div className="bdf-field">
      <label className="bdf-label">
        {label}
        {required && <span className="bdf-required">*</span>}
      </label>

      <div className={`bdf-rel${hasMany ? ' bdf-rel--multi' : ''}`}>
        {/* Main clickable control */}
        <div
          role="button"
          tabIndex={0}
          className="bdf-rel__control"
          onClick={openDrawer}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDrawer() }}
        >
          <div className="bdf-rel__values">
            {items.length === 0 && (
              <span className="bdf-rel__placeholder">Select a value...</span>
            )}

            {/* Single value */}
            {!hasMany && items.length > 0 && (
              <span className="bdf-rel__single">{getTitle(items[0])}</span>
            )}

            {/* hasMany chips */}
            {hasMany && items.map((item) => (
              <span key={String(item.id)} className="bdf-rel__chip">
                <span className="bdf-rel__chip-label">{getTitle(item)}</span>
                <button
                  type="button"
                  className="bdf-rel__chip-remove"
                  onClick={(e) => clearOne(e, item.id)}
                  aria-label={`Remove ${getTitle(item)}`}
                >
                  <svg height="12" width="12" viewBox="0 0 20 20" aria-hidden="true" focusable="false" fill="currentColor">
                    <path d="M14.348 14.849c-0.469 0.469-1.229 0.469-1.697 0l-2.651-3.030-2.651 3.029c-0.469 0.469-1.229 0.469-1.697 0-0.469-0.469-0.469-1.229 0-1.697l2.758-3.15-2.759-3.152c-0.469-0.469-0.469-1.228 0-1.697s1.228-0.469 1.697 0l2.652 3.031 2.651-3.031c0.469-0.469 1.228-0.469 1.697 0s0.469 1.229 0 1.697l-2.758 3.152 2.758 3.15c0.469 0.469 0.469 1.229 0 1.698z" />
                  </svg>
                </button>
              </span>
            ))}
          </div>

          {/* Right-side indicators */}
          <div className="bdf-rel__indicators">
            {!hasMany && items.length > 0 && (
              <button
                type="button"
                className="bdf-rel__clear"
                onClick={(e) => clearOne(e, items[0].id)}
                aria-label="Clear"
              >
                <svg height="16" width="16" viewBox="0 0 20 20" aria-hidden="true" focusable="false" fill="currentColor">
                  <path d="M14.348 14.849c-0.469 0.469-1.229 0.469-1.697 0l-2.651-3.030-2.651 3.029c-0.469 0.469-1.229 0.469-1.697 0-0.469-0.469-0.469-1.229 0-1.697l2.758-3.15-2.759-3.152c-0.469-0.469-0.469-1.228 0-1.697s1.228-0.469 1.697 0l2.652 3.031 2.651-3.031c0.469-0.469 1.228-0.469 1.697 0s0.469 1.229 0 1.697l-2.758 3.152 2.758 3.15c0.469 0.469 0.469 1.229 0 1.698z" />
                </svg>
              </button>
            )}
            <span className="bdf-rel__sep" />
            <span className="bdf-rel__chevron">
              <svg height="16" width="16" viewBox="0 0 20 20" aria-hidden="true" focusable="false" fill="currentColor">
                <path d="M4.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747 3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0 1.615-0.406 0.418-4.695 4.502-4.695 4.502-0.217 0.223-0.502 0.335-0.787 0.335s-0.57-0.112-0.789-0.335c0 0-4.287-4.084-4.695-4.502s-0.436-1.17 0-1.615z" />
              </svg>
            </span>
          </div>
        </div>

        {/* hasMany: + Add button outside control (like Payload's AddNewRelation) */}
        {hasMany && (
          <ListDrawerToggler className="bdf-rel__add" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            +
          </ListDrawerToggler>
        )}
      </div>

      <span className="bdf-rel__hint">{collection}{hasMany ? ' · multiple' : ''}</span>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ListDrawer onSelect={handleSelect as any} />
    </div>
  )
}

// ──// JsonField

interface JsonFieldProps {
  label: string
  required?: boolean
  value: unknown
  onChange: (val: unknown) => void
}

function JsonField({ label, required, value, onChange }: JsonFieldProps) {
  const [text, setText] = useState(() =>
    value !== undefined ? JSON.stringify(value, null, 2) : '',
  )
  const [hasError, setHasError] = useState(false)

  return (
    <div className="bdf-field">
      <label className="bdf-label">
        {label}
        {required && <span className="bdf-required">*</span>}
        <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--theme-elevation-400)', fontWeight: 400 }}>
          (JSON)
        </span>
      </label>
      <textarea
        className="bdf-input bdf-textarea bdf-mono"
        value={text}
        rows={4}
        onChange={(e) => {
          setText(e.target.value)
          try {
            onChange(JSON.parse(e.target.value))
            setHasError(false)
          } catch {
            setHasError(true)
          }
        }}
      />
      {hasError && (
        <div className="bdf-error" style={{ marginTop: 4 }}>
          Invalid JSON — changes not saved until fixed.
        </div>
      )}
    </div>
  )
}

// ─ SchemaForm ───────────────────────────────────────────────────────────────

interface SchemaFormProps {
  schema: BlockFieldDefinition[]
  value: Record<string, unknown>
  onChange: (val: Record<string, unknown>) => void
  depth?: number
}

function SchemaForm({ schema, value, onChange, depth = 0 }: SchemaFormProps) {
  const set = useCallback(
    (key: string, val: unknown) => onChange({ ...value, [key]: val }),
    [value, onChange],
  )

  if (depth > 10) {
    return <div className="bdf-error">Max nesting depth reached (10).</div>
  }

  return (
    <>
      {schema.map((field) => {
        // Row/Collapsible/Tabs are UI-only containers -- their fields render
        // against the *same* value/onChange as this SchemaForm, not nested
        // under `value[field.name]` (only group/array wrap data).
        if (field.type === 'row') {
          return (
            <div key={field.name} className="bdf-row">
              <SchemaForm schema={field.fields} value={value} onChange={onChange} depth={depth + 1} />
            </div>
          )
        }
        if (field.type === 'collapsible') {
          return (
            <CollapsibleSection key={field.name} field={field} value={value} onChange={onChange} depth={depth + 1} />
          )
        }
        if (field.type === 'tabs') {
          return (
            <TabsSection key={field.name} field={field} value={value} onChange={onChange} depth={depth + 1} />
          )
        }
        return (
          <FieldInput
            key={field.name}
            field={field}
            value={value[field.name]}
            onChange={(v) => set(field.name, v)}
            depth={depth}
          />
        )
      })}
    </>
  )
}

// ─── CollapsibleSection ────────────────────────────────────────────────────────

function CollapsibleSection({
  field,
  value,
  onChange,
  depth,
}: {
  field: Extract<BlockFieldDefinition, { type: 'collapsible' }>
  value: Record<string, unknown>
  onChange: (val: Record<string, unknown>) => void
  depth: number
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bdf-collapsible">
      <button
        type="button"
        className="bdf-collapsible__header"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`bdf-collapsible__caret${open ? ' bdf-collapsible__caret--open' : ''}`}>▸</span>
        {field.label}
      </button>
      {open && (
        <div className="bdf-collapsible__body">
          <SchemaForm schema={field.fields} value={value} onChange={onChange} depth={depth} />
        </div>
      )}
    </div>
  )
}

// ─── TabsSection ────────────────────────────────────────────────────────────────

function TabsSection({
  field,
  value,
  onChange,
  depth,
}: {
  field: Extract<BlockFieldDefinition, { type: 'tabs' }>
  value: Record<string, unknown>
  onChange: (val: Record<string, unknown>) => void
  depth: number
}) {
  const [activeTab, setActiveTab] = useState(0)
  const set = useCallback(
    (key: string, val: unknown) => onChange({ ...value, [key]: val }),
    [value, onChange],
  )
  const tabs = field.tabs ?? []
  const tab = tabs[activeTab]

  return (
    <div className="bdf-tabs">
      <div className="bdf-tabs__list">
        {tabs.map((t, i) => (
          <button
            key={t.name ?? t.label ?? i}
            type="button"
            className={`bdf-tabs__tab${i === activeTab ? ' bdf-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="bdf-tabs__panel">
        {tab && (
          tab.name
            ? <SchemaForm schema={tab.fields} value={(value[tab.name] as Record<string, unknown>) ?? {}} onChange={(v) => set(tab.name!, v)} depth={depth} />
            : <SchemaForm schema={tab.fields} value={value} onChange={onChange} depth={depth} />
        )}
      </div>
    </div>
  )
}

// ─── FieldInput ───────────────────────────────────────────────────────────────

interface FieldInputProps {
  field: BlockFieldDefinition
  value: unknown
  onChange: (val: unknown) => void
  depth: number
}

function FieldInput({ field, value, onChange, depth }: FieldInputProps) {
  const label = field.label ?? field.name

  switch (field.type) {
    case 'text':
    case 'url':
    case 'email':
      return (
        <div className="bdf-field">
          <label className="bdf-label">
            {label}
            {field.required && <span className="bdf-required">*</span>}
          </label>
          <input
            className="bdf-input"
            type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )

    case 'color':
      return (
        <div className="bdf-field">
          <label className="bdf-label">
            {label}
            {field.required && <span className="bdf-required">*</span>}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              className="bdf-input"
              type="text"
              value={(value as string) ?? ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#ffffff"
              style={{ flex: 1 }}
            />
            <input
              type="color"
              value={(value as string) || '#ffffff'}
              onChange={(e) => onChange(e.target.value)}
              style={{ width: 40, height: 40, padding: 2, border: '1px solid var(--theme-elevation-150)', borderRadius: 4, cursor: 'pointer', flexShrink: 0 }}
            />
          </div>
        </div>
      )

    case 'textarea':
      return (
        <div className="bdf-field">
          <label className="bdf-label">
            {label}
            {field.required && <span className="bdf-required">*</span>}
          </label>
          <textarea
            className="bdf-input bdf-textarea"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
          />
        </div>
      )

    case 'richtext':
      return (
        <div className="bdf-field">
          <label className="bdf-label">
            {label}
            {field.required && <span className="bdf-required">*</span>}
            <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--theme-elevation-400)', fontWeight: 400 }}>
              (plain text)
            </span>
          </label>
          <textarea
            className="bdf-input bdf-textarea"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            rows={6}
          />
        </div>
      )

    case 'number': {
      const numVal = typeof value === 'number' && !Number.isNaN(value) ? value : ''
      return (
        <div className="bdf-field">
          <label className="bdf-label">
            {label}
            {field.required && <span className="bdf-required">*</span>}
          </label>
          <input
            className="bdf-input"
            type="number"
            value={numVal}
            onChange={(e) =>
              onChange(e.target.value === '' ? null : e.target.valueAsNumber)
            }
          />
        </div>
      )
    }

    case 'checkbox':
      return (
        <label className="bdf-checkbox-row">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="bdf-checkbox-label">
            {label}
            {field.required && <span className="bdf-required"> *</span>}
          </span>
        </label>
      )

    case 'date':
      return (
        <div className="bdf-field">
          <label className="bdf-label">
            {label}
            {field.required && <span className="bdf-required">*</span>}
          </label>
          <input
            className="bdf-input"
            type="date"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )

    case 'select':
      return (
        <div className="bdf-field">
          <label className="bdf-label">
            {label}
            {field.required && <span className="bdf-required">*</span>}
          </label>
          <select
            className="bdf-input bdf-select"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">-- select --</option>
            {(field.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )

    case 'multiselect': {
      const current = Array.isArray(value) ? (value as string[]) : []
      return (
        <div className="bdf-field">
          <div className="bdf-fieldset">
            <div className="bdf-fieldset__header">
              {label}
              {field.required && <span className="bdf-required" style={{ marginLeft: 3 }}>*</span>}
            </div>
            <div className="bdf-fieldset__body">
              {(field.options ?? []).map((opt) => (
                <label key={opt.value} className="bdf-multiselect-opt">
                  <input
                    type="checkbox"
                    checked={current.includes(opt.value)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...current, opt.value]
                        : current.filter((v) => v !== opt.value)
                      onChange(next)
                    }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )
    }

    case 'image':
    case 'file':
      return (
        <MediaPicker
          label={label}
          required={field.required}
          value={value}
          onChange={onChange}
        />
      )

    case 'relationship': {
      const relField = field as unknown as { collection?: string; hasMany?: boolean }
      if (!relField.collection) {
        return (
          <div className="bdf-field">
            <label className="bdf-label">{label}</label>
            <div className="bdf-error">
              Relationship field <strong>{field.name}</strong> has no <code>collection</code> defined in its schema.
            </div>
          </div>
        )
      }
      return (
        <RelationshipPicker
          label={label}
          required={field.required}
          collection={relField.collection}
          hasMany={relField.hasMany ?? false}
          value={value}
          onChange={onChange}
        />
      )
    }

    case 'json':
      return <JsonField label={label} required={field.required} value={value} onChange={onChange} />

    case 'array': {
      const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : []
      const subFields = field.fields ?? []
      return (
        <div className="bdf-field">
          <div className="bdf-fieldset">
            <div className="bdf-fieldset__header">
              {label}
              {field.required && <span className="bdf-required" style={{ marginLeft: 3 }}>*</span>}
              <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--theme-elevation-400)', fontWeight: 400 }}>
                ({rows.length} {rows.length === 1 ? 'row' : 'rows'})
              </span>
            </div>
            <div className="bdf-fieldset__body">
              {rows.map((row, i) => (
                <div key={i} className="bdf-array-row">
                  <SchemaForm
                    schema={subFields}
                    value={row}
                    onChange={(updated) => {
                      const next = [...rows]
                      next[i] = updated
                      onChange(next)
                    }}
                    depth={depth + 1}
                  />
                  <button
                    type="button"
                    className="bdf-remove-btn"
                    onClick={() => onChange(rows.filter((_, j) => j !== i))}
                  >
                    x Remove row
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="bdf-add-btn"
                onClick={() => onChange([...rows, {}])}
              >
                <span className="bdf-add-btn__icon">+</span>
                Add row
              </button>
            </div>
          </div>
        </div>
      )
    }

    case 'group': {
      const groupVal = (value as Record<string, unknown>) ?? {}
      const subFields = field.fields ?? []
      return (
        <div className="bdf-field">
          <div className="bdf-fieldset">
            <div className="bdf-fieldset__header">{label}</div>
            <div className="bdf-fieldset__body">
              <SchemaForm schema={subFields} value={groupVal} onChange={onChange} depth={depth + 1} />
            </div>
          </div>
        </div>
      )
    }

    default:
      return (
        <div style={{ fontSize: 12, color: 'var(--theme-elevation-400)', fontFamily: 'var(--font-body)', padding: '4px 0' }}>
          Unsupported field type: <strong>{field.type}</strong> ({label})
        </div>
      )
  }
}

// ─── BlockDataField ───────────────────────────────────────────────────────────

export function BlockDataField({ path }: { path: string }) {
  const { value, setValue } = useField<Record<string, unknown>>({ path })

  const rowPrefix = path.replace(/\.data$/, '')
  const blockVersionPath = `${rowPrefix}.blockVersion`

  const blockVersionValue = useFormFields(([fields]) => fields[blockVersionPath]?.value)

  const versionId: string | number | null =
    blockVersionValue && typeof blockVersionValue === 'object'
      ? ((blockVersionValue as { id?: string | number }).id ?? null)
      : typeof blockVersionValue === 'string' || typeof blockVersionValue === 'number'
        ? blockVersionValue
        : null

  const [schema, setSchema] = useState<BlockFieldDefinition[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!versionId) {
      setSchema(null)
      setError(null)
      return
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(String(versionId))) {
      setError('Invalid version ID format')
      return
    }

    setLoading(true)
    setError(null)
    fetch(`/api/block-definition-versions/${versionId}?depth=0`, { credentials: 'same-origin' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((doc: Record<string, unknown> | null) => {
        if (!doc || typeof doc !== 'object') throw new Error('Empty response from server')
        const raw = doc.schema
        const fields: BlockFieldDefinition[] = Array.isArray(raw)
          ? (raw as BlockFieldDefinition[])
          : raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).fields)
            ? ((raw as Record<string, unknown>).fields as BlockFieldDefinition[])
            : []
        setSchema(fields.length > 0 ? fields : null)
        setLoading(false)
      })
      .catch((e: unknown) => {
        setError(String(e))
        setLoading(false)
      })
  }, [versionId])

  if (!versionId) {
    return (
      <div className="bdf-empty">
        Select a <strong>Block Version</strong> above to configure block data fields.
      </div>
    )
  }

  if (loading) {
    return <div className="bdf-loading">Loading schema...</div>
  }

  if (error) {
    return <div className="bdf-error">Failed to load schema: {error}</div>
  }

  if (!schema || schema.length === 0) {
    return (
      <div className="bdf-empty">
        This block version has no fields defined in its schema.
      </div>
    )
  }

  return (
    <div className="bdf-wrap">
      <div className="bdf-heading">Block Data</div>
      <div className="bdf-body">
        <SchemaForm
          schema={schema}
          value={(value as Record<string, unknown>) ?? {}}
          onChange={setValue}
        />
      </div>
    </div>
  )
}


