// â”€â”€â”€ Field Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "checkbox"
  | "select"
  | "radio"
  | "date"
  | "richText"
  | "upload"
  | "relationship"
  | "array"
  | "group"
  | "tabs"
  | "row"
  | "collapsible"
  | "json"
  | "code"
  | "point"
  | "ui";

export type ValidationRule = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
};

export type SelectOption = {
  label: string;
  value: string;
};

export type AdminConfig = {
  description?: string;
  placeholder?: string;
  readOnly?: boolean;
  hidden?: boolean;
  condition?: string;
};

// â”€â”€â”€ Field Definition â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type FieldDefinition = {
  id: string;
  type: FieldType;
  name: string;
  label?: string;
  required?: boolean;
  unique?: boolean;
  localized?: boolean;
  defaultValue?: string | number | boolean;
  validation?: ValidationRule;
  admin?: AdminConfig;
  options?: SelectOption[];
  relationTo?: string;
  hasMany?: boolean;
  maxDepth?: number;
  minRows?: number;
  maxRows?: number;
  fields?: FieldDefinition[];
};

// â”€â”€â”€ Block Definition â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type BlockDefinition = {
  id: string;
  slug: string;
  interfaceName?: string;
  labels?: {
    singular?: string;
    plural?: string;
  };
  imageURL?: string;
  imageAltText?: string;
  fields: FieldDefinition[];
};

// â”€â”€â”€ Builder State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type BuilderState = {
  blocks: BlockDefinition[];
  activeBlockId: string | null;
  activeFieldId: string | null;
  isDirty: boolean;
};

// â”€â”€â”€ Code Generation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type GeneratedOutput = {
  filename: string;
  code: string;
  language: "typescript" | "javascript";
};


