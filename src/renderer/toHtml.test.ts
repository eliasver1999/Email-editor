import { describe, it, expect } from "vitest";
import { renderToHtml, defineBlock } from "./toHtml";
import {
    createBlock,
    createHeadingBlock,
    createTextBlock,
    createButtonBlock,
    createImageBlock,
    createHtmlBlock,
    createStarterDocument,
} from "../defaults";
import { DEFAULT_SETTINGS, BLOCK_CATALOG } from "../types";
import type { EmailBlock, EmailDocument, EmailSettings, CustomBlock, AnyBlock } from "../types";

const PAD = { top: 0, right: 0, bottom: 0, left: 0 };

function makeDoc(blocks: EmailBlock[], settings: Partial<EmailSettings> = {}): EmailDocument {
    return { settings: { ...DEFAULT_SETTINGS, ...settings }, blocks };
}

describe("renderToHtml", () => {
    it("renders a full document (kitchen sink) — snapshot", () => {
        const blocks: EmailBlock[] = [
            createBlock("heading"),
            createBlock("text"),
            createBlock("button"),
            createBlock("divider"),
            createBlock("spacer"),
            createBlock("quote"),
            createBlock("footer"),
        ];
        expect(renderToHtml(makeDoc(blocks))).toMatchSnapshot();
    });

    it("emits a valid, email-safe document skeleton", () => {
        const html = renderToHtml(makeDoc([createBlock("text")]));
        expect(html).toContain("<!DOCTYPE html>");
        expect(html).toContain('role="presentation"'); // layout tables, not data tables
        expect(html).toMatch(/<body[^>]*>/);
    });

    it("createStarterDocument yields a non-empty, renderable starter layout", () => {
        const doc = createStarterDocument();
        expect(doc.blocks.length).toBeGreaterThan(0);
        const html = renderToHtml(doc);
        expect(html).toContain("<!DOCTYPE html>");
        expect(html).toContain("Your headline goes here");
    });

    describe("button width", () => {
        // Assertions match the exact `widthAttr` prefix on the button's <a> so they
        // can't be satisfied by the container table (which also has `width:100%;`).
        it("defaults to auto — content-sized inline-block, no width on the button", () => {
            const html = renderToHtml(makeDoc([createButtonBlock()]));
            expect(html).toContain("display:inline-block;background-color:");
            expect(html).not.toContain("display:inline-block;width:");
        });

        it("renders a percentage width when set", () => {
            const html = renderToHtml(makeDoc([{ ...createButtonBlock(), width: 50 }]));
            expect(html).toContain("display:inline-block;width:50%;box-sizing:border-box;");
        });

        it("treats width:100 as full width", () => {
            const html = renderToHtml(makeDoc([{ ...createButtonBlock(), width: 100 }]));
            expect(html).toContain("display:inline-block;width:100%;box-sizing:border-box;");
        });

        it("honors the legacy `fullWidth` flag on pre-0.3 documents (no `width`)", () => {
            const legacy = { ...createButtonBlock(), fullWidth: true } as Record<string, unknown>;
            delete legacy.width;
            const html = renderToHtml(makeDoc([legacy as unknown as EmailBlock]));
            expect(html).toContain("display:inline-block;width:100%;box-sizing:border-box;");
        });

        it("keeps the row transparent so the button color doesn't bleed full-width (canvas parity)", () => {
            const html = renderToHtml(makeDoc([createButtonBlock()])); // backgroundColor #22c55e
            expect(html).not.toContain("padding:15px 20px 15px 20px;background-color:"); // row <td> has no bg
            expect(html).toContain("background-color:#22c55e"); // ...but the <a> button is still green
        });
    });

    describe("responsive", () => {
        it("includes the mobile media query, fluid container, and column-stacking classes", () => {
            const html = renderToHtml(makeDoc([createBlock("columns")]));
            expect(html).toContain("@media only screen and (max-width: 600px)");
            expect(html).toContain('class="eb-container"');
            expect(html).toContain("eb-col");
            expect(html).toContain("eb-col-last"); // last column drops the inter-column gap
        });
    });

    describe("custom CSS hoisting", () => {
        it("hoists document CSS and block CSS into <head>, document first", () => {
            const htmlBlock = { ...createHtmlBlock(), css: ".block-css{color:red}", content: "<p>x</p>" };
            const html = renderToHtml(makeDoc([htmlBlock], { customCss: ".doc-css{color:blue}" }));
            const headEnd = html.indexOf("</head>");
            const docIdx = html.indexOf(".doc-css{color:blue}");
            const blockIdx = html.indexOf(".block-css{color:red}");

            expect(docIdx).toBeGreaterThan(-1);
            expect(blockIdx).toBeGreaterThan(-1);
            expect(docIdx).toBeLessThan(headEnd); // in <head>
            expect(blockIdx).toBeLessThan(headEnd);
            expect(docIdx).toBeLessThan(blockIdx); // document CSS comes first
        });

        it("does not emit a custom-CSS section when there is none", () => {
            const html = renderToHtml(makeDoc([createBlock("text")]));
            expect(html).not.toContain("Custom CSS");
        });
    });

    describe("escaping vs. rich text", () => {
        it("escapes attribute/text fields that are not rich (button text, image alt)", () => {
            const btn = { ...createButtonBlock(), text: '<script>alert("x")</script>' };
            const img = { ...createImageBlock(), src: "https://e.com/a.png", alt: 'a "b" c' };
            const html = renderToHtml(makeDoc([btn, img]));
            expect(html).toContain("&lt;script&gt;");
            expect(html).not.toContain('<script>alert');
            expect(html).toContain('alt="a &quot;b&quot; c"');
        });

        it("emits heading and text content as raw HTML (rich-text blocks)", () => {
            const heading = { ...createHeadingBlock(), content: "Hi <b>bold</b>" };
            const text = { ...createTextBlock(), content: '<a href="https://e.com">link</a>' };
            const html = renderToHtml(makeDoc([heading, text]));
            expect(html).toContain("Hi <b>bold</b>");
            expect(html).toContain('<a href="https://e.com">link</a>');
        });
    });

    describe("sanitization", () => {
        it("strips <script> from rich content", () => {
            const text = { ...createTextBlock(), content: "Hi<script>alert(1)</script> there" };
            const html = renderToHtml(makeDoc([text]));
            expect(html).not.toContain("<script>");
            expect(html).not.toContain("alert(1)");
            expect(html).toContain("Hi");
            expect(html).toContain("there");
        });

        it("strips inline event handlers", () => {
            const text = { ...createTextBlock(), content: '<img src="x" onerror="alert(1)">' };
            const html = renderToHtml(makeDoc([text]));
            expect(html).not.toMatch(/onerror/i);
        });

        it("neutralizes javascript: links", () => {
            const text = { ...createTextBlock(), content: '<a href="javascript:alert(1)">x</a>' };
            const html = renderToHtml(makeDoc([text]));
            expect(html).not.toContain("javascript:");
        });

        it("strips <iframe> from the custom HTML block", () => {
            const block = { ...createHtmlBlock(), content: '<iframe src="https://evil.test"></iframe><p>ok</p>' };
            const html = renderToHtml(makeDoc([block]));
            expect(html).not.toContain("<iframe");
            expect(html).toContain("<p>ok</p>");
        });

        it("prevents </style> breakout from custom CSS", () => {
            const html = renderToHtml(makeDoc([createBlock("text")], { customCss: ".x{}</style><script>alert(1)</script>" }));
            expect(html).not.toContain("</style><script>");
            expect(html).not.toContain("<script>alert(1)");
        });

        it("keeps safe formatting markup", () => {
            const text = { ...createTextBlock(), content: '<b>x</b> <a href="https://ok.test">y</a> <ul><li>z</li></ul>' };
            const html = renderToHtml(makeDoc([text]));
            expect(html).toContain("<b>x</b>");
            expect(html).toContain('href="https://ok.test"');
            expect(html).toContain("<li>z</li>");
        });
    });

    describe("visibility", () => {
        it("omits blocks marked hidden", () => {
            const visible = { ...createHeadingBlock(), content: "VISIBLE_CONTENT" };
            const hidden = { ...createHeadingBlock(), content: "HIDDEN_CONTENT", hidden: true };
            const html = renderToHtml(makeDoc([visible, hidden]));
            expect(html).toContain("VISIBLE_CONTENT");
            expect(html).not.toContain("HIDDEN_CONTENT");
        });
    });

    describe("settings", () => {
        it("applies content width and preheader text", () => {
            const html = renderToHtml(
                makeDoc([createBlock("text")], { contentWidth: 480, preheaderText: "Inbox preview line" })
            );
            expect(html).toContain("max-width:480px");
            expect(html).toContain("Inbox preview line");
        });
    });

    describe("custom block renderers", () => {
        interface ProductCardBlock extends CustomBlock {
            type: "product-card";
            title: string;
        }

        it("renders a registered custom block via renderToHtml options", () => {
            const productCard = defineBlock<ProductCardBlock>({
                type: "product-card",
                toHtml: (block, ctx) => ctx.wrapRow(`<div class="pc">${ctx.escapeHtml(block.title)}</div>`),
            });
            const blocks: AnyBlock[] = [
                { id: "p1", type: "product-card", title: "Hats & Co", padding: PAD, backgroundColor: "transparent" } as ProductCardBlock,
            ];
            const html = renderToHtml({ settings: DEFAULT_SETTINGS, blocks }, { blocks: [productCard] });
            expect(html).toContain('<div class="pc">Hats &amp; Co</div>'); // escaped + rendered via wrapRow
        });

        it("skips blocks whose type has no registered renderer", () => {
            const blocks: AnyBlock[] = [{ id: "x", type: "totally-unknown", padding: PAD, backgroundColor: "transparent" }];
            const html = renderToHtml({ settings: DEFAULT_SETTINGS, blocks });
            expect(html).toContain("<!DOCTYPE html>");
            expect(html).not.toContain("totally-unknown");
        });

        it("lets a custom renderer override a built-in type", () => {
            const override = defineBlock({ type: "text", toHtml: () => "<tr><td>OVERRIDDEN</td></tr>" });
            const doc = { settings: DEFAULT_SETTINGS, blocks: [{ ...createTextBlock(), content: "original-text" }] };
            const html = renderToHtml(doc, { blocks: [override] });
            expect(html).toContain("OVERRIDDEN");
            expect(html).not.toContain("original-text");
        });
    });

    it("renders every catalog block type without throwing", () => {
        for (const entry of BLOCK_CATALOG) {
            const html = renderToHtml(makeDoc([createBlock(entry.type)]));
            expect(typeof html).toBe("string");
            expect(html).toContain("<!DOCTYPE html>");
        }
    });
});
