import type { BlockSchema, BlockField } from '../validation/types'

// ─── Builder input types ───────────────────────────────────────────────────────

export interface RawFieldInput {
  name?: string
  type?: string
  label?: string
  required?: boolean
  fields?: RawFieldInput[]
  options?: Array<{ label: string; value: string } | string>
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  minRows?: number
  maxRows?: number
  defaultValue?: unknown
  collection?: string
  allowedMimeTypes?: string[]
  hasMany?: boolean
  timeFormat?: boolean
  admin?: Record<string, unknown>
  conditions?: unknown
  conditionMode?: string
  validation?: Record<string, unknown>
  ui?: Record<string, unknown>
  allowedBlocks?: string[]
  minBlocks?: number
  maxBlocks?: number
  [key: string]: unknown
}

export interface RawSchemaInput {
  fields: RawFieldInput[]
  layout?: string
}

// ─── Builder save request ─────────────────────────────────────────────────────

export interface SaveSchemaRequest {
  blockSlug: string
  name?: string
  description?: string
  category?: string
  schema: RawSchemaInput | BlockSchema
  changelog?: string
}

export interface SaveSchemaResult {
  success: boolean
  definitionId: string
  versionId: string
  versionNumber: number
  errors?: string[]
  warnings?: string[]
}


