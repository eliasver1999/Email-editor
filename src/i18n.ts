import { createContext, useContext } from "react";

/** Translator the host can pass in (e.g. the app's i18n `t`). */
export type BuilderTFn = (key: string) => string;

export const BuilderI18nContext = createContext<BuilderTFn | undefined>(undefined);

/**
 * Build a translator that resolves `key` via the host `t`, falling back to the
 * English `fallback` when no host translator is supplied OR the host can't
 * resolve the key (the app `t` returns the key itself on a miss). This keeps the
 * builder usable standalone and lets localization roll out key-by-key without
 * ever showing a raw key.
 */
export function makeTr(t?: BuilderTFn) {
    return (key: string, fallback: string): string => {
        if (!t) return fallback;
        const value = t(key);
        return value && value !== key ? value : fallback;
    };
}

/** Hook form for components rendered under the EmailBuilder provider. */
export function useTr() {
    return makeTr(useContext(BuilderI18nContext));
}
