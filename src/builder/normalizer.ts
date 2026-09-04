import type { RawFieldInput, RawSchemaInput } from './types'
import type {
  BlockSchema,
  BlockField,
  SelectOption,
  FieldType,
  ConditionRule,
  ValidationRules,
  UIMetadata,
} from '../validation/types'

const KNOWN_TYPES: Set<FieldType> = new Set([
  'text',
  'textarea',
  'richtext',
  'number',
  'checkbox',
  'select',
  'multiselect',
  'date',
  'image',
  'file',
  'url',
  'email',
  'color',
  'array',
  'group',
  'relationship',
  'json',
  'blocks',
  'row',
  'tabs',
  'collapsible',
])

function normaliseOption(opt: unknown): SelectOption {
  if (typeof opt === 'string') {
    return { label: opt, value: opt.toLowerCase().replace(/\s+/g, '-') }
  }
  if (opt && typeof opt === 'object') {
    const o = opt as Record<string, unknown>
    const value = String(o.value ?? o.label ?? '').toLowerCase().replace(/\s+/g, '-')
    const label = String(o.label ?? o.value ?? value)
    return { label, value }
  }
  return { label: String(opt), value: String(opt) }
}

function normaliseConditions(raw: unknown): ConditionRule[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const result: ConditionRule[] = []
  for (const item of raw) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const c = item as Record<string, unknown>
      if (typeof c.field === 'string' && typeof c.operator === 'string') {
        result.push({ field: c.field, operator: c.operator as ConditionRule['operator'], value: c.value })
      }
    }
  }
  return result.length > 0 ? result : undefined
}

function normaliseValidation(raw: unknown): ValidationRules | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const v = raw as Record<string, unknown>
  const out: ValidationRules = {}

  if (typeof v.required === 'boolean') out.required = v.required
  if (typeof v.minLength === 'number') out.minLength = v.minLength
  if (typeof v.maxLength === 'number') out.maxLength = v.maxLength
  if (typeof v.regex === 'string') out.regex = v.regex
  if (typeof v.min === 'number') out.min = v.min
  if (typeof v.max === 'number') out.max = v.max
  if (typeof v.step === 'number') out.step = v.step
  if (typeof v.integerOnly === 'boolean') out.integerOnly = v.integerOnly
  if (typeof v.minRows === 'number') out.minRows = v.minRows
  if (typeof v.maxRows === 'number') out.maxRows = v.maxRows
  if (typeof v.uniqueItems === 'boolean') out.uniqueItems = v.uniqueItems
  if (Array.isArray(v.allowedMimeTypes)) out.allowedMimeTypes = v.allowedMimeTypes as string[]
  if (typeof v.maxFileSize === 'number') out.maxFileSize = v.maxFileSize
  if (typeof v.maxSelections === 'number') out.maxSelections = v.maxSelections

  return Object.keys(out).length > 0 ? out : undefined
}

function normaliseUI(raw: unknown): UIMetadata | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const u = raw as Record<string, unknown>
  const out: UIMetadata = {}

  if (typeof u.tab === 'string') out.tab = u.tab
  if (typeof u.section === 'string') out.section = u.section
  if (['full', 'half', 'third', 'quarter'].includes(u.width as string)) {
    out.width = u.width as UIMetadata['width']
  }
  if (typeof u.collapsed === 'boolean') out.collapsed = u.collapsed
  if (typeof u.order === 'number') out.order = u.order

  return Object.keys(out).length > 0 ? out : undefined
}

function normaliseField(raw: RawFieldInput): BlockField {
  const type = (raw.type ?? 'text') as FieldType
  const resolvedType: FieldType = KNOWN_TYPES.has(type) ? type : 'text'

  const base: Record<string, unknown> = {
    name: String(raw.name ?? '').trim(),
    type: resolvedType,
  }

  if (raw.label) base.label = String(raw.label)
  if (raw.required !== undefined) base.required = Boolean(raw.required)
  // `unique` and `localized` apply to every field type and are settable in the
  // builder's config panel, so they belong in the shared prefix rather than in
  // one of the per-type branches below -- omitting them here dropped them
  // silently on publish, and they were gone after the next reload.
  if (raw.unique !== undefined) base.unique = Boolean(raw.unique)
  if (raw.localized !== undefined) base.localized = Boolean(raw.localized)
  if (raw.admin && typeof raw.admin === 'object') base.admin = raw.admin

  const conditions = normaliseConditions(raw.conditions)
  if (conditions) base.conditions = conditions
  if (raw.conditionMode === 'AND' || raw.conditionMode === 'OR') {
    base.conditionMode = raw.conditionMode
  }

  const validation = normaliseValidation(raw.validation)
  if (validation) base.validation = validation

  const ui = normaliseUI(raw.ui)
  if (ui) base.ui = ui

  switch (resolvedType) {
    case 'text':
    case 'textarea': {
      if (raw.minLength !== undefined) base.minLength = Number(raw.minLength)
      if (raw.maxLength !== undefined) base.maxLength = Number(raw.maxLength)
      if (raw.defaultValue !== undefined) base.defaultValue = raw.defaultValue
      break
    }

    case 'number': {
      if (raw.min !== undefined) base.min = Number(raw.min)
      if (raw.max !== undefined) base.max = Number(raw.max)
      if (raw.defaultValue !== undefined && raw.defaultValue !== '') {
        const n = Number(raw.defaultValue)
        if (!Number.isNaN(n)) base.defaultValue = n
      }
      break
    }

    case 'checkbox': {
      if (raw.defaultValue !== undefined) {
        base.defaultValue =
          typeof raw.defaultValue === 'string'
            ? raw.defaultValue.toLowerCase() === 'true'
            : Boolean(raw.defaultValue)
      }
      break
    }

    case 'select':
    case 'multiselect': {
      const rawOpts = Array.isArray(raw.options) ? raw.options : []
      base.options = rawOpts.map(normaliseOption)
      if (raw.defaultValue !== undefined) base.defaultValue = raw.defaultValue
      break
    }

    case 'date': {
      if (raw.timeFormat !== undefined) base.timeFormat = Boolean(raw.timeFormat)
      if (raw.defaultValue !== undefined) base.defaultValue = raw.defaultValue
      break
    }

    // The config panel offers a Default Value input for all of these, and the
    // emitter writes one out, so the normaliser has to carry it through.
    case 'richtext':
    case 'email':
    case 'url':
    case 'color': {
      if (raw.defaultValue !== undefined) base.defaultValue = raw.defaultValue
      break
    }

    case 'array': {
      const subFields = Array.isArray(raw.fields) ? raw.fields.map(normaliseField) : []
      base.fields = subFields
      if (raw.minRows !== undefined) base.minRows = Number(raw.minRows)
      if (raw.maxRows !== undefined) base.maxRows = Number(raw.maxRows)
      break
    }

    case 'group': {
      const subFields = Array.isArray(raw.fields) ? raw.fields.map(normaliseField) : []
      base.fields = subFields
      break
    }

    case 'relationship': {
      if (raw.collection) base.collection = String(raw.collection)
      if (raw.hasMany !== undefined) base.hasMany = Boolean(raw.hasMany)
      break
    }

    // Both upload types carry the target collection through to `relationTo`.
    case 'image': {
      if (raw.collection) base.collection = String(raw.collection)
      break
    }

    case 'file': {
      if (Array.isArray(raw.allowedMimeTypes)) base.allowedMimeTypes = raw.allowedMimeTypes
      if (raw.collection) base.collection = String(raw.collection)
      break
    }

    case 'blocks': {
      if (Array.isArray(raw.allowedBlocks)) {
        base.allowedBlocks = raw.allowedBlocks.map(String).filter(Boolean)
      }
      if (raw.minBlocks !== undefined) base.minBlocks = Number(raw.minBlocks)
      if (raw.maxBlocks !== undefined) base.maxBlocks = Number(raw.maxBlocks)
      break
    }

    case 'row':
    case 'collapsible': {
      const subFields = Array.isArray(raw.fields) ? raw.fields.map(normaliseField) : []
      base.fields = subFields
      if (resolvedType === 'collapsible') {
        base.label = String(raw.label ?? 'Collapsible Section')
      }
      break
    }

    case 'tabs': {
      const rawTabs = Array.isArray(raw.tabs) ? raw.tabs as unknown[] : []
      base.tabs = rawTabs.map((t) => {
        const tab = t as Record<string, unknown>
        return {
          id: tab.id ? String(tab.id) : undefined,
          name: tab.name ? String(tab.name) : undefined,
          label: String(tab.label ?? 'Tab'),
          description: tab.description ? String(tab.description) : undefined,
          fields: Array.isArray(tab.fields) ? (tab.fields as RawFieldInput[]).map(normaliseField) : [],
        }
      })
      break
    }
  }

  return base as unknown as BlockField
}

export function normaliseSchema(raw: RawSchemaInput): BlockSchema {
  const fields = Array.isArray(raw.fields) ? raw.fields.map(normaliseField) : []

  const schema: BlockSchema = { fields }

  if (raw.layout === 'sidebar' || raw.layout === 'tabs') {
    schema.layout = raw.layout
  } else {
    schema.layout = 'default'
  }

  return schema
}


