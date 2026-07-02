import { useDraggable, useDroppable } from "@dnd-kit/core";
import { EmailBlock, EmailSettings, ColumnsBlock } from "../types";
import { BlockRenderer } from "./BlockRenderer";
import { GripVertical, Plus } from "lucide-react";
import { cn } from "../ui/utils";
import { useTr } from "../i18n";
import { useCanManageLocks } from "../editor-context";

interface CanvasProps {
    blocks: EmailBlock[];
    settings: EmailSettings;
    selectedBlockId: string | null;
    onSelectBlock: (id: string | null) => void;
    isPreview?: boolean;
    isDragging?: boolean;
    /** Drop shadow around the canvas content area (off by default). */
    shadow?: boolean;
    /** Commit inline-edited content for a block (canvas edit mode). */
    onEditContent?: (id: string, content: string) => void;
}

function DropIndicator({ id, index, isDragging, extraData }: { id: string; index: number; isDragging?: boolean; extraData?: Record<string, any> }) {
    const tr = useTr();
    const { isOver, setNodeRef } = useDroppable({
        id,
        data: { type: "canvas-drop", index, ...extraData },
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "transition-all rounded flex items-center justify-center",
                isDragging
                    ? isOver
                        ? "h-12 bg-primary/10 border-2 border-dashed border-primary"
                        : "h-6 bg-muted/30 border border-dashed border-border/50"
                    : "h-1 hover:h-2 hover:bg-muted"
            )}
        >
            {isDragging && isOver && (
                <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[11px] font-medium shadow-sm">
                    {tr("emailBuilder.dropHere", "Drop here")}
                </span>
            )}
        </div>
    );
}

/** Draggable wrapper for blocks on the canvas */
function DraggableBlock({
    block,
    index,
    children,
}: {
    block: EmailBlock;
    index: number;
    children: React.ReactNode;
}) {
    const canManageLocks = useCanManageLocks();
    const lockedReadonly = !!block.locked && !canManageLocks;
    const { attributes, listeners, setNodeRef, isDragging: isThisDragging } = useDraggable({
        id: `block-${block.id}`,
        data: { type: "block-reorder", blockId: block.id, index },
        disabled: lockedReadonly,
    });

    // No transform here — the floating DragOverlay is the moving preview; the
    // source stays put as a dimmed placeholder so it's clear what's lifted.
    return (
        <div
            ref={setNodeRef}
            className={cn(
                "relative group transition-opacity",
                isThisDragging && "opacity-30 ring-2 ring-primary/40 ring-inset rounded"
            )}
        >
            {/* Drag handle — hidden for locked blocks a restricted editor can't move */}
            {!lockedReadonly && (
                <div
                    {...listeners}
                    {...attributes}
                    className="absolute left-1 top-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-card border rounded p-1 shadow-sm"
                >
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
            )}
            {children}
        </div>
    );
}

/** Renders a columns block with droppable zones inside each column */
function ColumnsBlockWithDropZones({
    block,
    isSelected,
    onClick,
    isDragging,
    selectedBlockId,
    onSelectBlock,
    onEditContent,
}: {
    block: ColumnsBlock;
    isSelected: boolean;
    onClick: () => void;
    isDragging?: boolean;
    selectedBlockId: string | null;
    onSelectBlock: (id: string | null) => void;
    onEditContent?: (id: string, content: string) => void;
}) {
    const padding = block.padding;

    return (
        <div
            style={{
                padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`,
                backgroundColor: block.backgroundColor === "transparent" ? undefined : block.backgroundColor,
                outline: isSelected ? "2px solid hsl(var(--primary))" : undefined,
                outlineOffset: "-1px",
                cursor: "pointer",
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClick();
                }
            }}
        >
            <div style={{ display: "flex", gap: `${block.gap}px` }}>
                {block.columns.map((col, colIdx) => (
                    <ColumnDropZone
                        key={colIdx}
                        blockId={block.id}
                        colIdx={colIdx}
                        blocks={col.blocks}
                        width={col.width}
                        isDragging={isDragging}
                        selectedBlockId={selectedBlockId}
                        onSelectBlock={onSelectBlock}
                        onEditContent={onEditContent}
                    />
                ))}
            </div>
        </div>
    );
}

function ColumnDropZone({
    blockId,
    colIdx,
    blocks,
    width,
    isDragging,
    selectedBlockId,
    onSelectBlock,
    onEditContent,
}: {
    blockId: string;
    colIdx: number;
    blocks: EmailBlock[];
    width: number;
    isDragging?: boolean;
    selectedBlockId: string | null;
    onSelectBlock: (id: string | null) => void;
    onEditContent?: (id: string, content: string) => void;
}) {
    const { isOver, setNodeRef } = useDroppable({
        id: `column-${blockId}-${colIdx}-end`,
        data: { type: "column-drop", parentBlockId: blockId, colIdx, index: blocks.length },
    });

    const isEmpty = blocks.length === 0;
    const tr = useTr();

    return (
        <div
            style={{ width: `${width}%`, minWidth: 0 }}
            // Light dashed outline so the column grid is visible at all times,
            // not just mid-drag.
            className="rounded-md border border-dashed border-border/50 bg-muted/10 p-1"
        >
            {blocks.map((childBlock, childIdx) => (
                <div key={childBlock.id}>
                    <DropIndicator
                        id={`column-${blockId}-${colIdx}-${childIdx}`}
                        index={childIdx}
                        isDragging={isDragging}
                        extraData={{ type: "column-drop", parentBlockId: blockId, colIdx }}
                    />
                    <BlockRenderer
                        block={childBlock}
                        isSelected={selectedBlockId === childBlock.id}
                        onClick={() => onSelectBlock(childBlock.id)}
                        isEditing
                        onEditContent={onEditContent ? (content) => onEditContent(childBlock.id, content) : undefined}
                    />
                </div>
            ))}
            {/* Drop target. When the column is empty it's always shown and
                labelled, so the slot reads as droppable before you drag; for a
                populated column it's a slim strip that expands while dragging. */}
            <div
                ref={setNodeRef}
                className={cn(
                    "flex items-center justify-center rounded text-center transition-all",
                    isEmpty
                        ? isOver
                            ? "min-h-[72px] border-2 border-dashed border-primary bg-primary/10 text-primary"
                            : "min-h-[72px] border-2 border-dashed border-border/60 bg-muted/20 text-muted-foreground"
                        : isOver
                            ? "min-h-[48px] border-2 border-dashed border-primary bg-primary/10 text-primary"
                            : isDragging
                                ? "min-h-[32px] border border-dashed border-border/40 text-muted-foreground/60"
                                : "min-h-[8px]"
                )}
            >
                {(isEmpty || isDragging) && (
                    <span className="flex items-center gap-1 text-[11px] font-medium py-2 px-1">
                        <Plus className="h-3.5 w-3.5 shrink-0" />
                        {isOver ? tr("emailBuilder.dropHere", "Drop here") : isEmpty ? tr("emailBuilder.dragBlockHere", "Drag a block here") : "+"}
                    </span>
                )}
            </div>
        </div>
    );
}

/**
 * Prefix every top-level selector in `css` with `scopeSel`, so the document's
 * Custom CSS styles only the canvas content area — not the editor chrome (which
 * lives in the same document). Best-effort: plain rules and nested at-rules
 * (@media/@supports/@container) are scoped; @keyframes/@font-face/@import pass
 * through untouched. The exported email applies this CSS globally (it owns the
 * whole document); here we scope it so editing stays WYSIWYG without bleeding.
 */
function scopeCss(css: string, scopeSel: string): string {
    const src = css.replace(/\/\*[\s\S]*?\*\//g, "").trim();
    let out = "";
    let i = 0;
    while (i < src.length) {
        const open = src.indexOf("{", i);
        if (open === -1) break;
        const prelude = src.slice(i, open).trim();
        let depth = 1;
        let j = open + 1;
        for (; j < src.length && depth > 0; j++) {
            if (src[j] === "{") depth++;
            else if (src[j] === "}") depth--;
        }
        const body = src.slice(open + 1, j - 1);
        if (prelude.startsWith("@")) {
            const at = prelude.slice(1).split(/[\s(]/)[0].toLowerCase();
            out += at === "media" || at === "supports" || at === "container"
                ? `${prelude}{${scopeCss(body, scopeSel)}}`
                : `${prelude}{${body}}`;
        } else if (prelude) {
            out += `${prelude.split(",").map((s) => `${scopeSel} ${s.trim()}`).join(",")}{${body}}`;
        }
        i = j;
    }
    return out;
}

export function Canvas({ blocks, settings, selectedBlockId, onSelectBlock, isPreview, isDragging, shadow, onEditContent }: CanvasProps) {
    const tr = useTr();
    const { setNodeRef: setCanvasRef, isOver: isCanvasOver } = useDroppable({
        id: "canvas-root",
        data: { type: "canvas-drop", index: blocks.length },
    });

    return (
        <div
            className="flex-1 overflow-auto"
            style={{ backgroundColor: settings.backgroundColor }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onSelectBlock(null);
            }}
        >
            <div
                className={cn("eb-content-css mx-auto flex flex-col", shadow && "shadow-lg")}
                style={{
                    // Mirror the email's vertical body padding (toHtml wraps the
                    // content in `padding:{bodyPadding}px 0`) so edit == preview == email.
                    marginTop: settings.bodyPadding ?? 0,
                    marginBottom: settings.bodyPadding ?? 0,
                    maxWidth: `${settings.contentWidth}px`,
                    backgroundColor: settings.contentBackgroundColor,
                    fontFamily: settings.fontFamily,
                    color: settings.textColor,
                    // Drives the edit-canvas link color (see styles.css) so links
                    // look the same as in the preview/email.
                    ["--eb-link-color" as string]: settings.linkColor,
                    border: settings.contentBorder && settings.contentBorder.width > 0 && settings.contentBorder.style !== "none"
                        ? `${settings.contentBorder.width}px ${settings.contentBorder.style} ${settings.contentBorder.color}`
                        : undefined,
                    borderRadius: settings.contentBorder && settings.contentBorder.radius > 0 ? settings.contentBorder.radius : undefined,
                    // Clip block backgrounds to the rounded corners so a colored
                    // first/last block doesn't poke square corners over the radius
                    // (the email output rounds the first/last cell to match).
                    overflow: settings.contentBorder && settings.contentBorder.radius > 0 ? "hidden" : undefined,
                }}
            >
                {/* Document Custom CSS, scoped to the canvas content so editing is
                    WYSIWYG (the exported email applies the same CSS globally). */}
                {settings.customCss && settings.customCss.trim() ? (
                    <style dangerouslySetInnerHTML={{ __html: scopeCss(settings.customCss, ".eb-content-css") }} />
                ) : null}
                {blocks.length === 0 ? (
                    <div
                        ref={setCanvasRef}
                        className={cn(
                            "flex flex-col items-center justify-center border-2 border-dashed rounded-lg mx-4 my-4 transition-all",
                            isCanvasOver ? "border-primary bg-primary/5 py-24" : "border-border py-20",
                            isDragging && "border-primary/50 bg-primary/5"
                        )}
                    >
                        <Plus className={cn("h-8 w-8 mb-2", isDragging ? "text-primary" : "text-muted-foreground/40")} />
                        <p className={cn("text-sm", isDragging ? "text-primary font-medium" : "text-muted-foreground")}>
                            {isDragging ? tr("emailBuilder.dropBlockHere", "Drop block here") : tr("emailBuilder.emptyCanvas", "Drag blocks here to start building")}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col min-h-full">
                        <div>
                            {blocks.map((block, index) => (
                                <div key={block.id}>
                                    {!isPreview && (
                                        <div className="mx-4">
                                            <DropIndicator id={`drop-${index}`} index={index} isDragging={isDragging} />
                                        </div>
                                    )}
                                    {!isPreview ? (
                                        <DraggableBlock block={block} index={index}>
                                            <div className={cn(
                                                "hover:ring-1 hover:ring-primary/30 hover:ring-inset",
                                            )}>
                                                {block.type === "columns" ? (
                                                    <ColumnsBlockWithDropZones
                                                        block={block as ColumnsBlock}
                                                        isSelected={selectedBlockId === block.id}
                                                        onClick={() => onSelectBlock(block.id)}
                                                        isDragging={isDragging}
                                                        selectedBlockId={selectedBlockId}
                                                        onSelectBlock={onSelectBlock}
                                                        onEditContent={onEditContent}
                                                    />
                                                ) : (
                                                    <BlockRenderer
                                                        block={block}
                                                        isSelected={selectedBlockId === block.id}
                                                        onClick={() => onSelectBlock(block.id)}
                                                        isEditing
                                                        onEditContent={onEditContent ? (content) => onEditContent(block.id, content) : undefined}
                                                    />
                                                )}
                                            </div>
                                        </DraggableBlock>
                                    ) : (
                                        <BlockRenderer
                                            block={block}
                                            isSelected={false}
                                            isEditing={false}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        {/* Final drop zone */}
                        {!isPreview && (
                            <div
                                ref={setCanvasRef}
                                className={cn(
                                    // Idle: no reserved space so the content box hugs
                                    // its blocks (matching the preview/email). While
                                    // dragging, expand into a generous end-drop target.
                                    "flex-1 transition-all",
                                    isDragging ? "min-h-[120px]" : "min-h-0"
                                )}
                            >
                                <div className="mx-4">
                                    <DropIndicator id={`drop-${blocks.length}`} index={blocks.length} isDragging={isDragging} />
                                </div>
                                {isDragging && (
                                    <div className={cn(
                                        "flex items-center justify-center py-8 mx-4 border-2 border-dashed rounded-lg transition-colors",
                                        isCanvasOver ? "border-primary bg-primary/10" : "border-border/50"
                                    )}>
                                        <p className={cn("text-xs", isCanvasOver ? "text-primary font-medium" : "text-muted-foreground")}>
                                            {isCanvasOver ? tr("emailBuilder.dropAtEnd", "Drop here to add at the end") : tr("emailBuilder.dropZone", "Drop zone")}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
