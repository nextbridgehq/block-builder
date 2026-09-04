// ── Plugin ────────────────────────────────────────────────────────────────────
export { dynamicBlocksPlugin } from './plugin'
export type { DynamicBlocksPluginOptions } from './plugin'

// ── Field factory ─────────────────────────────────────────────────────────────
export { dbLayoutField } from './fields/dbLayoutField'

// ── Collections (for consumers who want to register manually) ─────────────────
export { BlockDefinitions } from './collections/BlockDefinitions'
export { BlockDefinitionVersions } from './collections/BlockDefinitionVersions'

//── Types ─────────────────────────────────────────────────────────────────────
export type {
  BlockSchema,
  BlockFieldDefinition,
  BlockField,
  FieldType,
  ConditionRule,
  ValidationRules,
  UIMetadata,
  ValidationResult,
} from './validation/types'

export type {
  SaveSchemaRequest,
  SaveSchemaResult,
  RawFieldInput,
  RawSchemaInput,
} from './builder/types'

export type {
  BlockDefinition,
  FieldDefinition,
  BuilderState,
  GeneratedOutput,
  FieldType as BuilderFieldType,
} from './block-builder/types'


