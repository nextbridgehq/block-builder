'use client'

import React, { useState } from 'react'
import type { FieldDef } from './index'
import type { FieldType } from '../../validation/types'
import { OptionsEditor } from './OptionsEditor'
import { NestedFieldsEditor } from './NestedFieldsEditor'

const ALL_FIELD_TYPES: FieldType[] = [
  'text', 'textarea', 'richtext', 'number', 'checkbox',
  'select', 'multiselect', 'date', 'image', 'file',
  'url', 'email', 'color', 'array', 'group', 'relationship', 'json', 'blocks',
]

const TYPE_BADGE_COLORS: Partial<Record<FieldType, string>> = {
  text:         'var(--theme-elevation-150)',
  textarea:     'var(--theme-elevation-150)',
  richtext:     'var(--theme-elevation-150)',
  number:       'var(--theme-elevation-150)',
  email:        'var(--theme-elevation-150)',
  url:          'var(--theme-elevation-150)',
  color:        'var(--theme-elevation-150)',
  date:         'var(--theme-elevation-150)',
  checkbox:     'var(--theme-elevation-150)',
  select:       'var(--theme-elevation-150)',
  multiselect:  'var(--theme-elevation-150)',
  image:        'var(--theme-elevation-150)',
  file:         'var(--theme-elevation-150)',
  array:        'var(--theme-elevation-150)',
  group:        'var(--theme-elevation-150)',
  relationship: 'var(--theme-elevation-150)',
  json:         'var(--theme-elevation-150)',
  blocks:       'var(--theme-elevation-150)',
}

type Props = {
  index: number
  total: number
  field: FieldDef
  onChange: (updated: FieldDef) => void
  onRemove: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  readOnly?: boolean
  depth?: number
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className={`sbf-label${required ? ' sbf-label--required' : ''}`}>
      {children}
    </label>
  )
}

function FieldWrap({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column' }}>{children}</div>
}

export function FieldRow({
  index,
  field,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  readOnly,
  depth = 0,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showConditions, setShowConditions] = useState(false)

  const maxDepth = 3
  const canNest = depth < maxDepth
  const needsOptions = field.type === 'select' || field.type === 'multiselect'
  const needsNested = field.type === 'array' || field.type === 'group'

  function set<K extends keyof FieldDef>(key: K, val: FieldDef[K]) {
    onChange({ ...field, [key]: val })
  }

  const badgeBg = TYPE_BADGE_COLORS[field.type] ?? 'var(--theme-elevation-150)'

  return (
    <div className={`sbf-row${expanded ? '' : ' sbf-row--collapsed'}`}>
      <div
        className="sbf-row__header"
        role="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((p) => !p)}
      >
        <span
          style={{
            fontSize: 10,
            color: 'var(--theme-elevation-400)',
            flexShrink: 0,
            width: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.15s',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          {'>'}
        </span>

        <span className={`sbf-row__label${!field.name ? ' sbf-row__label--empty' : ''}`}>
          {field.name || 'unnamed field'}
        </span>

        {field.required && (
          <span style={{ color: 'var(--theme-error-500, #ef4444)', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
            *
          </span>
        )}

        <span
          className="sbf-type-badge"
          style={{ background: badgeBg }}
        >
          {field.type}
        </span>

        {!readOnly && (
          <div
            style={{ display: 'flex', gap: 2, flexShrink: 0, alignItems: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            {onMoveUp && (
              <button type="button" className="sbf-icon-btn" onClick={onMoveUp} title="Move up">
                ^
              </button>
            )}
            {onMoveDown && (
              <button type="button" className="sbf-icon-btn" onClick={onMoveDown} title="Move down">
                v
              </button>
            )}
            <button
              type="button"
              className="sbf-icon-btn sbf-icon-btn--danger"
              onClick={onRemove}
              title="Remove field"
            >
              x
            </button>
          </div>
        )}
      </div>

      {expanded && (
        <div className="sbf-row__content">

          <div className="sbf-grid-2">
            <FieldWrap>
              <FieldLabel required>Field Name</FieldLabel>
              <input
                className="sbf-input"
                type="text"
                value={field.name}
                placeholder="fieldName"
                disabled={readOnly}
                onChange={(e) => set('name', e.target.value)}
              />
            </FieldWrap>
            <FieldWrap>
              <FieldLabel required>Type</FieldLabel>
              <select
                className="sbf-input sbf-select"
                value={field.type}
                disabled={readOnly}
                onChange={(e) => set('type', e.target.value as FieldType)}
              >
                {ALL_FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </FieldWrap>
          </div>

          <FieldWrap>
            <FieldLabel>Label</FieldLabel>
            <input
              className="sbf-input"
              type="text"
              value={field.label ?? ''}
              placeholder="Human-readable label"
              disabled={readOnly}
              onChange={(e) => set('label', e.target.value)}
            />
          </FieldWrap>

          <div className="sbf-flags-row">
            <label className="sbf-checkbox-wrap">
              <input
                type="checkbox"
                checked={field.required ?? false}
                disabled={readOnly}
                onChange={(e) => set('required', e.target.checked)}
              />
              <span className="sbf-checkbox-label">Required</span>
            </label>
          </div>

          {field.type === 'number' && (
            <div className="sbf-grid-2">
              <FieldWrap>
                <FieldLabel>Min</FieldLabel>
                <input
                  className="sbf-input"
                  type="number"
                  value={field.min ?? ''}
                  disabled={readOnly}
                  onChange={(e) => set('min', e.target.value === '' ? undefined : e.target.valueAsNumber)}
                />
              </FieldWrap>
              <FieldWrap>
                <FieldLabel>Max</FieldLabel>
                <input
                  className="sbf-input"
                  type="number"
                  value={field.max ?? ''}
                  disabled={readOnly}
                  onChange={(e) => set('max', e.target.value === '' ? undefined : e.target.valueAsNumber)}
                />
              </FieldWrap>
            </div>
          )}

          {(field.type === 'text' || field.type === 'textarea') && (
            <div className="sbf-grid-2">
              <FieldWrap>
                <FieldLabel>Min Length</FieldLabel>
                <input
                  className="sbf-input"
                  type="number"
                  value={field.minLength ?? ''}
                  disabled={readOnly}
                  onChange={(e) => set('minLength', e.target.value === '' ? undefined : e.target.valueAsNumber)}
                />
              </FieldWrap>
              <FieldWrap>
                <FieldLabel>Max Length</FieldLabel>
                <input
                  className="sbf-input"
                  type="number"
                  value={field.maxLength ?? ''}
                  disabled={readOnly}
                  onChange={(e) => set('maxLength', e.target.value === '' ? undefined : e.target.valueAsNumber)}
                />
              </FieldWrap>
            </div>
          )}

          {field.type === 'array' && (
            <div className="sbf-grid-2">
              <FieldWrap>
                <FieldLabel>Min Rows</FieldLabel>
                <input
                  className="sbf-input"
                  type="number"
                  value={field.minRows ?? ''}
                  disabled={readOnly}
                  onChange={(e) => set('minRows', e.target.value === '' ? undefined : e.target.valueAsNumber)}
                />
              </FieldWrap>
              <FieldWrap>
                <FieldLabel>Max Rows</FieldLabel>
                <input
                  className="sbf-input"
                  type="number"
                  value={field.maxRows ?? ''}
                  disabled={readOnly}
                  onChange={(e) => set('maxRows', e.target.value === '' ? undefined : e.target.valueAsNumber)}
                />
              </FieldWrap>
            </div>
          )}

          {field.type === 'relationship' && (
            <>
              <FieldWrap>
                <FieldLabel required>Collection slug</FieldLabel>
                <input
                  className="sbf-input"
                  type="text"
                  value={field.collection ?? ''}
                  placeholder="e.g. pages"
                  disabled={readOnly}
                  onChange={(e) => set('collection', e.target.value)}
                />
              </FieldWrap>
              <div className="sbf-flags-row">
                <label className="sbf-checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={field.hasMany ?? false}
                    disabled={readOnly}
                    onChange={(e) => set('hasMany', e.target.checked)}
                  />
                  <span className="sbf-checkbox-label">Has Many</span>
                </label>
              </div>
            </>
          )}

          {needsOptions && (
            <OptionsEditor
              options={field.options ?? []}
              onChange={(opts) => set('options', opts)}
              readOnly={readOnly}
            />
          )}

          {needsNested && canNest && (
            <NestedFieldsEditor
              fields={field.fields ?? []}
              onChange={(nested) => set('fields', nested)}
              readOnly={readOnly}
              depth={depth + 1}
            />
          )}
          {needsNested && !canNest && (
            <span className="sbf-description">Maximum nesting depth ({depth}) reached.</span>
          )}

          <div className="sbf-section">
            <button
              type="button"
              className={`sbf-section__toggle${showAdmin ? ' sbf-section__toggle--open' : ''}`}
              onClick={() => setShowAdmin((p) => !p)}
            >
              Admin &amp; UI settings
              <span className="sbf-section__toggle-icon">{'>'}</span>
            </button>
            {showAdmin && (
              <div className="sbf-section__body">
                <FieldWrap>
                  <FieldLabel>Description</FieldLabel>
                  <input
                    className="sbf-input"
                    type="text"
                    value={field.admin?.description ?? ''}
                    placeholder="Helper text shown below the field"
                    disabled={readOnly}
                    onChange={(e) => set('admin', { ...field.admin, description: e.target.value })}
                  />
                </FieldWrap>
                <FieldWrap>
                  <FieldLabel>Placeholder</FieldLabel>
                  <input
                    className="sbf-input"
                    type="text"
                    value={field.admin?.placeholder ?? ''}
                    placeholder="Input placeholder text"
                    disabled={readOnly}
                    onChange={(e) => set('admin', { ...field.admin, placeholder: e.target.value })}
                  />
                </FieldWrap>
                <div className="sbf-flags-row">
                  <label className="sbf-checkbox-wrap">
                    <input
                      type="checkbox"
                      checked={field.admin?.readOnly ?? false}
                      disabled={readOnly}
                      onChange={(e) => set('admin', { ...field.admin, readOnly: e.target.checked })}
                    />
                    <span className="sbf-checkbox-label">Read Only</span>
                  </label>
                  <label className="sbf-checkbox-wrap">
                    <input
                      type="checkbox"
                      checked={field.admin?.hidden ?? false}
                      disabled={readOnly}
                      onChange={(e) => set('admin', { ...field.admin, hidden: e.target.checked })}
                    />
                    <span className="sbf-checkbox-label">Hidden</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="sbf-section">
            <button
              type="button"
              className={`sbf-section__toggle${showConditions ? ' sbf-section__toggle--open' : ''}`}
              onClick={() => setShowConditions((p) => !p)}
            >
              Conditional logic
              {(field.conditions?.length ?? 0) > 0 && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 11,
                    color: 'var(--theme-elevation-400)',
                    fontWeight: 400,
                  }}
                >
                  {field.conditions!.length} rule{field.conditions!.length !== 1 ? 's' : ''}
                </span>
              )}
              <span className="sbf-section__toggle-icon">{'>'}</span>
            </button>
            {showConditions && (
              <div className="sbf-section__body">
                <FieldWrap>
                  <FieldLabel>Condition Mode</FieldLabel>
                  <select
                    className="sbf-input sbf-select"
                    value={field.conditionMode ?? 'AND'}
                    disabled={readOnly}
                    onChange={(e) => set('conditionMode', e.target.value as 'AND' | 'OR')}
                    style={{ width: 'auto', minWidth: 240 }}
                  >
                    <option value="AND">AND - all conditions must match</option>
                    <option value="OR">OR - any condition must match</option>
                  </select>
                </FieldWrap>

                {(field.conditions ?? []).map((cond, ci) => (
                  <div key={ci} className="sbf-conditions-grid">
                    <FieldWrap>
                      <FieldLabel>Field</FieldLabel>
                      <input
                        className="sbf-input"
                        type="text"
                        value={cond.field}
                        placeholder="fieldName"
                        disabled={readOnly}
                        onChange={(e) => {
                          const next = [...(field.conditions ?? [])]
                          next[ci] = { ...next[ci], field: e.target.value }
                          set('conditions', next)
                        }}
                      />
                    </FieldWrap>
                    <FieldWrap>
                      <FieldLabel>Operator</FieldLabel>
                      <select
                        className="sbf-input sbf-select"
                        value={cond.operator}
                        disabled={readOnly}
                        onChange={(e) => {
                          const next = [...(field.conditions ?? [])]
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          next[ci] = { ...next[ci], operator: e.target.value as any }
                          set('conditions', next)
                        }}
                      >
                        {(['equals','not_equals','contains','not_contains','greater_than','less_than','in','not_in','exists','empty'] as const).map((op) => (
                          <option key={op} value={op}>{op.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </FieldWrap>
                    <FieldWrap>
                      <FieldLabel>Value</FieldLabel>
                      <input
                        className="sbf-input"
                        type="text"
                        value={String(cond.value ?? '')}
                        disabled={readOnly}
                        onChange={(e) => {
                          const next = [...(field.conditions ?? [])]
                          next[ci] = { ...next[ci], value: e.target.value }
                          set('conditions', next)
                        }}
                      />
                    </FieldWrap>
                    {!readOnly && (
                      <button
                        type="button"
                        className="sbf-icon-btn sbf-icon-btn--danger"
                        title="Remove condition"
                        style={{ marginTop: 25 }}
                        onClick={() => {
                          set('conditions', (field.conditions ?? []).filter((_, k) => k !== ci))
                        }}
                      >
                        x
                      </button>
                    )}
                  </div>
                ))}

                {!readOnly && (
                  <button
                    type="button"
                    className="sbf-add-btn sbf-add-btn--small"
                    onClick={() => {
                      set('conditions', [
                        ...(field.conditions ?? []),
                        { field: '', operator: 'equals' as const, value: '' },
                      ])
                    }}
                  >
                    <span className="sbf-add-btn__icon">+</span>
                    Add Condition
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}


