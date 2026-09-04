import type {
  BlockSchema,
  BlockField,
  ValidationResult,
  FieldType,
} from './types'

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_FIELD_TYPES: Set<FieldType> = new Set([
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

const CONTAINER_TYPES = new Set<FieldType>(['array', 'group', 'row', 'collapsible'])

// Payload's `row`, `tabs`, and `collapsible` configs have no `name` -- the
// emitter strips ours before writing them out. Their names are a builder-only
// handle, so they cannot collide with anything and take no part in the
// duplicate or reserved-name checks below.
const UNNAMED_TYPES = new Set<FieldType>(['row', 'tabs', 'collapsible'])
const LEAF_NAME_RE = /^[a-zA-Z][a-zA-Z0-9_]*$/

const VALID_CONDITION_OPERATORS = new Set([
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'greater_than',
  'less_than',
  'in',
  'not_in',
  'exists',
  'empty',
])

// ─── Condition validator ──────────────────────────────────────────────────────

function validateConditions(
  conditions: unknown,
  path: string,
  errors: string[],
): void {
  if (!Array.isArray(conditions)) {
    errors.push(`${path}: "conditions" must be an array.`)
    return
  }
  ;(conditions as unknown[]).forEach((cond, i) => {
    const cp = `${path}[${i}]`
    if (!cond || typeof cond !== 'object') {
      errors.push(`${cp}: condition must be an object.`)
      return
    }
    const c = cond as Record<string, unknown>
    if (typeof c.field !== 'string' || !c.field.trim()) {
      errors.push(`${cp}: "field" must be a non-empty string.`)
    }
    if (
      typeof c.operator !== 'string' ||
      !VALID_CONDITION_OPERATORS.has(c.operator)
    ) {
      errors.push(
        `${cp}: "operator" must be one of: ${[...VALID_CONDITION_OPERATORS].join(', ')}.`,
      )
    }
  })
}

// ─── Validation-rules object validator ───────────────────────────────────────

function validateValidationRules(
  v: Record<string, unknown>,
  path: string,
  errors: string[],
): void {
  const numericProps = [
    'minLength',
    'maxLength',
    'min',
    'max',
    'step',
    'minRows',
    'maxRows',
    'maxFileSize',
    'maxSelections',
  ]
  for (const prop of numericProps) {
    if (v[prop] !== undefined && typeof v[prop] !== 'number') {
      errors.push(`${path}.${prop}: must be a number.`)
    }
  }

  if (
    typeof v.minLength === 'number' &&
    typeof v.maxLength === 'number' &&
    v.minLength > v.maxLength
  ) {
    errors.push(`${path}: "minLength" (${v.minLength}) must be <= "maxLength" (${v.maxLength}).`)
  }

  if (
    typeof v.min === 'number' &&
    typeof v.max === 'number' &&
    v.min > v.max
  ) {
    errors.push(`${path}: "min" (${v.min}) must be <= "max" (${v.max}).`)
  }

  if (
    typeof v.minRows === 'number' &&
    typeof v.maxRows === 'number' &&
    v.minRows > v.maxRows
  ) {
    errors.push(`${path}: "minRows" (${v.minRows}) must be <= "maxRows" (${v.maxRows}).`)
  }

  if (v.regex !== undefined) {
    if (typeof v.regex !== 'string') {
      errors.push(`${path}.regex: must be a string.`)
    } else {
      try {
        new RegExp(v.regex)
      } catch {
        errors.push(`${path}.regex: invalid regular expression "${v.regex}".`)
      }
    }
  }

  if (v.integerOnly !== undefined && typeof v.integerOnly !== 'boolean') {
    errors.push(`${path}.integerOnly: must be a boolean.`)
  }
  if (v.uniqueItems !== undefined && typeof v.uniqueItems !== 'boolean') {
    errors.push(`${path}.uniqueItems: must be a boolean.`)
  }
  if (v.allowedMimeTypes !== undefined && !Array.isArray(v.allowedMimeTypes)) {
    errors.push(`${path}.allowedMimeTypes: must be an array of strings.`)
  }
}

// ─── Per-field validator ──────────────────────────────────────────────────────

function validateField(
  field: unknown,
  path: string,
  errors: string[],
  warnings: string[],
  reserved: string[] = [],
  names: Set<string> = new Set(),
): void {
  if (!field || typeof field !== 'object' || Array.isArray(field)) {
    errors.push(`${path}: must be a non-array object.`)
    return
  }

  const f = field as Record<string, unknown>

  if (typeof f.name !== 'string' || !f.name.trim()) {
    errors.push(`${path}: "name" is required and must be a non-empty string.`)
  } else if (!LEAF_NAME_RE.test(f.name)) {
    errors.push(
      `${path}.name "${f.name}": must start with a letter and contain only letters, digits, or underscores.`,
    )
  }

  if (typeof f.type !== 'string') {
    errors.push(`${path}: "type" is required.`)
    return
  }
  if (!VALID_FIELD_TYPES.has(f.type as FieldType)) {
    errors.push(`${path}: unknown field type "${f.type}".`)
    return
  }

  const type = f.type as FieldType

  if (f.label !== undefined && typeof f.label !== 'string') {
    errors.push(`${path}: "label" must be a string.`)
  } else if (f.label === undefined) {
    warnings.push(`${path}: no "label" defined; consider adding one for admin UX.`)
  }

  if (f.required !== undefined && typeof f.required !== 'boolean') {
    errors.push(`${path}: "required" must be a boolean.`)
  }

  if (f.conditions !== undefined) {
    validateConditions(f.conditions, `${path}.conditions`, errors)
  }

  if (
    f.conditionMode !== undefined &&
    f.conditionMode !== 'AND' &&
    f.conditionMode !== 'OR'
  ) {
    errors.push(`${path}: "conditionMode" must be "AND" or "OR".`)
  }

  if (f.validation !== undefined) {
    if (!f.validation || typeof f.validation !== 'object' || Array.isArray(f.validation)) {
      errors.push(`${path}: "validation" must be an object.`)
    } else {
      validateValidationRules(
        f.validation as Record<string, unknown>,
        `${path}.validation`,
        errors,
      )
    }
  }

  if (f.ui !== undefined) {
    if (!f.ui || typeof f.ui !== 'object' || Array.isArray(f.ui)) {
      errors.push(`${path}: "ui" must be an object.`)
    } else {
      const ui = f.ui as Record<string, unknown>
      if (
        ui.width !== undefined &&
        !['full', 'half', 'third', 'quarter'].includes(ui.width as string)
      ) {
        errors.push(`${path}.ui.width: must be "full", "half", "third", or "quarter".`)
      }
      if (ui.order !== undefined && typeof ui.order !== 'number') {
        errors.push(`${path}.ui.order: must be a number.`)
      }
      if (ui.collapsed !== undefined && typeof ui.collapsed !== 'boolean') {
        errors.push(`${path}.ui.collapsed: must be a boolean.`)
      }
    }
  }

  if (type === 'select' || type === 'multiselect') {
    if (!Array.isArray(f.options) || f.options.length === 0) {
      errors.push(`${path}: "${type}" fields must have a non-empty "options" array.`)
    } else {
      ;(f.options as unknown[]).forEach((opt, i) => {
        if (!opt || typeof opt !== 'object') {
          errors.push(`${path}.options[${i}]: must be an object.`)
          return
        }
        const o = opt as Record<string, unknown>
        if (typeof o.label !== 'string' || !o.label.trim()) {
          errors.push(`${path}.options[${i}]: "label" is required.`)
        }
        if (typeof o.value !== 'string' || !o.value.trim()) {
          errors.push(`${path}.options[${i}]: "value" is required.`)
        }
      })
    }
  }

  if (type === 'number') {
    if (f.min !== undefined && typeof f.min !== 'number') {
      errors.push(`${path}: "min" must be a number.`)
    }
    if (f.max !== undefined && typeof f.max !== 'number') {
      errors.push(`${path}: "max" must be a number.`)
    }
    if (
      typeof f.min === 'number' &&
      typeof f.max === 'number' &&
      f.min > f.max
    ) {
      errors.push(`${path}: "min" (${f.min}) must be <= "max" (${f.max}).`)
    }
  }

  if (type === 'text' || type === 'textarea') {
    if (f.minLength !== undefined && typeof f.minLength !== 'number') {
      errors.push(`${path}: "minLength" must be a number.`)
    }
    if (f.maxLength !== undefined && typeof f.maxLength !== 'number') {
      errors.push(`${path}: "maxLength" must be a number.`)
    }
  }

  if (type === 'relationship') {
    if (typeof f.collection !== 'string' || !f.collection.trim()) {
      errors.push(`${path}: "relationship" fields require a non-empty "collection" string.`)
    }
  }

  if (CONTAINER_TYPES.has(type)) {
    if (!Array.isArray(f.fields) || f.fields.length === 0) {
      errors.push(`${path}: "${type}" fields must have a non-empty "fields" array.`)
    } else {
      validateFields(
        f.fields as unknown[],
        `${path}.fields`,
        errors,
        warnings,
        childReservedNames(type, reserved),
        // A `row` or `collapsible` stores its children in the surrounding
        // object, so they share its namespace; `array` and `group` open one.
        FLATTENING_TYPES.has(type) ? names : new Set<string>(),
      )
    }

    if (type === 'array') {
      if (f.minRows !== undefined && typeof f.minRows !== 'number') {
        errors.push(`${path}: "minRows" must be a number.`)
      }
      if (f.maxRows !== undefined && typeof f.maxRows !== 'number') {
        errors.push(`${path}: "maxRows" must be a number.`)
      }
    }
  }

  if (type === 'blocks') {
    if (f.allowedBlocks !== undefined) {
      if (!Array.isArray(f.allowedBlocks)) {
        errors.push(`${path}: "allowedBlocks" must be an array.`)
      } else {
        ;(f.allowedBlocks as unknown[]).forEach((slug, i) => {
          if (typeof slug !== 'string' || !slug.trim()) {
            errors.push(`${path}.allowedBlocks[${i}]: must be a non-empty string.`)
          }
        })
      }
    }
    if (f.minBlocks !== undefined && typeof f.minBlocks !== 'number') {
      errors.push(`${path}: "minBlocks" must be a number.`)
    }
    if (f.maxBlocks !== undefined && typeof f.maxBlocks !== 'number') {
      errors.push(`${path}: "maxBlocks" must be a number.`)
    }
    if (
      typeof f.minBlocks === 'number' &&
      typeof f.maxBlocks === 'number' &&
      f.minBlocks > f.maxBlocks
    ) {
      errors.push(`${path}: "minBlocks" (${f.minBlocks}) must be <= "maxBlocks" (${f.maxBlocks}).`)
    }
  }

  if (type === 'tabs') {
    if (!Array.isArray(f.tabs) || f.tabs.length === 0) {
      errors.push(`${path}: "tabs" fields must have a non-empty "tabs" array.`)
    } else {
      ;(f.tabs as unknown[]).forEach((tab, i) => {
        const tabPath = `${path}.tabs[${i}]`
        if (!tab || typeof tab !== 'object') {
          errors.push(`${tabPath}: must be an object.`)
          return
        }
        const t = tab as Record<string, unknown>
        if (typeof t.label !== 'string' || !t.label.trim()) {
          errors.push(`${tabPath}: "label" is required.`)
        }
        if (!Array.isArray(t.fields) || t.fields.length === 0) {
          errors.push(`${tabPath}: "fields" must be a non-empty array.`)
        } else {
          // A *named* tab nests its children in their own object; an unnamed one
          // flattens them into the surrounding object, reserved names and all.
          const named = typeof t.name === 'string' && t.name.trim().length > 0
          // The name a named tab nests under is itself a key in the surrounding
          // object, so it competes with the sibling fields for that namespace.
          if (named) claimName(String(t.name).trim(), tabPath, errors, reserved, names)
          validateFields(
            t.fields as unknown[],
            `${tabPath}.fields`,
            errors,
            warnings,
            named ? [] : reserved,
            named ? new Set<string>() : names,
          )
        }
      })
    }
  }
}

// Payload injects these keys into every block's own data object.
const BLOCK_RESERVED_NAMES = ['id', 'createdAt', 'updatedAt', 'blockType', 'blockName']

// Payload injects an `id` into every array row, so a user-defined `id` inside an
// array collides just as surely as one at the top level.
const ARRAY_ROW_RESERVED_NAMES = ['id']

/**
 * The set of names Payload owns *inside* a container, given what it owned at
 * the container's own level.
 *
 * `row` and `collapsible` are presentational -- their children are stored
 * directly in the surrounding object, so an `id` inside a top-level Row
 * collides with the block's injected `id` exactly as one written at the root
 * would. They therefore inherit the enclosing level's reserved names.
 * `array` opens a fresh row object with its own injected `id`, and `group`
 * (like a named tab) opens a nested object Payload injects nothing into.
 */
function childReservedNames(type: FieldType, reserved: string[]): string[] {
  if (FLATTENING_TYPES.has(type)) return reserved
  if (type === 'array') return ARRAY_ROW_RESERVED_NAMES
  return []
}

// Containers whose children are stored in the *surrounding* object rather than
// in one of their own. An unnamed tab flattens the same way, but it is a `Tab`
// rather than a field, so it is handled where tabs are walked.
const FLATTENING_TYPES = new Set<FieldType>(['row', 'collapsible'])

/**
 * Records `name` as taken in the object being built at this level, reporting a
 * collision with an earlier sibling or with a key Payload injects.
 *
 * `names` is shared across a flattening boundary, so a field inside a Row is
 * checked against the Row's siblings -- Payload stores them side by side, and
 * a validator that checked each `fields` array in isolation let that through.
 */
function claimName(
  name: string,
  path: string,
  errors: string[],
  reserved: string[],
  names: Set<string>,
): void {
  if (names.has(name)) {
    errors.push(`${path}: duplicate field name "${name}".`)
  }
  if (reserved.includes(name)) {
    errors.push(`${path}: field name "${name}" is a reserved word in Payload CMS.`)
  }
  names.add(name)
}

/**
 * `reserved` is the set of names Payload itself owns at *this* level -- see
 * `childReservedNames` for how it is derived when descending into a container.
 */
function validateFields(
  fields: unknown[],
  path: string,
  errors: string[],
  warnings: string[],
  reserved: string[] = [],
  names: Set<string> = new Set(),
): void {
  fields.forEach((field, index) => {
    const fieldPath = `${path}[${index}]`
    validateField(field, fieldPath, errors, warnings, reserved, names)

    const f = field as Record<string, unknown>
    if (typeof f.name === 'string' && f.name && !UNNAMED_TYPES.has(f.type as FieldType)) {
      claimName(f.name, path, errors, reserved, names)
    }
  })
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function validateBlockSchema(schema: unknown): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return {
      valid: false,
      errors: ['Schema must be a non-array object with a "fields" property.'],
      warnings: [],
    }
  }

  const s = schema as Record<string, unknown>

  if (!Array.isArray(s.fields)) {
    errors.push('Schema must have a "fields" array.')
  } else if (s.fields.length === 0) {
    warnings.push('Schema has no fields defined.')
  } else {
    validateFields(s.fields, 'schema.fields', errors, warnings, BLOCK_RESERVED_NAMES)
  }

  if (
    s.layout !== undefined &&
    !['default', 'sidebar', 'tabs'].includes(s.layout as string)
  ) {
    errors.push(`schema.layout must be one of: "default", "sidebar", "tabs".`)
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function assertValidBlockSchema(schema: unknown, context = 'Schema'): BlockSchema {
  const result = validateBlockSchema(schema)
  if (!result.valid) {
    throw new Error(`${context} validation failed:\n  - ${result.errors.join('\n  - ')}`)
  }
  return schema as BlockSchema
}


