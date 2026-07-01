'use client'

import React from 'react'
import { Copy, Trash2, Plus } from 'lucide-react'
import { useBuilderStore } from '../../store/builder.store'

export function BlockList() {
  const blocks = useBuilderStore((s) => s.blocks)
  const activeBlockId = useBuilderStore((s) => s.activeBlockId)
  const addBlock = useBuilderStore((s) => s.addBlock)
  const removeBlock = useBuilderStore((s) => s.removeBlock)
  const duplicateBlock = useBuilderStore((s) => s.duplicateBlock)
  const setActiveBlock = useBuilderStore((s) => s.setActiveBlock)

  return (
    <div className="bb-sidebar bb-sidebar--200 bb-sidebar--blocks">
      <div className="bb-sidebar__header">
        <span className="bb-sidebar__title">Blocks</span>
        <button type="button" onClick={addBlock} title="Add block" className="bb-sidebar__add">
          <Plus size={14} strokeWidth={2} />
        </button>
      </div>

      <div className="bb-sidebar__body">
        {blocks.length === 0 && (
          <div className="bb-block-empty">No blocks yet.<br />Click + to create one.</div>
        )}
        {blocks.map((block) => {
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
      </div>
    </div>
  )
}


