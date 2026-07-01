import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { nanoid } from "nanoid";
import {
    DndContext,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    pointerWithin,
    rectIntersection,
} from "@dnd-kit/core";
import { Button, Tabs, TabsContent, TabsList, TabsTrigger, Popover, PopoverContent, PopoverTrigger, usePopoverClose, Dialog } from "./ui/primitives";
import {
    Eye,
    Code,
    Pencil,
    Undo,
    Redo,
    Download,
    Upload,
    Settings,
    Monitor,
    Smartphone,
    Copy,
    Move,
    Plus,
    MoreHorizontal,
    ClipboardPaste,
    Lock,
    Unlock,
    Languages,
    Check,
    CopyPlus,
    ShieldCheck,
    AlertTriangle,
    AlertOctagon,
    Info,
    CircleCheck,
} from "lucide-react";
import { cn } from "./ui/utils";
import { useToast, useUnsavedChanges } from "./ui/hooks";
import { validate } from "./validate";
import { CodeEditor } from "./ui/CodeEditor";

import { EmailBlock, EmailDocument, EmailLocale, EmailSettings, BlockType, ColumnsBlock, MergeFieldGroup, DEFAULT_SETTINGS, BLOCK_CATALOG } from "./types";

/** Deep-clone a block with fresh ids for it and every nested column child. */
function cloneWithNewIds(block: EmailBlock): EmailBlock {
    const fresh = JSON.parse(JSON.stringify(block)) as EmailBlock;
    const stamp = Date.now();
    let n = 0;
    const reid = (b: EmailBlock) => {
        b.id = `${b.type}-${stamp}-${n++}`;
        if (b.type === "columns") {
            (b as ColumnsBlock).columns.forEach((col) => col.blocks.forEach(reid));
        }
    };
    reid(fresh);
    return fresh;
}

/** Floating preview shown under the cursor while dragging. */
function DragPreview({ kind, label }: { kind: "catalog" | "reorder"; label: string }) {
    const Icon = kind === "catalog" ? Plus : Move;
    return (
        <div className="flex items-center gap-2 rounded-lg border-2 border-primary bg-card px-3 py-2 shadow-xl text-sm font-medium pointer-events-none">
            <Icon className="h-4 w-4 text-primary shrink-0" />
            <span>{kind === "catalog" ? `Add ${label}` : `Move ${label}`}</span>
        </div>
    );
}
import { createBlock, createStarterDocument } from "./defaults";
import { Canvas } from "./components/Canvas";
import { BlockSidebar } from "./components/BlockSidebar";
import { PropertyPanel, EmailSettingsPanel } from "./components/PropertyPanel";
import { exportToJson, importFromJson, renderEmailHtml, type BlockDefinition } from "./renderer/toHtml";
import { BuilderI18nContext, makeTr } from "./i18n";
import { ImageUploadContext, FileUploadContext, type ImageUploadFn, type FileUploadFn } from "./upload";
import { UpdateBlockContext, LockingContext, CustomBlocksContext } from "./editor-context";

/**
 * Extra payload passed to `onSave` as the third argument when the editor is in
 * multi-language mode (`locales` provided). Carries every language's design and
 * rendered HTML so the host can persist all variants in one save.
 */
export interface MultiLocaleSaveMeta {
    /** The language that was active when Save was clicked. */
    locale: string;
    /** Each language's current design, keyed by locale `code`. */
    documents: Record<string, EmailDocument>;
    /** Each language's rendered email HTML, keyed by locale `code`. */
    htmls: Record<string, string>;
}

export interface EmailBuilderProps {
    /** Initial document to load (single-language). For multi-language, use `initialDocuments`. */
    initialDocument?: EmailDocument;
    /**
     * Languages this template has variants for. When provided (non-empty), the
     * editor shows a language switcher and keeps a separate design per language;
     * `onSave` then also receives a {@link MultiLocaleSaveMeta} with all of them.
     * Omit for a single-language template (the default).
     */
    locales?: EmailLocale[];
    /** Initial design per language, keyed by locale `code`. Languages without an entry start from the default starter layout. Multi-language mode only. */
    initialDocuments?: Record<string, EmailDocument>;
    /** Which language is selected initially (defaults to the first in `locales`). */
    defaultLocale?: string;
    /** Called when document changes */
    onChange?: (doc: EmailDocument) => void;
    /** Called when user clicks save. In multi-language mode, `meta` carries every language's design + HTML. */
    onSave?: (doc: EmailDocument, html: string, meta?: MultiLocaleSaveMeta) => void;
    /** Called when user wants to go back */
    onBack?: () => void;
    /** Personalization tokens (e.g. from useTemplateFields) for the insert-field menu. */
    fieldGroups?: MergeFieldGroup[];
    /** Upload handler for image/thumbnail fields. Receives the picked File, returns a hosted URL. Omit to keep fields URL-only. */
    onImageUpload?: ImageUploadFn;
    /** Upload handler for the File/Download block (any file type). Receives the picked File, returns a hosted URL. Falls back to `onImageUpload` when omitted. */
    onFileUpload?: FileUploadFn;
    /** Show a drop shadow around the canvas in edit mode (off by default). */
    canvasShadow?: boolean;
    /** Full editor (default true). When false, the user is a restricted editor: locked blocks are read-only and the lock toggle is hidden. */
    canManageLocks?: boolean;
    /** Custom block definitions (from `defineBlock`). They appear in the sidebar and are rendered/edited via each definition's `create`/`Canvas`/`Editor`/`toHtml`. */
    customBlocks?: BlockDefinition[];
    /**
     * Optional transform applied to the compiled HTML in the Preview tab only —
     * e.g. substitute `{{merge_tags}}` with sample values so the preview shows
     * what a recipient sees. Saved/exported HTML always keeps the raw tokens for
     * the backend to fill per-recipient.
     */
    previewSubstitute?: (html: string) => string;
    /**
     * Optional translator (e.g. the app's i18n `t`) for the builder chrome.
     * Keys live under `emailBuilder.*`; any unresolved key falls back to the
     * built-in English, so the builder still works standalone.
     */
    t?: (key: string) => string;
}

const MAX_HISTORY = 50;

/** An item in the toolbar's "More" overflow menu — runs its action and closes the menu. */
function MoreMenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
    const close = usePopoverClose();
    return (
        <button
            type="button"
            onClick={() => { onClick(); close(); }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-left hover:bg-accent hover:text-accent-foreground"
        >
            <span className="shrink-0">{icon}</span>
            {label}
        </button>
    );
}

/** A language option in the toolbar's language switcher. */
function LocaleMenuItem({ label, active, onSelect }: { label: string; active: boolean; onSelect: () => void }) {
    const close = usePopoverClose();
    return (
        <button
            type="button"
            onClick={() => { onSelect(); close(); }}
            className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-xs text-left hover:bg-accent hover:text-accent-foreground"
        >
            <span>{label}</span>
            {active && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
        </button>
    );
}

/** A row in the toolbar's Validation panel; clicking a block-scoped issue selects that block. */
function ValidateRow({ icon, message, canSelect, onSelect }: { icon: React.ReactNode; message: string; canSelect: boolean; onSelect: () => void }) {
    const close = usePopoverClose();
    return (
        <button
            type="button"
            disabled={!canSelect}
            onClick={() => { onSelect(); close(); }}
            className={cn(
                "flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-xs",
                canSelect ? "cursor-pointer hover:bg-accent hover:text-accent-foreground" : "cursor-default",
            )}
        >
            {icon}
            <span className="leading-snug">{message}</span>
        </button>
    );
}

/** Find a block by id anywhere in the tree (top level or inside columns). */
function findBlockDeep(blocks: EmailBlock[], id: string): EmailBlock | undefined {
    for (const b of blocks) {
        if (b.id === id) return b;
        if (b.type === "columns") {
            for (const col of (b as ColumnsBlock).columns) {
                const found = findBlockDeep(col.blocks, id);
                if (found) return found;
            }
        }
    }
    return undefined;
}

/** Structural deep-clone of a document (drops references; keeps ids). */
function cloneDoc(doc: EmailDocument): EmailDocument {
    return JSON.parse(JSON.stringify(doc)) as EmailDocument;
}

export function EmailBuilder({ initialDocument, locales, initialDocuments, defaultLocale, onChange, onSave, onBack, fieldGroups, previewSubstitute, onImageUpload, onFileUpload, canvasShadow, canManageLocks = true, customBlocks, t }: EmailBuilderProps) {
    const { toast } = useToast();
    const tr = useMemo(() => makeTr(t), [t]);

    // Multi-language: a non-empty `locales` list turns on per-language designs.
    const localeList = useMemo(() => locales ?? [], [locales]);
    const isMultiLocale = localeList.length > 0;
    const firstLocale = localeList[0]?.code ?? "";
    // The language currently being edited. Meaningless (but harmless) when single-language.
    const [activeLocale, setActiveLocale] = useState<string>(
        () => defaultLocale && localeList.some((l) => l.code === defaultLocale) ? defaultLocale : firstLocale,
    );

    // Document state
    // No document provided → start from a sensible default layout (not a blank
    // canvas). An explicit document, even an empty one, is honored as-is.
    const [document, setDocument] = useState<EmailDocument>(() => {
        const initialActive = defaultLocale && (localeList.some((l) => l.code === defaultLocale)) ? defaultLocale : firstLocale;
        if (isMultiLocale) {
            return initialDocuments?.[initialActive] ?? initialDocument ?? createStarterDocument();
        }
        return initialDocument ?? createStarterDocument();
    });

    // The *other* languages' designs (everything except the active one). The
    // active language always lives in `document`; on switch we swap between here
    // and there. Seeded once from `initialDocuments` (a starter for any missing).
    const [localeDocs, setLocaleDocs] = useState<Record<string, EmailDocument>>(() => {
        if (!isMultiLocale) return {};
        const initialActive = defaultLocale && (localeList.some((l) => l.code === defaultLocale)) ? defaultLocale : firstLocale;
        const map: Record<string, EmailDocument> = {};
        for (const l of localeList) {
            if (l.code === initialActive) continue;
            map[l.code] = initialDocuments?.[l.code] ?? createStarterDocument();
        }
        return map;
    });
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"edit" | "preview" | "code">("edit");
    const [previewWidth, setPreviewWidth] = useState<"desktop" | "mobile">("desktop");
    const [isDirty, setIsDirty] = useState(false);
    // Manual override of the exported HTML, set by editing the "HTML" code tab.
    // null = derive from blocks. Cleared whenever the document changes.
    const [htmlOverride, setHtmlOverride] = useState<string | null>(null);
    // Open when the user clicks Back with unsaved changes (in-app confirm dialog).
    const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    // What's currently being dragged — drives the floating DragOverlay preview.
    const [activeDrag, setActiveDrag] = useState<{ kind: "catalog" | "reorder"; label: string } | null>(null);

    // History — past/future stacks. `commit` snapshots the current doc onto
    // `past` and clears `future`; undo/redo move docs between the two.
    const [past, setPast] = useState<EmailDocument[]>([]);
    const [future, setFuture] = useState<EmailDocument[]>([]);
    const lastCommitRef = useRef(0);
    const canUndo = past.length > 0;
    const canRedo = future.length > 0;

    useUnsavedChanges(isDirty);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    // --- Document mutations ---

    // Commit a new document. `coalesce` merges rapid successive edits (text
    // typing, slider drags) into a single undo step instead of one-per-keystroke.
    const commit = useCallback((next: EmailDocument, coalesce = false) => {
        const now = Date.now();
        const merge = coalesce && now - lastCommitRef.current < 500;
        lastCommitRef.current = now;
        if (!merge) {
            setPast((p) => {
                const np = [...p, document];
                return np.length > MAX_HISTORY ? np.slice(np.length - MAX_HISTORY) : np;
            });
            setFuture([]);
        }
        setDocument(next);
        onChange?.(next);
        setIsDirty(true);
    }, [document, onChange]);

    const updateDocument = useCallback(
        (updater: (doc: EmailDocument) => EmailDocument, coalesce = false) => {
            commit(updater(document), coalesce);
        },
        [commit, document],
    );

    const undo = useCallback(() => {
        if (past.length === 0) return;
        const prev = past[past.length - 1];
        setPast(past.slice(0, -1));
        setFuture((f) => [...f, document]);
        setDocument(prev);
        onChange?.(prev);
        setIsDirty(true);
    }, [past, document, onChange]);

    const redo = useCallback(() => {
        if (future.length === 0) return;
        const next = future[future.length - 1];
        setFuture(future.slice(0, -1));
        setPast((p) => [...p, document]);
        setDocument(next);
        onChange?.(next);
        setIsDirty(true);
    }, [future, document, onChange]);

    const updateSettings = useCallback((updates: Partial<EmailSettings>) => {
        commit({ ...document, settings: { ...document.settings, ...updates } }, true);
    }, [commit, document]);

    // --- Block operations ---

    const customBlockMap = useMemo(
        () => new Map((customBlocks ?? []).map((d) => [d.type, d])),
        [customBlocks],
    );

    /** Create a block by type — a registered custom definition's `create()`, else a built-in. */
    const createAnyBlock = useCallback((type: string): EmailBlock => {
        const def = customBlockMap.get(type);
        if (def) {
            const data = def.create ? def.create() : { padding: { top: 0, right: 0, bottom: 0, left: 0 }, backgroundColor: "transparent" };
            return { ...data, type, id: nanoid(8) } as unknown as EmailBlock;
        }
        return createBlock(type as BlockType);
    }, [customBlockMap]);

    const addBlock = useCallback((type: string, index?: number) => {
        const block = createAnyBlock(type);
        updateDocument((doc) => {
            const blocks = [...doc.blocks];
            // Footer always goes to the very end
            if (type === "footer") {
                blocks.push(block);
            } else {
                // Insert before any existing footer, or at the requested index
                const footerIdx = blocks.findIndex((b) => b.type === "footer");
                const maxInsert = footerIdx !== -1 ? footerIdx : blocks.length;
                const insertAt = Math.min(index ?? maxInsert, maxInsert);
                blocks.splice(insertAt, 0, block);
            }
            return { ...doc, blocks };
        });
        setSelectedBlockId(block.id);
    }, [updateDocument, createAnyBlock]);

    // Helper: apply a transform to a block by ID, searching top-level and inside columns
    const mapBlocksDeep = useCallback((blocks: EmailBlock[], id: string, fn: (b: EmailBlock) => EmailBlock | null): EmailBlock[] => {
        const result: EmailBlock[] = [];
        for (const b of blocks) {
            if (b.id === id) {
                const mapped = fn(b);
                if (mapped) result.push(mapped); // null = delete
            } else if (b.type === "columns") {
                const cols = (b as any).columns.map((col: any) => ({
                    ...col,
                    blocks: mapBlocksDeep(col.blocks, id, fn),
                }));
                result.push({ ...b, columns: cols } as EmailBlock);
            } else {
                result.push(b);
            }
        }
        return result;
    }, []);

    const updateBlock = useCallback((id: string, updates: Partial<EmailBlock>) => {
        // coalesce=true: rapid edits (typing, slider drags) collapse into one undo step.
        updateDocument((doc) => {
            const target = findBlockDeep(doc.blocks, id);
            if (target?.locked && !canManageLocks) return doc; // locked → restricted editors can't change it
            return { ...doc, blocks: mapBlocksDeep(doc.blocks, id, (b) => ({ ...b, ...updates } as EmailBlock)) };
        }, true);
    }, [updateDocument, mapBlocksDeep, canManageLocks]);

    const deleteBlock = useCallback((id: string) => {
        updateDocument((doc) => {
            const target = findBlockDeep(doc.blocks, id);
            if (target?.locked && !canManageLocks) return doc;
            return { ...doc, blocks: mapBlocksDeep(doc.blocks, id, () => null) };
        });
        if (selectedBlockId === id) setSelectedBlockId(null);
    }, [updateDocument, selectedBlockId, mapBlocksDeep, canManageLocks]);

    const duplicateBlock = useCallback((id: string) => {
        updateDocument((doc) => {
            if (findBlockDeep(doc.blocks, id)?.locked && !canManageLocks) return doc;
            // Try top-level first
            const idx = doc.blocks.findIndex((b) => b.id === id);
            if (idx !== -1) {
                // Deep re-id so a duplicated Columns block doesn't collide ids
                // with its source's nested children.
                const clone = cloneWithNewIds(doc.blocks[idx]);
                const blocks = [...doc.blocks];
                blocks.splice(idx + 1, 0, clone);
                return { ...doc, blocks };
            }
            // Search inside columns
            const blocks = doc.blocks.map((b) => {
                if (b.type !== "columns") return b;
                const cols = (b as ColumnsBlock).columns.map((col) => {
                    const cIdx = col.blocks.findIndex((cb) => cb.id === id);
                    if (cIdx === -1) return col;
                    const clone = cloneWithNewIds(col.blocks[cIdx]);
                    const newBlocks = [...col.blocks];
                    newBlocks.splice(cIdx + 1, 0, clone);
                    return { ...col, blocks: newBlocks };
                });
                return { ...b, columns: cols };
            });
            return { ...doc, blocks };
        });
    }, [updateDocument]);

    const toggleVisibility = useCallback((id: string) => {
        updateDocument((doc) => {
            const target = findBlockDeep(doc.blocks, id);
            if (target?.locked && !canManageLocks) return doc;
            return { ...doc, blocks: mapBlocksDeep(doc.blocks, id, (b) => ({ ...b, hidden: !b.hidden } as EmailBlock)) };
        });
    }, [updateDocument, mapBlocksDeep, canManageLocks]);

    const toggleLock = useCallback((id: string) => {
        updateDocument((doc) => ({
            ...doc,
            blocks: mapBlocksDeep(doc.blocks, id, (b) => ({ ...b, locked: !b.locked } as EmailBlock)),
        }));
    }, [updateDocument, mapBlocksDeep]);

    const moveBlock = useCallback((fromIndex: number, toIndex: number) => {
        updateDocument((doc) => {
            if (doc.blocks[fromIndex]?.locked && !canManageLocks) return doc;
            const blocks = [...doc.blocks];
            const [moved] = blocks.splice(fromIndex, 1);
            blocks.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, moved);
            return { ...doc, blocks };
        });
    }, [updateDocument]);

    // --- Drag and drop ---

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setIsDragging(true);
        const data = event.active.data.current;
        if (data?.type === "catalog") {
            const item = BLOCK_CATALOG.find((b) => b.type === data.blockType);
            const label = item?.label ?? customBlockMap.get(data.blockType as string)?.label ?? "block";
            setActiveDrag({ kind: "catalog", label });
        } else if (data?.type === "block-reorder") {
            const b = document.blocks[data.index as number];
            const label = b ? b.type.charAt(0).toUpperCase() + b.type.slice(1) : "block";
            setActiveDrag({ kind: "reorder", label });
        }
    }, [document.blocks]);

    const addBlockToColumn = useCallback((type: string, parentBlockId: string, colIdx: number, index: number) => {
        const newBlock = createAnyBlock(type);
        updateDocument((doc) => ({
            ...doc,
            blocks: doc.blocks.map((b) => {
                if (b.id !== parentBlockId || b.type !== "columns") return b;
                const cols = (b as any).columns.map((col: any, idx: number) => {
                    if (idx !== colIdx) return col;
                    const blocks = [...col.blocks];
                    blocks.splice(index, 0, newBlock);
                    return { ...col, blocks };
                });
                return { ...b, columns: cols };
            }),
        }));
        setSelectedBlockId(newBlock.id);
    }, [updateDocument]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setIsDragging(false);
        setActiveDrag(null);
        const { active, over } = event;
        if (!over) return;

        const activeData = active.data.current;
        const overData = over.data.current;

        // Dragging from catalog to canvas (top-level)
        if (activeData?.type === "catalog" && overData?.type === "canvas-drop") {
            addBlock(activeData.blockType as string, overData.index);
            return;
        }

        // Dragging from catalog into a column
        if (activeData?.type === "catalog" && overData?.type === "column-drop") {
            addBlockToColumn(
                activeData.blockType as string,
                overData.parentBlockId,
                overData.colIdx,
                overData.index
            );
            return;
        }

        // Reordering existing blocks on canvas
        if (activeData?.type === "block-reorder" && overData?.type === "canvas-drop") {
            const fromIndex = activeData.index as number;
            let toIndex = overData.index as number;
            if (fromIndex === toIndex || fromIndex === toIndex - 1) return; // no-op
            moveBlock(fromIndex, toIndex);
            return;
        }

        // Moving an existing block into a column
        if (activeData?.type === "block-reorder" && overData?.type === "column-drop") {
            const blockId = activeData.blockId as string;
            const block = document.blocks.find((b) => b.id === blockId);
            if (!block || block.type === "columns") return; // don't nest columns

            updateDocument((doc) => {
                // Remove from top level
                const blocks = doc.blocks.filter((b) => b.id !== blockId);
                // Add to column
                const updatedBlocks = blocks.map((b) => {
                    if (b.id !== overData.parentBlockId || b.type !== "columns") return b;
                    const cols = (b as any).columns.map((col: any, idx: number) => {
                        if (idx !== overData.colIdx) return col;
                        const colBlocks = [...col.blocks];
                        colBlocks.splice(overData.index, 0, block);
                        return { ...col, blocks: colBlocks };
                    });
                    return { ...b, columns: cols };
                });
                return { ...doc, blocks: updatedBlocks };
            });
            return;
        }
    }, [addBlock, addBlockToColumn, moveBlock, document.blocks, updateDocument]);

    const handleDragCancel = useCallback(() => {
        setIsDragging(false);
        setActiveDrag(null);
    }, []);

    // --- Export/Import ---

    const handleExportHtml = useCallback(async () => {
        const html = htmlOverride ?? await renderEmailHtml(document, { blocks: customBlocks });
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement("a");
        a.href = url;
        a.download = "email.html";
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "HTML exported" });
    }, [document, toast, htmlOverride, customBlocks]);

    const handleExportJson = useCallback(() => {
        const json = exportToJson(document);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement("a");
        a.href = url;
        a.download = "email-template.json";
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "JSON exported" });
    }, [document, toast]);

    const handleImportJson = useCallback(() => {
        const input = window.document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                const doc = importFromJson(reader.result as string);
                if (doc) {
                    setDocument(doc);
                    setSelectedBlockId(null);
                    setIsDirty(true);
                    toast({ title: "Template imported" });
                } else {
                    toast({ title: "Invalid file", variant: "destructive" });
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }, [toast]);

    // Copy the current design to the clipboard, and paste one in — a lightweight
    // way to duplicate a template into another without the file export/import dance.
    const handleCopyDesign = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(exportToJson(document));
            toast({ title: tr("emailBuilder.designCopied", "Design copied to clipboard") });
        } catch {
            toast({ title: tr("emailBuilder.copyFailed", "Couldn't access the clipboard"), variant: "destructive" });
        }
    }, [document, toast, tr]);

    const handlePasteDesign = useCallback(async () => {
        try {
            const doc = importFromJson(await navigator.clipboard.readText());
            if (!doc) {
                toast({ title: tr("emailBuilder.pasteInvalid", "Clipboard has no valid design"), variant: "destructive" });
                return;
            }
            setDocument(doc);
            setSelectedBlockId(null);
            setIsDirty(true);
            toast({ title: tr("emailBuilder.designPasted", "Design pasted") });
        } catch {
            toast({ title: tr("emailBuilder.pasteFailed", "Couldn't read the clipboard"), variant: "destructive" });
        }
    }, [toast, tr]);

    // --- Languages ---

    // Switch the edited language: stash the active design, load the target's.
    // History is per-language and resets on switch (undo doesn't cross languages).
    const switchLocale = useCallback((code: string) => {
        if (code === activeLocale || !isMultiLocale) return;
        const incoming = localeDocs[code] ?? createStarterDocument();
        setLocaleDocs((m) => {
            const next = { ...m };
            delete next[code];
            next[activeLocale] = document; // park the design we're leaving
            return next;
        });
        setDocument(incoming);
        setActiveLocale(code);
        setSelectedBlockId(null);
        setPast([]);
        setFuture([]);
        lastCommitRef.current = 0;
    }, [activeLocale, isMultiLocale, localeDocs, document]);

    // Copy the active language's design onto every other language (overwrites
    // them), so translators start from an identical layout. Confirms first.
    const copyToAllLocales = useCallback(() => {
        if (!isMultiLocale) return;
        const others = localeList.filter((l) => l.code !== activeLocale);
        if (others.length === 0) return;
        const activeLabel = localeList.find((l) => l.code === activeLocale)?.label ?? activeLocale;
        const ok = window.confirm(
            tr("emailBuilder.copyToAllConfirm", `Copy the "${activeLabel}" design to all other languages? This replaces their current content.`),
        );
        if (!ok) return;
        setLocaleDocs((m) => {
            const next = { ...m };
            for (const l of others) next[l.code] = cloneDoc(document);
            return next;
        });
        setIsDirty(true);
        toast({ title: tr("emailBuilder.copiedToAll", "Design copied to all languages") });
    }, [isMultiLocale, localeList, activeLocale, document, tr, toast]);

    const handleSave = useCallback(async () => {
        // Use the hand-edited HTML for the active language if the code tab was edited.
        const html = htmlOverride ?? await renderEmailHtml(document, { blocks: customBlocks });
        if (isMultiLocale) {
            // Render every language's design so the host can persist all variants.
            const documents: Record<string, EmailDocument> = { ...localeDocs, [activeLocale]: document };
            const htmls: Record<string, string> = {};
            for (const code of Object.keys(documents)) {
                htmls[code] = code === activeLocale ? html : await renderEmailHtml(documents[code], { blocks: customBlocks });
            }
            onSave?.(document, html, { locale: activeLocale, documents, htmls });
        } else {
            onSave?.(document, html);
        }
        setIsDirty(false);
        toast({ title: "Saved" });
    }, [document, onSave, toast, customBlocks, isMultiLocale, localeDocs, activeLocale, htmlOverride]);

    // Back button: confirm in-app (styled dialog) when there are unsaved changes,
    // instead of leaving silently. The browser's own beforeunload prompt still
    // covers hard tab-close / refresh (see useUnsavedChanges).
    const requestBack = useCallback(() => {
        if (!onBack) return;
        if (isDirty) setConfirmLeaveOpen(true);
        else onBack();
    }, [onBack, isDirty]);

    const saveAndLeave = useCallback(async () => {
        await handleSave();
        setConfirmLeaveOpen(false);
        onBack?.();
    }, [handleSave, onBack]);

    const leaveWithoutSaving = useCallback(() => {
        setConfirmLeaveOpen(false);
        onBack?.();
    }, [onBack]);

    // --- Computed ---

    const activeLocaleLabel = useMemo(
        () => localeList.find((l) => l.code === activeLocale)?.label ?? activeLocale,
        [localeList, activeLocale],
    );

    const selectedBlock = useMemo(() => {
        if (!selectedBlockId) return null;
        // Search top-level
        const top = document.blocks.find((b) => b.id === selectedBlockId);
        if (top) return top;
        // Search inside columns
        for (const b of document.blocks) {
            if (b.type === "columns") {
                for (const col of (b as any).columns) {
                    const found = col.blocks.find((cb: any) => cb.id === selectedBlockId);
                    if (found) return found as EmailBlock;
                }
            }
        }
        return null;
    }, [document.blocks, selectedBlockId]);

    // Compiled HTML for the Preview and HTML tabs — runs only while one of those
    // tabs is open and re-runs as the document changes. This is the real email
    // output recipients receive.
    const [compiledHtml, setCompiledHtml] = useState("");
    const [compiling, setCompiling] = useState(false);
    const [previewHeight, setPreviewHeight] = useState(400);
    // Any change to `document` (block edit, undo/redo, import, locale switch)
    // discards the manual HTML override so the blocks become the source again.
    useEffect(() => { setHtmlOverride(null); }, [document]);

    useEffect(() => {
        if (viewMode !== "code" && viewMode !== "preview") return;
        let cancelled = false;
        setCompiling(true);
        renderEmailHtml(document, { blocks: customBlocks })
            .then((html) => { if (!cancelled) setCompiledHtml(html); })
            .finally(() => { if (!cancelled) setCompiling(false); });
        return () => { cancelled = true; };
    }, [viewMode, document]);

    // What gets saved / exported / previewed: the manual override if the user
    // hand-edited the code tab, otherwise the freshly-compiled block output.
    const sourceHtml = htmlOverride ?? compiledHtml;

    // The preview shows this HTML with merge tags resolved to sample values (when
    // the host provides a substitutor) — true WYSIWYG. The token form is preserved
    // everywhere else (save/export/code view).
    const previewHtml = useMemo(
        () => (previewSubstitute ? previewSubstitute(sourceHtml) : sourceHtml),
        [sourceHtml, previewSubstitute],
    );

    // Class suggestions for the Custom CSS editor's autocomplete: the block-type
    // hooks in use, each block's custom class, and the inner-element variant
    // (e.g. `.eb-block-button a`) so users target the element, not the row.
    const cssClassSuggestions = useMemo(() => {
        const EL: Record<string, string> = { button: "a", file: "a", image: "img", text: "p", heading: "h1", footer: "p", social: "a", quote: "blockquote" };
        const types = new Set<string>();
        const customs: { cls: string; type: string }[] = [];
        const walk = (blocks: EmailBlock[]) => {
            for (const b of blocks) {
                types.add(b.type);
                const cn = (b.className ?? "").trim().split(/\s+/).filter(Boolean)[0];
                if (cn) customs.push({ cls: cn, type: b.type });
                if (b.type === "columns") (b as ColumnsBlock).columns.forEach((c) => walk(c.blocks));
            }
        };
        walk(document.blocks);
        const out: { label: string; insertText?: string; detail?: string }[] = [{ label: "eb-block", detail: "every block" }];
        for (const t of [...types].sort()) {
            out.push({ label: `eb-block-${t}`, detail: `all ${t} blocks` });
            if (EL[t]) out.push({ label: `eb-block-${t} ${EL[t]}`, insertText: `eb-block-${t} ${EL[t]}`, detail: `the ${t}'s <${EL[t]}>` });
        }
        for (const { cls, type } of customs) {
            out.push({ label: cls, detail: "your block class" });
            if (EL[type]) out.push({ label: `${cls} ${EL[type]}`, insertText: `${cls} ${EL[type]}`, detail: `your block's <${EL[type]}>` });
        }
        return out;
    }, [document.blocks]);

    // Live validation of the current document, surfaced in the toolbar's Check panel.
    const validationIssues = useMemo(() => validate(document, { blocks: customBlocks }), [document, customBlocks]);
    const worstLevel = validationIssues.some((i) => i.level === "error")
        ? "error"
        : validationIssues.some((i) => i.level === "warning")
            ? "warning"
            : validationIssues.length > 0 ? "info" : "ok";

    // --- Keyboard shortcuts ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isCtrl = e.ctrlKey || e.metaKey;
            const target = e.target as HTMLElement;
            // Don't intercept when typing in inputs/textareas
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

            // Ctrl+Z — Undo
            if (isCtrl && e.key === "z" && !e.shiftKey) {
                e.preventDefault();
                undo();
                return;
            }
            // Ctrl+Shift+Z or Ctrl+Y — Redo
            if (isCtrl && (e.key === "Z" || e.key === "y")) {
                e.preventDefault();
                redo();
                return;
            }
            // Ctrl+S — Save
            if (isCtrl && e.key === "s") {
                e.preventDefault();
                handleSave();
                return;
            }
            // Delete / Backspace — Delete selected block
            if ((e.key === "Delete" || e.key === "Backspace") && selectedBlockId) {
                e.preventDefault();
                deleteBlock(selectedBlockId);
                return;
            }
            // Ctrl+D — Duplicate selected block
            if (isCtrl && e.key === "d" && selectedBlockId) {
                e.preventDefault();
                duplicateBlock(selectedBlockId);
                return;
            }
            // Escape — Deselect
            if (e.key === "Escape") {
                setSelectedBlockId(null);
                return;
            }
            // Arrow Up — Move selected block up
            if (e.key === "ArrowUp" && isCtrl && selectedBlockId) {
                e.preventDefault();
                const idx = document.blocks.findIndex((b) => b.id === selectedBlockId);
                if (idx > 0) moveBlock(idx, idx - 1);
                return;
            }
            // Arrow Down — Move selected block down
            if (e.key === "ArrowDown" && isCtrl && selectedBlockId) {
                e.preventDefault();
                const idx = document.blocks.findIndex((b) => b.id === selectedBlockId);
                if (idx !== -1 && idx < document.blocks.length - 1) moveBlock(idx, idx + 2);
                return;
            }
            // P — Toggle preview
            if (e.key === "p" && isCtrl && e.shiftKey) {
                e.preventDefault();
                setViewMode((v) => v === "preview" ? "edit" : "preview");
                return;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [undo, redo, handleSave, deleteBlock, duplicateBlock, selectedBlockId, moveBlock, document.blocks]);

    return (
        <BuilderI18nContext.Provider value={t}>
        <ImageUploadContext.Provider value={onImageUpload}>
        <FileUploadContext.Provider value={onFileUpload ?? onImageUpload}>
        <UpdateBlockContext.Provider value={updateBlock}>
        <LockingContext.Provider value={canManageLocks}>
        <CustomBlocksContext.Provider value={customBlockMap}>
        <div className="email-builder">
        <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
            <div className="flex flex-col h-[calc(100vh-140px)]">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0">
                    <div className="flex items-center gap-2">
                        {onBack && (
                            <Button variant="ghost" size="sm" onClick={requestBack}>← {tr("emailBuilder.back", "Back")}</Button>
                        )}
                        <div className="flex items-center gap-1 border rounded-md p-0.5">
                            <Button
                                variant={viewMode === "edit" ? "default" : "ghost"}
                                size="sm"
                                className={cn("h-7 px-2 gap-1", viewMode === "edit" && "bg-primary")}
                                onClick={() => setViewMode("edit")}
                            >
                                <Pencil className="h-3 w-3" />
                                {tr("emailBuilder.edit", "Edit")}
                            </Button>
                            <Button
                                variant={viewMode === "preview" ? "default" : "ghost"}
                                size="sm"
                                className={cn("h-7 px-2 gap-1", viewMode === "preview" && "bg-primary")}
                                onClick={() => setViewMode("preview")}
                            >
                                <Eye className="h-3 w-3" />
                                {tr("emailBuilder.preview", "Preview")}
                            </Button>
                            <Button
                                variant={viewMode === "code" ? "default" : "ghost"}
                                size="sm"
                                className={cn("h-7 px-2 gap-1", viewMode === "code" && "bg-primary")}
                                onClick={() => setViewMode("code")}
                            >
                                <Code className="h-3 w-3" />
                                {tr("emailBuilder.html", "HTML")}
                            </Button>
                        </div>

                        {isMultiLocale && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-7 px-2 gap-1.5 ml-2" title={tr("emailBuilder.language", "Language")}>
                                        <Languages className="h-3.5 w-3.5" />
                                        <span className="text-xs font-medium">{activeLocaleLabel}</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-52 p-1">
                                    <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                        {tr("emailBuilder.language", "Language")}
                                    </p>
                                    {localeList.map((l) => (
                                        <LocaleMenuItem
                                            key={l.code}
                                            label={l.label}
                                            active={l.code === activeLocale}
                                            onSelect={() => switchLocale(l.code)}
                                        />
                                    ))}
                                </PopoverContent>
                            </Popover>
                        )}

                        {viewMode === "preview" && (
                            <div className="flex items-center gap-1 border rounded-md p-0.5 ml-2">
                                <Button
                                    variant={previewWidth === "desktop" ? "default" : "ghost"}
                                    size="icon"
                                    className={cn("h-7 w-7", previewWidth === "desktop" && "bg-primary")}
                                    onClick={() => setPreviewWidth("desktop")}
                                >
                                    <Monitor className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant={previewWidth === "mobile" ? "default" : "ghost"}
                                    size="icon"
                                    className={cn("h-7 w-7", previewWidth === "mobile" && "bg-primary")}
                                    onClick={() => setPreviewWidth("mobile")}
                                >
                                    <Smartphone className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={undo} disabled={!canUndo} title={tr("emailBuilder.undo", "Undo")}>
                            <Undo className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={redo} disabled={!canRedo} title={tr("emailBuilder.redo", "Redo")}>
                            <Redo className="h-3.5 w-3.5" />
                        </Button>
                        <div className="w-px h-5 bg-border mx-1" />
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" title={tr("emailBuilder.more", "More")}>
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                    {tr("emailBuilder.more", "More")}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-56 p-1">
                                {isMultiLocale && (
                                    <>
                                        <MoreMenuItem icon={<CopyPlus className="h-3.5 w-3.5" />} label={tr("emailBuilder.copyToAll", "Copy to all languages")} onClick={copyToAllLocales} />
                                        <div className="my-1 h-px bg-border" />
                                    </>
                                )}
                                <MoreMenuItem icon={<Copy className="h-3.5 w-3.5" />} label={tr("emailBuilder.copyDesign", "Copy design")} onClick={handleCopyDesign} />
                                <MoreMenuItem icon={<ClipboardPaste className="h-3.5 w-3.5" />} label={tr("emailBuilder.pasteDesign", "Paste design")} onClick={handlePasteDesign} />
                                <div className="my-1 h-px bg-border" />
                                <MoreMenuItem icon={<Upload className="h-3.5 w-3.5" />} label={tr("emailBuilder.importDesign", "Import design (JSON)")} onClick={handleImportJson} />
                                <MoreMenuItem icon={<Download className="h-3.5 w-3.5" />} label={tr("emailBuilder.exportDesign", "Export design (JSON)")} onClick={handleExportJson} />
                                <MoreMenuItem icon={<Code className="h-3.5 w-3.5" />} label={tr("emailBuilder.downloadHtml", "Download HTML")} onClick={handleExportHtml} />
                            </PopoverContent>
                        </Popover>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" title={tr("emailBuilder.validate", "Check for issues")}>
                                    <ShieldCheck className={cn("h-3.5 w-3.5", worstLevel === "warning" && "text-amber-500", worstLevel === "error" && "text-red-500", worstLevel === "ok" && "text-emerald-500")} />
                                    {tr("emailBuilder.check", "Check")}
                                    {validationIssues.length > 0 && (
                                        <span className={cn(
                                            "ml-0.5 inline-flex items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-white",
                                            worstLevel === "error" ? "bg-red-500" : worstLevel === "warning" ? "bg-amber-500" : "bg-muted-foreground",
                                        )}>
                                            {validationIssues.length}
                                        </span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-80 p-0">
                                <div className="px-3 py-2 border-b text-xs font-semibold">{tr("emailBuilder.validation", "Validation")}</div>
                                {validationIssues.length === 0 ? (
                                    <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
                                        <CircleCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                                        {tr("emailBuilder.noIssues", "No issues found — looks good to send.")}
                                    </div>
                                ) : (
                                    <div className="max-h-72 overflow-auto p-1">
                                        {validationIssues.map((issue, i) => {
                                            const LvlIcon = issue.level === "error" ? AlertOctagon : issue.level === "warning" ? AlertTriangle : Info;
                                            const color = issue.level === "error" ? "text-red-500" : issue.level === "warning" ? "text-amber-500" : "text-muted-foreground";
                                            return (
                                                <ValidateRow
                                                    key={i}
                                                    icon={<LvlIcon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", color)} />}
                                                    message={issue.message}
                                                    canSelect={!!issue.blockId}
                                                    onSelect={() => { if (issue.blockId) { setViewMode("edit"); setSelectedBlockId(issue.blockId); } }}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>
                        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={() => setSelectedBlockId(null)} title={tr("emailBuilder.settings", "Email settings")}>
                            <Settings className="h-3 w-3" />
                            {tr("emailBuilder.settingsShort", "Settings")}
                        </Button>
                        <div className="w-px h-5 bg-border mx-1" />
                        {isDirty && (
                            <span
                                className="flex items-center gap-1.5 text-[11px] text-muted-foreground mr-1"
                                title={tr("emailBuilder.unsavedChanges", "You have unsaved changes")}
                            >
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                {tr("emailBuilder.unsaved", "Unsaved")}
                            </span>
                        )}
                        <Button size="sm" className="h-7 bg-primary gap-1" onClick={handleSave}>
                            Save
                        </Button>
                    </div>
                </div>

                {/* Main content */}
                {viewMode === "edit" && (
                    <div className="flex flex-1 overflow-hidden">
                        {/* Left: Block sidebar */}
                        <div className="w-80 border-r bg-card shrink-0 overflow-hidden">
                            <BlockSidebar onAddBlock={(type) => addBlock(type)} />
                        </div>

                        {/* Center: Canvas */}
                        <Canvas
                            blocks={document.blocks}
                            settings={document.settings}
                            selectedBlockId={selectedBlockId}
                            onSelectBlock={setSelectedBlockId}
                            isDragging={isDragging}
                            shadow={canvasShadow}
                            onEditContent={(id, content) => updateBlock(id, { content } as Partial<EmailBlock>)}
                        />

                        {/* Right: block properties, or email settings when nothing is selected */}
                        <div className="w-80 border-l bg-card shrink-0 overflow-hidden">
                            {selectedBlock ? (
                                <PropertyPanel
                                    block={selectedBlock}
                                    onUpdate={updateBlock}
                                    onDelete={deleteBlock}
                                    onDuplicate={duplicateBlock}
                                    onToggleVisibility={toggleVisibility}
                                    onToggleLock={toggleLock}
                                    canManageLocks={canManageLocks}
                                    fieldGroups={fieldGroups}
                                />
                            ) : (
                                <EmailSettingsPanel settings={document.settings} onUpdate={updateSettings} cssClassSuggestions={cssClassSuggestions} />
                            )}
                        </div>
                    </div>
                )}

                {viewMode === "preview" && (
                    <div className="flex-1 overflow-auto bg-muted/50">
                        <div
                            className="mx-auto my-6 transition-all"
                            style={{
                                // Desktop preview matches the edit canvas width
                                // (Canvas uses settings.contentWidth) so the email
                                // doesn't shift/resize when toggling Edit↔Preview.
                                maxWidth: previewWidth === "mobile" ? "375px" : `${document.settings.contentWidth}px`,
                            }}
                        >
                            {/* Email client chrome */}
                            <div className="bg-card rounded-t-lg border border-b-0 shadow-sm">
                                <div className="flex items-center gap-2 px-4 py-3 border-b">
                                    <div className="flex gap-1.5">
                                        <div className="h-3 w-3 rounded-full bg-red-400" />
                                        <div className="h-3 w-3 rounded-full bg-yellow-400" />
                                        <div className="h-3 w-3 rounded-full bg-green-400" />
                                    </div>
                                    <span className="text-xs text-muted-foreground ml-2">Inbox — Preview</span>
                                </div>
                                <div className="px-4 py-3 space-y-1.5 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground w-12">From:</span>
                                        <span className="text-xs font-medium">Your Event &lt;noreply@example.com&gt;</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground w-12">To:</span>
                                        <span className="text-xs">recipient@example.com</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground w-12">Subject:</span>
                                        <span className="text-xs font-medium">
                                            {document.settings.subject || "Your Email Subject"}
                                            {document.settings.preheaderText && (
                                                <span className="font-normal text-muted-foreground"> — {document.settings.preheaderText}</span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="border rounded-b-lg overflow-hidden shadow-sm" style={{ backgroundColor: document.settings.backgroundColor }}>
                                {compiling && !compiledHtml ? (
                                    <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                                        Compiling preview…
                                    </div>
                                ) : (
                                    /* The real compiled email, rendered in an isolated iframe so its
                                       styles can't leak into (or inherit from) the app. `allow-same-origin`
                                       (without `allow-scripts`) keeps it script-free yet lets us measure
                                       the content height; remounting on width change re-measures. */
                                    <iframe
                                        key={previewWidth}
                                        title="Email preview"
                                        srcDoc={previewHtml}
                                        sandbox="allow-same-origin"
                                        className="block w-full bg-white"
                                        style={{ height: previewHeight, border: 0 }}
                                        onLoad={(e) => {
                                            const body = e.currentTarget.contentDocument?.body;
                                            if (body) setPreviewHeight(body.scrollHeight + 8);
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === "code" && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b bg-muted/40 text-[11px] text-muted-foreground shrink-0">
                            <span>
                                {htmlOverride !== null
                                    ? tr("emailBuilder.htmlEditedNotice", "Editing raw HTML — this overrides the blocks on save/export. Editing a block regenerates it.")
                                    : tr("emailBuilder.htmlEditableNotice", "Edit this HTML to override the exported output. Editing a block regenerates it.")}
                            </span>
                            {htmlOverride !== null && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-[11px] shrink-0"
                                    onClick={() => setHtmlOverride(null)}
                                >
                                    {tr("emailBuilder.regenerateFromBlocks", "Regenerate from blocks")}
                                </Button>
                            )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <CodeEditor
                                language="html"
                                value={htmlOverride !== null ? htmlOverride : (compiling ? "<!-- Compiling… -->" : compiledHtml)}
                                onChange={(v) => { setHtmlOverride(v); setIsDirty(true); }}
                                height="100%"
                                className="h-full overflow-hidden"
                                ariaLabel={tr("emailBuilder.codeView", "Email HTML")}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Floating preview of whatever is being dragged. */}
            <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
                {activeDrag ? <DragPreview kind={activeDrag.kind} label={activeDrag.label} /> : null}
            </DragOverlay>
        </DndContext>

        {/* Unsaved-changes confirmation when leaving via Back. */}
        <Dialog open={confirmLeaveOpen} onClose={() => setConfirmLeaveOpen(false)}>
            <h2 className="text-sm font-semibold">{tr("emailBuilder.unsavedTitle", "Unsaved changes")}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
                {tr("emailBuilder.unsavedBody", "You have unsaved changes. Save them before leaving?")}
            </p>
            <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirmLeaveOpen(false)}>
                    {tr("emailBuilder.cancel", "Cancel")}
                </Button>
                <Button variant="outline" size="sm" style={{ color: "#dc2626" }} onClick={leaveWithoutSaving}>
                    {tr("emailBuilder.leaveWithoutSaving", "Leave without saving")}
                </Button>
                <Button size="sm" className="bg-primary" onClick={saveAndLeave}>
                    {tr("emailBuilder.saveAndLeave", "Save & leave")}
                </Button>
            </div>
        </Dialog>
        </div>
        </CustomBlocksContext.Provider>
        </LockingContext.Provider>
        </UpdateBlockContext.Provider>
        </FileUploadContext.Provider>
        </ImageUploadContext.Provider>
        </BuilderI18nContext.Provider>
    );
}
