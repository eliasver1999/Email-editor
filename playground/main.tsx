import { useState } from "react";
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

function App() {
    const [doc, setDoc] = useState<EmailDocument | undefined>();

    return (
        <>
            <EmailBuilder
                initialDocument={doc}
                onSave={(document, html) => {
                    setDoc(document);
                    // Inspect the JSON design + rendered email HTML in the console.
                    console.log("[playground] saved document:", document);
                    console.log("[playground] rendered html:\n", html);
                }}
                onBack={() => console.log("[playground] back clicked")}
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
