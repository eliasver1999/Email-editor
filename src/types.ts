// ============================================================
// Email Builder — Block Type Definitions
// ============================================================

export type BlockType =
    | "text"
    | "image"
    | "button"
    | "divider"
    | "spacer"
    | "columns"
    | "social"
    | "heading"
    | "html"
    | "logo"
    | "footer"
    | "video"
    | "quote";

// --- Style primitives ---

export interface Padding {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface BorderStyle {
    width: number;
    style: "solid" | "dashed" | "dotted" | "none";
    color: string;
    radius: number;
}

// --- Base block ---

export interface BaseBlock {
    id: string;
    type: BlockType;
    /** Padding inside the block */
    padding: Padding;
    /** Background color */
    backgroundColor: string;
    /** Whether the block is hidden (still in tree, just not rendered) */
    hidden?: boolean;
}

// --- Concrete blocks ---

export interface TextBlock extends BaseBlock {
    type: "text";
    content: string; // HTML string
    color: string;
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    textAlign: "left" | "center" | "right";
}

export interface HeadingBlock extends BaseBlock {
    type: "heading";
    content: string;
    level: 1 | 2 | 3;
    color: string;
    fontFamily: string;
    textAlign: "left" | "center" | "right";
}

export interface ImageBlock extends BaseBlock {
    type: "image";
    src: string;
    alt: string;
    href: string;
    width: "auto" | number; // percentage or auto
    align: "left" | "center" | "right";
    border: BorderStyle;
}

export interface ButtonBlock extends BaseBlock {
    type: "button";
    text: string;
    href: string;
    color: string;
    backgroundColor: string;
    fontSize: number;
    fontFamily: string;
    borderRadius: number;
    align: "left" | "center" | "right";
    fullWidth: boolean;
}

export interface DividerBlock extends BaseBlock {
    type: "divider";
    color: string;
    thickness: number;
    style: "solid" | "dashed" | "dotted";
    width: number; // percentage
}

export interface SpacerBlock extends BaseBlock {
    type: "spacer";
    height: number;
}

export interface ColumnConfig {
    width: number; // percentage, e.g. 50
    blocks: EmailBlock[];
}

export interface ColumnsBlock extends BaseBlock {
    type: "columns";
    columns: ColumnConfig[];
    gap: number;
}

export interface SocialLink {
    platform: "facebook" | "twitter" | "instagram" | "linkedin" | "youtube" | "tiktok" | "website";
    url: string;
}

export interface SocialBlock extends BaseBlock {
    type: "social";
    links: SocialLink[];
    iconSize: number;
    iconStyle: "color" | "dark" | "light";
    align: "left" | "center" | "right";
    gap: number;
}

export interface HtmlBlock extends BaseBlock {
    type: "html";
    content: string; // raw HTML
    css: string; // raw CSS, emitted in a <style> tag (hoisted to the email <head> on export)
}

export interface LogoBlock extends BaseBlock {
    type: "logo";
    src: string;
    alt: string;
    href: string;
    width: number; // px
    border: BorderStyle;
    align: "left" | "center" | "right";
}

export interface FooterBlock extends BaseBlock {
    type: "footer";
    content: string; // HTML
    color: string;
    fontSize: number;
    textAlign: "left" | "center" | "right";
}

export interface VideoBlock extends BaseBlock {
    type: "video";
    thumbnailUrl: string;
    videoUrl: string;
    alt: string;
    align: "left" | "center" | "right";
}

export interface QuoteBlock extends BaseBlock {
    type: "quote";
    content: string;
    author: string;
    color: string;
    borderColor: string;
    fontSize: number;
    fontStyle: "italic" | "normal";
    textAlign: "left" | "center" | "right";
}

// --- Union type ---

export type EmailBlock =
    | TextBlock
    | HeadingBlock
    | ImageBlock
    | ButtonBlock
    | DividerBlock
    | SpacerBlock
    | ColumnsBlock
    | SocialBlock
    | HtmlBlock
    | LogoBlock
    | FooterBlock
    | VideoBlock
    | QuoteBlock;

/**
 * A third-party block. Same base shape as the built-ins, but `type` is an
 * arbitrary id and the rest of the data is open. Rendered via a custom
 * `BlockRenderer` passed to `renderToHtml(doc, { blocks })`.
 */
export interface CustomBlock {
    id: string;
    type: string;
    padding: Padding;
    backgroundColor: string;
    hidden?: boolean;
    [key: string]: unknown;
}

/** Any block the renderer accepts: a built-in or a custom one. */
export type AnyBlock = EmailBlock | CustomBlock;

// --- Email document ---

export interface EmailDocument {
    /** Document-level settings */
    settings: EmailSettings;
    /** Ordered list of top-level blocks */
    blocks: EmailBlock[];
}

export interface EmailSettings {
    /** Max width of the email body */
    contentWidth: number;
    /** Body background color (behind content) */
    backgroundColor: string;
    /** Content area background color */
    contentBackgroundColor: string;
    /** Default font family */
    fontFamily: string;
    /** Default text color */
    textColor: string;
    /** Default link color */
    linkColor: string;
    /** Preheader text (preview text in inbox) */
    preheaderText: string;
    /** Document-level custom CSS, injected into the email <head> (applies to the whole email) */
    customCss: string;
    /** Border around the content area (the email body). Width 0 / style "none" = no border. */
    contentBorder: BorderStyle;
}

// --- Personalization / merge tags ---

/** A group of insertable personalization tokens (e.g. `{{first_name}}`). */
export interface MergeFieldGroup {
    /** Display heading for the group (e.g. "Event", "Ticket"). */
    category: string;
    fields: { token: string; label: string }[];
}

// --- Editor state ---

export interface EmailBuilderState {
    document: EmailDocument;
    selectedBlockId: string | null;
    history: EmailDocument[];
    historyIndex: number;
    isDirty: boolean;
}

// --- Block catalog (for sidebar) ---

export interface BlockCatalogItem {
    type: BlockType;
    label: string;
    description: string;
    icon: string; // lucide icon name
    category: "content" | "layout" | "media" | "other";
}

export const BLOCK_CATALOG: BlockCatalogItem[] = [
    { type: "heading", label: "Heading", description: "Title or section header", icon: "Heading", category: "content" },
    { type: "text", label: "Text", description: "Paragraph of text", icon: "Type", category: "content" },
    { type: "image", label: "Image", description: "Image with optional link", icon: "Image", category: "media" },
    { type: "button", label: "Button", description: "Call-to-action button", icon: "MousePointerClick", category: "content" },
    { type: "divider", label: "Divider", description: "Horizontal line separator", icon: "Minus", category: "layout" },
    { type: "spacer", label: "Spacer", description: "Empty vertical space", icon: "MoveVertical", category: "layout" },
    { type: "columns", label: "Columns", description: "Multi-column layout", icon: "Columns3", category: "layout" },
    { type: "social", label: "Social Links", description: "Social media icons", icon: "Share2", category: "media" },
    { type: "logo", label: "Logo", description: "Brand logo with optional link", icon: "Crown", category: "media" },
    { type: "video", label: "Video", description: "Video thumbnail with play button", icon: "Play", category: "media" },
    { type: "quote", label: "Quote", description: "Blockquote with author", icon: "Quote", category: "content" },
    { type: "footer", label: "Footer", description: "Email footer with small text", icon: "PanelBottom", category: "layout" },
    { type: "html", label: "Custom HTML", description: "Raw HTML block", icon: "Code", category: "other" },
];

// --- Defaults ---

export const DEFAULT_PADDING: Padding = { top: 0, right: 0, bottom: 0, left: 0 };
export const DEFAULT_BORDER: BorderStyle = { width: 0, style: "solid", color: "#000000", radius: 0 };

export const DEFAULT_SETTINGS: EmailSettings = {
    contentWidth: 600,
    backgroundColor: "#f4f4f5",
    contentBackgroundColor: "#ffffff",
    fontFamily: "Arial, sans-serif",
    textColor: "#333333",
    linkColor: "#22c55e",
    preheaderText: "",
    customCss: "",
    contentBorder: { ...DEFAULT_BORDER },
};
