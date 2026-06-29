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

const linkStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
    color: "#111827",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "7px 12px",
};

/** Small landing header shown above the editor on the hosted demo. */
function Landing() {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard?.writeText(INSTALL_CMD).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };
    return (
        <header
            style={{
                fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
                borderBottom: "1px solid #e5e7eb",
                background: "#fff",
                padding: "12px 20px",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", maxWidth: 1240, margin: "0 auto" }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 20 }} aria-hidden>✉️</span>
                        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: "-0.01em" }}>email-block-builder</h1>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", background: "#dcfce7", borderRadius: 999, padding: "2px 8px" }}>live demo</span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
                        Drag-and-drop email builder for React — multi-language, custom blocks, themeable, exports email-safe HTML.
                    </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <button
                        onClick={copy}
                        title="Copy install command"
                        style={{
                            display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13,
                            color: "#111827", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8, padding: "7px 12px",
                        }}
                    >
                        <span style={{ color: "#16a34a" }}>$</span>
                        {INSTALL_CMD}
                        <span style={{ fontSize: 11, color: copied ? "#16a34a" : "#9ca3af" }}>{copied ? "copied ✓" : "copy"}</span>
                    </button>
                    <a href={GH_URL} target="_blank" rel="noreferrer" style={linkStyle}>GitHub ↗</a>
                    <a href={NPM_URL} target="_blank" rel="noreferrer" style={{ ...linkStyle, background: "#16a34a", color: "#fff", borderColor: "#16a34a" }}>npm ↗</a>
                </div>
            </div>
        </header>
    );
}

function App() {
    const [doc, setDoc] = useState<EmailDocument | undefined>();

    return (
        <>
            <Landing />
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
            <EmailBuilderToaster />
        </>
    );
}

// Note: no <StrictMode> — Monaco's automaticLayout breaks under StrictMode's
// dev-only double-mount (editor gets stuck at its initial 5px size).
createRoot(document.getElementById("root")!).render(<App />);
