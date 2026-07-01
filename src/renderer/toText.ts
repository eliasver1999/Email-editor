// ============================================================
// Email Builder — plain-text renderer
// ============================================================
// Produces a readable text/plain alternative for the multipart email (better
// deliverability + accessibility than HTML alone). Pure + dependency-free.

import type { EmailDocument, EmailBlock, ColumnsBlock } from "../types";
import type { BlockDefinition } from "./toHtml";

export interface RenderTextOptions {
    /** Custom block definitions; a definition's optional `toText` renders that block (others are skipped). */
    blocks?: BlockDefinition[];
}

const stripTags = (s: string) => s.replace(/<[^>]+>/g, "");

function decodeEntities(s: string): string {
    return s
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#0*39;|&apos;/gi, "'")
        .replace(/&#(\d+);/g, (_m, n) => codePoint(parseInt(n, 10)))
        .replace(/&#x([0-9a-f]+);/gi, (_m, n) => codePoint(parseInt(n, 16)));
}
const codePoint = (n: number) => (Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "");

/** Convert the rich HTML the editor produces (p/br/a/ul/li/b/i/…) to readable plain text. */
function htmlToText(html: string): string {
    let s = html;
    s = s.replace(/<br\s*\/?>/gi, "\n");
    // <a href="url">text</a> → "text (url)" (drop the URL when it's empty, "#", or equal to the text)
    s = s.replace(/<a\b[^>]*\bhref=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, inner: string) => {
        const text = stripTags(inner).trim();
        const url = href.trim();
        if (!url || url === "#" || url === text) return text;
        return `${text} (${url})`;
    });
    s = s.replace(/<li\b[^>]*>/gi, "\n- ").replace(/<\/li>/gi, "");
    s = s.replace(/<\/(p|div|h[1-6]|ul|ol|blockquote)>/gi, "\n\n");
    s = stripTags(s);
    s = decodeEntities(s);
    return s
        .replace(/[ \t]+/g, " ")
        .split("\n").map((l) => l.trim()).join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** A `text (url)` / `text: url` style line for CTAs, or null when there's nothing to show. */
function linkLine(label: string | undefined, href: string | undefined): string | null {
    const t = (label ?? "").trim();
    const h = (href ?? "").trim();
    if (!t && (!h || h === "#")) return null;
    if (!h || h === "#") return t || null;
    return t ? `${t}: ${h}` : h;
}

function builtinText(b: EmailBlock, resolve: (b: EmailBlock) => string | null): string | null {
    switch (b.type) {
        case "heading":
        case "text":
        case "footer":
        case "html":
            return htmlToText(b.content) || null;
        case "quote": {
            const q = htmlToText(b.content);
            // Author may already include a leading dash (the default is "— Author Name").
            const author = b.author?.trim().replace(/^[—–-]\s*/, "");
            if (!q && !author) return null;
            return author ? `"${q}"\n— ${author}` : `"${q}"`;
        }
        case "button":
            return linkLine(b.text, b.href);
        case "file":
            return linkLine(b.label, b.url);
        case "image": {
            const alt = b.alt?.trim();
            if (!alt) return null;
            const href = b.href?.trim();
            return href && href !== "#" ? `${alt} (${href})` : `[${alt}]`;
        }
        case "social": {
            const lines = b.links.filter((l) => l.url?.trim() && l.url.trim() !== "#").map((l) => `${cap(l.platform)}: ${l.url.trim()}`);
            return lines.length ? lines.join("\n") : null;
        }
        case "divider":
            return "----------------------------------------";
        case "spacer":
            return null;
        case "columns":
            return (b as ColumnsBlock).columns
                .flatMap((c) => c.blocks.filter((cb) => !cb.hidden).map(resolve))
                .filter((t): t is string => !!t && t.trim().length > 0)
                .join("\n\n") || null;
        default:
            return null;
    }
}

/**
 * Render an email document to a plain-text alternative (for the multipart
 * `text/plain` part). Built-in blocks are converted to readable text; custom
 * blocks render via their optional `toText` (see `defineBlock`) and are skipped
 * otherwise. Hidden blocks are excluded; merge tags are left intact.
 */
export function renderToText(doc: { blocks: EmailBlock[] } | EmailDocument, options?: RenderTextOptions): string {
    const custom = new Map<string, (b: EmailBlock) => string>();
    for (const d of options?.blocks ?? []) {
        if (d.toText) custom.set(d.type, d.toText as unknown as (b: EmailBlock) => string);
    }

    const resolve = (b: EmailBlock): string | null => {
        if (b.hidden) return null;
        const ct = custom.get(b.type);
        return ct ? ct(b) : builtinText(b, resolve);
    };

    const parts = doc.blocks
        .map(resolve)
        .filter((t): t is string => !!t && t.trim().length > 0)
        .map((t) => t.trim());

    const body = parts.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
    return body ? `${body}\n` : "";
}
