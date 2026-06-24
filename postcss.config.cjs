/**
 * Builds the package's distributable stylesheet:
 *   1. Tailwind generates only the utilities actually used in src/**
 *   2. Autoprefixer adds vendor prefixes
 *   3. prefix-selector scopes EVERY generated rule under `.email-builder`
 *
 * Step 3 is what makes the package self-contained and safe to drop into any app:
 * the utilities (and the preflight reset) only apply inside the builder root and
 * never leak into — or collide with — the consumer's own styles.
 */
const prefixSelector = require("postcss-prefix-selector");

module.exports = {
    plugins: [
        require("tailwindcss")("./tailwind.config.cjs"),
        require("autoprefixer"),
        prefixSelector({
            prefix: ".email-builder",
            transform(prefix, selector, prefixedSelector) {
                // Leave alone: rules already scoped to the builder, :root,
                // and @keyframes steps (from/to/<percent>).
                if (
                    selector.includes(".email-builder") ||
                    selector.startsWith(":root") ||
                    selector === "from" ||
                    selector === "to" ||
                    /^\d/.test(selector)
                ) {
                    return selector;
                }
                return prefixedSelector;
            },
        }),
    ],
};
