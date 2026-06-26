import { createContext, useContext } from "react";
import type { EmailBlock } from "./types";
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
