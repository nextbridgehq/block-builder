'use client'

import { useEffect, useRef } from 'react'
import { useField, useFormFields } from '@payloadcms/ui'

// Registered as afterInput on the blockDefinition field.
// path = e.g. "dbLayout.0.blockDefinition"
// Watches blockDefinition — when it changes, fetches the block's currentVersion
// and auto-sets blockVersion.
export function BlockVersionSync({ path }: { path: string }) {
  const blockVersionPath = path.replace(/\.blockDefinition$/, '.blockVersion')

  const { setValue: setVersion } = useField<unknown>({ path: blockVersionPath })
  const blockDefValue = useFormFields(([fields]) => fields[path]?.value)

  const prevDefIdRef = useRef<string | number | null>(null)

  useEffect(() => {
    const defId =
      blockDefValue && typeof blockDefValue === 'object'
        ? ((blockDefValue as Record<string, unknown>).id as string | number | null)
        : typeof blockDefValue === 'string' || typeof blockDefValue === 'number'
          ? blockDefValue
          : null

    if (defId === prevDefIdRef.current) return
    prevDefIdRef.current = defId as string | number | null

    if (!defId) {
      setVersion(null)
      return
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(String(defId))) {
      return
    }

    fetch(`/api/block-definitions/${String(defId)}?depth=1`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((doc: Record<string, unknown> | null) => {
        if (!doc) return
        const currentVersion = doc.currentVersion
        if (!currentVersion) return
        const versionId =
          typeof currentVersion === 'object'
            ? (currentVersion as Record<string, unknown>).id
            : currentVersion
        if (versionId) setVersion(versionId)
      })
      .catch((err) => {
        console.error('[Block Builder] BlockVersionSync fetch error:', err)
      })
  }, [blockDefValue, setVersion])

  return null
}
