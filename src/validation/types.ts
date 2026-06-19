// â"€â"€â"€ Field Types â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

// â"€â"€â"€ Feature 1: Conditional Logic â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

// â"€â"€â"€ Feature 2: Advanced Validation Rules â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

// â"€â"€â"€ Feature 3: Visual UI Metadata â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export type UIWidth = 'full' | 'half' | 'third' | 'quarter'

export interface UIMetadata {
  tab?: string
  section?: string
  width?: UIWidth
  collapsed?: boolean
  order?: number
}

// â"€â"€â"€ Feature 5: Responsive Values â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export type Breakpoint = 'desktop' | 'tablet' | 'mobile'

export interface ResponsiveValue<T = unknown> {
  desktop: T
  tablet?: T
  mobile?: T
}

// â"€â"€â"€ Base Field â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export interface BaseField {
  name: string
  type: FieldType
  label?: string
  required?: boolean
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

// â"€â"€â"€ Leaf Field Types â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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
}

export interface FileField extends BaseField {
  type: 'file'
  allowedMimeTypes?: string[]
}

export interface UrlField extends BaseField {
  type: 'url'
}

export interface EmailField extends BaseField {
  type: 'email'
}

export interface ColorField extends BaseField {
  type: 'color'
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

// â"€â"€â"€ Feature 4: Nested / Composable Blocks â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

// â"€â"€â"€ Block Field Union â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

// â"€â"€â"€ Block Schema â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export interface BlockSchema {
  fields: BlockField[]
  layout?: 'default' | 'sidebar' | 'tabs'
}

// â"€â"€â"€ Validation Results â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// â"€â"€â"€ Block Instance Data â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export type BlockData = Record<string, unknown>

export interface DataValidationResult {
  valid: boolean
  errors: Array<{ path: string; message: string }>
}

// â"€â"€â"€ Backward-compatible aliases â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export type BlockFieldType = FieldType
export type BlockSelectOption = SelectOption
export type BlockFieldDefinition = BlockField


