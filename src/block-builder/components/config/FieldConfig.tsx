'use client'

import React from 'react'
import { useBuilderStore } from '../../store/builder.store'
import type { FieldDefinition, FieldType } from '../../types'

const ALL_TYPES: FieldType[] = [
  'text', 'textarea', 'richText', 'number', 'checkbox', 'select', 'radio',
  'date', 'upload', 'email', 'code', 'point', 'relationship', 'array',
  'group', 'json', 'ui',
]

export function FieldConfig() {
  const activeBlockId = useBuilderStore((s) => s.activeBlockId)
  const activeFieldId = useBuilderStore((s) => s.activeFieldId)
  const block = useBuilderStore((s) => s.blocks.find((b) => b.id === activeBlockId))
  const field = block?.fields.find((f) => f.id === activeFieldId)
  const updateField = useBuilderStore((s) => s.updateField)

  if (!activeBlockId || !activeFieldId || !field) {
    return (
      <div className="bb-form__empty">Select a field to configure it.</div>
    )
  }

  function upd(updates: Partial<FieldDefinition>) {
    updateField(activeBlockId!, activeFieldId!, updates)
  }

  const needsOptions = field.type === 'select' || field.type === 'radio'

  return (
    <div className="bb-form">
      <div className="bb-grid-2">
        <div className="bb-form__section">
          <label className="bb-form__label">Field Name *</label>
          <input
            type="text"
            value={field.name}
            onChange={(e) => upd({ name: e.target.value })}
            placeholder="fieldName"
            className="bb-input"
          />
        </div>
        <div className="bb-form__section">
          <label className="bb-form__label">Type *</label>
          <select
            value={field.type}
            onChange={(e) => upd({ type: e.target.value as FieldType })}
            className="bb-input bb-select"
          >
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bb-form__section">
        <label className="bb-form__label">Label</label>
        <input
          type="text"
          value={field.label ?? ''}
          onChange={(e) => upd({ label: e.target.value || undefined })}
          placeholder="Human-readable label"
          className="bb-input"
        />
      </div>

      <div className="bb-flags-row">
        <label className="bb-checkbox-row">
          <input
            type="checkbox"
            checked={field.required ?? false}
            onChange={(e) => upd({ required: e.target.checked })}
          />
          Required
        </label>
        <label className="bb-checkbox-row">
          <input
            type="checkbox"
            checked={field.unique ?? false}
            onChange={(e) => upd({ unique: e.target.checked })}
          />
          Unique
        </label>
        <label className="bb-checkbox-row">
          <input
            type="checkbox"
            checked={field.localized ?? false}
            onChange={(e) => upd({ localized: e.target.checked })}
          />
          Localized
        </label>
      </div>

      <div className="bb-form__section">
        <label className="bb-form__label">Default Value</label>
        <input
          type="text"
          value={field.defaultValue !== undefined ? String(field.defaultValue) : ''}
          onChange={(e) => upd({ defaultValue: e.target.value || undefined })}
          placeholder="Default value"
          className="bb-input"
        />
      </div>

      {field.type === 'relationship' && (
        <>
          <div className="bb-form__section">
            <label className="bb-form__label">Relation To (collection slug)</label>
            <input
              type="text"
              value={field.relationTo ?? ''}
              onChange={(e) => upd({ relationTo: e.target.value })}
              placeholder="pages"
              className="bb-input"
            />
          </div>
          <label className="bb-checkbox-row">
            <input
              type="checkbox"
              checked={field.hasMany ?? false}
              onChange={(e) => upd({ hasMany: e.target.checked })}
            />
            Has Many
          </label>
        </>
      )}

      {field.type === 'array' && (
        <div className="bb-grid-2">
          <div className="bb-form__section">
            <label className="bb-form__label">Min Rows</label>
            <input
              type="number"
              value={field.minRows ?? ''}
              onChange={(e) => upd({ minRows: e.target.value === '' ? undefined : e.target.valueAsNumber })}
              className="bb-input"
            />
          </div>
          <div className="bb-form__section">
            <label className="bb-form__label">Max Rows</label>
            <input
              type="number"
              value={field.maxRows ?? ''}
              onChange={(e) => upd({ maxRows: e.target.value === '' ? undefined : e.target.valueAsNumber })}
              className="bb-input"
            />
          </div>
        </div>
      )}

      {needsOptions && (
        <div className="bb-form__section">
          <div className="bb-options-label">Options</div>
          {(field.options ?? []).map((opt, i) => (
            <div key={i} className="bb-option-row">
              <input
                type="text"
                value={opt.label}
                placeholder="Label"
                onChange={(e) => {
                  const next = [...(field.options ?? [])]
                  next[i] = { ...next[i], label: e.target.value }
                  upd({ options: next })
                }}
                className="bb-input"
              />
              <input
                type="text"
                value={opt.value}
                placeholder="Value"
                onChange={(e) => {
                  const next = [...(field.options ?? [])]
                  next[i] = { ...next[i], value: e.target.value }
                  upd({ options: next })
                }}
                className="bb-input"
              />
              <button
                type="button"
                onClick={() => {
                  const next = (field.options ?? []).filter((_, k) => k !== i)
                  upd({ options: next })
                }}
                className="bb-option-delete"
                title="Remove option"
              >
                x
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => upd({ options: [...(field.options ?? []), { label: '', value: '' }] })}
            className="bb-add-option"
          >
            + Add Option
          </button>
        </div>
      )}
    </div>
  )
}


