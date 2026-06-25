import { useState, useCallback, useMemo, useEffect, useRef } from "react";
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
import { Button, Tabs, TabsContent, TabsList, TabsTrigger, Popover, PopoverContent, PopoverTrigger } from "./ui/primitives";
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
    Keyboard,
    Move,
    Plus,
} from "lucide-react";
import { cn } from "./ui/utils";
import { useToast, useUnsavedChanges } from "./ui/hooks";
import { CodeEditor } from "./ui/CodeEditor";

import { EmailBlock, EmailDocument, EmailSettings, BlockType, ColumnsBlock, MergeFieldGroup, DEFAULT_SETTINGS, BLOCK_CATALOG } from "./types";

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
import { createBlock } from "./defaults";
import { Canvas } from "./components/Canvas";
import { BlockSidebar } from "./components/BlockSidebar";
import { PropertyPanel, EmailSettingsPanel } from "./components/PropertyPanel";
import { exportToJson, importFromJson, renderEmailHtml } from "./renderer/toHtml";
import { BuilderI18nContext, makeTr } from "./i18n";
import { ImageUploadContext, type ImageUploadFn } from "./upload";

interface EmailBuilderProps {
    /** Initial document to load */
    initialDocument?: EmailDocument;
    /** Called when document changes */
    onChange?: (doc: EmailDocument) => void;
    /** Called when user clicks save */
    onSave?: (doc: EmailDocument, html: string) => void;
    /** Called when user wants to go back */
    onBack?: () => void;
    /** Personalization tokens (e.g. from useTemplateFields) for the insert-field menu. */
    fieldGroups?: MergeFieldGroup[];
    /** Upload handler for image/logo/thumbnail fields. Receives the picked File, returns a hosted URL. Omit to keep fields URL-only. */
    onImageUpload?: ImageUploadFn;
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

export function EmailBuilder({ initialDocument, onChange, onSave, onBack, fieldGroups, previewSubstitute, onImageUpload, t }: EmailBuilderProps) {
    const { toast } = useToast();
    const tr = useMemo(() => makeTr(t), [t]);

    // Document state
    const [document, setDocument] = useState<EmailDocument>(
        initialDocument || { settings: { ...DEFAULT_SETTINGS }, blocks: [] }
    );
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"edit" | "preview" | "code">("edit");
    const [previewWidth, setPreviewWidth] = useState<"desktop" | "mobile">("desktop");
    const [isDirty, setIsDirty] = useState(false);
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

    const addBlock = useCallback((type: BlockType, index?: number) => {
        const block = createBlock(type);
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
    }, [updateDocument]);

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
        updateDocument((doc) => ({
            ...doc,
            blocks: mapBlocksDeep(doc.blocks, id, (b) => ({ ...b, ...updates } as EmailBlock)),
        }), true);
    }, [updateDocument, mapBlocksDeep]);

    const deleteBlock = useCallback((id: string) => {
        updateDocument((doc) => ({
            ...doc,
            blocks: mapBlocksDeep(doc.blocks, id, () => null),
        }));
        if (selectedBlockId === id) setSelectedBlockId(null);
    }, [updateDocument, selectedBlockId, mapBlocksDeep]);

    const duplicateBlock = useCallback((id: string) => {
        updateDocument((doc) => {
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
        updateDocument((doc) => ({
            ...doc,
            blocks: mapBlocksDeep(doc.blocks, id, (b) => ({ ...b, hidden: !b.hidden } as EmailBlock)),
        }));
    }, [updateDocument, mapBlocksDeep]);

    const moveBlock = useCallback((fromIndex: number, toIndex: number) => {
        updateDocument((doc) => {
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
            setActiveDrag({ kind: "catalog", label: item?.label ?? "block" });
        } else if (data?.type === "block-reorder") {
            const b = document.blocks[data.index as number];
            const label = b ? b.type.charAt(0).toUpperCase() + b.type.slice(1) : "block";
            setActiveDrag({ kind: "reorder", label });
        }
    }, [document.blocks]);

    const addBlockToColumn = useCallback((type: BlockType, parentBlockId: string, colIdx: number, index: number) => {
        const newBlock = createBlock(type);
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
            addBlock(activeData.blockType as BlockType, overData.index);
            return;
        }

        // Dragging from catalog into a column
        if (activeData?.type === "catalog" && overData?.type === "column-drop") {
            addBlockToColumn(
                activeData.blockType as BlockType,
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
        const html = await renderEmailHtml(document);
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement("a");
        a.href = url;
        a.download = "email.html";
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "HTML exported" });
    }, [document, toast]);

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

    const handleSave = useCallback(async () => {
        const html = await renderEmailHtml(document);
        onSave?.(document, html);
        setIsDirty(false);
        toast({ title: "Saved" });
    }, [document, onSave, toast]);

    // --- Computed ---

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
    useEffect(() => {
        if (viewMode !== "code" && viewMode !== "preview") return;
        let cancelled = false;
        setCompiling(true);
        renderEmailHtml(document)
            .then((html) => { if (!cancelled) setCompiledHtml(html); })
            .finally(() => { if (!cancelled) setCompiling(false); });
        return () => { cancelled = true; };
    }, [viewMode, document]);

    // The preview shows the *compiled* HTML with merge tags resolved to sample
    // values (when the host provides a substitutor) — true WYSIWYG. The token
    // form is preserved everywhere else (save/export/code view).
    const previewHtml = useMemo(
        () => (previewSubstitute ? previewSubstitute(compiledHtml) : compiledHtml),
        [compiledHtml, previewSubstitute],
    );

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
        <div className="email-builder">
        <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
            <div className="flex flex-col h-[calc(100vh-140px)]">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0">
                    <div className="flex items-center gap-2">
                        {onBack && (
                            <Button variant="ghost" size="sm" onClick={onBack}>← {tr("emailBuilder.back", "Back")}</Button>
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
                        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={handleImportJson}>
                            <Upload className="h-3 w-3" />
                            {tr("emailBuilder.import", "Import")}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={handleExportJson}>
                            <Copy className="h-3 w-3" />
                            {tr("emailBuilder.json", "JSON")}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={handleExportHtml}>
                            <Download className="h-3 w-3" />
                            {tr("emailBuilder.html", "HTML")}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={() => setSelectedBlockId(null)} title={tr("emailBuilder.settings", "Email settings")}>
                            <Settings className="h-3 w-3" />
                            {tr("emailBuilder.settingsShort", "Settings")}
                        </Button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" title={tr("emailBuilder.shortcuts", "Keyboard shortcuts")}>
                                    <Keyboard className="h-3.5 w-3.5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-64 p-3">
                                <h4 className="font-semibold text-sm mb-2">{tr("emailBuilder.shortcuts", "Keyboard shortcuts")}</h4>
                                <div className="space-y-1.5 text-xs">
                                    {[
                                        ["Ctrl+S", "Save"],
                                        ["Ctrl+Z", "Undo"],
                                        ["Ctrl+Shift+Z", "Redo"],
                                        ["Delete", "Delete block"],
                                        ["Ctrl+D", "Duplicate block"],
                                        ["Escape", "Deselect"],
                                        ["Ctrl+↑", "Move block up"],
                                        ["Ctrl+↓", "Move block down"],
                                        ["Ctrl+Shift+P", "Toggle preview"],
                                    ].map(([key, label]) => (
                                        <div key={key} className="flex items-center justify-between">
                                            <span className="text-muted-foreground">{label}</span>
                                            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">{key}</kbd>
                                        </div>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                        <div className="w-px h-5 bg-border mx-1" />
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
                                    fieldGroups={fieldGroups}
                                />
                            ) : (
                                <EmailSettingsPanel settings={document.settings} onUpdate={updateSettings} />
                            )}
                        </div>
                    </div>
                )}

                {viewMode === "preview" && (
                    <div className="flex-1 overflow-auto bg-muted/50">
                        <div
                            className="mx-auto my-6 transition-all"
                            style={{
                                maxWidth: previewWidth === "mobile" ? "375px" : `${Math.max(document.settings.contentWidth + 80, 700)}px`,
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
                                        <span className="text-xs font-medium">Your Event &lt;noreply@eventora.com&gt;</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground w-12">To:</span>
                                        <span className="text-xs">recipient@example.com</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground w-12">Subject:</span>
                                        <span className="text-xs font-medium">{document.settings.preheaderText || "Your Email Subject"}</span>
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
                    <div className="flex-1 overflow-hidden">
                        <CodeEditor
                            language="html"
                            readOnly
                            value={compiling ? "<!-- Compiling… -->" : compiledHtml}
                            height="100%"
                            className="h-full overflow-hidden"
                            ariaLabel={tr("emailBuilder.codeView", "Email HTML")}
                        />
                    </div>
                )}
            </div>

            {/* Floating preview of whatever is being dragged. */}
            <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
                {activeDrag ? <DragPreview kind={activeDrag.kind} label={activeDrag.label} /> : null}
            </DragOverlay>
        </DndContext>
        </div>
        </ImageUploadContext.Provider>
        </BuilderI18nContext.Provider>
    );
}
