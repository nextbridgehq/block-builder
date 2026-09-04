'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Blocks, ChevronDown, X } from 'lucide-react'
import { uuidv4 } from '../../../utils/uuid'
import { useBuilderStore } from '../../store/builder.store'
import type { VersionInfo, BlockDefInfo, NotificationState } from './BuilderShell'
import type { FieldDefinition } from '../../types'

// Imported JSON may come from a hand-authored Payload field config, where
// fields have no `id`. Every field (and nested/tab field) needs a unique id
// so BuilderCanvas can key its lists correctly.
function ensureFieldIds(fields: unknown): FieldDefinition[] {
  if (!Array.isArray(fields)) return []
  return fields.map((field) => {
    const f = { ...(field as FieldDefinition) }
    if (!f.id) f.id = uuidv4()
    if (Array.isArray(f.fields)) f.fields = ensureFieldIds(f.fields)
    if (Array.isArray(f.tabs)) {
      f.tabs = f.tabs.map((tab) => ({ ...tab, fields: ensureFieldIds(tab.fields) }))
    }
    return f
  })
}

type Props = {
  blockDefs: BlockDefInfo[]
  activeSlug: string | null
  onBlockSelect: (slug: string) => void
  versions: VersionInfo[]
  selectedVersionId: string | null
  onVersionSelect: (versionId: string) => void
  onRestoreVersion: () => void
  onAfterPublish: (publishedSlug: string) => void
  notification: NotificationState
  onSetNotification: (n: NotificationState) => void
  previewOpen: boolean
  onTogglePreview: () => void
}

export function TopBar({ blockDefs, activeSlug, onBlockSelect, versions, selectedVersionId, onVersionSelect, onRestoreVersion, onAfterPublish, notification, onSetNotification, previewOpen, onTogglePreview }: Props) {
  const blocks = useBuilderStore((s) => s.blocks)
  const activeBlockId = useBuilderStore((s) => s.activeBlockId)
  const activeBlock = blocks.find((b) => b.id === activeBlockId)
  const markClean = useBuilderStore((s) => s.markClean)
  const isDirty = useBuilderStore((s) => s.isDirty)
  const isReadOnly = useBuilderStore((s) => s.isReadOnly)
  const setVersionMeta = useBuilderStore((s) => s.setVersionMeta)
  const loadBlock = useBuilderStore((s) => s.loadBlock)

  const setNotification = onSetNotification
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false)
  const [blockPickerOpen, setBlockPickerOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const blockPickerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  async function handlePublish(): Promise<boolean> {
    if (!activeBlock || isReadOnly) return false
    setNotification({ status: 'publishing' })
    try {
      const normalizeSlug = (s: string) => s.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      // The slug the server actually stores under -- the shell needs it to know
      // which block the version list it is about to refresh belongs to.
      const publishedSlug = normalizeSlug(activeBlock.slug)
      const req = {
        blockSlug: publishedSlug,
        name: activeBlock.labels?.singular ?? activeBlock.slug,
        schema: { fields: activeBlock.fields },
        changelog: "Created via block builder",
      }
      const res = await fetch('/api/blocks/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Block-Builder': '1' },
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
        onAfterPublish(publishedSlug)
        return true
      } else {
        setNotification({
          status: 'error',
          title: 'Failed to publish block',
          errors: json.errors ?? ['An unknown error occurred.'],
        })
        return false
      }
    } catch (err) {
      setNotification({
        status: 'error',
        title: 'Network error',
        errors: [err instanceof Error ? err.message : 'Could not reach the server.'],
      })
      return false
    }
  }

  function handleExportJson() {
    if (!activeBlock) return
    const blob = new Blob([JSON.stringify(activeBlock, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeBlock.slug}-schema.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        if (json && json.slug && Array.isArray(json.fields)) {
          // ensure block id and every field id exist and are unique
          if (!json.id) json.id = uuidv4()
          json.fields = ensureFieldIds(json.fields)
          loadBlock(json)
          setNotification({ status: 'success', msg: 'Block imported successfully!' })
        } else {
          setNotification({ status: 'error', title: 'Invalid JSON', errors: ['The file does not contain a valid block schema.'] })
        }
      } catch (err) {
        setNotification({ status: 'error', title: 'Parse Error', errors: ['Could not parse JSON file.'] })
      }
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
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
                <Blocks size={14} strokeWidth={1.75} className="bb-block-picker__icon" />
                <span>{activeBlockDef?.name ?? activeSlug ?? 'Select a block'}</span>
                <ChevronDown size={14} strokeWidth={1.75} className="bb-version-selector__chevron" />
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
                <ChevronDown size={14} strokeWidth={1.75} className="bb-version-selector__chevron" />
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
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleImportJson}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bb-btn bb-btn--secondary"
          >
            Import JSON
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            disabled={!activeBlock}
            className="bb-btn bb-btn--secondary"
          >
            Export JSON
          </button>

          <div style={{ width: 1, height: 24, background: 'var(--bb-border)', margin: '0 4px' }} />

          <button
            type="button"
            onClick={onTogglePreview}
            disabled={!activeBlock}
            className={`bb-btn ${previewOpen ? 'bb-btn--primary' : 'bb-btn--secondary'}`}
          >
            {previewOpen ? 'Close Preview' : 'Live Preview'}
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
                  const success = await handlePublish()
                  if (success) onRestoreVersion()
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
            <button className="bb-notify__close" onClick={() => setNotification(null)}><X size={12} strokeWidth={2} /></button>
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
            <button className="bb-notify__close" onClick={() => setNotification(null)}><X size={12} strokeWidth={2} /></button>
          </div>
        </div>
      )}
    </>
  )
}
