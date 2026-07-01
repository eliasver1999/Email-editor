// Shared representative sample email, used by both render-sample and
// validate-sample so the smoke-test HTML and the CI validation cover the
// same document. `pkg` is the built package (../dist/index.js).

export function buildSampleDoc({ createBlock, DEFAULT_SETTINGS }) {
    // A two-column row demonstrates the responsive stacking on phones.
    const columns = createBlock("columns");
    columns.columns[0].blocks = [createBlock("heading"), createBlock("text")];
    columns.columns[1].blocks = [createBlock("image")];

    return {
        settings: {
            ...DEFAULT_SETTINGS,
            subject: "A sample email from email-block-builder",
            preheaderText: "See what the builder produces",
        },
        blocks: [
            createBlock("image"),
            createBlock("heading"),
            createBlock("text"),
            columns,
            createBlock("button"),
            createBlock("divider"),
            createBlock("quote"),
            createBlock("footer"),
        ],
    };
}
