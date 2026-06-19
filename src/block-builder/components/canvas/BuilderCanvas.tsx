'use client'

import React from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import { useBuilderStore } from '../../store/builder.store'
import { SortableFieldCard } from './SortableFieldCard'

export function BuilderCanvas() {
  const activeBlockId = useBuilderStore((s) => s.activeBlockId)
  const block = useBuilderStore((s) => s.blocks.find((b) => b.id === activeBlockId))
  const reorderFields = useBuilderStore((s) => s.reorderFields)
  const isReadOnly = useBuilderStore((s) => s.isReadOnly)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    if (isReadOnly) return
    const { active, over } = event
    if (!over || active.id === over.id || !block) return
    const fromIndex = block.fields.findIndex((f) => f.id === active.id)
    const toIndex = block.fields.findIndex((f) => f.id === over.id)
    if (fromIndex !== -1 && toIndex !== -1) {
      reorderFields(block.id, fromIndex, toIndex)
    }
  }

  if (!block) {
    return (
      <div className="bb-canvas" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="bb-canvas__no-block">Select or create a block from the left panel.</span>
      </div>
    )
  }

  return (
    <div className={`bb-canvas${isReadOnly ? ' bb-canvas--readonly' : ''}`}>
      <div className="bb-canvas__inner">
        <div className="bb-canvas__header">
          {block.slug} - {block.fields.length} field{block.fields.length !== 1 ? 's' : ''}
        </div>

        {block.fields.length === 0 ? (
          <div className="bb-canvas__empty">
            Add fields from the palette on the left
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={block.fields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="bb-canvas__field-list">
                {block.fields.map((field, i) => (
                  <SortableFieldCard
                    key={field.id}
                    field={field}
                    blockId={block.id}
                    index={i}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}


