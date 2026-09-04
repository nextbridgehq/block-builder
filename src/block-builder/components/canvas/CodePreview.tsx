'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useBuilderStore } from '../../store/builder.store'
import { generateAllBlocks, generateIndexFile } from '../../lib/codegen'

// ─── Tiny TypeScript syntax tokeniser ────────────────────────────────────────

type TokenKind = 'keyword' | 'string' | 'comment' | 'type' | 'number' | 'punct' | 'plain'

interface Token { kind: TokenKind; text: string }

const KEYWORDS = new Set([
  'import', 'export', 'from', 'const', 'let', 'var', 'type', 'interface',
  'as', 'true', 'false', 'null', 'undefined', 'return', 'async', 'await',
])
const TYPE_RE = /^[A-Z][A-Za-z0-9_<>[\],\s|&]*$/

function tokenise(code: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < code.length) {
    if (code[i] === '/' && code[i + 1] === '/') {
      const end = code.indexOf('\n', i)
      const text = end === -1 ? code.slice(i) : code.slice(i, end)
      tokens.push({ kind: 'comment', text })
      i += text.length
      continue
    }
    if (code[i] === "'" || code[i] === '"' || code[i] === '`') {
      const q = code[i]
      let j = i + 1
      while (j < code.length) {
        if (code[j] === '\\') { j += 2; continue }
        if (code[j] === q) { j++; break }
        j++
      }
      tokens.push({ kind: 'string', text: code.slice(i, j) })
      i = j
      continue
    }
    if (/[0-9]/.test(code[i]) || (code[i] === '-' && /[0-9]/.test(code[i + 1] ?? ''))) {
      let j = i + 1
      while (j < code.length && /[0-9._]/.test(code[j])) j++
      tokens.push({ kind: 'number', text: code.slice(i, j) })
      i = j
      continue
    }
    if (/[A-Za-z_$]/.test(code[i])) {
      let j = i + 1
      while (j < code.length && /[A-Za-z0-9_$]/.test(code[j])) j++
      const word = code.slice(i, j)
      const kind: TokenKind = KEYWORDS.has(word) ? 'keyword' : TYPE_RE.test(word) ? 'type' : 'plain'
      tokens.push({ kind, text: word })
      i = j
      continue
    }
    if (/[{}[\]:,;=().<>|&!]/.test(code[i])) {
      tokens.push({ kind: 'punct', text: code[i] })
      i++
      continue
    }
    let j = i + 1
    while (j < code.length && !/[A-Za-z0-9_$'"`0-9{}[\]:,;=().<>|&!/-]/.test(code[j])) j++
    tokens.push({ kind: 'plain', text: code.slice(i, j) })
    i = j
  }
  return tokens
}

const TOKEN_COLORS: Record<TokenKind, string> = {
  keyword: '#c792ea',
  string:  '#c3e88d',
  comment: '#546e7a',
  type:    '#82aaff',
  number:  '#f78c6c',
  punct:   '#89ddff',
  plain:   '#f9fafb',
}

function HighlightedCode({ code }: { code: string }) {
  const tokens = tokenise(code)
  return (
    <code style={{ fontFamily: 'inherit' }}>
      {tokens.map((tok, i) => (
        <span key={i} style={{ color: TOKEN_COLORS[tok.kind] }}>
          {tok.text}
        </span>
      ))}
    </code>
  )
}

// ─── CodePreview component ────────────────────────────────────────────────────

export function CodePreview() {
  const blocks = useBuilderStore((s) => s.blocks)
  const [fileMap, setFileMap] = useState<Record<string, string>>({})
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const regenerate = useCallback(() => {
    if (blocks.length === 0) {
      setFileMap({})
      setActiveFile(null)
      return
    }
    const blockOutputs = generateAllBlocks(blocks, { react: true })
    const indexOutput = generateIndexFile(blocks)
    const next: Record<string, string> = {}
    for (const out of blockOutputs) next[out.filename] = out.code
    next[indexOutput.filename] = indexOutput.code
    setFileMap(next)
    setActiveFile((prev) => {
      const keys = Object.keys(next)
      return prev && keys.includes(prev) ? prev : keys[0] ?? null
    })
  }, [blocks])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(regenerate, 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [regenerate])

  function copyActive() {
    if (!activeFile || !fileMap[activeFile]) return
    navigator.clipboard.writeText(fileMap[activeFile]).then(() => {
      setCopied(true)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
    })
  }

  const fileNames = Object.keys(fileMap)
  const activeCode = activeFile ? (fileMap[activeFile] ?? '') : ''
  const lineCount = activeCode ? activeCode.split('\n').length : 0

  if (fileNames.length === 0) {
    return (
      <div
        className="code-preview"
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--payload-muted, #9ca3af)',
          fontSize: '0.875rem',
          fontStyle: 'italic',
        }}
      >
        Add a block to see generated TypeScript code
      </div>
    )
  }

  return (
    <div className="code-preview" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--payload-border, #1f2937)',
          flexShrink: 0,
          overflowX: 'auto',
          gap: 0,
        }}
      >
        {fileNames.map((name) => {
          const isActive = activeFile === name
          return (
            <button
              key={name}
              type="button"
              onClick={() => setActiveFile(name)}
              style={{
                padding: '0.375rem 0.875rem',
                background: isActive ? 'var(--payload-surface, #111827)' : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? '#22c55e' : 'transparent'}`,
                borderRight: '1px solid var(--payload-border, #1f2937)',
                color: isActive ? '#22c55e' : 'var(--payload-muted, #9ca3af)',
                fontSize: '0.75rem',
                fontFamily: 'ui-monospace, monospace',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 0.1s, background 0.1s',
              }}
            >
              {name}
            </button>
          )
        })}

        <div style={{ flex: 1 }} />

        {lineCount > 0 && (
          <span
            style={{
              fontSize: '0.6875rem',
              color: 'var(--payload-muted, #9ca3af)',
              padding: '0 0.75rem',
              whiteSpace: 'nowrap',
            }}
          >
            {lineCount} lines
          </span>
        )}

        <button
          type="button"
          onClick={copyActive}
          title="Copy to clipboard"
          style={{
            padding: '0.375rem 0.875rem',
            background: 'transparent',
            border: 'none',
            borderLeft: '1px solid var(--payload-border, #1f2937)',
            color: copied ? '#22c55e' : 'var(--payload-muted, #9ca3af)',
            fontSize: '0.75rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'color 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', display: 'flex' }}>
        <div
          style={{
            flexShrink: 0,
            padding: '1rem 0.75rem 1rem 0.5rem',
            textAlign: 'right',
            color: 'var(--payload-muted, #4b5563)',
            fontSize: '0.75rem',
            lineHeight: 1.6,
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            userSelect: 'none',
            borderRight: '1px solid var(--payload-border, #1f2937)',
            minWidth: '2.5rem',
          }}
          aria-hidden="true"
        >
          {activeCode.split('\n').map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        <pre
          style={{
            flex: 1,
            margin: 0,
            padding: '1rem',
            fontSize: '0.75rem',
            lineHeight: 1.6,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            background: 'transparent',
            overflow: 'visible',
            whiteSpace: 'pre',
          }}
        >
          <HighlightedCode code={activeCode} />
        </pre>
      </div>
    </div>
  )
}


