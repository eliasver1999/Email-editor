# email-block-builder

A framework-agnostic, drag-and-drop **email builder** for React. Compose emails from blocks (text, image, button, columns, social, …), preview them live, and export **email-safe, table-based HTML** that renders across clients (including Outlook).

**▶ [Live demo](https://eliasver1999.github.io/Email-editor/)** — try the editor in your browser.

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

Image and logo fields take a URL by default. Pass `onImageUpload` to add an upload button — with drag-and-drop — next to them: the builder hands you the picked or dropped `File`, you upload it wherever you store assets, and return the hosted URL. Users can also drop an image file straight onto an empty image/logo block on the canvas.

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

> Note: `t` translates the **editor chrome**. To translate the **email content** itself, use multi-language mode below — each language gets its own design.

## Multiple languages

Pass a `locales` list to keep a **separate design per language**. A switcher appears in the toolbar, and each language is a fully independent `EmailDocument` — different blocks, layout, and content are all allowed. A **"Copy to all languages"** action (in the ⋯ More menu) clones the active language's design onto the others, so translators start from an identical layout.

```tsx
<EmailBuilder
  locales={[
    { code: "en", label: "English" },
    { code: "el", label: "Ελληνικά" },
    { code: "fr", label: "Français" },
  ]}
  defaultLocale="en"
  initialDocuments={{ en: savedEn, el: savedEl }}   // optional; missing langs start from the starter
  onSave={(doc, html, meta) => {
    // doc/html are the active language. meta has them all:
    if (meta) {
      for (const [code, document] of Object.entries(meta.documents)) {
        save(code, document, meta.htmls[code]);       // persist each language's design + HTML
      }
    }
  }}
/>
```

`onSave`'s third argument (`MultiLocaleSaveMeta`) carries `{ locale, documents, htmls }` — every language's design and rendered HTML, keyed by `code` — so you can persist all variants in one save.

> Editing history (undo/redo) is per-language and resets when you switch languages.

## `<EmailBuilder>` props

| Prop | Type | Description |
| --- | --- | --- |
| `initialDocument` | `EmailDocument` | Design to load. Omit to start from a default starter layout; pass `{ settings, blocks: [] }` for a blank canvas. |
| `onSave` | `(doc, html, meta?) => void` | Called on save with the JSON design **and** rendered HTML. With `locales`, the third arg is a `MultiLocaleSaveMeta` carrying every language's design + HTML. |
| `onBack` | `() => void` | Optional back button handler. |
| `locales` | `EmailLocale[]` | Enable multi-language mode: edit a separate design per language with a toolbar switcher. See [Multiple languages](#multiple-languages). |
| `initialDocuments` | `Record<string, EmailDocument>` | Initial design per language, keyed by locale `code`. Missing languages start from the starter layout. |
| `defaultLocale` | `string` | Which language is selected on load (defaults to the first in `locales`). |
| `fieldGroups` | `MergeFieldGroup[]` | Merge-tag groups available to insert. |
| `previewSubstitute` | `(html) => string` | Resolve `{{tokens}}` to sample values in the live preview. |
| `onImageUpload` | `(file) => Promise<string>` | Upload picked images and return a hosted URL; adds an upload button to image/logo/thumbnail fields. Omit for URL-only. |
| `canManageLocks` | `boolean` | Full editor (default `true`). `false` = restricted editor: locked blocks are read-only. |
| `customBlocks` | `BlockDefinition[]` | Custom block types from `defineBlock` (see [Custom blocks](#custom-blocks-plugin-api)). |
| `canvasShadow` | `boolean` | Draw a drop shadow around the canvas in edit mode (off by default). |
| `t` | `(key) => string` | Translation function for the editor UI. |

## Custom blocks (plugin API)

Register your own block types — without forking — by defining them once with `defineBlock`. A definition supplies both how the block **renders to email** (`toHtml`, required) and, optionally, how it behaves **in the editor** (`Canvas`, `Editor`, plus sidebar metadata). Pass the definitions to both `<EmailBuilder customBlocks={…} />` and `renderToHtml(doc, { blocks })`:

```tsx
import { defineBlock, EmailBuilder, renderToHtml, type CustomBlock } from "email-block-builder";

interface ProductCardBlock extends CustomBlock {
  type: "product-card";
  title: string;
}

const productCard = defineBlock<ProductCardBlock>({
  type: "product-card",

  // Sidebar metadata (optional — falls back to the type string)
  label: "Product card",
  description: "Title + image promo",
  category: "content",          // "layout" → Layout tab, otherwise Components tab
  icon: <ShoppingBag className="h-4 w-4" />,

  // Default data for a freshly-added block (optional)
  create: () => ({ id: "", type: "product-card", title: "New product", padding: { top: 12, right: 16, bottom: 12, left: 16 }, backgroundColor: "transparent" }),

  // How it looks on the editor canvas (optional — falls back to a placeholder)
  Canvas: ({ block }) => <strong>{block.title}</strong>,

  // Its property-panel editor (optional — falls back to "no editable properties")
  Editor: ({ block, update }) => (
    <input value={block.title} onChange={(e) => update({ title: e.target.value })} />
  ),

  // How it exports to email HTML (required)
  toHtml: (block, ctx) => ctx.wrapRow(`<strong>${ctx.escapeHtml(block.title)}</strong>`),
});

// Editor:
<EmailBuilder customBlocks={[productCard]} onSave={(doc, html) => …} />

// Headless render (e.g. on your server) — pass the same definitions:
const html = renderToHtml(savedDocument, { blocks: [productCard] });
```

Custom blocks appear in the sidebar, drag/double-click onto the canvas, render via `Canvas`, and edit via `Editor` in the property panel — then export through `toHtml`. Only `type` and `toHtml` are required; omit the editor fields for render-only blocks.

`ctx` gives you `settings`, `escapeHtml`, `sanitizeRichHtml`, `wrapRow` (the standard padded/background row), and `renderBlock` (for container blocks). Reusing a built-in `type` overrides it; an unrecognized `type` renders to nothing.

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

## License

MIT © Ilias Verginis
