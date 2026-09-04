import type { BlockDefinition, FieldDefinition, FieldType, GeneratedOutput } from "../types";

// ─── Field serialisation ─────────────────────────────────────────────────────

function indent(n: number): string {
  return "  ".repeat(n);
}

function safeStr(s: string): string {
  return JSON.stringify(s);
}

/**
 * Emits a bracketed list of object literals, collapsing the empty case to `[]`
 * rather than a pair of brackets wrapped around a blank line.
 */
function listToCode<T>(
  items: T[],
  body: (item: T) => string,
  depth: number,
): string {
  if (items.length === 0) return "[]";
  const pad = indent(depth);
  const innerPad = indent(depth + 1);
  const entries = items
    .map((item) => `${innerPad}{\n${body(item)}\n${innerPad}}`)
    .join(",\n");
  return `[\n${entries}\n${pad}]`;
}

// Payload's real `row`, `tabs`, and `collapsible` field configs don't accept a
// `name` property (they're presentational/structural, not data-bearing) -- our
// internal FieldDefinition always carries one for UI/id purposes, but it must
// be dropped here or the generated code fails Payload's own field types.
const UNNAMED_TYPES = new Set(["row", "tabs", "collapsible"]);

// `name` isn't the only key those structural types drop. Payload's configs
// `Omit` several more `FieldBase` properties, so emitting them is a compile
// error in the generated file even though our `FieldDefinition` carries them:
//
//   RowField          omits `label`, `localized` and `admin.description`
//   TabsField         omits `localized` and `admin.description`
//   CollapsibleField  omits `localized` (its `label` is *required*, not absent)
//
// `unique` is deliberately absent from these sets -- Payload keeps it on all
// three, so it stays emitted even though it means nothing on a container.
const NO_LABEL_TYPES = new Set<string>(["row"]);
const NO_LOCALIZED_TYPES = new Set<string>(["row", "tabs", "collapsible"]);
const NO_ADMIN_DESCRIPTION_TYPES = new Set<string>(["row", "tabs"]);

// Payload requires the child key on every container whether or not it holds
// anything: `fields` on array/group/row/collapsible, `blocks` on blocks,
// `tabs` on tabs. A freshly added container has no children yet, so the key
// must still be emitted as `[]` -- skipping it produces code that will not
// compile, which Code Preview (no validation) will happily show.
const FIELDS_CONTAINER_TYPES = new Set<FieldType>([
  "array",
  "group",
  "row",
  "collapsible",
]);

// Our stored `FieldType` vocabulary is the *schema* vocabulary, not Payload's.
// Several of our types have a different name (or no direct equivalent) in a real
// Payload field config, so the emitted `type:` must be translated -- writing
// `type: 'richtext'` or `type: 'image'` produces a Block that Payload rejects.
// Anything absent from this map already matches Payload one-for-one.
const PAYLOAD_TYPE: Partial<Record<FieldType, string>> = {
  richtext: "richText",
  image: "upload",
  file: "upload",
  multiselect: "select",
  url: "text",
  color: "text",
};

// Payload's `upload` field requires a `relationTo` pointing at an upload-enabled
// collection. We don't model which one, so emit the conventional default and let
// the developer retarget it.
const UPLOAD_TYPES = new Set<FieldType>(["image", "file"]);
const DEFAULT_UPLOAD_COLLECTION = "media";

function payloadType(type: FieldType): string {
  return PAYLOAD_TYPE[type] ?? type;
}

function fieldToCode(field: FieldDefinition, depth = 1): string {
  const pad = indent(depth);
  const innerPad = indent(depth + 1);
  const lines: string[] = [];

  if (!UNNAMED_TYPES.has(field.type)) {
    lines.push(`${pad}name: ${safeStr(field.name)}`);
  }
  lines.push(`${pad}type: '${payloadType(field.type)}'`);

  if (field.label && !NO_LABEL_TYPES.has(field.type)) {
    lines.push(`${pad}label: ${safeStr(field.label)}`);
  }
  if (field.required) lines.push(`${pad}required: true`);
  if (field.unique) lines.push(`${pad}unique: true`);
  if (field.localized && !NO_LOCALIZED_TYPES.has(field.type)) {
    lines.push(`${pad}localized: true`);
  }

  if (field.defaultValue !== undefined) {
    const val =
      typeof field.defaultValue === "string"
        ? safeStr(String(field.defaultValue))
        : field.defaultValue;
    lines.push(`${pad}defaultValue: ${val}`);
  }

  if (field.type === "richtext") {
    lines.push(`${pad}editor: lexicalEditor({})`);
  }

  if (field.options && field.options.length > 0) {
    const opts = field.options
      .map((o) => `{ label: ${safeStr(o.label)}, value: ${safeStr(o.value)} }`)
      .join(`, `);
    lines.push(`${pad}options: [${opts}]`);
  }

  if (UPLOAD_TYPES.has(field.type)) {
    lines.push(
      `${pad}relationTo: ${safeStr(field.collection || DEFAULT_UPLOAD_COLLECTION)}`,
    );
  } else if (field.collection) {
    lines.push(`${pad}relationTo: ${safeStr(field.collection)}`);
  }

  // `multiselect` collapses to a Payload `select` and is only distinguishable
  // by `hasMany`, so it must always be emitted rather than left to the flag.
  if (field.type === "multiselect") {
    lines.push(`${pad}hasMany: true`);
  } else if (field.hasMany !== undefined) {
    lines.push(`${pad}hasMany: ${field.hasMany}`);
  }

  if (field.minRows !== undefined) lines.push(`${pad}minRows: ${field.minRows}`);
  if (field.maxRows !== undefined) lines.push(`${pad}maxRows: ${field.maxRows}`);

  const children = field.fields ?? [];
  if (children.length > 0 || FIELDS_CONTAINER_TYPES.has(field.type)) {
    lines.push(
      `${pad}fields: ${listToCode(children, (f) => fieldToCode(f, depth + 2), depth)}`,
    );
  }

  // We don't model a nested block's own definition, so emit the required key
  // empty and leave filling it in to the developer.
  if (field.type === "blocks") {
    lines.push(`${pad}blocks: []`);
  }

  if (field.type === "tabs") {
    const tabsCode = (field.tabs ?? [])
      .map((tab) => {
        const tabPad = indent(depth + 2);
        const tabLines: string[] = [];
        if (tab.name) tabLines.push(`${tabPad}name: ${safeStr(tab.name)}`);
        tabLines.push(`${tabPad}label: ${safeStr(tab.label)}`);
        tabLines.push(
          `${tabPad}fields: ${listToCode(tab.fields ?? [], (f) => fieldToCode(f, depth + 4), depth + 2)}`,
        );
        return `${innerPad}{\n${tabLines.join(",\n")}\n${innerPad}}`;
      })
      .join(",\n");
    lines.push(
      `${pad}tabs: ${(field.tabs ?? []).length > 0 ? `[\n${tabsCode}\n${pad}]` : "[]"}`,
    );
  }

  const adminParts: string[] = [];
  if (field.admin?.description && !NO_ADMIN_DESCRIPTION_TYPES.has(field.type))
    adminParts.push(`description: ${safeStr(field.admin.description)}`);
  if (field.admin?.placeholder)
    adminParts.push(`placeholder: ${safeStr(field.admin.placeholder)}`);
  if (field.admin?.readOnly) adminParts.push(`readOnly: true`);
  if (field.admin?.hidden) adminParts.push(`hidden: true`);

  if (adminParts.length > 0) {
    lines.push(`${pad}admin: { ${adminParts.join(", ")} }`);
  }

  return lines.join(",\n");
}

// ─── Block code generation ────────────────────────────────────────────────────

function generateBlockCode(block: BlockDefinition): string {
  const hasRichText = containsRichText(block.fields);

  const imports: string[] = [`import type { Block } from 'payload'`];
  if (hasRichText) {
    imports.push(`import { lexicalEditor } from '@payloadcms/richtext-lexical'`);
  }

  const fieldsCode = block.fields
    .map((f) => `    {\n${fieldToCode(f, 3)}\n    }`)
    .join(",\n");

  const labelsCode = block.labels
    ? `\n  labels: {\n    singular: ${safeStr(block.labels.singular ?? block.slug)},\n    plural: ${safeStr(block.labels.plural ?? block.slug + "s")},\n  },`
    : "";

  const interfaceLine = block.interfaceName
    ? `\n  interfaceName: ${safeStr(block.interfaceName)},`
    : "";

  const exportName = block.interfaceName ?? toCamelCase(block.slug);

  return [
    imports.join("\n"),
    "",
    `export const ${exportName}: Block = {`,
    `  slug: ${safeStr(block.slug)},${interfaceLine}${labelsCode}`,
    `  fields: [`,
    fieldsCode,
    `  ],`,
    `}`,
    "",
  ].join("\n");
}

// Must walk exactly the tree `fieldToCode` emits -- including `tabs[].fields`.
// If this misses a branch the emitter covers, the generated file calls
// `lexicalEditor()` without importing it.
function containsRichText(fields: FieldDefinition[]): boolean {
  return fields.some((f) => {
    if (f.type === "richtext") return true;
    if (f.fields && containsRichText(f.fields)) return true;
    if (f.tabs?.some((tab) => containsRichText(tab.fields ?? []))) return true;
    return false;
  });
}

function toCamelCase(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((part, i) =>
      i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join("");
}

// ─── Public API ───────────────────────────────────────────────────────────────

function toPascalCase(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function getTsType(field: FieldDefinition): string {
  switch (field.type) {
    case 'number':
      return 'number';
    case 'checkbox':
      return 'boolean';
    case 'text':
    case 'textarea':
    case 'email':
    case 'url':
    case 'color':
    case 'select':
    case 'date':
      return 'string';
    case 'multiselect':
      return 'string[]';
    case 'group':
      return field.fields ? objectType(flattenProps(field.fields)) : 'any';
    case 'array':
      if (field.fields) {
        const inner = flattenProps(field.fields).map((p) => `${p.name}: ${p.type}`).join('; ');
        return `Array<{ id: string; ${inner} }>`;
      }
      return 'any[]';
    default:
      return 'any';
  }
}

function objectType(props: { name: string; type: string }[]): string {
  return props.length > 0
    ? `{ ${props.map((p) => `${p.name}: ${p.type}`).join('; ')} }`
    : 'Record<string, unknown>';
}

// Row, Collapsible, and (unnamed) Tabs are UI-only containers -- their data
// flattens into the parent object rather than nesting under their own name
// (mirrors the same flattening SchemaForm/BlockDataField applies at runtime).
// Only a *named* tab actually introduces a nested prop.
function flattenProps(fields: FieldDefinition[]): { name: string; type: string }[] {
  const out: { name: string; type: string }[] = [];
  for (const f of fields) {
    if (f.type === 'row' || f.type === 'collapsible') {
      out.push(...flattenProps(f.fields ?? []));
    } else if (f.type === 'tabs') {
      for (const tab of f.tabs ?? []) {
        if (tab.name) {
          out.push({ name: tab.name, type: objectType(flattenProps(tab.fields ?? [])) });
        } else {
          out.push(...flattenProps(tab.fields ?? []));
        }
      }
    } else {
      out.push({ name: f.name, type: getTsType(f) });
    }
  }
  return out;
}

export function generateReactComponent(block: BlockDefinition): GeneratedOutput {
  const componentName = block.interfaceName ?? toPascalCase(block.slug);
  const propsName = `${componentName}Props`;

  const propList = flattenProps(block.fields);

  const propsCode = propList
    .map((p) => `  ${p.name}: ${p.type}`)
    .join("\n");

  const fieldsJsx = propList
    .map((p) => `      <div className="field-${p.name}">\n        {/* ${p.name} */}\n        {String(props.${p.name})}\n      </div>`)
    .join("\n");

  const code = [
    `import React from 'react'`,
    ``,
    `export type ${propsName} = {`,
    propsCode,
    `}`,
    ``,
    `export function ${componentName}(props: ${propsName}) {`,
    `  return (`,
    `    <div className="${block.slug}">`,
    fieldsJsx,
    `    </div>`,
    `  )`,
    `}`,
    ``
  ].join("\n");

  return {
    filename: `${componentName}.tsx`,
    code,
    language: "typescript",
  };
}

export function generateBlockOutput(block: BlockDefinition): GeneratedOutput {
  return {
    filename: `${block.slug}.ts`,
    code: generateBlockCode(block),
    language: "typescript",
  };
}

export type GenerateAllOptions = {
  /**
   * Also emit a typed React component stub (`<Interface>.tsx`) per block.
   * Off by default so `generateAllBlocks` keeps its one-file-per-block
   * contract; callers that want the stubs opt in explicitly.
   */
  react?: boolean;
};

export function generateAllBlocks(
  blocks: BlockDefinition[],
  options: GenerateAllOptions = {},
): GeneratedOutput[] {
  return blocks.flatMap((block) =>
    options.react
      ? [generateBlockOutput(block), generateReactComponent(block)]
      : [generateBlockOutput(block)],
  );
}

export function generateIndexFile(blocks: BlockDefinition[]): GeneratedOutput {
  const exportName = (b: BlockDefinition) => b.interfaceName ?? toCamelCase(b.slug);

  const imports = blocks
    .map((b) => `import { ${exportName(b)} } from './${b.slug}'`)
    .join("\n");

  const exportList = blocks.map((b) => `  ${exportName(b)}`).join(",\n");

  const code = [
    imports,
    "",
    `export const blocks = [`,
    exportList,
    `] as const`,
    "",
  ].join("\n");

  return { filename: "index.ts", code, language: "typescript" };
}


