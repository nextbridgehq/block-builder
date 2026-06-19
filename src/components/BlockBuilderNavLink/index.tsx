'use client'

import React from 'react'
import Link from 'next/link'

export function BlockBuilderNavLink() {
  return (
    <div style={{ padding: '0 16px', marginTop: '8px' }}>
      <Link
        href="/block-builder"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid #16a34a',
          color: '#16a34a',
          textDecoration: 'none',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'background 0.15s',
        }}
      >
        Block Builder
      </Link>
    </div>
  )
}
