'use client'

import React from 'react'

interface SelectOption {
  label: string
  value: string
}

type Props = {
  options: SelectOption[]
  onChange: (options: SelectOption[]) => void
  readOnly?: boolean
}

export function OptionsEditor({ options, onChange, readOnly }: Props) {
  function addOption() {
    onChange([...options, { label: '', value: '' }])
  }

  function updateOption(index: number, key: keyof SelectOption, val: string) {
    onChange(options.map((o, i) => (i === index ? { ...o, [key]: val } : o)))
  }

  function removeOption(index: number) {
    onChange(options.filter((_, i) => i !== index))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          color: 'var(--theme-elevation-800)',
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          lineHeight: '20px',
          fontWeight: 400,
          paddingBottom: 5,
        }}
      >
        Options
        {options.length > 0 && (
          <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--theme-elevation-400)', fontWeight: 400 }}>
            ({options.length})
          </span>
        )}
      </span>

      {options.length === 0 && (
        <p
          style={{
            fontSize: 13,
            color: 'var(--theme-elevation-400)',
            fontFamily: 'var(--font-body)',
            lineHeight: '20px',
            margin: 0,
          }}
        >
          No options yet.
        </p>
      )}

      {options.map((opt, i) => (
        <div key={i} className="sbf-options-row">
          <input
            className="sbf-input"
            type="text"
            value={opt.label}
            placeholder="Label"
            disabled={readOnly}
            onChange={(e) => updateOption(i, 'label', e.target.value)}
          />
          <input
            className="sbf-input"
            type="text"
            value={opt.value}
            placeholder="Value"
            disabled={readOnly}
            onChange={(e) => updateOption(i, 'value', e.target.value)}
          />
          {!readOnly && (
            <button
              type="button"
              className="sbf-icon-btn sbf-icon-btn--danger"
              title="Remove option"
              onClick={() => removeOption(i)}
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
          onClick={addOption}
        >
          <span className="sbf-add-btn__icon">+</span>
          Add Option
        </button>
      )}
    </div>
  )
}


