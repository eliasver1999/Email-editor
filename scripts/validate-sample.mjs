// Runs the output validator over the representative sample email and fails the
// build on any validation *error*. Warnings/info are printed for visibility but
// don't fail (they're often intentional design choices, e.g. brand colors).
//
// Usage:  npm run build && npm run validate:sample   (imports the built ./dist)

import { validate, createBlock, DEFAULT_SETTINGS } from "../dist/index.js";
import { buildSampleDoc } from "./sample-doc.mjs";

// Levels that fail CI. Flip to ["error", "warning"] to be stricter.
const FAIL_ON = ["error"];

const doc = buildSampleDoc({ createBlock, DEFAULT_SETTINGS });
const issues = validate(doc);

const icon = { error: "✖", warning: "⚠", info: "ℹ" };
for (const i of issues) {
    console.log(`  ${icon[i.level] ?? "-"} [${i.level}] ${i.code}: ${i.message}${i.blockId ? ` (block ${i.blockId})` : ""}`);
}

const counts = { error: 0, warning: 0, info: 0 };
for (const i of issues) counts[i.level] = (counts[i.level] ?? 0) + 1;
console.log(`\nvalidate(sample): ${counts.error} error, ${counts.warning} warning, ${counts.info} info`);

const failing = issues.filter((i) => FAIL_ON.includes(i.level));
if (failing.length) {
    console.error(`\n✖ Sample email failed validation: ${failing.length} ${FAIL_ON.join("/")}-level issue(s).`);
    process.exit(1);
}
console.log(`✓ Sample email passed (no ${FAIL_ON.join("/")}-level issues).`);
