import { defineConfig } from "vitest/config";

// Dedicated Vitest config so the runner does NOT pick up the playground's
// vite.config.ts (which sets root: ./playground and the React plugin).
export default defineConfig({
    test: {
        environment: "node", // the renderer is a pure string function — no DOM needed
        include: ["src/**/*.test.ts"],
    },
});
