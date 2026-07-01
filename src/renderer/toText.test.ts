import { describe, it, expect } from "vitest";
import { renderToText } from "./toText";
import { createBlock, createTextBlock, createButtonBlock, createHeadingBlock } from "../defaults";
import { defineBlock } from "./toHtml";
import type { EmailBlock } from "../types";

const doc = (blocks: EmailBlock[]) => ({ blocks });

describe("renderToText", () => {
    it("renders heading + text as plain text (no tags)", () => {
        const t = renderToText(doc([
            { ...createHeadingBlock(), content: "Welcome" },
            { ...createTextBlock(), content: "<p>Hello <b>world</b></p>" },
        ]));
        expect(t).toContain("Welcome");
        expect(t).toContain("Hello world");
        expect(t).not.toContain("<");
    });

    it("renders links as text (url)", () => {
        const t = renderToText(doc([{ ...createTextBlock(), content: '<p>See <a href="https://x.io">our site</a>.</p>' }]));
        expect(t).toContain("our site (https://x.io)");
    });

    it("renders a button as label: url", () => {
        const t = renderToText(doc([{ ...createButtonBlock(), text: "Buy now", href: "https://shop.io" }]));
        expect(t).toContain("Buy now: https://shop.io");
    });

    it("renders a divider and preserves merge tags", () => {
        const t = renderToText(doc([
            { ...createTextBlock(), content: "<p>Hi {{first_name}}</p>" },
            createBlock("divider"),
        ]));
        expect(t).toContain("{{first_name}}");
        expect(t).toMatch(/-{5,}/);
    });

    it("decodes entities and bullet lists", () => {
        const t = renderToText(doc([{ ...createTextBlock(), content: "<ul><li>A &amp; B</li><li>C</li></ul>" }]));
        expect(t).toContain("- A & B");
        expect(t).toContain("- C");
    });

    it("skips hidden blocks", () => {
        const t = renderToText(doc([
            { ...createTextBlock(), content: "<p>shown</p>" },
            { ...createTextBlock(), content: "<p>secret</p>", hidden: true },
        ]));
        expect(t).toContain("shown");
        expect(t).not.toContain("secret");
    });

    it("renders a quote with its author", () => {
        const q = { ...createBlock("quote"), content: "<p>Great tool</p>", author: "Jane" } as EmailBlock;
        const t = renderToText(doc([q]));
        expect(t).toContain('"Great tool"');
        expect(t).toContain("— Jane");
    });

    it("uses a custom block's toText when provided", () => {
        const callout = defineBlock({
            type: "callout",
            toHtml: (b, ctx) => ctx.wrapRow(String((b as { text?: string }).text ?? "")),
            toText: (b) => `NOTE: ${(b as { text?: string }).text ?? ""}`,
        });
        const block = { id: "c1", type: "callout", text: "Heads up", padding: { top: 0, right: 0, bottom: 0, left: 0 }, backgroundColor: "transparent" } as unknown as EmailBlock;
        expect(renderToText(doc([block]), { blocks: [callout] })).toContain("NOTE: Heads up");
    });

    it("returns an empty string for an empty document", () => {
        expect(renderToText(doc([]))).toBe("");
    });
});
