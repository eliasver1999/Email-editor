# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/). While pre-1.0, minor versions may
include breaking changes.

## [Unreleased]

### Added

- **Output validator — `validate(doc)`.** A dependency-free linter that flags common email pitfalls before sending: Gmail's ~102 KB clipping limit, images missing `alt`, low color contrast (WCAG AA), non-`https://` links, empty CTAs, missing subject, and leftover `{{merge_tags}}`. Returns `{ level, code, message, blockId? }[]` so you can surface issues or gate a send. See the README "Validating output" section.
- **Per-block CSS hooks.** Every block's row now carries `eb-block` + `eb-block-<type>` classes, and each block has an optional **CSS class** field (Properties panel), so document Custom CSS can target a whole type (`.eb-block-button a { … }`) or one specific block (`.promo-cta { … }`) — applied live on the canvas and in the exported email. (User class is sanitized to safe characters.)
- **Custom CSS autocomplete.** Typing `.` in the Custom CSS editor suggests the available block classes for the current design — each block type in use, your per-block classes, and the inner-element variant (`.eb-block-button a`, `.eb-block-text p`, …) so it's easy to target the element rather than the row.
- **Editable HTML output.** The toolbar **"HTML"** tab is now editable — hand-edit the compiled email HTML and it becomes what gets saved / exported / previewed (a manual override). A banner shows when you're overriding, with a **"Regenerate from blocks"** button to revert; editing any block automatically regenerates the HTML and discards the manual edits.

### Changed

- The **Custom HTML block editor is taller** (360px) with clear **HTML | CSS** tabs, so raw HTML/CSS is easier to read and edit.

### Removed

- The **Logo** block — it duplicated the Image block. Use an **Image** block instead (the default starter layout now uses a small centered image for the top slot). Saved documents still open, but any block with `type: "logo"` won't render — re-add it as an image.

### Changed

- New **text blocks** start with default padding (`8px` vertical / `24px` horizontal) so body text isn't flush against the email edges. Adjust per-block in the Properties panel.

### Fixed

- **Content border & corner radius now render in the sent email.** The content table used `border-collapse: collapse`, which makes clients ignore `border-radius` and lets row backgrounds (e.g. the footer) bleed over the side border — so the radius was lost and the border looked broken. Switched the content table to `border-collapse: separate` (with `border-spacing: 0`), so the radius applies and the border wraps the whole content area.
- **Code-editor autocomplete/hover popups no longer get clipped** by the editor's box or the side panel — they now render in a fixed overflow layer (`fixedOverflowWidgets`).

## [0.5.1] - 2026-06-26

### Added

- **Email subject field.** Email Settings now has a **Subject** input. It's stored on `settings.subject` so the host can use it as the email's `Subject` header when sending (returned with the document in `onSave`), shown in the editor's preview header, and written to the exported HTML's `<title>`. It is **not** rendered into the email body.

## [0.5.0] - 2026-06-26

### Added

- **File / Download block.** A new block that links a downloadable file as a styled button or a text link. Upload **any file type** via a new `onFileUpload` prop — which **falls back to `onImageUpload`**, so an existing S3 handler serves files too — or paste a URL. The empty block accepts drag-and-drop, and the uploaded filename becomes the default label.
- **In-app unsaved-changes guard.** The toolbar now shows an "Unsaved" indicator (amber dot) while there are pending edits, and clicking **Back** with unsaved changes opens a styled confirmation dialog — **Cancel** / **Leave without saving** / **Save & leave** — instead of navigating away silently. The browser's native prompt still guards hard tab-close / refresh. Backed by a new `Dialog` modal primitive.

## [0.4.3] - 2026-06-26

- Maintenance release; no functional changes.

## [0.4.2] - 2026-06-26

### Fixed

- **Code editors no longer collapse to a 5px sliver.** Monaco could measure its container as ~0 when mounted inside a tab/panel that sizes after creation and never recover — leaving the Custom HTML block's HTML/CSS editors and the document Custom CSS editor effectively uneditable. They now force a relayout once the box has real size (and on resize).
- **Document Custom CSS is now applied in the live editing canvas**, scoped to the content area (it previously showed only in Preview/export). Editing is WYSIWYG — Custom CSS affects the canvas the same way it affects the exported email, without leaking into the editor chrome.

### Changed

- The **heading block renders its semantic tag** (`h1`/`h2`/`h3`) while editing on the canvas, matching the exported email, so Custom CSS selectors like `h1 { … }` apply on the canvas too.

## [0.4.1] - 2026-06-26

### Fixed

- Corrected the package's `repository`, `homepage`, and `bugs` URLs to point to the real GitHub repo (`eliasver1999/Email-editor`). The previous URLs (`iliasverginis/email-block-builder`) were wrong, so the npm page linked to a non-existent repository. (No code changes.)

## [0.4.0] - 2026-06-26

### Changed

- **Button width** is now an **auto / percentage** control (10–100%), like Image and Divider — instead of just an on/off "Full Width" toggle. **Breaking (types):** `ButtonBlock.fullWidth` is deprecated and replaced by `width: "auto" | number`. Saved documents still render unchanged (a stored `fullWidth: true` → 100%, `false` → auto), but TypeScript that builds a `ButtonBlock` literal should now set `width`.
- Internal: the email `<head>` and the live canvas now share one `EMAIL_BASE_RESET_CSS` block, so a Custom HTML block renders identically in Edit and Preview.

### Fixed

- **Button row no longer bleeds the button color full-width** in the exported email. The button's row stays transparent (only the button itself is colored), so a button — especially a full-width one — looks the same in Edit and Preview. Previously the renderer painted the whole row with the button color while the canvas didn't.
- **Desktop preview width now matches the edit canvas** (uses `settings.contentWidth`), so the email no longer shifts or resizes when toggling Edit ↔ Preview.

## [0.3.1] - 2026-06-26

- Maintenance republish of 0.3.0; no functional changes.

## [0.3.0] - 2026-06-26

### Added

- **Multi-language templates**: pass `<EmailBuilder locales={[{code,label}]} />` to edit a separate design per language with a toolbar switcher. Languages are fully independent designs; a **"Copy to all languages"** action (⋯ More menu) clones the active design onto the others. `onSave` gains an optional third arg (`MultiLocaleSaveMeta`) with every language's document + rendered HTML. Seed with `initialDocuments` / `defaultLocale`. Single-language usage is unchanged.

## [0.2.0] - 2026-06-26

### Added

- **Editable custom blocks**: custom blocks registered with `defineBlock` and passed to `<EmailBuilder customBlocks={[…]} />` are now first-class in the editor — they appear in the block sidebar, can be dragged/double-clicked onto the canvas, render via an optional `Canvas` component, and edit via an optional `Editor` component in the property panel. They still export through your `toHtml`. (Render-only support shipped earlier; this completes the plugin API.)
- **Drag-and-drop image upload**: drop an image file onto an image/logo field, or onto an empty image/logo block on the canvas, to upload it (via `onImageUpload`).
- **Lockable components**: `<EmailBuilder canManageLocks>` (default `true`). Restricted editors (`false`) can't edit/move/delete locked blocks; locked blocks show a background-contrasting lock badge.

### Changed

- New blocks default to **no padding** (avoids inset/full-bleed layout issues); set padding per-block in the Properties panel as needed.

### Removed

- The **Video** block — use a linked image block instead.

## [0.1.0] - 2026-06-25

Initial public release.

### Editor

- Block-based drag-and-drop editor with 13 block types (text, heading, image, button, divider, spacer, columns, social, custom HTML, logo, footer, video, quote).
- Inline WYSIWYG rich-text toolbar (bold / italic / underline / link / lists) for text and footer blocks, and a reduced toolbar (no lists) for headings.
- Syntax-highlighted HTML + CSS editor for the Custom HTML block and a document-level Custom CSS field (Monaco — an optional peer dependency — with a plain-textarea fallback).
- Optional image upload via the `onImageUpload` prop on image / logo / thumbnail fields; URL-only when omitted.
- Desktop / mobile preview, undo/redo (50 steps), keyboard shortcuts, theming via CSS variables, and localization via a `t` prop.
- Mounts with a **default starter layout** when no `initialDocument` is given (pass an explicit document — even empty — to start blank).
- Toolbar tidied: Import / Export / Download HTML moved into a **"⋯ More"** menu, alongside **Copy / Paste design** (clipboard) for duplicating one template into another.

### Rendering

- `renderToHtml` / `renderEmailHtml` produce table-based, email-safe HTML with Outlook (MSO / VML) support.
- Responsive output: fluid content width and columns that stack on phones (`@media (max-width: 600px)`).
- Document- and block-level custom CSS hoisted into `<head>`.
- Baseline HTML sanitization on export (strips `<script>` / `<iframe>` / inline event handlers / `javascript:` URLs) plus `</style>`-breakout protection for custom CSS.
- **Extensible rendering**: register custom block renderers with `defineBlock` and `renderToHtml(doc, { blocks })`.

### Tooling

- Vitest snapshot + assertion suite for the renderer.
- CI (typecheck + test + build) on pull requests; the npm release is gated on those checks.

### Known limitations

- Custom blocks render at send time but are **not yet editable in the editor UI** (planned for 0.2).
- Sanitization is a conservative blocklist, not a full allowlist sanitizer — pre-sanitize untrusted, multi-tenant input.
- No dark-mode handling or plain-text / multipart alternative yet.
- Generated HTML has not been validated across the full email-client matrix — smoke-test your own templates (see the README).

[Unreleased]: https://github.com/eliasver1999/Email-editor/compare/v0.5.1...HEAD
[0.5.1]: https://github.com/eliasver1999/Email-editor/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/eliasver1999/Email-editor/compare/v0.4.3...v0.5.0
[0.4.3]: https://github.com/eliasver1999/Email-editor/compare/v0.4.2...v0.4.3
[0.4.2]: https://github.com/eliasver1999/Email-editor/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/eliasver1999/Email-editor/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/eliasver1999/Email-editor/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/eliasver1999/Email-editor/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/eliasver1999/Email-editor/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/eliasver1999/Email-editor/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/eliasver1999/Email-editor/releases/tag/v0.1.0
