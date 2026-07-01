// ============================================================
// Email Builder — output validator / linter
// ============================================================
// Checks an EmailDocument (and its rendered HTML) for common email pitfalls:
// Gmail's clipping limit, missing alt text, non-https links, low color
// contrast, empty CTAs, and leftover merge tags. Pure + dependency-free.

import { renderToHtml, type RenderOptions } from "./renderer/toHtml";
import type { EmailDocument, EmailBlock, ColumnsBlock, EmailSettings } from "./types";

export type ValidationLevel = "error" | "warning" | "info";

export interface ValidationIssue {
    /** `error` = will likely break; `warning` = deliverability/accessibility risk; `info` = heads-up. */
    level: ValidationLevel;
    /** Stable machine code, e.g. `image.missing-alt`. */
    code: string;
    /** Human-readable explanation. */
    message: string;
    /** The offending block's id, when the issue is block-scoped. */
    blockId?: string;
}

export interface ValidateOptions extends RenderOptions {
    /** Pre-rendered HTML (from `renderToHtml`). Omit to render it from `doc` internally. */
    html?: string;
}

/** Gmail clips messages larger than ~102 KB ("[Message clipped] View entire message"). */
const GMAIL_CLIP_BYTES = 102 * 1024;
/** WCAG AA minimum contrast for normal-size text. */
const MIN_CONTRAST = 4.5;

// --- color / contrast ---

function parseColor(c: string | undefined): [number, number, number] | null {
    const s = (c ?? "").trim().toLowerCase();
    if (!s || s === "transparent" || s === "none") return null;
    let m = /^#([0-9a-f]{3})$/.exec(s);
    if (m) return [0, 1, 2].map((i) => parseInt(m![1][i] + m![1][i], 16)) as [number, number, number];
    m = /^#([0-9a-f]{6})$/.exec(s);
    if (m) return [0, 2, 4].map((i) => parseInt(m![1].slice(i, i + 2), 16)) as [number, number, number];
    m = /^rgba?\(([^)]+)\)$/.exec(s);
    if (m) {
        const p = m[1].split(",").map((x) => parseFloat(x));
        if (p.length >= 3 && p.every((n) => !Number.isNaN(n))) return [p[0], p[1], p[2]];
    }
    return null;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
    const f = (v: number) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Contrast ratio (1–21) between two colors, or null if either can't be parsed. */
function contrastRatio(a: string | undefined, b: string | undefined): number | null {
    const ca = parseColor(a);
    const cb = parseColor(b);
    if (!ca || !cb) return null;
    const la = relativeLuminance(ca);
    const lb = relativeLuminance(cb);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const stripTags = (s: string) => s.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");

// --- per-block checks ---

function checkLink(href: string | undefined, requireTarget: boolean, blockId: string, out: ValidationIssue[]) {
    const h = (href ?? "").trim();
    if (!h || h === "#") {
        if (requireTarget) out.push({ level: "info", code: "link.empty", message: "Link points nowhere yet (href is empty or “#”).", blockId });
        return;
    }
    if (h.startsWith("{{")) return; // merge tag, resolved at send time
    if (!/^(https:\/\/|mailto:|tel:)/i.test(h)) {
        out.push({ level: "warning", code: "link.insecure", message: `Link “${h}” isn’t an absolute https:// URL — some clients block or rewrite it.`, blockId });
    }
}

function checkContrast(fg: string | undefined, bg: string | undefined, label: string, blockId: string, out: ValidationIssue[]) {
    const cr = contrastRatio(fg, bg);
    if (cr !== null && cr < MIN_CONTRAST) {
        out.push({ level: "warning", code: "contrast.low", message: `${label} contrast is ${cr.toFixed(1)}:1 — WCAG AA needs ${MIN_CONTRAST}:1.`, blockId });
    }
}

function checkBlock(b: EmailBlock, settings: EmailSettings, out: ValidationIssue[]) {
    // Effective background behind the block: its own, else the content background.
    const rowBg = b.backgroundColor && b.backgroundColor !== "transparent" ? b.backgroundColor : settings.contentBackgroundColor;

    switch (b.type) {
        case "image":
            if (b.src?.trim() && !b.alt?.trim()) out.push({ level: "warning", code: "image.missing-alt", message: "Image has no alt text — screen readers and blocked-image views show nothing.", blockId: b.id });
            if (!b.src?.trim()) out.push({ level: "info", code: "image.no-src", message: "Image block has no source set.", blockId: b.id });
            if (b.href?.trim()) checkLink(b.href, false, b.id, out);
            break;
        case "button":
            checkLink(b.href, true, b.id, out);
            checkContrast(b.color, b.backgroundColor, "Button text/background", b.id, out);
            if (!b.text?.trim()) out.push({ level: "info", code: "button.empty", message: "Button has no label.", blockId: b.id });
            break;
        case "file":
            checkLink(b.url, true, b.id, out);
            checkContrast(b.color, b.variant === "button" ? b.buttonColor : rowBg, "File link text/background", b.id, out);
            break;
        case "text":
        case "heading":
        case "footer":
        case "quote":
            checkContrast(b.color, rowBg, "Text/background", b.id, out);
            if ("content" in b && !stripTags(b.content).trim()) out.push({ level: "info", code: "content.empty", message: `${b.type[0].toUpperCase()}${b.type.slice(1)} block is empty.`, blockId: b.id });
            break;
        case "columns":
            (b as ColumnsBlock).columns.forEach((col) => col.blocks.forEach((cb) => checkBlock(cb, settings, out)));
            break;
    }
}

/**
 * Validate an email document against common client/deliverability/accessibility
 * pitfalls. Returns a flat list of issues (empty = all clear). Pass `html` to
 * validate specific rendered output, or `blocks` so custom blocks render for the
 * size check.
 */
export function validate(doc: EmailDocument, options?: ValidateOptions): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Block-level checks (skips hidden blocks — they aren't sent).
    for (const b of doc.blocks) {
        if (!b.hidden) checkBlock(b, doc.settings, issues);
    }

    // Document-level checks.
    if (!doc.settings.subject?.trim()) {
        issues.push({ level: "warning", code: "subject.missing", message: "No subject set — the email would send with an empty Subject line." });
    }

    // Rendered-HTML checks.
    const html = options?.html ?? renderToHtml(doc, options);
    const bytes = new TextEncoder().encode(html).length;
    if (bytes > GMAIL_CLIP_BYTES) {
        issues.push({ level: "warning", code: "size.gmail-clip", message: `Rendered HTML is ${(bytes / 1024).toFixed(0)} KB — Gmail clips messages over ~102 KB (“View entire message”). Trim content or inline less.` });
    }
    if (/\{\{\s*[\w.]+\s*\}\}/.test(html)) {
        issues.push({ level: "info", code: "token.unresolved", message: "Merge tags (e.g. {{first_name}}) are present — make sure your sender fills them per-recipient before sending." });
    }

    return issues;
}
