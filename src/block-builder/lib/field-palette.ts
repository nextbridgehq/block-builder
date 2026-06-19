import type { FieldType } from "../types";

export type FieldPaletteItem = {
  type: FieldType;
  label: string;
  description: string;
  icon: string;
  category: "basic" | "choice" | "media" | "relational" | "layout" | "advanced";
  color: string;
};

export const FIELD_PALETTE: FieldPaletteItem[] = [
  // Basic
  { type: "text",         label: "Text",         description: "Single line text input",        icon: "Type",         category: "basic",      color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { type: "textarea",     label: "Textarea",     description: "Multi-line text input",         icon: "AlignLeft",    category: "basic",      color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { type: "number",       label: "Number",       description: "Numeric input field",           icon: "Hash",         category: "basic",      color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { type: "email",        label: "Email",        description: "Email address field",           icon: "Mail",         category: "basic",      color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { type: "date",         label: "Date",         description: "Date and time picker",          icon: "Calendar",     category: "basic",      color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { type: "checkbox",     label: "Checkbox",     description: "Boolean toggle",                icon: "CheckSquare",  category: "basic",      color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  // Choice
  { type: "select",       label: "Select",       description: "Dropdown selection",            icon: "ChevronDown",  category: "choice",     color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { type: "radio",        label: "Radio",        description: "Radio button group",            icon: "Circle",       category: "choice",     color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  // Media
  { type: "upload",       label: "Upload",       description: "File or media upload",          icon: "Upload",       category: "media",      color: "bg-green-500/20 text-green-400 border-green-500/30" },
  // Relational
  { type: "relationship", label: "Relationship", description: "Link to another collection",    icon: "Link",         category: "relational", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  // Advanced
  { type: "json",         label: "JSON",         description: "Raw JSON data field",           icon: "Braces",       category: "advanced",   color: "bg-red-500/20 text-red-400 border-red-500/30" },
];

export const FIELD_CATEGORIES = [
  { id: "basic", label: "Basic" },
  { id: "choice", label: "Choice" },
  { id: "media", label: "Media" },
  { id: "relational", label: "Relational" },
  { id: "advanced", label: "Advanced" },
] as const;

export function getFieldMeta(type: FieldType): FieldPaletteItem | undefined {
  return FIELD_PALETTE.find((f) => f.type === type);
}


