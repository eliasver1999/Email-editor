import { createContext, useContext } from "react";
import type { EmailBlock, MergeFieldGroup } from "./types";
import type { BlockDefinition } from "./renderer/toHtml";

/**
 * Update a block by id. Provided by EmailBuilder so in-canvas widgets (e.g. the
 * empty image block's "Add image" button) can write back without prop-drilling
 * an update callback through the Canvas tree.
 */
export type UpdateBlockFn = (id: string, updates: Partial<EmailBlock>) => void;

export const UpdateBlockContext = createContext<UpdateBlockFn | undefined>(undefined);

export function useUpdateBlock(): UpdateBlockFn | undefined {
    return useContext(UpdateBlockContext);
}

/**
 * Whether the current user may manage locks and edit locked blocks (a "full"
 * editor). Restricted editors (false) can't modify locked blocks. Defaults to
 * true so blocks are fully editable when no provider is present.
 */
export const LockingContext = createContext<boolean>(true);

export function useCanManageLocks(): boolean {
    return useContext(LockingContext);
}

/** Custom block definitions registered via `<EmailBuilder customBlocks>`, keyed by type. */
export const CustomBlocksContext = createContext<Map<string, BlockDefinition>>(new Map());

export function useCustomBlocks(): Map<string, BlockDefinition> {
    return useContext(CustomBlocksContext);
}

/**
 * Personalization tokens (from `<EmailBuilder fieldGroups>`), shared so in-canvas
 * widgets — e.g. the rich-text link editor — can offer a "link to a field" tag
 * picker without prop-drilling.
 */
export const FieldGroupsContext = createContext<MergeFieldGroup[]>([]);

export function useFieldGroups(): MergeFieldGroup[] {
    return useContext(FieldGroupsContext);
}

/**
 * Bridge between the in-canvas `contentEditable` blocks and the right-hand
 * property panel. The active editable saves its element + current selection via
 * `save`; the panel (and toolbar) then insert a merge tag at the caret or wrap
 * the selection in a link — acting on the *real* caret instead of blindly
 * appending. All operations are scoped by `blockId` so a stale selection from a
 * different block is never used; each returns `false` when it couldn't act (no
 * saved caret, or — for links — nothing selected) so callers can fall back.
 */
export interface EditorSelectionApi {
    /** Remember the editable element + its current selection range for `blockId`. */
    save: (el: HTMLElement, blockId: string) => void;
    /** Insert `token` at the saved caret of `blockId`'s editable. */
    insertToken: (blockId: string, token: string) => boolean;
    /** Wrap the saved (non-collapsed) selection of `blockId`'s editable in a link. */
    applyLink: (blockId: string, href: string) => boolean;
}

export const EditorSelectionContext = createContext<EditorSelectionApi | null>(null);

export function useEditorSelection(): EditorSelectionApi | null {
    return useContext(EditorSelectionContext);
}
