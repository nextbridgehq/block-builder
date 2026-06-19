'use client'

import React from 'react'
import { useDocumentInfo } from '@payloadcms/ui'
import { useField } from '@payloadcms/ui'

export function EditInBuilderButton() {
  const { id } = useDocumentInfo()
  const { value: slug } = useField<string>({ path: 'slug' })

  if (!id || !slug) return null

  return (
    <div style={{ marginTop: '1rem' }}>
      <a
        href={`/block-builder?load=${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          borderRadius: '6px',
          border: '1px solid #16a34a',
          color: '#16a34a',
          textDecoration: 'none',
          fontSize: '13px',
          fontWeight: 500,
          background: 'transparent',
          cursor: 'pointer',
        }}
      >
        Edit in Block Builder
      </a>
    </div>
  )
}


