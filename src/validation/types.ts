// ─── Field Types ───────────────────────────────────────────────────────────────

export type FieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'checkbox'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'image'
  | 'file'
  | 'url'
  | 'email'
  | 'color'
  | 'array'
  | 'group'
  | 'relationship'
  | 'json'
  | 'blocks'
  | 'row'
  | 'tabs'
  | 'collapsible'

// ─── Feature 1: Conditional Logic ────────────────────────────────────────────

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'in'
  | 'not_in'
  | 'exists'
  | 'empty'

export interface ConditionRule {
  field: string
  operator: ConditionOperator
  value?: unknown
}

// ─── Feature 2: Advanced Validation Rules ────────────────────────────────────

export interface ValidationRules {
  required?: boolean
  minLength?: number
  maxLength?: number
  regex?: string
  min?: number
  max?: number
  step?: number
  integerOnly?: boolean
  minRows?: number
  maxRows?: number
  uniqueItems?: boolean
  allowedMimeTypes?: string[]
  maxFileSize?: number
  maxSelections?: number
}

// ─── Feature 3: Visual UI Metadata ───────────────────────────────────────────

export type UIWidth = 'full' | 'half' | 'third' | 'quarter'

export interface UIMetadata {
  tab?: string
  section?: string
  width?: UIWidth
  collapsed?: boolean
  order?: number
}

// ─── Feature 5: Responsive Values ────────────────────────────────────────────

export type Breakpoint = 'desktop' | 'tablet' | 'mobile'

export interface ResponsiveValue<T = unknown> {
  desktop: T
  tablet?: T
  mobile?: T
}

// ─── Base Field ───────────────────────────────────────────────────────────────

export interface BaseField {
  name: string
  type: FieldType
  label?: string
  required?: boolean
  /** Payload's `unique` index flag. Settable on every field in the builder. */
  unique?: boolean
  /** Payload's `localized` flag. Settable on every field in the builder. */
  localized?: boolean
  admin?: {
    description?: string
    readOnly?: boolean
    hidden?: boolean
    placeholder?: string
    condition?: string
  }
  conditions?: ConditionRule[]
  conditionMode?: 'AND' | 'OR'
  validation?: ValidationRules
  ui?: UIMetadata
  responsive?: boolean
}

// ─── Leaf Field Types ─────────────────────────────────────────────────────────

export interface TextField extends BaseField {
  type: 'text'
  minLength?: number
  maxLength?: number
  defaultValue?: string
}

export interface TextareaField extends BaseField {
  type: 'textarea'
  minLength?: number
  maxLength?: number
  defaultValue?: string
}

export interface RichTextField extends BaseField {
  type: 'richtext'
  defaultValue?: string
}

export interface NumberField extends BaseField {
  type: 'number'
  min?: number
  max?: number
  defaultValue?: number
}

export interface CheckboxField extends BaseField {
  type: 'checkbox'
  defaultValue?: boolean
}

export interface SelectOption {
  label: string
  value: string
}

export interface SelectField extends BaseField {
  type: 'select'
  options: SelectOption[]
  defaultValue?: string
}

export interface MultiSelectField extends BaseField {
  type: 'multiselect'
  options: SelectOption[]
  defaultValue?: string[]
}

export interface DateField extends BaseField {
  type: 'date'
  timeFormat?: boolean
  defaultValue?: string
}

export interface ImageField extends BaseField {
  type: 'image'
  /** Upload-enabled collection this field points at. Defaults to `media`. */
  collection?: string
}

export interface FileField extends BaseField {
  type: 'file'
  allowedMimeTypes?: string[]
  /** Upload-enabled collection this field points at. Defaults to `media`. */
  collection?: string
}

export interface UrlField extends BaseField {
  type: 'url'
  defaultValue?: string
}

export interface EmailField extends BaseField {
  type: 'email'
  defaultValue?: string
}

export interface ColorField extends BaseField {
  type: 'color'
  defaultValue?: string
}

export interface ArrayField extends BaseField {
  type: 'array'
  fields: BlockField[]
  minRows?: number
  maxRows?: number
}

export interface GroupField extends BaseField {
  type: 'group'
  fields: BlockField[]
}

export interface RelationshipField extends BaseField {
  type: 'relationship'
  collection: string
  hasMany?: boolean
}

export interface JsonField extends BaseField {
  type: 'json'
}

// ─── Feature 4: Nested / Composable Blocks ────────────────────────────────────

export interface BlocksField extends BaseField {
  type: 'blocks'
  allowedBlocks?: string[]
  minBlocks?: number
  maxBlocks?: number
}

export interface NestedBlockValue {
  id?: string
  blockType: string
  data: BlockData
}

// ─── Layout Fields ────────────────────────────────────────────────────────

export interface RowField extends BaseField {
  type: 'row'
  fields: BlockField[]
}

export interface Tab {
  name?: string
  label: string
  description?: string
  fields: BlockField[]
}

export interface TabsField extends BaseField {
  type: 'tabs'
  tabs: Tab[]
}

export interface CollapsibleField extends BaseField {
  type: 'collapsible'
  label: string
  fields: BlockField[]
}

// ─── Block Field Union ────────────────────────────────────────────────────────

export type BlockField =
  | TextField
  | TextareaField
  | RichTextField
  | NumberField
  | CheckboxField
  | SelectField
  | MultiSelectField
  | DateField
  | ImageField
  | FileField
  | UrlField
  | EmailField
  | ColorField
  | ArrayField
  | GroupField
  | RelationshipField
  | JsonField
  | BlocksField
  | RowField
  | TabsField
  | CollapsibleField

// ─── Block Schema ─────────────────────────────────────────────────────────────

export interface BlockSchema {
  fields: BlockField[]
  layout?: 'default' | 'sidebar' | 'tabs'
}

// ─── Validation Results ───────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// ─── Block Instance Data ──────────────────────────────────────────────────────

export type BlockData = Record<string, unknown>

export interface DataValidationResult {
  valid: boolean
  errors: Array<{ path: string; message: string }>
}

// ─── Backward-compatible aliases ─────────────────────────────────────────────

export type BlockFieldType = FieldType
export type BlockSelectOption = SelectOption
export type BlockFieldDefinition = BlockField


