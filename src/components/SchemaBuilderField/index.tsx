'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useField } from '@payloadcms/ui'
import type { FieldType, ConditionRule, ValidationRules, UIMetadata } from '../../validation/types'
import { FieldRow } from './FieldRow'

export interface FieldDef {
  name: string
  type: FieldType
  label: string
  required: boolean
  options?: { label: string; value: string }[]
  fields?: FieldDef[]
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  minRows?: number
  maxRows?: number
  collection?: string
  hasMany?: boolean
  allowedMimeTypes?: string
  timeFormat?: boolean
  admin?: {
    description?: string
    placeholder?: string
    readOnly?: boolean
    hidden?: boolean
  }
  conditions?: ConditionRule[]
  conditionMode?: 'AND' | 'OR'
  validation?: ValidationRules
  ui?: UIMetadata
  allowedBlocks?: string[]
  minBlocks?: number
  maxBlocks?: number
}

function parseSchema(raw: unknown): FieldDef[] {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsed) return []
    if (Array.isArray(parsed)) return parsed as FieldDef[]
    if (parsed?.fields && Array.isArray(parsed.fields)) return parsed.fields as FieldDef[]
  } catch {
    // ignore parse errors
  }
  return []
}

type Props = {
  path: string
  readOnly?: boolean
}

export function SchemaBuilderField({ path, readOnly }: Props) {
  const { value, setValue } = useField<unknown>({ path })

  const setValueRef = useRef(setValue)
  useEffect(() => { setValueRef.current = setValue })

  const [fields, setFields] = useState<FieldDef[]>(() => parseSchema(value))

  const hasExistingValue = value !== undefined && value !== null
  const [hydrated, setHydrated] = useState(!hasExistingValue)

  useEffect(() => {
    if (hydrated) return
    if (value !== undefined && value !== null) {
      setFields(parseSchema(value))
      setHydrated(true)
    }
  }, [value, hydrated])

  useEffect(() => {
    if (!hydrated) return
    setValueRef.current({ fields })
  }, [fields, hydrated])

  const addField = useCallback(() => {
    setFields((prev) => [
      ...prev,
      { name: '', type: 'text', label: '', required: false },
    ])
  }, [])

  const updateField = useCallback((index: number, updated: FieldDef) => {
    setFields((prev) => prev.map((f, i) => (i === index ? updated : f)))
  }, [])

  const removeField = useCallback((index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const moveField = useCallback((index: number, dir: -1 | 1) => {
    setFields((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }, [])

  return (
    <div>
      <div className="sbf-section-heading">
        <span className="sbf-section-label">
          Fields
          {fields.length > 0 && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                color: 'var(--theme-elevation-400)',
                fontWeight: 400,
              }}
            >
              ({fields.length})
            </span>
          )}
        </span>
      </div>

      {fields.length === 0 ? (
        <div className="sbf-empty">
          No fields defined. Click &ldquo;Add Field&rdquo; below to add the first field to this block schema.
        </div>
      ) : (
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
            />
          ))}
        </div>
      )}

      {!readOnly && (
        <div style={{ marginTop: 'calc(var(--base, 16px) / 2)', marginBottom: 'calc(var(--base, 16px) / 2)' }}>
          <button type="button" className="sbf-add-btn" onClick={addField}>
            <span className="sbf-add-btn__icon">+</span>
            Add Field
          </button>
        </div>
      )}
    </div>
  )
}


