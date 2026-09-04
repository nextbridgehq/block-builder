'use client'

import React from 'react'
import { useBuilderStore } from '../../store/builder.store'

export function BlockConfig() {
  const activeBlockId = useBuilderStore((s) => s.activeBlockId)
  const block = useBuilderStore((s) => s.blocks.find((b) => b.id === activeBlockId))
  const updateBlock = useBuilderStore((s) => s.updateBlock)

  if (!block) {
    return (
      <div className="bb-form__empty">No block selected.</div>
    )
  }

  return (
    <div className="bb-form">
      <div className="bb-form__section">
        <label className="bb-form__label">Slug *</label>
        <input
          type="text"
          value={block.slug}
          onChange={(e) => updateBlock(block.id, { slug: e.target.value })}
          placeholder="myBlock"
          className="bb-input"
        />
        <span className="bb-form__hint">Unique identifier used in code and database</span>
      </div>

      <div className="bb-form__section">
        <label className="bb-form__label">Interface Name</label>
        <input
          type="text"
          value={block.interfaceName ?? ''}
          onChange={(e) => updateBlock(block.id, { interfaceName: e.target.value || undefined })}
          placeholder="MyBlock"
          className="bb-input"
        />
      </div>

      <div className="bb-grid-2">
        <div className="bb-form__section">
          <label className="bb-form__label">Singular Label</label>
          <input
            type="text"
            value={block.labels?.singular ?? ''}
            onChange={(e) =>
              updateBlock(block.id, { labels: { ...block.labels, singular: e.target.value } })
            }
            placeholder="My Block"
            className="bb-input"
          />
        </div>
        <div className="bb-form__section">
          <label className="bb-form__label">Plural Label</label>
          <input
            type="text"
            value={block.labels?.plural ?? ''}
            onChange={(e) =>
              updateBlock(block.id, { labels: { ...block.labels, plural: e.target.value } })
            }
            placeholder="My Blocks"
            className="bb-input"
          />
        </div>
      </div>

      <div className="bb-form__section">
        <label className="bb-form__label">Image URL</label>
        <input
          type="text"
          value={block.imageURL ?? ''}
          onChange={(e) => updateBlock(block.id, { imageURL: e.target.value || undefined })}
          placeholder="https://..."
          className="bb-input"
        />
      </div>

      <div className="bb-stat-box">
        <strong>{block.fields.length}</strong> field{block.fields.length !== 1 ? 's' : ''} defined
      </div>
    </div>
  )
}


