import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Local dev playground for the library (see ./playground). This is NOT part of
// the published package — it just mounts <EmailBuilder> so you can see the UI.
const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: resolve(here, "playground"),
    plugins: [react()],
    css: {
        // Reuse the package's PostCSS pipeline (Tailwind + autoprefixer +
        // .email-builder scoping) so the playground styles match production.
        postcss: here,
    },
    server: { open: true, port: 5180 },
});
