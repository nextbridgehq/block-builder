import { v4 as uuidv4 } from "uuid";
import type { BlockDefinition, FieldDefinition, FieldType } from "../types";
import type { RawFieldInput } from "../../builder/types";

const REVERSE_TYPE_MAP: Record<string, FieldType> = {
  richtext: "richText",
  image: "upload",
};

const VALID_BUILDER_TYPES = new Set<FieldType>([
  "text", "textarea", "number", "email", "checkbox", "select", "radio",
  "date", "richText", "upload", "relationship", "array", "group",
  "tabs", "row", "collapsible", "json", "code", "point", "ui",
]);

function fieldToBuilderField(raw: RawFieldInput): FieldDefinition {
  const rawType = String(raw.type ?? "text");
  const mappedType = REVERSE_TYPE_MAP[rawType] ?? rawType;
  const fieldType: FieldType = VALID_BUILDER_TYPES.has(mappedType as FieldType)
    ? (mappedType as FieldType)
    : "text";

  const field: FieldDefinition = {
    id: uuidv4(),
    type: fieldType,
    name: String(raw.name ?? "field"),
    label: raw.label ? String(raw.label) : undefined,
    required: Boolean(raw.required),
  };

  if (raw.options && Array.isArray(raw.options)) {
    field.options = raw.options.map((o) =>
      typeof o === "string"
        ? { label: o, value: o }
        : { label: String(o.label), value: String(o.value) }
    );
  }

  if (raw.hasMany !== undefined) field.hasMany = Boolean(raw.hasMany);

  if (raw.collection) field.relationTo = String(raw.collection);
  if ((raw as Record<string, unknown>).relationTo) {
    field.relationTo = String((raw as Record<string, unknown>).relationTo);
  }

  if (raw.minRows !== undefined) field.minRows = Number(raw.minRows);
  if (raw.maxRows !== undefined) field.maxRows = Number(raw.maxRows);

  if (raw.fields && Array.isArray(raw.fields)) {
    field.fields = raw.fields.map(fieldToBuilderField);
  }

  if (raw.admin && typeof raw.admin === "object") {
    const a = raw.admin as Record<string, unknown>;
    field.admin = {
      description: a.description ? String(a.description) : undefined,
      placeholder: a.placeholder ? String(a.placeholder) : undefined,
      readOnly: Boolean(a.readOnly),
      hidden: Boolean(a.hidden),
    };
  }

  return field;
}

function slugToInterfaceName(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function schemaToBuilderBlock(
  slug: string,
  name: string,
  labels: { singular?: string; plural?: string },
  schemaFields: RawFieldInput[]
): BlockDefinition {
  return {
    id: uuidv4(),
    slug,
    interfaceName: slugToInterfaceName(slug),
    labels,
    fields: schemaFields.map(fieldToBuilderField),
  };
}


