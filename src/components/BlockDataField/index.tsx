'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useField, useFormFields, useListDrawer } from '@payloadcms/ui'
import type { BlockFieldDefinition } from '../../validation/types'

// â"€â"€â"€ MediaPicker â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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
              <img src={media.url as string} alt={media.alt as string ?? ''} className="bdf-thumb" />
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

// â"€â"€â"€ SchemaForm â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

interface SchemaFormProps {
  schema: BlockFieldDefinition[]
  value: Record<string, unknown>
  onChange: (val: Record<string, unknown>) => void
}

function SchemaForm({ schema, value, onChange }: SchemaFormProps) {
  const set = useCallback(
    (key: string, val: unknown) => onChange({ ...value, [key]: val }),
    [value, onChange],
  )

  return (
    <>
      {schema.map((field) => (
        <FieldInput
          key={field.name}
          field={field}
          value={value[field.name]}
          onChange={(v) => set(field.name, v)}
        />
      ))}
    </>
  )
}

// â"€â"€â"€ FieldInput â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

interface FieldInputProps {
  field: BlockFieldDefinition
  value: unknown
  onChange: (val: unknown) => void
}

function FieldInput({ field, value, onChange }: FieldInputProps) {
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
            type={field.type === 'email' ? 'email' : 'text'}
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
              onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)
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

    case 'relationship':
      return (
        <div className="bdf-field">
          <label className="bdf-label">
            {label}
            {field.required && <span className="bdf-required">*</span>}
            {(field as unknown as { collection?: string }).collection && (
              <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--theme-elevation-400)', fontWeight: 400 }}>
                ({(field as unknown as { collection?: string }).collection})
              </span>
            )}
          </label>
          <input
            className="bdf-input"
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter document ID"
          />
        </div>
      )

    case 'json':
      return (
        <div className="bdf-field">
          <label className="bdf-label">
            {label}
            {field.required && <span className="bdf-required">*</span>}
            <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--theme-elevation-400)', fontWeight: 400 }}>
              (JSON)
            </span>
          </label>
          <textarea
            className="bdf-input bdf-textarea bdf-mono"
            value={value !== undefined ? JSON.stringify(value, null, 2) : ''}
            rows={4}
            onChange={(e) => {
              try { onChange(JSON.parse(e.target.value)) } catch { /* allow partial edits */ }
            }}
          />
        </div>
      )

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
              <SchemaForm schema={subFields} value={groupVal} onChange={onChange} />
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

// â"€â"€â"€ BlockDataField â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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


