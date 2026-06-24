import { useEffect, useCallback, useRef, useState } from "react";

/**
 * Warns the user before navigating away when there are unsaved changes.
 */
export function useUnsavedChanges(hasChanges: boolean) {
    useEffect(() => {
        if (!hasChanges) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [hasChanges]);
}

/**
 * Minimal toast system — stores messages and auto-clears them.
 */
export interface Toast {
    id: string;
    title: string;
    description?: string;
    variant?: "default" | "destructive";
}

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toastStore: Toast[] = [];

function notifyListeners() {
    toastListeners.forEach((fn) => fn([...toastStore]));
}

export function toast(t: Omit<Toast, "id">) {
    const id = Math.random().toString(36).slice(2);
    toastStore.push({ ...t, id });
    notifyListeners();
    setTimeout(() => {
        toastStore = toastStore.filter((tt) => tt.id !== id);
        notifyListeners();
    }, 3000);
}

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        toastListeners.push(setToasts);
        return () => {
            toastListeners = toastListeners.filter((fn) => fn !== setToasts);
        };
    }, []);

    return { toast, toasts };
}
