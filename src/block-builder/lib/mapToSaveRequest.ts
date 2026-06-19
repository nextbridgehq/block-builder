import type { BlockDefinition } from "../types";
import type { SaveSchemaRequest } from "../../builder/types";

const TYPE_MAP: Record<string, string> = {
  richText: "richtext",
  upload: "image",
  radio: "select",
};

const UNSUPPORTED = new Set(["code", "point", "ui", "tabs", "collapsible", "row"]);

function normalizeSlug(slug: string): string {
  return slug
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function mapToSaveRequest(block: BlockDefinition): SaveSchemaRequest {
  const fields = block.fields
    .filter((f) => {
      if (UNSUPPORTED.has(f.type)) {
        console.warn(`[block-builder] Field type "${f.type}" is not supported in this project â€" skipping field "${f.name}"`);
        return false;
      }
      return true;
    })
    .map(({ id: _id, relationTo, ...f }) => ({
      ...f,
      type: TYPE_MAP[f.type] ?? f.type,
      // normalizer reads `collection`, block-builder stores `relationTo`
      ...(relationTo ? { collection: relationTo } : {}),
    }));

  return {
    blockSlug: normalizeSlug(block.slug),
    name: block.labels?.singular ?? block.slug,
    schema: { fields },
    changelog: "Created via block builder",
  };
}


