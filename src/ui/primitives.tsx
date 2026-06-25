/**
 * Self-contained UI primitives for the Email Builder.
 * These are minimal, unstyled-by-default components that use Tailwind CSS classes.
 * No external UI library dependencies.
 */
import React, { forwardRef, useState, useRef, useEffect, createContext, useContext } from "react";
import { cn } from "./utils";

// ============================================================
// BUTTON
// ============================================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "ghost" | "outline";
    size?: "default" | "sm" | "icon";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        const variants: Record<string, string> = {
            default: "bg-primary text-primary-foreground hover:bg-primary/90",
            ghost: "hover:bg-accent hover:text-accent-foreground",
            outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        };
        const sizes: Record<string, string> = {
            default: "h-9 px-4 py-2",
            sm: "h-8 px-3 text-xs",
            icon: "h-9 w-9",
        };
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                    variants[variant],
                    sizes[size],
                    className,
                )}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

// ============================================================
// INPUT
// ============================================================
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, type, ...props }, ref) => (
        <input
            type={type}
            ref={ref}
            className={cn(
                "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            {...props}
        />
    )
);
Input.displayName = "Input";

// ============================================================
// LABEL
// ============================================================
export const Label = forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
    ({ className, ...props }, ref) => (
        <label
            ref={ref}
            className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}
            {...props}
        />
    )
);
Label.displayName = "Label";

// ============================================================
// SLIDER
// ============================================================
interface SliderProps {
    value: number[];
    min: number;
    max: number;
    step?: number;
    onValueChange: (value: number[]) => void;
    className?: string;
}

export function Slider({ value, min, max, step = 1, onValueChange, className }: SliderProps) {
    const percent = ((value[0] - min) / (max - min)) * 100;
    return (
        <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
            <div className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
                <div className="absolute h-full bg-primary rounded-full" style={{ width: `${percent}%` }} />
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value[0]}
                onChange={(e) => onValueChange([parseFloat(e.target.value)])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
                className="absolute h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors"
                style={{ left: `calc(${percent}% - 8px)` }}
            />
        </div>
    );
}

// ============================================================
// SEPARATOR
// ============================================================
export function Separator({ className, orientation = "horizontal" }: { className?: string; orientation?: "horizontal" | "vertical" }) {
    return (
        <div
            className={cn(
                "shrink-0 bg-border",
                orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
                className,
            )}
        />
    );
}

// ============================================================
// SCROLL AREA (simple overflow wrapper)
// ============================================================
export function ScrollArea({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("overflow-y-auto overflow-x-hidden", className)}>
            {children}
        </div>
    );
}

// ============================================================
// SELECT
// ============================================================
interface SelectContextValue {
    value: string;
    onValueChange: (v: string) => void;
    open: boolean;
    setOpen: (o: boolean) => void;
}
const SelectContext = createContext<SelectContextValue | null>(null);

export function Select({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    return (
        <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
            <div className="relative">
                {children}
            </div>
        </SelectContext.Provider>
    );
}

export function SelectTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
    const ctx = useContext(SelectContext)!;
    return (
        <button
            type="button"
            onClick={() => ctx.setOpen(!ctx.open)}
            className={cn(
                "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
                className,
            )}
        >
            {children}
            <svg className="h-4 w-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
    );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
    const ctx = useContext(SelectContext)!;
    return <span className="truncate">{ctx.value || placeholder || ""}</span>;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
    const ctx = useContext(SelectContext)!;
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ctx.open) return;
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                ctx.setOpen(false);
            }
        };
        window.document.addEventListener("mousedown", handleClick);
        return () => window.document.removeEventListener("mousedown", handleClick);
    }, [ctx.open]);

    if (!ctx.open) return null;
    return (
        <div
            ref={ref}
            className="absolute z-50 mt-1 w-full min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
        >
            <div className="p-1 max-h-48 overflow-y-auto">{children}</div>
        </div>
    );
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
    const ctx = useContext(SelectContext)!;
    return (
        <div
            className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                ctx.value === value && "bg-accent text-accent-foreground",
            )}
            onClick={() => { ctx.onValueChange(value); ctx.setOpen(false); }}
        >
            {children}
        </div>
    );
}

// ============================================================
// TABS
// ============================================================
interface TabsContextValue {
    value: string;
    onValueChange: (v: string) => void;
}
const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({ value, onValueChange, children, className }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode; className?: string }) {
    return (
        <TabsContext.Provider value={{ value, onValueChange }}>
            <div className={className}>{children}</div>
        </TabsContext.Provider>
    );
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className)}>
            {children}
        </div>
    );
}

export function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
    const ctx = useContext(TabsContext)!;
    return (
        <button
            type="button"
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none",
                ctx.value === value ? "bg-background text-foreground shadow" : "hover:bg-background/50",
                className,
            )}
            onClick={() => ctx.onValueChange(value)}
        >
            {children}
        </button>
    );
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
    const ctx = useContext(TabsContext)!;
    if (ctx.value !== value) return null;
    return <div className={className}>{children}</div>;
}

// ============================================================
// POPOVER
// ============================================================
interface PopoverContextValue {
    open: boolean;
    setOpen: (o: boolean) => void;
}
const PopoverContext = createContext<PopoverContextValue | null>(null);

export function Popover({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    return (
        <PopoverContext.Provider value={{ open, setOpen }}>
            <div className="relative inline-block">{children}</div>
        </PopoverContext.Provider>
    );
}

export function PopoverTrigger({ children, asChild }: { children: React.ReactElement; asChild?: boolean }) {
    const ctx = useContext(PopoverContext)!;
    if (asChild) {
        return React.cloneElement(children, { onClick: () => ctx.setOpen(!ctx.open) } as any);
    }
    return <button onClick={() => ctx.setOpen(!ctx.open)}>{children}</button>;
}

export function PopoverContent({ children, className, align = "start" }: { children: React.ReactNode; className?: string; align?: "start" | "end" }) {
    const ctx = useContext(PopoverContext)!;
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ctx.open) return;
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                ctx.setOpen(false);
            }
        };
        window.document.addEventListener("mousedown", handleClick);
        return () => window.document.removeEventListener("mousedown", handleClick);
    }, [ctx.open]);

    if (!ctx.open) return null;
    return (
        <div
            ref={ref}
            className={cn(
                "absolute z-50 mt-2 rounded-md border bg-popover p-4 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
                align === "end" ? "right-0" : "left-0",
                className,
            )}
        >
            {children}
        </div>
    );
}

/** Returns a function that closes the enclosing Popover (use inside PopoverContent). */
export function usePopoverClose() {
    const ctx = useContext(PopoverContext);
    return () => ctx?.setOpen(false);
}
