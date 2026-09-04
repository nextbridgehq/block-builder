export interface BlockDefinitionDoc {
  id: string | number
  slug: string
  name: string
  description?: string
  category?: string
  currentVersion?: string | number | { id: string | number }
  createdAt: string
  updatedAt: string
}

export interface BlockDefinitionVersionDoc {
  id: string | number
  blockDefinition: string | number | BlockDefinitionDoc
  versionNumber: number
  label?: string
  schema: Record<string, unknown>
  changelog?: string
  versionIdString?: string
  createdAt: string
  updatedAt: string
}
