'use client'

import React from 'react'
import { uuidv4 } from '../../../utils/uuid'
import { useBuilderStore, getTargetFields, encodeTabPath } from '../../store/builder.store'
import type { FieldDefinition, FieldType } from '../../types'

// Every type the schema vocabulary defines, not just the ones the palette
// offers: JSON import can introduce any of them, and a field whose type is
// missing here renders a blank dropdown that silently rewrites the type on
// the next change.
const ALL_TYPES: FieldType[] = [
  'text', 'textarea', 'richtext', 'number', 'email', 'url', 'color', 'date', 'checkbox',
  'select', 'multiselect', 'image', 'file', 'relationship', 'json',
  'array', 'group', 'blocks', 'row', 'tabs', 'collapsible',
]

// Payload doesn't support a `defaultValue` on these -- containers/layout
// types don't hold their own data, and relationship/image/file/json values
// aren't meaningfully expressible as a single default.
const NO_DEFAULT_VALUE_TYPES = new Set<FieldType>([
  'array', 'group', 'blocks', 'row', 'tabs', 'collapsible',
  'image', 'file', 'relationship', 'json',
])

export function FieldConfig() {
  const activeBlockId = useBuilderStore((s) => s.activeBlockId)
  const activeFieldId = useBuilderStore((s) => s.activeFieldId)
  const activeParentPath = useBuilderStore((s) => s.activeParentPath)
  const block = useBuilderStore((s) => s.blocks.find((b) => b.id === activeBlockId))
  const field = block ? getTargetFields(block, activeParentPath)?.find((f) => f.id === activeFieldId) : undefined
  const updateField = useBuilderStore((s) => s.updateField)
  const pushParentPath = useBuilderStore((s) => s.pushParentPath)

  if (!activeBlockId || !activeFieldId || !field) {
    return (
      <div className="bb-form__empty">Select a field to configure it.</div>
    )
  }

  function upd(updates: Partial<FieldDefinition>) {
    updateField(activeBlockId!, activeFieldId!, updates)
  }

  // `multiselect` is a `select` with `hasMany`, and the validator rejects
  // either one without a non-empty `options` array.
  const needsOptions = field.type === 'select' || field.type === 'multiselect'

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

      {!NO_DEFAULT_VALUE_TYPES.has(field.type) && (
        <div className="bb-form__section">
          <label className="bb-form__label">Default Value</label>
          {field.type === 'checkbox' ? (
            <label className="bb-checkbox-row">
              <input
                type="checkbox"
                checked={field.defaultValue === true}
                onChange={(e) => upd({ defaultValue: e.target.checked })}
              />
              Checked by default
            </label>
          ) : field.type === 'number' ? (
            <input
              type="number"
              value={typeof field.defaultValue === 'number' ? field.defaultValue : ''}
              onChange={(e) => upd({ defaultValue: e.target.value === '' ? undefined : e.target.valueAsNumber })}
              placeholder="0"
              className="bb-input"
            />
          ) : (
            <input
              type="text"
              value={field.defaultValue !== undefined ? String(field.defaultValue) : ''}
              onChange={(e) => upd({ defaultValue: e.target.value || undefined })}
              placeholder="Default value"
              className="bb-input"
            />
          )}
        </div>
      )}

      {field.type === 'relationship' && (
        <>
          <div className="bb-form__section">
            <label className="bb-form__label">Relation To (collection slug)</label>
            <input
              type="text"
              value={field.collection ?? ''}
              onChange={(e) => upd({ collection: e.target.value })}
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

      {field.type === 'tabs' && (
        <div className="bb-form__section">
          <div className="bb-options-label">Tabs</div>
          {(field.tabs ?? []).map((tab, i) => (
            <div key={tab.id ?? i} className="bb-option-row">
              <input
                type="text"
                value={tab.label}
                placeholder="Tab label"
                onChange={(e) => {
                  const next = [...(field.tabs ?? [])]
                  next[i] = { ...next[i], label: e.target.value }
                  upd({ tabs: next })
                }}
                className="bb-input"
              />
              <button
                type="button"
                onClick={() => pushParentPath(encodeTabPath(field.id, i))}
                className="bb-add-option"
                title="Edit this tab's fields"
              >
                Edit Fields
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = (field.tabs ?? []).filter((_, k) => k !== i)
                  upd({ tabs: next })
                }}
                className="bb-option-delete"
                title="Remove tab"
              >
                x
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              upd({
                tabs: [
                  ...(field.tabs ?? []),
                  { id: uuidv4(), label: `Tab ${(field.tabs?.length ?? 0) + 1}`, fields: [] },
                ],
              })
            }
            className="bb-add-option"
          >
            + Add Tab
          </button>
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


