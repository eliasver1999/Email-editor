import { useState, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { EmailBuilder, EmailBuilderToaster, defineBlock, type EmailDocument, type CustomBlock } from "../src";
import "../src/styles.css";

// Demo custom block (Phase 2): appears in the sidebar, renders on the canvas,
// edits in the property panel, and exports via toHtml.
interface CalloutBlock extends CustomBlock {
    type: "callout";
    text: string;
}

const calloutBlock = defineBlock<CalloutBlock>({
    type: "callout",
    label: "Callout",
    description: "Highlighted message box",
    category: "content",
    create: () => ({
        id: "",
        type: "callout",
        text: "Important note for your readers.",
        padding: { top: 12, right: 16, bottom: 12, left: 16 },
        backgroundColor: "transparent",
    }),
    Canvas: ({ block }) => (
        <div style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: 8, padding: 12, fontSize: 14, color: "#713f12" }}>
            💡 {block.text}
        </div>
    ),
    Editor: ({ block, update }) => (
        <div>
            <label style={{ fontSize: 12, fontWeight: 500 }}>Callout text</label>
            <input
                style={{ width: "100%", marginTop: 4, padding: "6px 8px", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 6 }}
                value={block.text}
                onChange={(e) => update({ text: e.target.value })}
            />
        </div>
    ),
    toHtml: (block, ctx) =>
        ctx.wrapRow(`<div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:12px;color:#713f12;">💡 ${ctx.escapeHtml(block.text)}</div>`),
});

const NPM_URL = "https://www.npmjs.com/package/email-block-builder";
const GH_URL = "https://github.com/eliasver1999/Email-editor";
const INSTALL_CMD = "npm i email-block-builder";

const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const FEATURES = ["📤 Email-safe HTML", "🪟 Outlook-ready", "🌍 Multi-language", "🧱 Custom blocks", "🎨 Themeable", "📱 Responsive", "🖼️ Image upload"];

const navLink: CSSProperties = { fontSize: 14, fontWeight: 600, color: "#0f172a", textDecoration: "none" };
const btnPrimary: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, textDecoration: "none", color: "#fff", background: "#16a34a", border: "1px solid #16a34a", borderRadius: 10, padding: "10px 18px" };
const btnGhost: CSSProperties = { ...btnPrimary, color: "#0f172a", background: "#fff", border: "1px solid #e2e8f0" };
const chip: CSSProperties = { fontSize: 12.5, fontWeight: 500, color: "#334155", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 999, padding: "6px 12px" };

/** Copyable `npm i …` pill — the hero centerpiece. */
function InstallPill() {
    const [copied, setCopied] = useState(false);
    const copy = () =>
        navigator.clipboard?.writeText(INSTALL_CMD).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    return (
        <button
            onClick={copy}
            title="Copy install command"
            style={{
                display: "inline-flex", alignItems: "center", gap: 14, cursor: "pointer",
                fontFamily: MONO, fontSize: 14, color: "#e2e8f0", background: "#0f172a",
                border: "1px solid #0f172a", borderRadius: 10, padding: "11px 16px",
            }}
        >
            <span><span style={{ color: "#22c55e" }}>$</span> {INSTALL_CMD}</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: copied ? "#22c55e" : "#94a3b8" }}>{copied ? "COPIED ✓" : "COPY"}</span>
        </button>
    );
}

function Nav() {
    return (
        <nav style={{ borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }} aria-hidden>✉️</span>
                    <strong style={{ fontSize: 15, color: "#0f172a", letterSpacing: "-0.01em" }}>email-block-builder</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                    <a href={GH_URL} target="_blank" rel="noreferrer" style={navLink}>GitHub</a>
                    <a href={NPM_URL} target="_blank" rel="noreferrer" style={navLink}>npm</a>
                </div>
            </div>
        </nav>
    );
}

function Hero() {
    return (
        <section style={{ background: "linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)", borderBottom: "1px solid #e5e7eb" }}>
            <div style={{ maxWidth: 880, margin: "0 auto", padding: "64px 20px 52px", textAlign: "center" }}>
                <span style={{ display: "inline-block", fontSize: 12, fontWeight: 700, color: "#16a34a", background: "#dcfce7", borderRadius: 999, padding: "5px 12px", letterSpacing: "0.02em" }}>
                    Open source · MIT · React 18 &amp; 19
                </span>
                <h1 style={{ fontSize: "clamp(30px, 5vw, 46px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#0f172a", margin: "18px 0 0" }}>
                    The drag-and-drop email builder for React
                </h1>
                <p style={{ fontSize: 18, color: "#475569", lineHeight: 1.6, margin: "16px auto 0", maxWidth: 660 }}>
                    Compose emails from blocks, preview live, and export <strong style={{ color: "#0f172a" }}>email-safe HTML</strong> that renders everywhere — including Outlook. Multi-language, custom blocks, fully themeable.
                </p>
                <div style={{ marginTop: 30, display: "flex", justifyContent: "center" }}>
                    <InstallPill />
                </div>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
                    <a href={GH_URL} target="_blank" rel="noreferrer" style={btnGhost}>★ Star on GitHub</a>
                    <a href={NPM_URL} target="_blank" rel="noreferrer" style={btnPrimary}>View on npm ↗</a>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 30 }}>
                    {FEATURES.map((f) => <span key={f} style={chip}>{f}</span>)}
                </div>
                <p style={{ marginTop: 36, fontSize: 13, color: "#94a3b8" }}>↓ Try the editor below — it's the real component</p>
            </div>
        </section>
    );
}

function Footer() {
    const fl: CSSProperties = { color: "#16a34a", textDecoration: "none", fontWeight: 600 };
    return (
        <footer style={{ borderTop: "1px solid #e5e7eb", background: "#fff", padding: "22px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            <span style={{ fontFamily: MONO, color: "#475569" }}>{INSTALL_CMD}</span>
            {"  ·  "}
            <a href={GH_URL} target="_blank" rel="noreferrer" style={fl}>GitHub</a>
            {"  ·  "}
            <a href={NPM_URL} target="_blank" rel="noreferrer" style={fl}>npm</a>
            {"  ·  MIT © Ilias Verginis"}
        </footer>
    );
}

function App() {
    const [doc, setDoc] = useState<EmailDocument | undefined>();

    return (
        <div style={{ fontFamily: FONT, background: "#fff" }}>
            <Nav />
            <Hero />
            <div style={{ maxWidth: 880, margin: "0 auto", padding: "30px 20px 16px" }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>Live editor</h2>
                <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748b" }}>
                    Drag blocks from the left, edit on the canvas, switch languages in the toolbar, then open the <strong style={{ color: "#334155" }}>HTML</strong> tab to see the exported email.
                </p>
            </div>
            {/* Full-width editor — no max-width wrapper so it uses the whole page. */}
            <div style={{ borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
            <EmailBuilder
                initialDocument={doc}
                locales={[
                    { code: "en", label: "English" },
                    { code: "el", label: "Ελληνικά" },
                    { code: "fr", label: "Français" },
                ]}
                defaultLocale="en"
                onSave={(document, html, meta) => {
                    setDoc(document);
                    // Inspect the JSON design + rendered email HTML in the console.
                    console.log("[playground] saved document:", document);
                    console.log("[playground] rendered html:\n", html);
                    if (meta) {
                        console.log("[playground] saved languages:", Object.keys(meta.documents).join(", "));
                        console.log("[playground] per-language html:", meta.htmls);
                    }
                }}
                customBlocks={[calloutBlock]}
                // Demo uploader: a real app would upload to a CDN and return the
                // hosted URL. A blob: URL is fine for previewing locally.
                onImageUpload={async (file) => {
                    console.log("[playground] uploading", file.name, file.type, file.size);
                    return URL.createObjectURL(file);
                }}
                fieldGroups={[
                    {
                        category: "Recipient",
                        fields: [
                            { token: "{{first_name}}", label: "First name" },
                            { token: "{{email}}", label: "Email" },
                        ],
                    },
                ]}
                previewSubstitute={(html) =>
                    html
                        .replaceAll("{{first_name}}", "Maria")
                        .replaceAll("{{email}}", "maria@example.com")
                }
            />
            </div>
            <Footer />
            <EmailBuilderToaster />
        </div>
    );
}

// Note: no <StrictMode> — Monaco's automaticLayout breaks under StrictMode's
// dev-only double-mount (editor gets stuck at its initial 5px size).
// Reuse a single root across Vite HMR re-runs of this entry module, otherwise
// createRoot() is called twice on the same container and React warns.
const container = document.getElementById("root")!;
const store = window as unknown as { __ebbRoot?: ReturnType<typeof createRoot> };
const root = store.__ebbRoot ?? (store.__ebbRoot = createRoot(container));
root.render(<App />);
