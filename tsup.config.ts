import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    // Everything below is a peer dependency — never bundle it into the package.
    external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@dnd-kit/core",
        "@monaco-editor/react",
        "lucide-react",
        "nanoid",
        "clsx",
        "tailwind-merge",
    ],
});
