// Renders a representative email to examples/sample-email.html so you can open it
// in a browser and forward it to yourself / paste it into Litmus or Email on Acid
// to smoke-test across real clients (Gmail, Outlook, Apple Mail, iOS).
//
// Usage:  npm run build && npm run email:sample
// (imports the built package in ./dist, so build first)

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToHtml, createBlock, DEFAULT_SETTINGS } from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));

// A two-column row demonstrates the responsive stacking on phones.
const columns = createBlock("columns");
columns.columns[0].blocks = [createBlock("heading"), createBlock("text")];
columns.columns[1].blocks = [createBlock("image")];

const doc = {
    settings: { ...DEFAULT_SETTINGS, preheaderText: "A sample email from email-block-builder" },
    blocks: [
        createBlock("logo"),
        createBlock("heading"),
        createBlock("text"),
        columns,
        createBlock("button"),
        createBlock("divider"),
        createBlock("quote"),
        createBlock("footer"),
    ],
};

const html = renderToHtml(doc);
const out = resolve(here, "../examples/sample-email.html");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html, "utf8");
console.log(`Wrote ${out} (${html.length} bytes)`);
