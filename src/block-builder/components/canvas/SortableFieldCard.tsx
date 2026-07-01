'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Type, AlignLeft, Hash, Mail, Calendar, CheckSquare,
  ChevronDown, Circle, Upload, Link, Braces, X,
  type LucideIcon,
} from 'lucide-react'
import { useBuilderStore } from '../../store/builder.store'
import type { FieldDefinition } from '../../types'

const ICON_MAP: Record<string, LucideIcon> = {
  text:         Type,
  textarea:     AlignLeft,
  number:       Hash,
  email:        Mail,
  date:         Calendar,
  checkbox:     CheckSquare,
  select:       ChevronDown,
  radio:        Circle,
  upload:       Upload,
  relationship: Link,
  json:         Braces,
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
  const isReadOnly = useBuilderStore((s) => s.isReadOnly)

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
          <FieldIcon type={field.type} />
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

        {!isReadOnly && (
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
            <X size={12} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  )
}

function FieldIcon({ type }: { type: string }) {
  const Icon = ICON_MAP[type]
  return Icon ? <Icon size={13} strokeWidth={1.75} /> : null
}
