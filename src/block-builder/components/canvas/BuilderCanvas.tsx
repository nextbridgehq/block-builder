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
import { useBuilderStore, getTargetFields } from '../../store/builder.store'
import { SortableFieldCard } from './SortableFieldCard'
import type { BlockDefinition, FieldDefinition, TabDefinition } from '../../types'

/**
 * Resolves a display label for every segment of the drill-down path.
 *
 * Each segment must be looked up in the field list its *own* parent produced,
 * not in `block.fields` -- only the first segment lives at the top level, so a
 * top-level-only lookup can never name anything below depth 1.
 */
function resolvePathLabels(block: BlockDefinition, parentPath: string[]): string[] {
  const labels: string[] = []
  let currentFields: FieldDefinition[] | undefined = block.fields

  for (const segment of parentPath) {
    const sepIndex = segment.indexOf('::')

    if (sepIndex !== -1) {
      const fieldId = segment.slice(0, sepIndex)
      const tabIndex = Number(segment.slice(sepIndex + 2))
      const tabsField: FieldDefinition | undefined = currentFields?.find((f) => f.id === fieldId)
      const tab: TabDefinition | undefined = tabsField?.tabs?.[tabIndex]
      labels.push(tab?.label || tabsField?.name || 'Tab')
      currentFields = tab?.fields
      continue
    }

    const field: FieldDefinition | undefined = currentFields?.find((f) => f.id === segment)
    labels.push(field?.name || field?.label || 'Nested Field')
    currentFields = field?.fields
  }

  return labels
}

export function BuilderCanvas() {
  const activeBlockId = useBuilderStore((s) => s.activeBlockId)
  const block = useBuilderStore((s) => s.blocks.find((b) => b.id === activeBlockId))
  const reorderFields = useBuilderStore((s) => s.reorderFields)
  const activeFieldId = useBuilderStore((s) => s.activeFieldId)
  const activeParentPath = useBuilderStore((s) => s.activeParentPath)
  const truncateParentPath = useBuilderStore((s) => s.truncateParentPath)
  const resetParentPath = useBuilderStore((s) => s.resetParentPath)
  const pushParentPath = useBuilderStore((s) => s.pushParentPath)
  const isReadOnly = useBuilderStore((s) => s.isReadOnly)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    if (isReadOnly) return
    const { active, over } = event
    if (!over || active.id === over.id || !block) return

    const targetFields = getTargetFields(block, activeParentPath)
    if (!targetFields) return

    const fromIndex = targetFields.findIndex((f) => f.id === active.id)
    const toIndex = targetFields.findIndex((f) => f.id === over.id)
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

  const targetFields = getTargetFields(block, activeParentPath) || []
  const pathLabels = resolvePathLabels(block, activeParentPath)

  return (
    <div className={`bb-canvas${isReadOnly ? ' bb-canvas--readonly' : ''}`}>
      <div className="bb-canvas__inner">
        <div className="bb-canvas__header">
          {activeParentPath.length === 0 ? (
            <>{block.slug} - {targetFields.length} field{targetFields.length !== 1 ? 's' : ''}</>
          ) : (
            <nav className="bb-breadcrumb" aria-label="Field path">
              <button
                type="button"
                onClick={() => resetParentPath()}
                className="bb-breadcrumb__item"
              >
                {block.slug}
              </button>
              <span className="bb-breadcrumb__sep">/</span>
              {activeParentPath.map((segment, index) => {
                const isLast = index === activeParentPath.length - 1
                return (
                  <React.Fragment key={segment}>
                    <button
                      type="button"
                      onClick={isLast ? undefined : () => truncateParentPath(index + 1)}
                      className="bb-breadcrumb__item"
                      aria-current={isLast ? 'location' : undefined}
                      data-current={isLast ? 'true' : undefined}
                    >
                      {pathLabels[index]}
                    </button>
                    {!isLast && <span className="bb-breadcrumb__sep">/</span>}
                  </React.Fragment>
                )
              })}
            </nav>
          )}
        </div>

        {targetFields.length === 0 ? (
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
              items={targetFields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="bb-canvas__field-list">
                {targetFields.map((field, i) => (
                  <SortableFieldCard
                    key={field.id}
                    field={field}
                    blockId={block.id}
                    index={i}
                    isActive={activeFieldId === field.id}
                    isReadOnly={isReadOnly}
                    onDrillDown={
                      ['group', 'row', 'array', 'collapsible'].includes(field.type)
                        ? () => pushParentPath(field.id)
                        : undefined
                    }
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
