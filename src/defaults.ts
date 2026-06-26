import { nanoid } from "nanoid";
import {
    EmailBlock,
    TextBlock,
    HeadingBlock,
    ImageBlock,
    ButtonBlock,
    DividerBlock,
    SpacerBlock,
    ColumnsBlock,
    SocialBlock,
    HtmlBlock,
    LogoBlock,
    FooterBlock,
    QuoteBlock,
    BlockType,
    EmailDocument,
    DEFAULT_PADDING,
    DEFAULT_BORDER,
    DEFAULT_SETTINGS,
} from "./types";

// Factory functions to create blocks with defaults

export function createBlock(type: BlockType): EmailBlock {
    const factories: Record<BlockType, () => EmailBlock> = {
        text: createTextBlock,
        heading: createHeadingBlock,
        image: createImageBlock,
        button: createButtonBlock,
        divider: createDividerBlock,
        spacer: createSpacerBlock,
        columns: createColumnsBlock,
        social: createSocialBlock,
        html: createHtmlBlock,
        logo: createLogoBlock,
        footer: createFooterBlock,
        quote: createQuoteBlock,
    };
    return factories[type]();
}

/**
 * The starter layout shown when `<EmailBuilder>` mounts without an
 * `initialDocument` — a simple, editable skeleton (logo → headline → body →
 * call-to-action → divider → footer) so users don't face a blank canvas. Pass an
 * explicit document (even `{ settings, blocks: [] }`) to start blank instead.
 */
export function createStarterDocument(): EmailDocument {
    return {
        settings: { ...DEFAULT_SETTINGS },
        blocks: [
            createLogoBlock(),
            { ...createHeadingBlock(), content: "Your headline goes here" },
            { ...createTextBlock(), content: "<p>Write a short, friendly message to your readers here. You can format text, add links, images, buttons, and more.</p>" },
            createButtonBlock(),
            createDividerBlock(),
            createFooterBlock(),
        ],
    };
}

export function createTextBlock(): TextBlock {
    return {
        id: nanoid(8),
        type: "text",
        content: "<p>Type your text here...</p>",
        color: "#333333",
        fontSize: 14,
        fontFamily: "Arial, sans-serif",
        lineHeight: 1.6,
        textAlign: "left",
        padding: { ...DEFAULT_PADDING },
        backgroundColor: "transparent",
    };
}

export function createHeadingBlock(): HeadingBlock {
    return {
        id: nanoid(8),
        type: "heading",
        content: "Heading",
        level: 1,
        color: "#111111",
        fontFamily: "Arial, sans-serif",
        textAlign: "left",
        padding: { ...DEFAULT_PADDING, top: 20, bottom: 10 },
        backgroundColor: "transparent",
    };
}

export function createImageBlock(): ImageBlock {
    return {
        id: nanoid(8),
        type: "image",
        src: "",
        alt: "Image",
        href: "",
        width: "auto",
        align: "center",
        border: { ...DEFAULT_BORDER },
        padding: { ...DEFAULT_PADDING },
        backgroundColor: "transparent",
    };
}

export function createButtonBlock(): ButtonBlock {
    return {
        id: nanoid(8),
        type: "button",
        text: "Click Here",
        href: "#",
        color: "#ffffff",
        backgroundColor: "#22c55e",
        fontSize: 16,
        fontFamily: "Arial, sans-serif",
        borderRadius: 6,
        align: "center",
        width: "auto",
        padding: { top: 15, right: 20, bottom: 15, left: 20 },
    };
}

export function createDividerBlock(): DividerBlock {
    return {
        id: nanoid(8),
        type: "divider",
        color: "#e5e7eb",
        thickness: 1,
        style: "solid",
        width: 100,
        padding: { top: 10, right: 20, bottom: 10, left: 20 },
        backgroundColor: "transparent",
    };
}

export function createSpacerBlock(): SpacerBlock {
    return {
        id: nanoid(8),
        type: "spacer",
        height: 30,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        backgroundColor: "transparent",
    };
}

export function createColumnsBlock(): ColumnsBlock {
    return {
        id: nanoid(8),
        type: "columns",
        columns: [
            { width: 50, blocks: [] },
            { width: 50, blocks: [] },
        ],
        gap: 10,
        padding: { ...DEFAULT_PADDING },
        backgroundColor: "transparent",
    };
}

export function createSocialBlock(): SocialBlock {
    return {
        id: nanoid(8),
        type: "social",
        // Real placeholder URLs (not "#") so the icons actually render in the
        // preview/email out of the box — the renderers treat "#"/empty as
        // "not configured" and drop them. Users swap these for their own pages.
        links: [
            { platform: "facebook", url: "https://facebook.com" },
            { platform: "twitter", url: "https://twitter.com" },
            { platform: "instagram", url: "https://instagram.com" },
            { platform: "linkedin", url: "https://linkedin.com" },
        ],
        iconSize: 32,
        iconStyle: "color",
        align: "center",
        gap: 10,
        padding: { top: 15, right: 20, bottom: 15, left: 20 },
        backgroundColor: "transparent",
    };
}

export function createHtmlBlock(): HtmlBlock {
    return {
        id: nanoid(8),
        type: "html",
        content: "<!-- Custom HTML here -->",
        css: "",
        padding: { ...DEFAULT_PADDING },
        backgroundColor: "transparent",
    };
}

export function createLogoBlock(): LogoBlock {
    return {
        id: nanoid(8),
        type: "logo",
        src: "",
        alt: "Logo",
        href: "",
        width: 150,
        border: { ...DEFAULT_BORDER },
        align: "center",
        padding: { top: 20, right: 20, bottom: 20, left: 20 },
        backgroundColor: "transparent",
    };
}

export function createFooterBlock(): FooterBlock {
    return {
        id: nanoid(8),
        type: "footer",
        content: '<p style="margin:0;">© 2026 Your Company. All rights reserved.</p><p style="margin:4px 0 0;"><a href="#">Unsubscribe</a> · <a href="#">Privacy Policy</a></p>',
        color: "#999999",
        fontSize: 12,
        textAlign: "center",
        padding: { top: 20, right: 20, bottom: 20, left: 20 },
        backgroundColor: "#f9fafb",
    };
}

export function createQuoteBlock(): QuoteBlock {
    return {
        id: nanoid(8),
        type: "quote",
        content: "This is a great quote that adds credibility to your email.",
        author: "— Author Name",
        color: "#555555",
        borderColor: "#22c55e",
        fontSize: 16,
        fontStyle: "italic",
        textAlign: "left",
        padding: { top: 15, right: 20, bottom: 15, left: 20 },
        backgroundColor: "transparent",
    };
}
