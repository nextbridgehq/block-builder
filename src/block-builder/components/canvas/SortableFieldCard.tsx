'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useBuilderStore } from '../../store/builder.store'
import type { FieldDefinition } from '../../types'

const ICON_MAP: Record<string, string> = {
  text: 'ðŸ“',
  textarea: 'ðŸ“„',
  richText: 'ðŸ“°',
  number: 'ðŸ”¢',
  checkbox: 'â˜‘',
  select: 'â–¾',
  radio: 'â—‰',
  date: 'ðŸ“…',
  upload: 'ðŸ“Ž',
  email: 'âœ‰',
  code: 'â€¹â€º',
  point: 'â—Ž',
  relationship: 'â‡Œ',
  array: 'â–¤',
  group: 'â–£',
  json: '{}',
  ui: 'â—ˆ',
}

type Props = {
  field: FieldDefinition
  blockId: string
  index: number
}

export function SortableFieldCard({ field, blockId, index }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  })

  const activeFieldId = useBuilderStore((s) => s.activeFieldId)
  const setActiveField = useBuilderStore((s) => s.setActiveField)
  const removeField = useBuilderStore((s) => s.removeField)

  const isActive = activeFieldId === field.id

  const wrapStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={wrapStyle}
      className={`bb-field-card-wrap${isDragging ? ' bb-field-card-wrap--dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div
        className={`bb-field-card${isActive ? ' bb-field-card--active' : ''}`}
        onClick={() => setActiveField(isActive ? null : field.id)}
      >
        <span className="bb-field-card__icon">
          {ICON_MAP[field.type] ?? 'â—»'}
        </span>

        <div className="bb-field-card__body">
          <div className="bb-field-card__name">
            {field.name || <span className="bb-field-card__name--empty">unnamed</span>}
          </div>
          <div className="bb-field-card__type">
            {field.type}
            {field.required && <span className="bb-field-card__required">*</span>}
          </div>
        </div>

        <span className="bb-field-card__index">#{index + 1}</span>

        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            removeField(blockId, field.id)
          }}
          className="bb-field-card__delete"
          title="Remove field"
        >
          âœ•
        </button>
      </div>
    </div>
  )
}


