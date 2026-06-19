import type { BlockDefinition, FieldDefinition, GeneratedOutput } from "../types";

// â”€â”€â”€ Field serialisation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function indent(n: number): string {
  return "  ".repeat(n);
}

function escStr(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function fieldToCode(field: FieldDefinition, depth = 1): string {
  const pad = indent(depth);
  const innerPad = indent(depth + 1);
  const lines: string[] = [];

  lines.push(`${pad}name: '${escStr(field.name)}'`);
  lines.push(`${pad}type: '${field.type}'`);

  if (field.label) lines.push(`${pad}label: '${escStr(field.label)}'`);
  if (field.required) lines.push(`${pad}required: true`);
  if (field.unique) lines.push(`${pad}unique: true`);
  if (field.localized) lines.push(`${pad}localized: true`);

  if (field.defaultValue !== undefined) {
    const val =
      typeof field.defaultValue === "string"
        ? `'${escStr(String(field.defaultValue))}'`
        : field.defaultValue;
    lines.push(`${pad}defaultValue: ${val}`);
  }

  if (field.type === "richText") {
    lines.push(`${pad}editor: lexicalEditor({})`);
  }

  if (field.options && field.options.length > 0) {
    const opts = field.options
      .map((o) => `{ label: '${escStr(o.label)}', value: '${escStr(o.value)}' }`)
      .join(`, `);
    lines.push(`${pad}options: [${opts}]`);
  }

  if (field.relationTo) {
    lines.push(`${pad}relationTo: '${escStr(field.relationTo)}'`);
  }

  if (field.hasMany !== undefined) {
    lines.push(`${pad}hasMany: ${field.hasMany}`);
  }

  if (field.minRows !== undefined) lines.push(`${pad}minRows: ${field.minRows}`);
  if (field.maxRows !== undefined) lines.push(`${pad}maxRows: ${field.maxRows}`);

  if (field.fields && field.fields.length > 0) {
    const nested = field.fields
      .map((f) => `${innerPad}{\n${fieldToCode(f, depth + 2)}\n${innerPad}}`)
      .join(",\n");
    lines.push(`${pad}fields: [\n${nested}\n${innerPad}]`);
  }

  const adminParts: string[] = [];
  if (field.admin?.description)
    adminParts.push(`description: '${escStr(field.admin.description)}'`);
  if (field.admin?.placeholder)
    adminParts.push(`placeholder: '${escStr(field.admin.placeholder)}'`);
  if (field.admin?.readOnly) adminParts.push(`readOnly: true`);
  if (field.admin?.hidden) adminParts.push(`hidden: true`);

  if (adminParts.length > 0) {
    lines.push(`${pad}admin: { ${adminParts.join(", ")} }`);
  }

  return lines.join(",\n");
}

// â”€â”€â”€ Block code generation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function generateBlockCode(block: BlockDefinition): string {
  const hasRichText = containsRichText(block.fields);

  const imports: string[] = [`import type { Block } from 'payload'`];
  if (hasRichText) {
    imports.push(`import { lexicalEditor } from '@payloadcms/richtext-lexical'`);
  }

  const fieldsCode = block.fields
    .map((f) => `  {\n${fieldToCode(f, 2)}\n  }`)
    .join(",\n");

  const labelsCode = block.labels
    ? `\n  labels: {\n    singular: '${escStr(block.labels.singular ?? block.slug)}',\n    plural: '${escStr(block.labels.plural ?? block.slug + "s")}',\n  },`
    : "";

  const interfaceLine = block.interfaceName
    ? `\n  interfaceName: '${escStr(block.interfaceName)}',`
    : "";

  const exportName = block.interfaceName ?? toCamelCase(block.slug);

  return [
    imports.join("\n"),
    "",
    `export const ${exportName}: Block = {`,
    `  slug: '${escStr(block.slug)}',${interfaceLine}${labelsCode}`,
    `  fields: [`,
    fieldsCode,
    `  ],`,
    `}`,
    "",
  ].join("\n");
}

function containsRichText(fields: FieldDefinition[]): boolean {
  return fields.some(
    (f) =>
      f.type === "richText" ||
      (f.fields ? containsRichText(f.fields) : false),
  );
}

function toCamelCase(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((part, i) =>
      i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join("");
}

// â”€â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function generateBlockOutput(block: BlockDefinition): GeneratedOutput {
  return {
    filename: `${block.slug}.ts`,
    code: generateBlockCode(block),
    language: "typescript",
  };
}

export function generateAllBlocks(blocks: BlockDefinition[]): GeneratedOutput[] {
  return blocks.map(generateBlockOutput);
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


