import { useEffect, useRef } from "react";
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
} from "lucide-react";

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
    onCommit,
    style,
}: {
    value: string;
    editing: boolean;
    plainText?: boolean;
    onCommit: (next: string) => void;
    style?: React.CSSProperties;
}) {
    const ref = useRef<HTMLDivElement>(null);
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

    return (
        <div
            ref={ref}
            contentEditable={editing}
            suppressContentEditableWarning
            spellCheck={false}
            style={{ ...style, outline: "none", cursor: editing ? "text" : undefined }}
            onInput={(e) => commit(e.currentTarget)}
            onBlur={(e) => commit(e.currentTarget)}
        />
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
                        plainText
                        onCommit={(v) => onEditContent!(v)}
                        style={headingStyle}
                    />
                );
            }
            return (
                <Tag style={headingStyle}>
                    {block.content}
                </Tag>
            );
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

        case "html":
            return <div dangerouslySetInnerHTML={{ __html: block.content }} />;

        default:
            return <div>Unknown block</div>;
    }
}
