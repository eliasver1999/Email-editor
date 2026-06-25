# email-block-builder

A framework-agnostic, drag-and-drop **email builder** for React. Compose emails from blocks (text, image, button, columns, social, …), preview them live, and export **email-safe, table-based HTML** that renders across clients (including Outlook).

- 🧱 **Block-based editor** — drag, drop, reorder, edit inline
- 🎨 **Themable** — every color is a CSS variable; light/dark out of the box
- 🌍 **Localizable** — inject your own translations via a single `t` prop
- 📦 **Self-contained styles** — ships precompiled, scoped CSS; **no Tailwind required** in your app
- 📤 **HTML + JSON export** — save the design as JSON, render to email-safe HTML
- 🔤 **Merge tags** — insert `{{tokens}}` for personalization

## Install

```bash
npm install email-block-builder
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
import { EmailBuilder, type EmailDocument } from "email-block-builder";
import "email-block-builder/styles.css"; // once, anywhere

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
import { renderToHtml, type EmailDocument } from "email-block-builder";

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

## Image uploads

Image, logo, and video-thumbnail fields take a URL by default. Pass `onImageUpload` to add an upload button next to them — the builder hands you the picked `File`, you upload it wherever you store assets, and return the hosted URL:

```tsx
<EmailBuilder
  onImageUpload={async (file) => {
    const url = await uploadToMyCdn(file); // your code
    return url;                            // builder writes it into the block
  }}
/>
```

Emails require publicly-hosted images, so return an absolute `https://` URL (not a `blob:`/`data:` URI). Without the prop, the fields stay URL-only.

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
| `initialDocument` | `EmailDocument` | Design to load. Omit to start from a default starter layout; pass `{ settings, blocks: [] }` for a blank canvas. |
| `onSave` | `(doc, html) => void` | Called on save with the JSON design **and** rendered HTML. |
| `onBack` | `() => void` | Optional back button handler. |
| `fieldGroups` | `MergeFieldGroup[]` | Merge-tag groups available to insert. |
| `previewSubstitute` | `(html) => string` | Resolve `{{tokens}}` to sample values in the live preview. |
| `onImageUpload` | `(file) => Promise<string>` | Upload picked images and return a hosted URL; adds an upload button to image/logo/thumbnail fields. Omit for URL-only. |
| `t` | `(key) => string` | Translation function for the editor UI. |

## Custom blocks (rendering)

Register your own block types for the email output without forking — provide a `BlockRenderer` via `defineBlock` and pass it to `renderToHtml`:

```tsx
import { defineBlock, renderToHtml, type CustomBlock } from "email-block-builder";

interface ProductCardBlock extends CustomBlock {
  type: "product-card";
  title: string;
}

const productCard = defineBlock<ProductCardBlock>({
  type: "product-card",
  toHtml: (block, ctx) => ctx.wrapRow(`<strong>${ctx.escapeHtml(block.title)}</strong>`),
});

const html = renderToHtml(savedDocument, { blocks: [productCard] });
```

`ctx` gives you `settings`, `escapeHtml`, `sanitizeRichHtml`, `wrapRow` (the standard padded/background row), and `renderBlock` (for container blocks). Reusing a built-in `type` overrides it; an unrecognized `type` renders to nothing.

> **Editor support for custom blocks** (sidebar entry, drag-in, property-panel editor) is planned for **0.2**. Today custom blocks render at send time via your `toHtml`; they aren't yet placeable/editable in the visual editor.

## Testing in real email clients

The output targets the broad email-client matrix, but always smoke-test your own templates. Generate a sample (or use your real document):

```bash
npm run build && npm run email:sample   # writes examples/sample-email.html
```

Open it in a browser, then send it through your ESP — or paste it into Litmus / Email on Acid — and check at least Gmail (web + app), Outlook (Windows desktop), Apple Mail, and iOS Mail. In the editor, the **HTML** tab and the `onSave` callback both hand you this same exported HTML.

## Status & limitations

This is an early **0.x** release; the API may change between minor versions.

- The **renderer** is covered by tests; the **editor UI** is not yet — verify interactions in your app.
- **Sanitization** is a conservative baseline (see above), not a full sanitizer.
- **No dark-mode** handling or **plain-text / multipart** alternative yet.
- **Custom blocks** render at send time but aren't editable in the UI yet (0.2).

## License

MIT © Ilias Verginis
