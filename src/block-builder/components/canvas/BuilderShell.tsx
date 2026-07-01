'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useBuilderStore } from '../../store/builder.store'
import { TopBar } from './TopBar'
import { BlockList } from './BlockList'
import { BuilderCanvas } from './BuilderCanvas'
import { ConfigPanel } from './ConfigPanel'
import { FieldPalette } from '../sidebar/FieldPalette'
import { CodePreview } from './CodePreview'
import type { BlockDefinition } from '../../types'

export type VersionInfo = {
  id: string
  versionNumber: number
  label: string
  changelog: string
  createdAt: string
  isCurrent: boolean
}

export type BlockDefInfo = {
  id: string
  slug: string
  name: string
}

type Props = {
  loadSlug?: string | null
}

export function BuilderShell({ loadSlug }: Props) {
  const loadBlock = useBuilderStore((s) => s.loadBlock)
  const setVersionMeta = useBuilderStore((s) => s.setVersionMeta)
  const setBlockSlug = useBuilderStore((s) => s.setBlockSlug)
  const isReadOnly = useBuilderStore((s) => s.isReadOnly)

  const [activeSlug, setActiveSlug] = useState<string | null>(loadSlug ?? null)
  const [loading, setLoading] = useState(!!loadSlug)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showCodePreview, setShowCodePreview] = useState(false)
  const [versions, setVersions] = useState<VersionInfo[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [blockDefs, setBlockDefs] = useState<BlockDefInfo[]>([])
  const [mobilePanelTab, setMobilePanelTab] = useState<'blocks' | 'canvas' | 'palette' | 'config'>('blocks')

  // Fetch all block definitions for the picker
  useEffect(() => {
    fetch('/api/block-definitions?limit=200&depth=0')
      .then((r) => r.json())
      .then((json: { docs?: Array<{ id: string; slug: string; name: string }> }) => {
        setBlockDefs(
          (json.docs ?? []).map((d) => ({ id: String(d.id), slug: d.slug, name: d.name })),
        )
      })
      .catch((err: unknown) => {
        console.error('[block-builder] Failed to load block definitions:', err)
        setLoadError('Could not load block definitions. Please refresh the page.')
      })
  }, [])

  const loadVersionsForSlug = useCallback(async (slug: string): Promise<VersionInfo[]> => {
    try {
      const res = await fetch(`/api/block-builder/versions/${encodeURIComponent(slug)}`)
      const json = await res.json() as { versions?: VersionInfo[] }
      return json.versions ?? []
    } catch {
      return []
    }
  }, [])

  const loadVersion = useCallback(async (slug: string, versionId?: string) => {
    setLoading(true)
    setLoadError(null)
    const url = versionId
      ? `/api/block-builder/load/${encodeURIComponent(slug)}?versionId=${encodeURIComponent(versionId)}`
      : `/api/block-builder/load/${encodeURIComponent(slug)}`

    try {
      const res = await fetch(url)
      const json = await res.json() as {
        block?: BlockDefinition
        versionId?: string | null
        isCurrent?: boolean
        error?: string
      }
      if (json.block) {
        loadBlock(json.block)
        setVersionMeta(json.versionId ?? null, !(json.isCurrent ?? true))
        setSelectedVersionId(json.versionId ?? null)
      } else {
        setLoadError(json.error ?? 'Failed to load block')
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }, [loadBlock, setVersionMeta])

  // Load a block by slug (used for initial load and block picker selection)
  const loadBlockBySlug = useCallback(async (slug: string) => {
    setActiveSlug(slug)
    setBlockSlug(slug)
    setVersions([])
    setSelectedVersionId(null)
    setLoadError(null)
    setMobilePanelTab('canvas')

    await loadVersion(slug)

    const list = await loadVersionsForSlug(slug)
    setVersions(list)
    const current = list.find((v) => v.isCurrent) ?? list[0]
    if (current) setSelectedVersionId(current.id)
  }, [loadVersion, loadVersionsForSlug, setBlockSlug])

  // Initial load from URL param
  useEffect(() => {
    if (!loadSlug) return
    loadBlockBySlug(loadSlug)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadSlug])

  function handleVersionSelect(versionId: string) {
    if (!activeSlug) return
    loadVersion(activeSlug, versionId)
  }

  async function handleRestoreVersion() {
    if (!activeSlug) return
    await loadVersion(activeSlug)
    const list = await loadVersionsForSlug(activeSlug)
    setVersions(list)
    const current = list.find((v) => v.isCurrent) ?? list[0]
    if (current) setSelectedVersionId(current.id)
  }

  async function handleAfterPublish() {
    if (!activeSlug) return
    const list = await loadVersionsForSlug(activeSlug)
    setVersions(list)
    const current = list.find((v) => v.isCurrent) ?? list[0]
    if (current) setSelectedVersionId(current.id)
  }

  return (
    <div className="bb-shell">
      <TopBar
        blockDefs={blockDefs}
        activeSlug={activeSlug}
        onBlockSelect={loadBlockBySlug}
        versions={versions}
        selectedVersionId={selectedVersionId}
        onVersionSelect={handleVersionSelect}
        onRestoreVersion={handleRestoreVersion}
        onAfterPublish={handleAfterPublish}
      />

      {loading && (
        <div className="bb-loading-bar">Loading...</div>
      )}

      {loadError && (
        <div className="bb-error-bar">Error: {loadError}</div>
      )}

      {isReadOnly && !loading && (
        <div className="bb-readonly-banner">
          <span className="bb-readonly-banner__icon">[i]</span>
          <span>
            You are viewing a previous version - read only.
            <button
              type="button"
              className="bb-readonly-banner__btn"
              onClick={handleRestoreVersion}
            >
              Switch to latest
            </button>
          </span>
        </div>
      )}

      <div className="bb-main" data-mobile-panel={mobilePanelTab}>
        <BlockList />
        <div className="bb-main__center">
          <FieldPalette />
          <BuilderCanvas />
        </div>
        <ConfigPanel />
      </div>

      <div className="bb-footer">
        <button
          type="button"
          onClick={() => setShowCodePreview((p) => !p)}
          className={`bb-footer__toggle${showCodePreview ? ' bb-footer__toggle--open' : ''}`}
        >
          {showCodePreview ? 'v' : '>'} Code Preview
        </button>
        {showCodePreview && (
          <div className="bb-footer__content">
            <CodePreview />
          </div>
        )}
      </div>

      {/* Mobile bottom nav - hidden on desktop via CSS */}
      <nav className="bb-mobile-nav" aria-label="Panel navigation">
        {(
          [
            { id: 'blocks',  icon: 'B',  label: 'Blocks'  },
            { id: 'canvas',  icon: '[]', label: 'Canvas'  },
            { id: 'palette', icon: '+',  label: 'Fields'  },
            { id: 'config',  icon: '*',  label: 'Config'  },
          ] as const
        ).map(({ id, icon, label }) => (
          <button
            key={id}
            type="button"
            className={`bb-mobile-nav__tab${mobilePanelTab === id ? ' bb-mobile-nav__tab--active' : ''}`}
            onClick={() => setMobilePanelTab(id)}
          >
            <span className="bb-mobile-nav__icon">{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}
