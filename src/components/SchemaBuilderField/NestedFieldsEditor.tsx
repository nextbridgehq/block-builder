'use client'

import React, { useCallback } from 'react'
import type { FieldDef } from './index'
import { FieldRow } from './FieldRow'

type Props = {
  fields: FieldDef[]
  onChange: (fields: FieldDef[]) => void
  readOnly?: boolean
  depth?: number
}

export function NestedFieldsEditor({ fields, onChange, readOnly, depth = 1 }: Props) {
  const addField = useCallback(() => {
    onChange([...fields, { name: '', type: 'text', label: '', required: false }])
  }, [fields, onChange])

  const updateField = useCallback(
    (index: number, updated: FieldDef) => {
      onChange(fields.map((f, i) => (i === index ? updated : f)))
    },
    [fields, onChange],
  )

  const removeField = useCallback(
    (index: number) => {
      onChange(fields.filter((_, i) => i !== index))
    },
    [fields, onChange],
  )

  const moveField = useCallback(
    (index: number, dir: -1 | 1) => {
      const next = [...fields]
      const target = index + dir
      if (target < 0 || target >= next.length) return
      ;[next[index], next[target]] = [next[target], next[index]]
      onChange(next)
    },
    [fields, onChange],
  )

  return (
    <div className="sbf-nested">
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          color: 'var(--theme-elevation-800)',
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          lineHeight: '20px',
          fontWeight: 400,
          paddingBottom: fields.length > 0 ? 6 : 0,
        }}
      >
        Nested fields
        {fields.length > 0 && (
          <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--theme-elevation-400)', fontWeight: 400 }}>
            ({fields.length})
          </span>
        )}
      </span>

      {fields.length === 0 && (
        <p
          style={{
            fontSize: 13,
            color: 'var(--theme-elevation-400)',
            fontFamily: 'var(--font-body)',
            lineHeight: '20px',
            margin: '4px 0 8px',
          }}
        >
          No nested fields yet.
        </p>
      )}

      {fields.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--base, 16px) / 2)' }}>
          {fields.map((field, i) => (
            <FieldRow
              key={i}
              index={i}
              total={fields.length}
              field={field}
              onChange={(updated) => updateField(i, updated)}
              onRemove={() => removeField(i)}
              onMoveUp={i > 0 ? () => moveField(i, -1) : undefined}
              onMoveDown={i < fields.length - 1 ? () => moveField(i, 1) : undefined}
              readOnly={readOnly}
              depth={depth}
            />
          ))}
        </div>
      )}

      {!readOnly && (
        <div style={{ marginTop: 'calc(var(--base, 16px) / 2)' }}>
          <button
            type="button"
            className="sbf-add-btn sbf-add-btn--small"
            onClick={addField}
          >
            <span className="sbf-add-btn__icon">+</span>
            Add Nested Field
          </button>
        </div>
      )}
    </div>
  )
}


