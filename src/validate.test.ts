import { describe, it, expect } from "vitest";
import { validate } from "./validate";
import { createTextBlock, createButtonBlock, createImageBlock } from "./defaults";
import { DEFAULT_SETTINGS } from "./types";
import type { EmailBlock, EmailDocument, EmailSettings } from "./types";

function doc(blocks: EmailBlock[], settings: Partial<EmailSettings> = {}): EmailDocument {
    return { settings: { ...DEFAULT_SETTINGS, subject: "Hello", ...settings }, blocks };
}
const codes = (issues: ReturnType<typeof validate>) => issues.map((i) => i.code);

describe("validate", () => {
    it("returns no issues for a clean document", () => {
        const d = doc([{ ...createTextBlock(), content: "<p>Hello there</p>" }]);
        expect(validate(d)).toHaveLength(0);
    });

    it("flags a missing subject", () => {
        expect(codes(validate(doc([createTextBlock()], { subject: "" })))).toContain("subject.missing");
    });

    it("flags an image without alt text", () => {
        const img = { ...createImageBlock(), src: "https://x/i.png", alt: "" };
        expect(codes(validate(doc([img])))).toContain("image.missing-alt");
    });

    it("flags a non-https link", () => {
        const btn = { ...createButtonBlock(), href: "http://insecure.example" };
        expect(codes(validate(doc([btn])))).toContain("link.insecure");
    });

    it("accepts https / merge-tag links", () => {
        expect(codes(validate(doc([{ ...createButtonBlock(), href: "https://ok.example" }])))).not.toContain("link.insecure");
        expect(codes(validate(doc([{ ...createButtonBlock(), href: "{{cta_url}}" }])))).not.toContain("link.insecure");
    });

    it("flags low text/background contrast", () => {
        const t = { ...createTextBlock(), content: "<p>hi</p>", color: "#dddddd" }; // on white content bg
        expect(codes(validate(doc([t])))).toContain("contrast.low");
    });

    it("flags leftover merge tags in the output", () => {
        const t = { ...createTextBlock(), content: "<p>Hi {{first_name}}</p>" };
        expect(codes(validate(doc([t])))).toContain("token.unresolved");
    });

    it("flags Gmail clipping for very large emails", () => {
        const big = { ...createTextBlock(), content: `<p>${"word ".repeat(30000)}</p>` };
        expect(codes(validate(doc([big])))).toContain("size.gmail-clip");
    });

    it("reports the offending block id", () => {
        const img = { ...createImageBlock(), id: "img-1", src: "https://x/i.png", alt: "" };
        const issue = validate(doc([img])).find((i) => i.code === "image.missing-alt");
        expect(issue?.blockId).toBe("img-1");
    });

    it("uses pre-rendered html when provided (no internal render)", () => {
        const issues = validate(doc([createTextBlock()]), { html: "<html><body>{{x}}</body></html>" });
        expect(codes(issues)).toContain("token.unresolved");
    });
});
