import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { UseBoundStore, StoreApi } from "zustand";
import { uuidv4 } from "../../utils/uuid";
import type {
  BlockDefinition,
  BuilderState,
  FieldDefinition,
  FieldType,
} from "../types";

const TAB_PATH_SEP = "::";

/**
 * localStorage key used by the persist middleware. Exported so recovery UI
 * (e.g. the ErrorBoundary) can clear corrupt persisted state without
 * duplicating the literal.
 */
export const BUILDER_PERSIST_KEY = "@nextbridgehq/payload-block-builder";

export function encodeTabPath(fieldId: string, tabIndex: number): string {
  return `${fieldId}${TAB_PATH_SEP}${tabIndex}`;
}

function walkPath(
  block: BlockDefinition,
  parentPath: string[],
  create: boolean,
): FieldDefinition[] | null {
  let currentFields = block.fields;
  for (const segment of parentPath) {
    const sepIndex = segment.indexOf(TAB_PATH_SEP);
    if (sepIndex !== -1) {
      // Compound segment: "<tabsFieldId>::<tabIndex>" -- walk into that tab's own
      // fields array instead of the Tabs field itself, which has no top-level `.fields`.
      const fieldId = segment.slice(0, sepIndex);
      const tabIndex = Number(segment.slice(sepIndex + TAB_PATH_SEP.length));
      const parentField = currentFields.find((f) => f.id === fieldId);
      if (!parentField || parentField.type !== "tabs" || !Array.isArray(parentField.tabs)) return null;
      const tab = parentField.tabs[tabIndex];
      if (!tab) return null;
      if (!tab.fields) {
        if (!create) return null;
        tab.fields = [];
      }
      currentFields = tab.fields;
      continue;
    }

    const parentField = currentFields.find((f) => f.id === segment);
    if (!parentField) return null;

    // Support nested fields for layout types
    if (!parentField.fields) {
      if (!create) return null;
      parentField.fields = [];
    }
    currentFields = parentField.fields;
  }
  return currentFields;
}

/**
 * Read-only resolver for the field list at `parentPath`. Safe to call from a
 * render body -- it never mutates the block. Returns `null` if any segment of
 * the path is missing (including a container that has no `fields` array yet).
 */
export function getTargetFields(
  block: BlockDefinition,
  parentPath: string[],
): FieldDefinition[] | null {
  return walkPath(block, parentPath, false);
}

/**
 * Same walk, but lazily creates missing `fields` arrays on containers. Only
 * valid inside an immer `set()` callback, where `block` is a draft -- calling it
 * on live store state mutates outside a setter and skips subscriber updates.
 */
function ensureTargetFields(
  block: BlockDefinition,
  parentPath: string[],
): FieldDefinition[] | null {
  return walkPath(block, parentPath, true);
}

export function createDefaultField(type: FieldType): FieldDefinition {
  const base: FieldDefinition = {
    id: uuidv4(),
    type,
    name: `${type}Field`,
    label: `${type.charAt(0).toUpperCase()}${type.slice(1)} Field`,
    required: false,
  };

  switch (type) {
    case "select":
      return {
        ...base,
        options: [
          { label: "Option 1", value: "option_1" },
          { label: "Option 2", value: "option_2" },
        ],
      };
    case "relationship":
      return { ...base, collection: "", hasMany: false };
    case "array":
      return { ...base, fields: [] };
    case "group":
      return { ...base, fields: [] };
    case "row":
      return { ...base, fields: [] };
    case "collapsible":
      return { ...base, label: base.label ?? "Collapsible Section", fields: [] };
    case "tabs":
      return { ...base, tabs: [{ id: uuidv4(), label: "Tab 1", fields: [] }] };
    default:
      return base;
  }
}

function regenerateFieldIds(fields: FieldDefinition[]): FieldDefinition[] {
  return fields.map((f) => {
    const next: FieldDefinition = { ...f, id: uuidv4() };
    if (next.fields) next.fields = regenerateFieldIds(next.fields);
    if (next.tabs) {
      next.tabs = next.tabs.map((tab) => ({ ...tab, fields: regenerateFieldIds(tab.fields) }));
    }
    return next;
  });
}

function createDefaultBlock(): BlockDefinition {
  return {
    id: uuidv4(),
    slug: "myBlock",
    interfaceName: "MyBlock",
    labels: { singular: "My Block", plural: "My Blocks" },
    fields: [],
  };
}

type BuilderActions = {
  addBlock: () => void;
  removeBlock: (blockId: string) => void;
  updateBlock: (blockId: string, updates: Partial<BlockDefinition>) => void;
  setActiveBlock: (blockId: string | null) => void;
  duplicateBlock: (blockId: string) => void;
  addField: (blockId: string, type: FieldType) => void;
  removeField: (blockId: string, fieldId: string) => void;
  updateField: (blockId: string, fieldId: string, updates: Partial<FieldDefinition>) => void;
  reorderFields: (blockId: string, fromIndex: number, toIndex: number) => void;
  setActiveField: (fieldId: string | null) => void;
  reset: () => void;
  markClean: () => void;
  loadBlock: (block: BlockDefinition) => void;
  setVersionMeta: (versionId: string | null, isReadOnly: boolean) => void;
  setBlockSlug: (slug: string) => void;
  pushParentPath: (fieldId: string) => void;
  popParentPath: () => void;
  truncateParentPath: (depth: number) => void;
  resetParentPath: () => void;
};

type BuilderStore = BuilderState & {
  isReadOnly: boolean;
  loadedVersionId: string | null;
  blockSlug: string | null;
  activeParentPath: string[];
} & BuilderActions;

const initialState: BuilderState = {
  blocks: [],
  activeBlockId: null,
  activeFieldId: null,
  isDirty: false,
};

export const useBuilderStore = (create<BuilderStore>()(
  devtools(
    persist(
      immer((set) => ({
        ...initialState,
        isReadOnly: false,
        loadedVersionId: null,
        blockSlug: null,
        activeParentPath: [],

        addBlock: () =>
          set((state) => {
            const block = createDefaultBlock();
            state.blocks.push(block);
            state.activeBlockId = block.id;
            state.activeFieldId = null;
            state.activeParentPath = [];
            state.isDirty = true;
          }),

        removeBlock: (blockId) =>
          set((state) => {
            state.blocks = state.blocks.filter((b) => b.id !== blockId);
            if (state.activeBlockId === blockId) {
              state.activeBlockId = state.blocks[0]?.id ?? null;
              state.activeFieldId = null;
              state.activeParentPath = [];
            }
            state.isDirty = true;
          }),

        updateBlock: (blockId, updates) =>
          set((state) => {
            const block = state.blocks.find((b) => b.id === blockId);
            if (block) Object.assign(block, updates);
            state.isDirty = true;
          }),

        setActiveBlock: (blockId) =>
          set((state) => {
            state.activeBlockId = blockId;
            state.activeFieldId = null;
            state.activeParentPath = [];
          }),

        duplicateBlock: (blockId) =>
          set((state) => {
            const block = state.blocks.find((b) => b.id === blockId);
            if (!block) return;
            const clone: BlockDefinition = JSON.parse(JSON.stringify(block));
            clone.id = uuidv4();
            // `-copy`, not `Copy`: saveSchema validates slugs against ^[a-z0-9-]+$,
            // so the store must not mint a value its own validator rejects.
            clone.slug = `${block.slug}-copy`;
            clone.interfaceName = block.interfaceName
              ? `${block.interfaceName}Copy`
              : undefined;
            clone.fields = regenerateFieldIds(clone.fields);
            const idx = state.blocks.findIndex((b) => b.id === blockId);
            state.blocks.splice(idx + 1, 0, clone);
            state.activeBlockId = clone.id;
            state.isDirty = true;
          }),

        addField: (blockId, type) =>
          set((state) => {
            const block = state.blocks.find((b) => b.id === blockId);
            if (!block) return;
            const targetFields = ensureTargetFields(block, state.activeParentPath);
            if (!targetFields) return;
            const field = createDefaultField(type);
            targetFields.push(field);
            state.activeFieldId = field.id;
            state.isDirty = true;
          }),

        removeField: (blockId, fieldId) =>
          set((state) => {
            const block = state.blocks.find((b) => b.id === blockId);
            if (!block) return;
            const targetFields = ensureTargetFields(block, state.activeParentPath);
            if (!targetFields) return;
            const index = targetFields.findIndex((f) => f.id === fieldId);
            if (index !== -1) {
              targetFields.splice(index, 1);
            }
            if (state.activeFieldId === fieldId) state.activeFieldId = null;
            state.isDirty = true;
          }),

        updateField: (blockId, fieldId, updates) =>
          set((state) => {
            const block = state.blocks.find((b) => b.id === blockId);
            if (!block) return;
            const targetFields = ensureTargetFields(block, state.activeParentPath);
            if (!targetFields) return;
            const field = targetFields.find((f) => f.id === fieldId);
            if (field) Object.assign(field, updates);
            state.isDirty = true;
          }),

        reorderFields: (blockId, fromIndex, toIndex) =>
          set((state) => {
            const block = state.blocks.find((b) => b.id === blockId);
            if (!block) return;
            const targetFields = ensureTargetFields(block, state.activeParentPath);
            if (!targetFields) return;
            const [moved] = targetFields.splice(fromIndex, 1);
            targetFields.splice(toIndex, 0, moved);
            state.isDirty = true;
          }),

        setActiveField: (fieldId) =>
          set((state) => {
            state.activeFieldId = fieldId;
          }),

        reset: () => set(() => ({ ...initialState, isReadOnly: false, loadedVersionId: null, blockSlug: null, activeParentPath: [] })),
        markClean: () => set((state) => { state.isDirty = false; }),

        loadBlock: (block) =>
          set((state) => {
            state.blocks = [block];
            state.activeBlockId = block.id;
            state.activeFieldId = null;
            state.activeParentPath = [];
            state.isDirty = false;
          }),

        setVersionMeta: (versionId, isReadOnly) =>
          set((state) => {
            state.loadedVersionId = versionId;
            state.isReadOnly = isReadOnly;
          }),

        setBlockSlug: (slug) =>
          set((state) => {
            state.blockSlug = slug;
          }),

        pushParentPath: (fieldId) =>
          set((state) => {
            state.activeParentPath.push(fieldId);
            state.activeFieldId = null;
          }),

        popParentPath: () =>
          set((state) => {
            state.activeParentPath.pop();
            state.activeFieldId = null;
          }),

        // Jump directly to an ancestor level -- `depth` is the number of
        // segments to keep, so breadcrumb index `i` maps to `i + 1`.
        truncateParentPath: (depth) =>
          set((state) => {
            if (depth < 0 || depth >= state.activeParentPath.length) return;
            state.activeParentPath = state.activeParentPath.slice(0, depth);
            state.activeFieldId = null;
          }),

        resetParentPath: () =>
          set((state) => {
            state.activeParentPath = [];
            state.activeFieldId = null;
          }),
      })),
      {
        name: BUILDER_PERSIST_KEY,
        version: 1,
        migrate: (persistedState: unknown, version: number) => {
          if (version === 0) {
            // Version 0 predates the unified field-type system (Feature 3) and the
            // Row/Tabs/Collapsible shapes -- discard old state rather than crash on load.
            return { blocks: [], activeBlockId: null } as unknown as BuilderStore
          }
          return persistedState as BuilderStore
        },
        partialize: (state) => ({
          blocks: state.blocks,
          activeBlockId: state.activeBlockId,
        }),
      }
    )
  )
)) as UseBoundStore<StoreApi<BuilderStore>>
