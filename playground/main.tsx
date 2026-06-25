import { useState } from "react";
import { createRoot } from "react-dom/client";
import { EmailBuilder, EmailBuilderToaster, type EmailDocument } from "../src";
import "../src/styles.css";

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
