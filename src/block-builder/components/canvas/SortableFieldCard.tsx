'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Type, AlignLeft, AlignJustify, Hash, Mail, Calendar, CheckSquare,
  ChevronDown, Upload, Image, Link, Braces, List, Box, Columns, Folder, X,
  type LucideIcon,
} from 'lucide-react'
import { useBuilderStore } from '../../store/builder.store'
import type { FieldDefinition } from '../../types'

const ICON_MAP: Record<string, LucideIcon> = {
  text:         Type,
  textarea:     AlignLeft,
  richtext:     AlignJustify,
  number:       Hash,
  email:        Mail,
  date:         Calendar,
  checkbox:     CheckSquare,
  select:       ChevronDown,
  image:        Image,
  file:         Upload,
  relationship: Link,
  json:         Braces,
  array:        List,
  group:        Box,
  row:          Columns,
  tabs:         Folder,
  collapsible:  ChevronDown,
}

type Props = {
  field: FieldDefinition
  blockId: string
  index: number
  isActive: boolean
  isReadOnly: boolean
  onDrillDown?: () => void
}

export const SortableFieldCard = React.memo(function SortableFieldCard({
  field, blockId, index, isActive, isReadOnly, onDrillDown
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  })

  const setActiveField = useBuilderStore((s) => s.setActiveField)
  const removeField = useBuilderStore((s) => s.removeField)

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
      // Spread first, override second: dnd-kit's `attributes` already sets
      // `aria-roledescription`, so anything declared above the spread is
      // silently discarded. Only `aria-label` is ours to supply.
      aria-label={`Draggable field card for ${field.name || 'unnamed'}`}
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

        {onDrillDown && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onDrillDown()
            }}
            className="bb-field-card__drill"
            title="Edit Inner Fields"
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid var(--theme-border)',
              background: 'var(--theme-elevation-100)',
              cursor: 'pointer'
            }}
          >
            Edit Fields
          </button>
        )}

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
})

function FieldIcon({ type }: { type: string }) {
  const Icon = ICON_MAP[type]
  return Icon ? <Icon size={13} strokeWidth={1.75} /> : null
}
