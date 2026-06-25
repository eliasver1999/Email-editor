import { useEffect, useRef, useState } from "react";
import { EmailBlock, Padding } from "../types";
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
} from "lucide-react";
import { cn } from "../ui/utils";
import { useTr } from "../i18n";

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
}: {
    value: string;
    editing: boolean;
    plainText?: boolean;
    /** Show list buttons in the toolbar (false for headings, where <ul> is invalid). */
    allowLists?: boolean;
    onCommit: (next: string) => void;
    style?: React.CSSProperties;
}) {
    const ref = useRef<HTMLDivElement>(null);
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
    const commit = (el: HTMLDivElement) => {
        const next = plainText ? el.textContent ?? "" : el.innerHTML;
        if (next !== value) onCommit(next);
    };

    // Rich (non-plainText) blocks get a formatting toolbar while focused. Its
    // buttons preventDefault on mousedown so the caret/selection stays here, so
    // they never fire this element's blur — only leaving the block does.
    return (
        <div style={{ position: "relative" }}>
            {editing && !plainText && focused && (
                <RichTextToolbar targetRef={ref} allowLists={allowLists} onChanged={() => ref.current && commit(ref.current)} />
            )}
            <div
                ref={ref}
                contentEditable={editing}
                suppressContentEditableWarning
                spellCheck={false}
                style={{ ...style, outline: "none", cursor: editing ? "text" : undefined }}
                onFocus={() => setFocused(true)}
                onInput={(e) => commit(e.currentTarget)}
                onBlur={(e) => { setFocused(false); commit(e.currentTarget); }}
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
    targetRef: React.RefObject<HTMLDivElement | null>;
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
    if (block.hidden) return null;

    // For button blocks, backgroundColor is the button color, not the wrapper bg
    const wrapperBg = block.type === "button"
        ? undefined
        : block.backgroundColor === "transparent" ? undefined : block.backgroundColor;

    const wrapperStyle: React.CSSProperties = {
        ...paddingStyle(block.padding),
        backgroundColor: wrapperBg,
        cursor: isEditing ? "pointer" : undefined,
        outline: isSelected ? "2px solid hsl(var(--primary))" : undefined,
        outlineOffset: "-1px",
        position: "relative",
    };

    return (
        <div style={wrapperStyle} onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
            {renderBlock(block, isEditing, onEditContent)}
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

        case "button":
            return (
                <div style={{ textAlign: block.align }}>
                    <a
                        href={isEditing ? undefined : block.href}
                        style={{
                            display: block.fullWidth ? "block" : "inline-block",
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

        case "logo":
            return (
                <div style={{ textAlign: block.align }}>
                    {block.src ? (
                        <a href={isEditing ? undefined : block.href || undefined}>
                            <img
                                src={block.src}
                                alt={block.alt}
                                style={{ width: `${block.width}px`, maxWidth: "100%", display: "inline-block" }}
                            />
                        </a>
                    ) : (
                        <div
                            style={{
                                width: `${block.width}px`,
                                height: "60px",
                                backgroundColor: "#f3f4f6",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "8px",
                                border: "2px dashed #d1d5db",
                                fontSize: "12px",
                                color: "#9ca3af",
                            }}
                        >
                            Your Logo
                        </div>
                    )}
                </div>
            );

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

        case "video":
            return (
                <div style={{ textAlign: block.align }}>
                    <a href={isEditing ? undefined : block.videoUrl || undefined} style={{ display: "inline-block", position: "relative" }}>
                        {block.thumbnailUrl ? (
                            <div style={{ position: "relative", display: "inline-block" }}>
                                <img
                                    src={block.thumbnailUrl}
                                    alt={block.alt}
                                    style={{ maxWidth: "100%", display: "block", borderRadius: "8px" }}
                                />
                                <div style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    width: "60px",
                                    height: "60px",
                                    backgroundColor: "rgba(0,0,0,0.7)",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}>
                                    <div style={{ width: 0, height: 0, borderTop: "12px solid transparent", borderBottom: "12px solid transparent", borderLeft: "20px solid white", marginLeft: "4px" }} />
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                width: "100%",
                                height: "200px",
                                backgroundColor: "#1a1a2e",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "8px",
                                gap: "8px",
                            }}>
                                <div style={{
                                    width: "50px",
                                    height: "50px",
                                    backgroundColor: "rgba(255,255,255,0.2)",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}>
                                    <div style={{ width: 0, height: 0, borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderLeft: "16px solid white", marginLeft: "3px" }} />
                                </div>
                                <span style={{ color: "#999", fontSize: "12px" }}>Video placeholder</span>
                            </div>
                        )}
                    </a>
                </div>
            );

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
        shadowRef.current.innerHTML = html;
    }, [html]);
    return <div ref={hostRef} />;
}
