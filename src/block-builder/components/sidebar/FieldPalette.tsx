'use client'

import React, { useState } from 'react'
import {
  Type, AlignLeft, Hash, Mail, Calendar, CheckSquare,
  ChevronDown, Circle, Upload, Link, List,
  Folder, Braces,
  type LucideIcon,
} from 'lucide-react'
import { FIELD_PALETTE, FIELD_CATEGORIES, getFieldMeta } from '../../lib/field-palette'
import { useBuilderStore } from '../../store/builder.store'
import type { FieldType } from '../../types'

const ICON_MAP: Record<string, LucideIcon> = {
  Type, AlignLeft, Hash, Mail, Calendar, CheckSquare,
  ChevronDown, Circle, Upload, Link, List,
  Folder, Braces,
}

export function FieldPalette() {
  const [search, setSearch] = useState('')
  const activeBlockId = useBuilderStore((s) => s.activeBlockId)
  const addField = useBuilderStore((s) => s.addField)
  const isReadOnly = useBuilderStore((s) => s.isReadOnly)

  const filtered = search.trim()
    ? FIELD_PALETTE.filter(
        (f) =>
          f.label.toLowerCase().includes(search.toLowerCase()) ||
          f.type.toLowerCase().includes(search.toLowerCase()),
      )
    : FIELD_PALETTE

  function handleAdd(type: FieldType) {
    if (!activeBlockId || isReadOnly) return
    addField(activeBlockId, type)
  }

  return (
    <div className={`bb-sidebar bb-sidebar--200 bb-sidebar--palette${isReadOnly ? ' bb-sidebar--readonly' : ''}`}>
      <div className="bb-sidebar__header">
        <span className="bb-sidebar__title">Fields</span>
      </div>

      <div className="bb-palette__search-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="bb-palette__search"
        />
      </div>

      <div className="bb-sidebar__body">
        {search.trim() ? (
          <div className="bb-palette__items">
            {filtered.map((item) => (
              <FieldButton
                key={item.type}
                type={item.type}
                label={item.label}
                icon={item.icon}
                onAdd={handleAdd}
                disabled={!activeBlockId || isReadOnly}
              />
            ))}
          </div>
        ) : (
          FIELD_CATEGORIES.map((cat) => {
            const items = FIELD_PALETTE.filter((f) => f.category === cat.id)
            return (
              <div key={cat.id} style={{ marginTop: 6 }}>
                <div className="bb-palette__cat-label">{cat.label}</div>
                <div className="bb-palette__items">
                  {items.map((item) => (
                    <FieldButton
                      key={item.type}
                      type={item.type}
                      label={item.label}
                      icon={item.icon}
                      onAdd={handleAdd}
                      disabled={!activeBlockId || isReadOnly}
                    />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {!activeBlockId && (
        <div className="bb-sidebar__footer">Select a block first</div>
      )}
    </div>
  )
}

function FieldButton({
  type,
  label,
  icon,
  onAdd,
  disabled,
}: {
  type: FieldType
  label: string
  icon: string
  onAdd: (type: FieldType) => void
  disabled: boolean
}) {
  const meta = getFieldMeta(type)
  const Icon = ICON_MAP[icon]

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onAdd(type)}
      title={meta?.description}
      className="bb-palette__item"
    >
      <span className="bb-palette__item__icon">
        {Icon ? <Icon size={13} strokeWidth={1.75} /> : null}
      </span>
      <span className="bb-palette__item__label">{label}</span>
      <span className="bb-palette__item__type">{type}</span>
    </button>
  )
}


