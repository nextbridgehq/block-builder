'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useBuilderStore } from '../../store/builder.store'
import { mapToSaveRequest } from '../../lib/mapToSaveRequest'
import { generateAllBlocks, generateIndexFile } from '../../lib/codegen'
import type { VersionInfo, BlockDefInfo } from './BuilderShell'

type NotificationState =
  | { status: 'publishing' }
  | { status: 'success'; msg: string }
  | { status: 'error'; title: string; errors: string[] }
  | null

type Props = {
  blockDefs: BlockDefInfo[]
  activeSlug: string | null
  onBlockSelect: (slug: string) => void
  versions: VersionInfo[]
  selectedVersionId: string | null
  onVersionSelect: (versionId: string) => void
  onRestoreVersion: () => void
  onAfterPublish: () => void
}

export function TopBar({ blockDefs, activeSlug, onBlockSelect, versions, selectedVersionId, onVersionSelect, onRestoreVersion, onAfterPublish }: Props) {
  const blocks = useBuilderStore((s) => s.blocks)
  const activeBlockId = useBuilderStore((s) => s.activeBlockId)
  const activeBlock = blocks.find((b) => b.id === activeBlockId)
  const markClean = useBuilderStore((s) => s.markClean)
  const isDirty = useBuilderStore((s) => s.isDirty)
  const isReadOnly = useBuilderStore((s) => s.isReadOnly)
  const setVersionMeta = useBuilderStore((s) => s.setVersionMeta)

  const [notification, setNotification] = useState<NotificationState>(null)
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false)
  const [blockPickerOpen, setBlockPickerOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const blockPickerRef = useRef<HTMLDivElement>(null)

  const selectedVersion = versions.find((v) => v.id === selectedVersionId)
  const currentVersion = versions.find((v) => v.isCurrent)
  const activeBlockDef = blockDefs.find((b) => b.slug === activeSlug)

  // Auto-dismiss success after 3 seconds
  useEffect(() => {
    if (notification?.status === 'success') {
      const t = setTimeout(() => setNotification(null), 3000)
      return () => clearTimeout(t)
    }
  }, [notification])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setVersionDropdownOpen(false)
      }
      if (blockPickerRef.current && !blockPickerRef.current.contains(e.target as Node)) {
        setBlockPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handlePublish() {
    if (!activeBlock || isReadOnly) return
    setNotification({ status: 'publishing' })
    try {
      const req = mapToSaveRequest(activeBlock)
      const res = await fetch('/api/blocks/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      })
      const json = await res.json() as {
        success: boolean
        errors?: string[]
        versionNumber?: number
        message?: string
      }
      if (json.success) {
        markClean()
        setVersionMeta(null, false)
        setNotification({
          status: 'success',
          msg: `v${json.versionNumber ?? '?'} published successfully!`,
        })
        await onAfterPublish()
      } else {
        setNotification({
          status: 'error',
          title: 'Failed to publish block',
          errors: json.errors ?? ['An unknown error occurred.'],
        })
      }
    } catch (err) {
      setNotification({
        status: 'error',
        title: 'Network error',
        errors: [err instanceof Error ? err.message : 'Could not reach the server.'],
      })
    }
  }

  function handleExport() {
    if (blocks.length === 0) return
    const outputs = [...generateAllBlocks(blocks), generateIndexFile(blocks)]
    for (const out of outputs) {
      const blob = new Blob([out.code], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = out.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  return (
    <>
      <div className="bb-topbar">
        <div className="bb-topbar__brand">
          <span className="bb-topbar__title">Block Builder</span>
          {isDirty && !isReadOnly && <span className="bb-topbar__dirty">* unsaved</span>}
        </div>

        <div className="bb-topbar__selectors">

          {/* Block picker */}
          {blockDefs.length > 0 && (
            <div className="bb-block-picker" ref={blockPickerRef}>
              <button
                type="button"
                className="bb-block-picker__trigger"
                onClick={() => setBlockPickerOpen((o) => !o)}
              >
                <span className="bb-block-picker__icon">B</span>
                <span>{activeBlockDef?.name ?? activeSlug ?? 'Select a block'}</span>
                <span className="bb-version-selector__chevron">v</span>
              </button>

              {blockPickerOpen && (
                <div className="bb-block-picker__dropdown">
                  <div className="bb-version-dropdown__header">Block Definitions</div>
                  {blockDefs.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className={`bb-version-dropdown__item${b.slug === activeSlug ? ' bb-version-dropdown__item--active' : ''}`}
                      onClick={() => {
                        setBlockPickerOpen(false)
                        onBlockSelect(b.slug)
                      }}
                    >
                      <span className="bb-block-picker__item-name">{b.name}</span>
                      <span className="bb-version-dropdown__meta">{b.slug}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Version selector */}
          {versions.length > 0 && (
            <div className="bb-version-selector" ref={dropdownRef}>
              <button
                type="button"
                className={`bb-version-selector__trigger${isReadOnly ? ' bb-version-selector__trigger--readonly' : ''}`}
                onClick={() => setVersionDropdownOpen((o) => !o)}
              >
                <span className={`bb-version-selector__dot${selectedVersion?.isCurrent ? ' bb-version-selector__dot--current' : ' bb-version-selector__dot--old'}`} />
                <span>{selectedVersion?.label ?? `v${selectedVersion?.versionNumber ?? '?'}`}</span>
                {selectedVersion?.isCurrent && <span className="bb-version-selector__badge">current</span>}
                <span className="bb-version-selector__chevron">v</span>
              </button>

              {versionDropdownOpen && (
                <div className="bb-version-dropdown">
                  <div className="bb-version-dropdown__header">Version History</div>
                  {versions.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`bb-version-dropdown__item${v.id === selectedVersionId ? ' bb-version-dropdown__item--active' : ''}`}
                      onClick={() => {
                        setVersionDropdownOpen(false)
                        onVersionSelect(v.id)
                      }}
                    >
                      <span className={`bb-version-selector__dot${v.isCurrent ? ' bb-version-selector__dot--current' : ' bb-version-selector__dot--old'}`} />
                      <span className="bb-version-dropdown__label">
                        {v.label}
                        {v.isCurrent && <span className="bb-version-selector__badge">current</span>}
                      </span>
                      <span className="bb-version-dropdown__meta">
                        {v.changelog ? `${v.changelog.slice(0, 32)}${v.changelog.length > 32 ? '...' : ''}` : formatDate(v.createdAt)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        <div className="bb-topbar__actions">
          <button
            type="button"
            onClick={handleExport}
            disabled={blocks.length === 0}
            className="bb-btn bb-btn--secondary"
            style={{ display: 'none' }}
          >
            Export .ts
          </button>

          {isReadOnly ? (
            <>
              <button
                type="button"
                onClick={() => { onVersionSelect(currentVersion?.id ?? ''); }}
                className="bb-btn bb-btn--secondary"
                disabled={!currentVersion}
              >
                Back to current
              </button>
              <button
                type="button"
                onClick={async () => {
                  // Restore: publish this old version's schema as a new version
                  await handlePublish()
                  setVersionMeta(null, false)
                  onRestoreVersion()
                }}
                disabled={notification?.status === 'publishing' || !activeBlock}
                className="bb-btn bb-btn--warning"
              >
                {notification?.status === 'publishing' ? 'Restoring...' : 'Restore as new version'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              disabled={notification?.status === 'publishing' || !activeBlock}
              className="bb-btn bb-btn--primary"
            >
              {notification?.status === 'publishing' ? 'Publishing...' : 'Publish to Payload'}
            </button>
          )}
        </div>
      </div>

      {/* Notification overlay */}
      {notification?.status === 'publishing' && (
        <div className="bb-notify bb-notify--publishing">
          <div className="bb-notify__box">
            <div className="bb-notify__spinner" />
            <div className="bb-notify__body">
              <p className="bb-notify__title">
                {isReadOnly ? 'Restoring version...' : 'Publishing to Payload...'}
              </p>
              <p className="bb-notify__sub">Validating schema and saving block definition.</p>
            </div>
          </div>
        </div>
      )}

      {notification?.status === 'success' && (
        <div className="bb-notify bb-notify--success">
          <div className="bb-notify__box">
            <span className="bb-notify__icon">OK</span>
            <div className="bb-notify__body">
              <p className="bb-notify__title">{notification.msg}</p>
              <p className="bb-notify__sub">The block definition and version have been saved.</p>
            </div>
            <button className="bb-notify__close" onClick={() => setNotification(null)}>x</button>
          </div>
        </div>
      )}

      {notification?.status === 'error' && (
        <div className="bb-notify bb-notify--error">
          <div className="bb-notify__box">
            <span className="bb-notify__icon">!</span>
            <div className="bb-notify__body">
              <p className="bb-notify__title">{notification.title}</p>
              <p className="bb-notify__sub">Fix the following errors before publishing:</p>
              <ul className="bb-notify__error-list">
                {notification.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
            <button className="bb-notify__close" onClick={() => setNotification(null)}>x</button>
          </div>
        </div>
      )}
    </>
  )
}
