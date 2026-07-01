import { useEffect, useRef, useState } from "react";
import { EmailBlock, CustomBlock, Padding, resolveButtonWidth } from "../types";
import type { BlockDefinition } from "../renderer/toHtml";
import { EMAIL_BASE_RESET_CSS } from "../renderer/toHtml";
import {
    Type,
    Heading,
    Image,
    MousePointerClick,
    Minus,
    MoveVertical,
    Columns3,
    Share2,
    Code,
    Facebook,
    Twitter,
    Instagram,
    Linkedin,
    Youtube,
    Globe,
    Bold,
    Italic,
    Underline,
    Link,
    List,
    ListOrdered,
    RemoveFormatting,
    Upload,
    Loader2,
    Lock,
    FileDown,
} from "lucide-react";
import { cn } from "../ui/utils";
import { useTr } from "../i18n";
import { useImageUpload, useFileUpload } from "../upload";
import { useUpdateBlock, useCanManageLocks, useCustomBlocks } from "../editor-context";
import { toast } from "../ui/hooks";

function paddingStyle(p: Padding): React.CSSProperties {
    return { padding: `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px` };
}

/**
 * In-place editable content for the textual blocks. Kept uncontrolled while
 * focused — we seed the DOM from `value` via a ref only when the element isn't
 * focused, and commit on blur — so a parent re-render never resets the caret
 * mid-type. `plainText` commits `textContent` (headings/quotes); otherwise it
 * round-trips `innerHTML` (rich text / footer).
 */
function EditableContent({
    value,
    editing,
    plainText,
    allowLists = true,
    onCommit,
    style,
    as,
}: {
    value: string;
    editing: boolean;
    plainText?: boolean;
    /** Show list buttons in the toolbar (false for headings, where <ul> is invalid). */
    allowLists?: boolean;
    onCommit: (next: string) => void;
    style?: React.CSSProperties;
    /** Semantic tag to render (e.g. "h1") so the canvas matches the exported email and Custom CSS selectors apply. Defaults to "div". */
    as?: keyof React.JSX.IntrinsicElements;
}) {
    const ref = useRef<HTMLElement>(null);
    const [focused, setFocused] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el || document.activeElement === el) return;
        const current = plainText ? el.textContent ?? "" : el.innerHTML;
        if (current !== value) {
            if (plainText) el.textContent = value;
            else el.innerHTML = value;
        }
    }, [value, plainText]);

    // Commit on input as well as blur so a click straight to "Save" (which
    // blurs only after its own click handler) never drops the latest edit.
    const commit = (el: HTMLElement) => {
        const next = plainText ? el.textContent ?? "" : el.innerHTML;
        if (next !== value) onCommit(next);
    };

    const Tag = (as ?? "div") as React.ElementType;

    // Rich (non-plainText) blocks get a formatting toolbar while focused. Its
    // buttons preventDefault on mousedown so the caret/selection stays here, so
    // they never fire this element's blur — only leaving the block does.
    return (
        <div style={{ position: "relative" }}>
            {editing && !plainText && focused && (
                <RichTextToolbar targetRef={ref} allowLists={allowLists} onChanged={() => ref.current && commit(ref.current)} />
            )}
            <Tag
                ref={ref}
                contentEditable={editing}
                suppressContentEditableWarning
                spellCheck={false}
                style={{ ...style, outline: "none", cursor: editing ? "text" : undefined }}
                onFocus={() => setFocused(true)}
                onInput={(e: React.FormEvent<HTMLElement>) => commit(e.currentTarget)}
                onBlur={(e: React.FocusEvent<HTMLElement>) => { setFocused(false); commit(e.currentTarget); }}
            />
        </div>
    );
}

/** A single formatting button. preventDefault on mousedown keeps the editor's selection. */
function ToolbarButton({ label, active, onAction, children }: {
    label: string;
    active?: boolean;
    onAction: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onAction}
            className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground",
                active && "bg-accent text-accent-foreground"
            )}
        >
            {children}
        </button>
    );
}

/**
 * Floating WYSIWYG toolbar for the rich text/footer blocks. Drives the built-in
 * document.execCommand — deprecated but universally supported and dependency-free,
 * which fits this lib's no-heavy-editor philosophy. The committed innerHTML
 * (e.g. <b>, <i>, <a>, <ul>) is what the renderer ships to the email.
 */
function RichTextToolbar({ targetRef, onChanged, allowLists = true }: {
    targetRef: React.RefObject<HTMLElement | null>;
    onChanged: () => void;
    allowLists?: boolean;
}) {
    const tr = useTr();
    const [active, setActive] = useState({ bold: false, italic: false, underline: false });

    // Reflect the active inline styles at the caret (bold/italic/underline).
    useEffect(() => {
        const update = () => {
            try {
                setActive({
                    bold: document.queryCommandState("bold"),
                    italic: document.queryCommandState("italic"),
                    underline: document.queryCommandState("underline"),
                });
            } catch {
                /* queryCommandState can throw without an active editable selection */
            }
        };
        document.addEventListener("selectionchange", update);
        update();
        return () => document.removeEventListener("selectionchange", update);
    }, []);

    const exec = (command: string, value?: string) => {
        const el = targetRef.current;
        if (!el) return;
        el.focus();
        document.execCommand(command, false, value);
        onChanged();
    };

    const addLink = () => {
        const el = targetRef.current;
        if (!el) return;
        // window.prompt blurs the editor and may collapse the selection, so save
        // the range first and restore it before applying the link.
        const sel = window.getSelection();
        const saved = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
        const url = window.prompt(tr("emailBuilder.richText.linkPrompt", "Link URL"), "https://");
        if (!url) return;
        el.focus();
        if (saved && sel) {
            sel.removeAllRanges();
            sel.addRange(saved);
        }
        document.execCommand("createLink", false, url);
        onChanged();
    };

    // Float above the text, but flip below when there isn't room above (e.g. a
    // text block at the very top of the canvas, where "above" lands under the
    // editor's header bar). ~100px ≈ header + toolbar height.
    const el = targetRef.current;
    const placeBelow = !!el && el.getBoundingClientRect().top < 100;

    return (
        <div
            contentEditable={false}
            onMouseDown={(e) => e.preventDefault()}
            className="absolute left-0 z-50 flex items-center gap-0.5 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
            style={placeBelow ? { top: "calc(100% + 4px)" } : { bottom: "calc(100% + 4px)" }}
        >
            <ToolbarButton label={tr("emailBuilder.richText.bold", "Bold")} active={active.bold} onAction={() => exec("bold")}>
                <Bold className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton label={tr("emailBuilder.richText.italic", "Italic")} active={active.italic} onAction={() => exec("italic")}>
                <Italic className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton label={tr("emailBuilder.richText.underline", "Underline")} active={active.underline} onAction={() => exec("underline")}>
                <Underline className="h-3.5 w-3.5" />
            </ToolbarButton>
            <span className="mx-0.5 h-5 w-px bg-border" />
            <ToolbarButton label={tr("emailBuilder.richText.link", "Add link")} onAction={addLink}>
                <Link className="h-3.5 w-3.5" />
            </ToolbarButton>
            {allowLists && (
                <>
                    <ToolbarButton label={tr("emailBuilder.richText.bulletList", "Bulleted list")} onAction={() => exec("insertUnorderedList")}>
                        <List className="h-3.5 w-3.5" />
                    </ToolbarButton>
                    <ToolbarButton label={tr("emailBuilder.richText.numberedList", "Numbered list")} onAction={() => exec("insertOrderedList")}>
                        <ListOrdered className="h-3.5 w-3.5" />
                    </ToolbarButton>
                    <span className="mx-0.5 h-5 w-px bg-border" />
                </>
            )}
            <ToolbarButton label={tr("emailBuilder.richText.clear", "Clear formatting")} onAction={() => exec("removeFormat")}>
                <RemoveFormatting className="h-3.5 w-3.5" />
            </ToolbarButton>
        </div>
    );
}

interface BlockRendererProps {
    block: EmailBlock;
    isSelected?: boolean;
    onClick?: () => void;
    isEditing?: boolean;
    /** When provided (canvas edit mode), textual blocks become editable in place. */
    onEditContent?: (content: string) => void;
}

export function BlockRenderer({ block, isSelected, onClick, isEditing, onEditContent }: BlockRendererProps) {
    const canManageLocks = useCanManageLocks();
    const customBlocks = useCustomBlocks();
    if (block.hidden) return null;

    // For button blocks, backgroundColor is the button color, not the wrapper bg
    const wrapperBg = block.type === "button"
        ? undefined
        : block.backgroundColor === "transparent" ? undefined : block.backgroundColor;

    // Restricted editors can't edit locked blocks — no inline editing, no upload placeholder.
    const lockedReadonly = !!block.locked && !canManageLocks;
    const effectiveEditing = !!isEditing && !lockedReadonly;
    const customDef = customBlocks.get(block.type);

    const wrapperStyle: React.CSSProperties = {
        ...paddingStyle(block.padding),
        backgroundColor: wrapperBg,
        cursor: isEditing ? "pointer" : undefined,
        outline: isSelected ? "2px solid hsl(var(--primary))" : undefined,
        outlineOffset: "-1px",
        position: "relative",
    };

    return (
        <div
            className={cn("eb-block", `eb-block-${block.type}`, block.className)}
            style={wrapperStyle}
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        >
            {block.locked && isEditing && <LockBadge bg={block.backgroundColor} />}
            {customDef
                ? customDef.Canvas
                    ? <customDef.Canvas block={block as unknown as CustomBlock} editing={effectiveEditing} />
                    : <CustomBlockFallback def={customDef} />
                : renderBlock(block, effectiveEditing, effectiveEditing ? onEditContent : undefined)}
        </div>
    );
}

/** Canvas fallback when a custom block has no `Canvas` component. */
function CustomBlockFallback({ def }: { def: BlockDefinition }) {
    return (
        <div style={{ padding: "16px", border: "2px dashed #d1d5db", borderRadius: "8px", textAlign: "center", color: "#9ca3af", fontSize: "12px" }}>
            {def.label ?? def.type}
        </div>
    );
}

/** Pick a color (near-black or white) that contrasts with a background color. */
function contrastColor(bg?: string): string {
    const hex = bg && bg !== "transparent" ? bg.trim() : "#ffffff";
    const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
    if (!m) return "#111827";
    const n = parseInt(m[1], 16);
    const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return lum > 0.55 ? "#111827" : "#ffffff";
}

/**
 * Lock indicator on a locked block. Its colors derive from the block's background
 * so it stays visible regardless of the background — it can't be camouflaged by
 * changing colors (and a restricted editor can't change a locked block anyway).
 */
function LockBadge({ bg }: { bg?: string }) {
    const pill = contrastColor(bg); // contrasts with the block background
    const icon = contrastColor(pill); // contrasts with the pill
    return (
        <div
            title="Locked"
            style={{
                position: "absolute",
                top: 4,
                right: 4,
                zIndex: 20,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 20,
                height: 20,
                borderRadius: 9999,
                backgroundColor: pill,
                color: icon,
                pointerEvents: "none",
            }}
        >
            <Lock style={{ width: 12, height: 12 }} />
        </div>
    );
}

function renderBlock(
    block: EmailBlock,
    isEditing?: boolean,
    onEditContent?: (content: string) => void,
): React.ReactNode {
    const canEdit = !!isEditing && !!onEditContent;
    switch (block.type) {
        case "text": {
            const textStyle: React.CSSProperties = {
                color: block.color,
                fontSize: `${block.fontSize}px`,
                fontFamily: block.fontFamily,
                lineHeight: block.lineHeight,
                textAlign: block.textAlign,
            };
            if (canEdit) {
                return (
                    <EditableContent
                        value={block.content}
                        editing
                        onCommit={(v) => onEditContent!(v)}
                        style={textStyle}
                    />
                );
            }
            return <div style={textStyle} dangerouslySetInnerHTML={{ __html: block.content }} />;
        }

        case "heading": {
            const Tag = `h${block.level}` as any;
            const sizes = { 1: "28px", 2: "22px", 3: "18px" };
            const headingStyle: React.CSSProperties = {
                color: block.color,
                fontFamily: block.fontFamily,
                textAlign: block.textAlign,
                fontSize: sizes[block.level],
                fontWeight: "bold",
                margin: 0,
            };
            if (canEdit) {
                return (
                    <EditableContent
                        value={block.content}
                        editing
                        allowLists={false}
                        onCommit={(v) => onEditContent!(v)}
                        style={headingStyle}
                        as={Tag}
                    />
                );
            }
            return <Tag style={headingStyle} dangerouslySetInnerHTML={{ __html: block.content }} />;
        }

        case "image":
            return (
                <div style={{ textAlign: block.align }}>
                    {block.src ? (
                        <img
                            src={block.src}
                            alt={block.alt}
                            style={{
                                maxWidth: "100%",
                                width: block.width === "auto" ? "100%" : `${block.width}%`,
                                borderRadius: `${block.border.radius}px`,
                                border: block.border.width > 0 ? `${block.border.width}px ${block.border.style} ${block.border.color}` : undefined,
                                display: "inline-block",
                            }}
                        />
                    ) : isEditing ? (
                        <ImageUploadPlaceholder blockId={block.id} />
                    ) : (
                        <div
                            style={{
                                width: "100%",
                                height: "150px",
                                backgroundColor: "#f3f4f6",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "8px",
                                border: "2px dashed #d1d5db",
                            }}
                        >
                            <Image className="h-8 w-8 text-gray-400" />
                        </div>
                    )}
                </div>
            );

        case "button": {
            const btnWidth = resolveButtonWidth(block);
            return (
                <div style={{ textAlign: block.align }}>
                    <a
                        href={isEditing ? undefined : block.href}
                        style={{
                            display: "inline-block",
                            width: btnWidth === "auto" ? undefined : `${btnWidth}%`,
                            boxSizing: btnWidth === "auto" ? undefined : "border-box",
                            backgroundColor: block.backgroundColor,
                            color: block.color,
                            fontSize: `${block.fontSize}px`,
                            fontFamily: block.fontFamily,
                            borderRadius: `${block.borderRadius}px`,
                            padding: "12px 28px",
                            textDecoration: "none",
                            fontWeight: "bold",
                            textAlign: "center",
                            cursor: isEditing ? "pointer" : undefined,
                        }}
                    >
                        {block.text}
                    </a>
                </div>
            );
        }

        case "file": {
            const isButton = block.variant === "button";
            const linkStyle: React.CSSProperties = isButton
                ? {
                      display: "inline-block",
                      backgroundColor: block.buttonColor,
                      color: block.color,
                      fontSize: `${block.fontSize}px`,
                      borderRadius: `${block.borderRadius}px`,
                      padding: "12px 28px",
                      textDecoration: "none",
                      fontWeight: "bold",
                      cursor: isEditing ? "pointer" : undefined,
                  }
                : {
                      color: block.color,
                      fontSize: `${block.fontSize}px`,
                      textDecoration: "underline",
                      cursor: isEditing ? "pointer" : undefined,
                  };
            const label = (
                <>
                    {block.showIcon && <span aria-hidden>⬇️ </span>}
                    {block.label}
                </>
            );
            return (
                <div style={{ textAlign: block.align }}>
                    {block.url ? (
                        <a href={isEditing ? undefined : block.url} target="_blank" rel="noreferrer" style={linkStyle}>
                            {label}
                        </a>
                    ) : isEditing ? (
                        <FileUploadPlaceholder blockId={block.id} />
                    ) : (
                        <span style={linkStyle}>{label}</span>
                    )}
                </div>
            );
        }

        case "divider":
            return (
                <div style={{ textAlign: "center" }}>
                    <hr
                        style={{
                            border: "none",
                            borderTop: `${block.thickness}px ${block.style} ${block.color}`,
                            width: `${block.width}%`,
                            margin: "0 auto",
                        }}
                    />
                </div>
            );

        case "spacer":
            return <div style={{ height: `${block.height}px` }} />;

        case "columns":
            return (
                <div
                    style={{
                        display: "flex",
                        gap: `${block.gap}px`,
                    }}
                >
                    {block.columns.map((col, idx) => (
                        <div key={idx} style={{ width: `${col.width}%`, minWidth: 0 }}>
                            {col.blocks.map((childBlock) => (
                                <BlockRenderer key={childBlock.id} block={childBlock} isEditing={isEditing} />
                            ))}
                        </div>
                    ))}
                </div>
            );

        case "social": {
            const iconMap: Record<string, React.ComponentType<any>> = {
                facebook: Facebook,
                twitter: Twitter,
                instagram: Instagram,
                linkedin: Linkedin,
                youtube: Youtube,
                tiktok: Globe,
                website: Globe,
            };
            const colorMap: Record<string, string> = {
                facebook: "#1877F2",
                twitter: "#1DA1F2",
                instagram: "#E4405F",
                linkedin: "#0A66C2",
                youtube: "#FF0000",
                tiktok: "#000000",
                website: "#666666",
            };
            const visibleLinks = block.links.filter((link) => link.url && link.url !== "#" && link.url.trim() !== "");
            if (visibleLinks.length === 0 && !isEditing) return null;
            const linksToShow = isEditing ? block.links : visibleLinks;
            return (
                <div style={{ textAlign: block.align, display: "flex", justifyContent: block.align, gap: `${block.gap}px`, flexWrap: "wrap" }}>
                    {linksToShow.map((link, idx) => {
                        const Icon = iconMap[link.platform] || Globe;
                        const color = block.iconStyle === "color" ? colorMap[link.platform] : block.iconStyle === "dark" ? "#333" : "#fff";
                        const isEmpty = !link.url || link.url === "#" || link.url.trim() === "";
                        return (
                            <a
                                key={idx}
                                href={isEditing ? undefined : link.url}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: block.iconSize + 12,
                                    height: block.iconSize + 12,
                                    borderRadius: "50%",
                                    backgroundColor: block.iconStyle === "color" ? `${colorMap[link.platform]}15` : undefined,
                                    opacity: isEmpty && isEditing ? 0.3 : 1,
                                    transition: "opacity 0.2s",
                                }}
                            >
                                <Icon style={{ width: block.iconSize, height: block.iconSize, color }} />
                            </a>
                        );
                    })}
                </div>
            );
        }

        case "footer": {
            const footerStyle: React.CSSProperties = {
                color: block.color,
                fontSize: `${block.fontSize}px`,
                textAlign: block.textAlign,
                lineHeight: 1.5,
            };
            if (canEdit) {
                return (
                    <EditableContent
                        value={block.content}
                        editing
                        onCommit={(v) => onEditContent!(v)}
                        style={footerStyle}
                    />
                );
            }
            return <div style={footerStyle} dangerouslySetInnerHTML={{ __html: block.content }} />;
        }

        case "quote":
            return (
                <div style={{
                    borderLeft: `4px solid ${block.borderColor}`,
                    paddingLeft: "16px",
                    textAlign: block.textAlign,
                }}>
                    {canEdit ? (
                        <EditableContent
                            value={block.content}
                            editing
                            plainText
                            onCommit={(v) => onEditContent!(v)}
                            style={{
                                color: block.color,
                                fontSize: `${block.fontSize}px`,
                                fontStyle: block.fontStyle,
                                margin: "0 0 8px 0",
                                lineHeight: 1.6,
                            }}
                        />
                    ) : (
                        <p style={{
                            color: block.color,
                            fontSize: `${block.fontSize}px`,
                            fontStyle: block.fontStyle,
                            margin: "0 0 8px 0",
                            lineHeight: 1.6,
                        }}>
                            "{block.content}"
                        </p>
                    )}
                    {block.author && (
                        <p style={{ color: "#999", fontSize: `${block.fontSize - 2}px`, margin: 0 }}>
                            {block.author}
                        </p>
                    )}
                </div>
            );

        case "html": {
            const inner = (block.css && block.css.trim() ? `<style>${block.css}</style>` : "") + block.content;
            return <ShadowHtml html={inner} />;
        }

        default:
            return <div>Unknown block</div>;
    }
}

/**
 * Renders raw HTML (+ optional CSS) inside a shadow root so a Custom HTML block's
 * styles stay isolated — they can't leak into the editor chrome, and the editor's
 * styles can't override them. Mirrors how the exported email scopes nothing, but
 * keeps the live canvas safe to edit.
 */
function ShadowHtml({ html }: { html: string }) {
    const hostRef = useRef<HTMLDivElement>(null);
    const shadowRef = useRef<ShadowRoot | null>(null);
    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        if (!shadowRef.current) shadowRef.current = host.attachShadow({ mode: "open" });
        // Mirror the email's base reset (esp. table border-collapse) so the block
        // renders the same here as in the exported email / Preview.
        shadowRef.current.innerHTML = `<style>${EMAIL_BASE_RESET_CSS}</style>` + html;
    }, [html]);
    return <div ref={hostRef} />;
}

/**
 * Empty image-block placeholder shown while editing. When an `onImageUpload`
 * handler is available it offers an inline "Add image" button that opens the file
 * picker, uploads, and writes the returned URL back to the block.
 */
function ImageUploadPlaceholder({ blockId }: { blockId: string }) {
    const tr = useTr();
    const onImageUpload = useImageUpload();
    const updateBlock = useUpdateBlock();
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const handleFile = async (file: File | undefined) => {
        if (!file || !onImageUpload) return;
        setUploading(true);
        try {
            const url = await onImageUpload(file);
            if (url) updateBlock?.(blockId, { src: url });
        } catch (err) {
            toast({
                title: tr("emailBuilder.prop.uploadFailed", "Image upload failed"),
                description: err instanceof Error ? err.message : undefined,
                variant: "destructive",
            });
        } finally {
            setUploading(false);
        }
    };

    // Native file drag-and-drop (separate from dnd-kit's block reordering).
    const dropProps = onImageUpload
        ? {
              onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); },
              onDragLeave: () => setDragOver(false),
              onDrop: (e: React.DragEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOver(false);
                  const file = Array.from(e.dataTransfer?.files ?? []).find((f) => f.type.startsWith("image/"));
                  if (file) handleFile(file);
              },
          }
        : {};

    return (
        <div
            {...dropProps}
            style={{
                width: "100%",
                minHeight: "150px",
                backgroundColor: dragOver ? "hsl(var(--primary) / 0.08)" : "#f3f4f6",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                borderRadius: "8px",
                border: dragOver ? "2px dashed hsl(var(--primary))" : "2px dashed #d1d5db",
                padding: "16px",
            }}
        >
            <Image className="h-8 w-8 text-gray-400" />
            {onImageUpload && (
                <>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            handleFile(e.target.files?.[0]);
                            e.target.value = "";
                        }}
                    />
                    <button
                        type="button"
                        disabled={uploading}
                        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                    >
                        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        {tr("emailBuilder.prop.addImage", "Add image")}
                    </button>
                    <span className="text-[10px] text-muted-foreground">{tr("emailBuilder.prop.orDropImage", "or drop an image here")}</span>
                </>
            )}
        </div>
    );
}

/**
 * Empty File/Download-block placeholder. With an `onFileUpload` (or `onImageUpload`
 * fallback) handler it offers an inline "Upload file" button that opens the file
 * picker (any type), uploads, and writes the returned URL + filename to the block.
 */
function FileUploadPlaceholder({ blockId }: { blockId: string }) {
    const tr = useTr();
    const onFileUpload = useFileUpload();
    const updateBlock = useUpdateBlock();
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const handleFile = async (file: File | undefined) => {
        if (!file || !onFileUpload) return;
        setUploading(true);
        try {
            const url = await onFileUpload(file);
            // Default the visible label to the filename on first upload.
            if (url) updateBlock?.(blockId, { url, fileName: file.name, label: file.name });
        } catch (err) {
            toast({
                title: tr("emailBuilder.prop.fileUploadFailed", "File upload failed"),
                description: err instanceof Error ? err.message : undefined,
                variant: "destructive",
            });
        } finally {
            setUploading(false);
        }
    };

    const dropProps = onFileUpload
        ? {
              onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); },
              onDragLeave: () => setDragOver(false),
              onDrop: (e: React.DragEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOver(false);
                  handleFile(Array.from(e.dataTransfer?.files ?? [])[0]);
              },
          }
        : {};

    return (
        <div
            {...dropProps}
            style={{
                width: "100%",
                minHeight: "120px",
                backgroundColor: dragOver ? "hsl(var(--primary) / 0.08)" : "#f3f4f6",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                borderRadius: "8px",
                border: dragOver ? "2px dashed hsl(var(--primary))" : "2px dashed #d1d5db",
                padding: "16px",
            }}
        >
            <FileDown className="h-7 w-7 text-gray-400" />
            {onFileUpload ? (
                <>
                    <input
                        ref={inputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                            handleFile(e.target.files?.[0]);
                            e.target.value = "";
                        }}
                    />
                    <button
                        type="button"
                        disabled={uploading}
                        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                    >
                        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        {tr("emailBuilder.prop.uploadFile", "Upload file")}
                    </button>
                    <span className="text-[10px] text-muted-foreground">{tr("emailBuilder.prop.orDropFile", "or drop a file here")}</span>
                </>
            ) : (
                <span className="text-[10px] text-muted-foreground">{tr("emailBuilder.prop.setFileUrl", "Set a file URL in the panel")}</span>
            )}
        </div>
    );
}
