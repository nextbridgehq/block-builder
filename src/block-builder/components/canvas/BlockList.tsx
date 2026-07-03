'use client'

import React from 'react'
import { Copy, Trash2, Plus } from 'lucide-react'
import { useBuilderStore } from '../../store/builder.store'
import type { BlockDefInfo } from './BuilderShell'

type Props = {
  blockDefs?: BlockDefInfo[]
  activeSlug?: string | null
  onBlockSelect?: (slug: string) => void
}

export function BlockList({ blockDefs = [], activeSlug, onBlockSelect }: Props) {
  const blocks = useBuilderStore((s) => s.blocks)
  const activeBlockId = useBuilderStore((s) => s.activeBlockId)
  const addBlock = useBuilderStore((s) => s.addBlock)
  const removeBlock = useBuilderStore((s) => s.removeBlock)
  const duplicateBlock = useBuilderStore((s) => s.duplicateBlock)
  const setActiveBlock = useBuilderStore((s) => s.setActiveBlock)

  // When API block defs are available, use them for navigation.
  // Also show local-only blocks (newly created, not yet saved).
  const useApiNav = blockDefs.length > 0

  // The block currently loaded in the store (for field count)
  const loadedBlock = useApiNav
    ? blocks.find((b) => b.slug === activeSlug)
    : null

  // Blocks created locally in this session (no matching slug in blockDefs)
  const localOnlyBlocks = blocks.filter(
    (b) => !blockDefs.some((d) => d.slug === b.slug),
  )

  return (
    <div className="bb-sidebar bb-sidebar--200 bb-sidebar--blocks">
      <div className="bb-sidebar__header">
        <span className="bb-sidebar__title">Blocks</span>
        <button type="button" onClick={addBlock} title="Add block" className="bb-sidebar__add">
          <Plus size={14} strokeWidth={2} />
        </button>
      </div>

      <div className="bb-sidebar__body">
        {/* API navigation items */}
        {useApiNav && blockDefs.map((def) => {
          const isActive = def.slug === activeSlug
          const fieldCount = isActive && loadedBlock ? loadedBlock.fields.length : null
          return (
            <div
              key={def.id}
              onClick={() => onBlockSelect?.(def.slug)}
              className={`bb-block-item${isActive ? ' bb-block-item--active' : ''}`}
            >
              <div className="bb-block-item__slug">{def.slug}</div>
              <div className="bb-block-item__meta">
                {fieldCount !== null
                  ? `${fieldCount} field${fieldCount !== 1 ? 's' : ''}`
                  : def.name}
              </div>
            </div>
          )
        })}

        {/* Local-only blocks (new, unsaved) */}
        {localOnlyBlocks.map((block) => {
          const isActive = block.id === activeBlockId
          return (
            <div
              key={block.id}
              onClick={() => setActiveBlock(block.id)}
              className={`bb-block-item${isActive ? ' bb-block-item--active' : ''}`}
            >
              <div className="bb-block-item__slug">{block.slug}</div>
              <div className="bb-block-item__meta">
                {block.fields.length} field{block.fields.length !== 1 ? 's' : ''}
              </div>
              <div
                className="bb-block-item__actions"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => duplicateBlock(block.id)}
                  className="bb-block-action"
                  title="Duplicate"
                >
                  <Copy size={12} strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => removeBlock(block.id)}
                  className="bb-block-action bb-block-action--danger"
                  title="Delete"
                >
                  <Trash2 size={12} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          )
        })}

        {/* Empty state — only when no API blocks and no local blocks */}
        {!useApiNav && blocks.length === 0 && (
          <div className="bb-block-empty">No blocks yet.<br />Click + to create one.</div>
        )}
      </div>
    </div>
  )
}
