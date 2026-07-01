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
        setDoc(document);                       // persist the JSON design
        sendToServer({
          subject: document.settings.subject,   // the email Subject header
          html,                                 // the rendered email body
        });
      }}
      onBack={() => history.back()}
    />
  );
}
```

That's it — the editor is fully styled (it renders inside a `.email-builder` root the stylesheet targets).

> **Subject & preheader** live on `document.settings` (`subject`, `preheaderText`) — set them in the editor's **Email settings** panel. They're metadata for your sender: the subject is *not* in the rendered body (it's the email's `Subject` header), and the preheader is emitted as the usual hidden inbox-preview snippet.

## Rendering without the editor

Render a saved design to HTML anywhere (server or client) — no React tree needed:

```ts
import { renderToHtml, renderToText, type EmailDocument } from "email-block-builder";

const doc = savedDocument as EmailDocument;
const html = renderToHtml(doc);
const text = renderToText(doc); // plain-text alternative for the multipart email
```

`renderToText` produces a readable `text/plain` part (better deliverability + accessibility): headings/paragraphs, `- ` bullet lists, `text (url)` links, `label: url` buttons, `"quote" — author`, and `---` dividers; images become their alt text, hidden blocks and merge tags are handled. Send both parts (`text/plain` + `text/html`) as a multipart alternative. Custom blocks render via an optional `toText` on `defineBlock` (skipped otherwise).

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

## Image & file uploads

Image fields and the **File / Download** block take a URL by default. Provide an uploader and the builder adds an upload button (with drag-and-drop): it hands you the picked/dropped `File`, you upload it wherever you store assets, and return the hosted URL.

- `onImageUpload` — image fields (`<img src>`).
- `onFileUpload` — the File/Download block, **any** file type (the URL becomes the link). Falls back to `onImageUpload` when omitted, so a single S3 handler serves both.

```tsx
<EmailBuilder
  // One handler for both images and files — e.g. a presigned-S3 upload:
  onImageUpload={async (file) => {
    // 1) ask your backend for a presigned PUT URL
    const { uploadUrl, publicUrl } = await fetch(
      `/api/s3-presign?name=${encodeURIComponent(file.name)}&type=${file.type}`
    ).then((r) => r.json());
    // 2) PUT the file straight to S3
    await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
    // 3) return the public https URL the email will point at
    return publicUrl;
  }}
  // Optional: route files differently from images
  // onFileUpload={async (file) => uploadToDocsBucket(file)}
/>
```

Emails require publicly-hosted assets, so return an absolute `https://` URL (not a `blob:`/`data:` URI). Without an uploader, the fields stay URL-only.

## Theming

Override any CSS variable on `.email-builder` (or a parent). Add a `.dark` class for dark mode.

```css
.email-builder {
  --primary: 250 84% 54%;     /* HSL channels (no hsl()) */
  --radius: 0.75rem;
}
```

## Styling blocks with Custom CSS

The document **Custom CSS** field (Email settings) is injected into the email `<head>` and applied live on the canvas. Every block's row carries hooks you can target:

- `.eb-block` — every block; `.eb-block-<type>` — all blocks of a type (`.eb-block-button`, `.eb-block-text`, …).
- A per-block **CSS class** (set in the block's Properties panel) — target one specific block.

```css
.eb-block-button a { text-transform: uppercase !important; }  /* all buttons */
.promo-cta a       { background: #111 !important; }           /* one tagged block */
```

Note: blocks set their base styles inline, so use `!important` (or properties the block doesn't set) to override. And email clients vary in `<style>` support — the Preview is the source of truth, and inline styles are safest for the actual inbox.

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
| `onImageUpload` | `(file) => Promise<string>` | Upload picked images and return a hosted URL; adds an upload button to image/thumbnail fields. Omit for URL-only. |
| `onFileUpload` | `(file) => Promise<string>` | Upload any file for the **File / Download** block and return a hosted URL. Falls back to `onImageUpload` when omitted — one S3 handler serves both. Omit both for URL-only. |
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

## Validating output

`validate(doc)` lints a document against common email pitfalls before you send — so you catch problems without round-tripping through a testing service:

```tsx
import { validate } from "email-block-builder";

const issues = validate(document); // ValidationIssue[] — empty means all clear
for (const i of issues) console.log(`[${i.level}] ${i.code}: ${i.message}`, i.blockId);

// gate a send on it:
if (issues.some((i) => i.level === "error")) throw new Error("Fix email issues first");
```

Each issue is `{ level: "error" | "warning" | "info", code, message, blockId? }`. Current checks:

- **Gmail clipping** — rendered HTML over ~102 KB (`size.gmail-clip`).
- **Accessibility** — images missing `alt` (`image.missing-alt`); text/button color contrast below WCAG AA 4.5:1 (`contrast.low`).
- **Links** — non-`https://` links (`link.insecure`); empty CTA targets (`link.empty`).
- **Send-time** — no subject set (`subject.missing`); leftover `{{merge_tags}}` in the output (`token.unresolved`).

Pass `validate(doc, { html })` to lint a specific rendered string, or `{ blocks }` (custom-block renderers) so the size check is accurate.

## Status & limitations

This is an early **0.x** release; the API may change between minor versions.

- The **renderer** is covered by tests; the **editor UI** is not yet — verify interactions in your app.
- **Sanitization** is a conservative baseline (see above), not a full sanitizer.
- **No dark-mode** handling or **plain-text / multipart** alternative yet.

## License

MIT © Ilias Verginis
