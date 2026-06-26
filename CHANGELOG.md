# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/). While pre-1.0, minor versions may
include breaking changes.

## [Unreleased]

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

[0.1.0]: https://github.com/iliasverginis/email-block-builder/releases/tag/v0.1.0
