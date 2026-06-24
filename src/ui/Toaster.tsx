import { useToast } from "./hooks";
import { cn } from "./utils";

export function EmailBuilderToaster() {
    const { toasts } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="email-builder fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={cn(
                        "px-4 py-3 rounded-lg shadow-lg border text-sm animate-in slide-in-from-bottom-2 fade-in-0",
                        t.variant === "destructive"
                            ? "bg-destructive text-destructive-foreground border-destructive"
                            : "bg-card text-card-foreground border-border"
                    )}
                >
                    <p className="font-medium">{t.title}</p>
                    {t.description && <p className="text-xs opacity-80 mt-0.5">{t.description}</p>}
                </div>
            ))}
        </div>
    );
}
