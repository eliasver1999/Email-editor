import { createContext, useContext } from "react";
import type { EmailBlock } from "./types";

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
