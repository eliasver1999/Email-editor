import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from "react";

// Monaco is an OPTIONAL peer dependency (@monaco-editor/react). Lazy-load it so
// it's only fetched when a code editor is actually shown, and so apps that never
// edit/view raw HTML/CSS don't pay for it. If it isn't installed (or fails to
// load), we fall back to a plain <textarea> via the error boundary below — the
// editor still works, just without syntax highlighting.
const MonacoEditor = lazy(() => import("@monaco-editor/react"));

type Language = "html" | "css";

interface CodeEditorProps {
    value: string;
    /** Omit for a read-only viewer. */
    onChange?: (value: string) => void;
    language: Language;
    /** Editor height — number (px) or any CSS length (e.g. "100%" to fill its parent). */
    height?: number | string;
    readOnly?: boolean;
    /** Accessible label, also used as the textarea fallback's aria-label. */
    ariaLabel?: string;
    /** Wrapper classes; defaults to a bordered, rounded box. */
    className?: string;
}

function isDark(): boolean {
    return typeof window !== "undefined" && window.document.documentElement.classList.contains("dark");
}

/** Plain-textarea fallback used while Monaco loads and if it isn't available. */
function FallbackTextarea({ value, onChange, readOnly, ariaLabel }: CodeEditorProps) {
    return (
        <textarea
            aria-label={ariaLabel}
            className="h-full w-full text-xs p-2 resize-none font-mono bg-background outline-none"
            value={value}
            onChange={onChange ? (e) => onChange(e.target.value) : undefined}
            readOnly={readOnly || !onChange}
            spellCheck={false}
        />
    );
}

/** Renders Monaco; if its lazy import throws (dep missing), shows the textarea. */
class MonacoBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() {
        return { failed: true };
    }
    render() {
        return this.state.failed ? this.props.fallback : this.props.children;
    }
}

export function CodeEditor({ value, onChange, language, height = 240, readOnly, ariaLabel, className }: CodeEditorProps) {
    // A CSS-length height (e.g. "100%") means "fill the parent". Monaco's
    // automaticLayout is unreliable with percentage heights — it can measure its
    // container as 0 at creation, render at its initial 5px, and never recover
    // because the observer sees no later size *change*. So we measure the wrapper
    // ourselves and hand Monaco a definite pixel height (which it lays out
    // correctly, just like the fixed-height case).
    const fill = typeof height !== "number";
    const wrapperRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<{ layout: () => void } | null>(null);
    const [measured, setMeasured] = useState(0);

    // Monaco can measure its container as ~0 at creation (it's often mounted
    // inside a tab/panel that hasn't laid out yet), render at its initial 5px,
    // and never recover because automaticLayout sees no later size *change*.
    // Observe the wrapper ourselves and force a relayout once it has real size —
    // for every case, not just percentage heights.
    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;
        const update = () => {
            if (fill) setMeasured(el.clientHeight);
            editorRef.current?.layout();
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [fill]);

    const monacoHeight = fill ? measured || "100%" : (height as number);
    const fallback = <FallbackTextarea value={value} onChange={onChange} language={language} readOnly={readOnly} ariaLabel={ariaLabel} />;

    return (
        <div ref={wrapperRef} className={className ?? "overflow-hidden rounded-md border"} style={{ height }}>
            <MonacoBoundary fallback={fallback}>
                <Suspense fallback={fallback}>
                    <MonacoEditor
                        height={monacoHeight}
                        language={language}
                        value={value}
                        onChange={onChange ? (v) => onChange(v ?? "") : undefined}
                        onMount={(editor) => {
                            editorRef.current = editor;
                            // The container may still be sizing when Monaco mounts; nudge a
                            // relayout across a few frames so it fills its box instead of
                            // sticking at the initial 5px.
                            [0, 60, 200].forEach((d) => setTimeout(() => editor.layout(), d));
                        }}
                        theme={isDark() ? "vs-dark" : "light"}
                        options={{
                            readOnly: readOnly || !onChange,
                            minimap: { enabled: false },
                            fontSize: 12,
                            lineNumbers: "on",
                            scrollBeyondLastLine: false,
                            wordWrap: "on",
                            formatOnPaste: true,
                            automaticLayout: true,
                            tabSize: 2,
                            padding: { top: 8 },
                        }}
                    />
                </Suspense>
            </MonacoBoundary>
        </div>
    );
}
