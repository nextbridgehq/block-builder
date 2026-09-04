'use client'

import React, { useState } from 'react'
import { useBuilderStore } from '../../store/builder.store'
import { BlockConfig } from '../config/BlockConfig'
import { FieldConfig } from '../config/FieldConfig'

export function ConfigPanel() {
  const [tab, setTab] = useState<'block' | 'field'>('block')
  const activeFieldId = useBuilderStore((s) => s.activeFieldId)
  const isReadOnly = useBuilderStore((s) => s.isReadOnly)

  const activeTab = activeFieldId ? 'field' : tab

  return (
    <div className={`bb-config${isReadOnly ? ' bb-config--readonly' : ''}`}>
      <div className="bb-config__tabs">
        {(['block', 'field'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`bb-config__tab${activeTab === t ? ' bb-config__tab--active' : ''}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bb-config__body">
        {activeTab === 'block' ? <BlockConfig /> : <FieldConfig />}
      </div>

      {isReadOnly && (
        <div className="bb-config__readonly-overlay">
          <span className="bb-config__readonly-label">Read only</span>
        </div>
      )}
    </div>
  )
}


