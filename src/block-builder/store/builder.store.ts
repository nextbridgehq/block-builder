import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { UseBoundStore, StoreApi } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  BlockDefinition,
  BuilderState,
  FieldDefinition,
  FieldType,
} from "../types";

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
    case "radio":
      return {
        ...base,
        options: [
          { label: "Option 1", value: "option_1" },
          { label: "Option 2", value: "option_2" },
        ],
      };
    case "relationship":
      return { ...base, relationTo: "", hasMany: false };
    case "array":
      return { ...base, fields: [] };
    case "group":
      return { ...base, fields: [] };
    default:
      return base;
  }
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
};

type BuilderStore = BuilderState & {
  isReadOnly: boolean;
  loadedVersionId: string | null;
  blockSlug: string | null;
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

        addBlock: () =>
          set((state) => {
            const block = createDefaultBlock();
            state.blocks.push(block);
            state.activeBlockId = block.id;
            state.activeFieldId = null;
            state.isDirty = true;
          }),

        removeBlock: (blockId) =>
          set((state) => {
            state.blocks = state.blocks.filter((b) => b.id !== blockId);
            if (state.activeBlockId === blockId) {
              state.activeBlockId = state.blocks[0]?.id ?? null;
              state.activeFieldId = null;
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
          }),

        duplicateBlock: (blockId) =>
          set((state) => {
            const block = state.blocks.find((b) => b.id === blockId);
            if (!block) return;
            const clone: BlockDefinition = JSON.parse(JSON.stringify(block));
            clone.id = uuidv4();
            clone.slug = `${block.slug}Copy`;
            clone.interfaceName = block.interfaceName
              ? `${block.interfaceName}Copy`
              : undefined;
            clone.fields = clone.fields.map((f) => ({ ...f, id: uuidv4() }));
            const idx = state.blocks.findIndex((b) => b.id === blockId);
            state.blocks.splice(idx + 1, 0, clone);
            state.activeBlockId = clone.id;
            state.isDirty = true;
          }),

        addField: (blockId, type) =>
          set((state) => {
            const block = state.blocks.find((b) => b.id === blockId);
            if (!block) return;
            const field = createDefaultField(type);
            block.fields.push(field);
            state.activeFieldId = field.id;
            state.isDirty = true;
          }),

        removeField: (blockId, fieldId) =>
          set((state) => {
            const block = state.blocks.find((b) => b.id === blockId);
            if (!block) return;
            block.fields = block.fields.filter((f) => f.id !== fieldId);
            if (state.activeFieldId === fieldId) state.activeFieldId = null;
            state.isDirty = true;
          }),

        updateField: (blockId, fieldId, updates) =>
          set((state) => {
            const block = state.blocks.find((b) => b.id === blockId);
            if (!block) return;
            const field = block.fields.find((f) => f.id === fieldId);
            if (field) Object.assign(field, updates);
            state.isDirty = true;
          }),

        reorderFields: (blockId, fromIndex, toIndex) =>
          set((state) => {
            const block = state.blocks.find((b) => b.id === blockId);
            if (!block) return;
            const [moved] = block.fields.splice(fromIndex, 1);
            block.fields.splice(toIndex, 0, moved);
            state.isDirty = true;
          }),

        setActiveField: (fieldId) =>
          set((state) => {
            state.activeFieldId = fieldId;
          }),

        reset: () => set(() => ({ ...initialState, isReadOnly: false, loadedVersionId: null, blockSlug: null })),
        markClean: () => set((state) => { state.isDirty = false; }),

        loadBlock: (block) =>
          set((state) => {
            state.blocks = [block];
            state.activeBlockId = block.id;
            state.activeFieldId = null;
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
      })),
      {
        name: "@nextbridgehq/payload-block-builder",
        partialize: (state) => ({
          blocks: state.blocks,
          activeBlockId: state.activeBlockId,
        }),
      }
    )
  )
)) as unknown as UseBoundStore<StoreApi<BuilderStore>>


