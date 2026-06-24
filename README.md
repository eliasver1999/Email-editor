# @eventora/email-builder

A framework-agnostic, drag-and-drop **email builder** for React. Compose emails from blocks (text, image, button, columns, social, …), preview them live, and export **email-safe, table-based HTML** that renders across clients (including Outlook).

- 🧱 **Block-based editor** — drag, drop, reorder, edit inline
- 🎨 **Themable** — every color is a CSS variable; light/dark out of the box
- 🌍 **Localizable** — inject your own translations via a single `t` prop
- 📦 **Self-contained styles** — ships precompiled, scoped CSS; **no Tailwind required** in your app
- 📤 **HTML + JSON export** — save the design as JSON, render to email-safe HTML
- 🔤 **Merge tags** — insert `{{tokens}}` for personalization

## Install

```bash
npm install @eventora/email-builder
```

Peer dependencies (you likely already have most):

```bash
npm install react react-dom @dnd-kit/core lucide-react nanoid clsx tailwind-merge
# optional — only needed for the in-editor HTML "code view"
npm install @monaco-editor/react
```

## Quick start

```tsx
import { useState } from "react";
import { EmailBuilder, type EmailDocument } from "@eventora/email-builder";
import "@eventora/email-builder/styles.css"; // once, anywhere

export function MyEditor() {
  const [doc, setDoc] = useState<EmailDocument>();

  return (
    <EmailBuilder
      initialDocument={doc}
      onSave={(document, html) => {
        setDoc(document);        // persist the JSON design
        sendToServer(html);      // ...and/or the rendered email HTML
      }}
      onBack={() => history.back()}
    />
  );
}
```

That's it — the editor is fully styled (it renders inside a `.email-builder` root the stylesheet targets).

## Rendering without the editor

Render a saved design to HTML anywhere (server or client) — no React tree needed:

```ts
import { renderToHtml, type EmailDocument } from "@eventora/email-builder";

const html = renderToHtml(savedDocument as EmailDocument);
```

## Merge tags (personalization)

Pass groups of insertable tokens; users can drop them into text, and you control how they preview:

```tsx
<EmailBuilder
  fieldGroups={[
    { category: "Recipient", fields: [
      { token: "{{first_name}}", label: "First name" },
      { token: "{{email}}", label: "Email" },
    ]},
  ]}
  previewSubstitute={(html) =>
    html.replaceAll("{{first_name}}", "Maria").replaceAll("{{email}}", "maria@example.com")
  }
/>
```

The exported HTML keeps the raw `{{tokens}}` so your backend does the final substitution at send time.

## Theming

Override any CSS variable on `.email-builder` (or a parent). Add a `.dark` class for dark mode.

```css
.email-builder {
  --primary: 250 84% 54%;     /* HSL channels (no hsl()) */
  --radius: 0.75rem;
}
```

## Localization

The editor ships English text by default. Pass a `t(key)` function to translate its UI — it falls back to English for any missing key. Keys live under the `emailBuilder.*` namespace.

```tsx
<EmailBuilder t={(key) => myI18n.translate(key)} />
```

## `<EmailBuilder>` props

| Prop | Type | Description |
| --- | --- | --- |
| `initialDocument` | `EmailDocument` | Design to load (omit for a blank canvas). |
| `onSave` | `(doc, html) => void` | Called on save with the JSON design **and** rendered HTML. |
| `onBack` | `() => void` | Optional back button handler. |
| `fieldGroups` | `MergeFieldGroup[]` | Merge-tag groups available to insert. |
| `previewSubstitute` | `(html) => string` | Resolve `{{tokens}}` to sample values in the live preview. |
| `t` | `(key) => string` | Translation function for the editor UI. |

## License

MIT © Eventora
