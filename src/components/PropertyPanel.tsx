import { useRef, useState } from "react";
import { EmailBlock, Padding, TextBlock, HeadingBlock, ImageBlock, ButtonBlock, DividerBlock, SpacerBlock, SocialBlock, HtmlBlock, LogoBlock, FooterBlock, VideoBlock, QuoteBlock, ColumnsBlock, ColumnConfig, EmailSettings, MergeFieldGroup, BorderStyle, DEFAULT_BORDER } from "../types";
import { Input, Label, Button, Slider, ScrollArea, Separator, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Popover, PopoverContent, PopoverTrigger, Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/primitives";
import { CodeEditor } from "../ui/CodeEditor";
import { useTr } from "../i18n";
import { useImageUpload } from "../upload";
import { toast } from "../ui/hooks";
import {
    AlignLeft,
    AlignCenter,
    AlignRight,
    Trash2,
    Copy,
    EyeOff,
    Eye,
    Settings,
    Braces,
    Upload,
    Loader2,
    Lock,
    Unlock,
} from "lucide-react";

/** Popover menu of personalization tokens; clicking one inserts it. */
function InsertFieldMenu({ fieldGroups, onInsert }: { fieldGroups: MergeFieldGroup[]; onInsert: (token: string) => void }) {
    const tr = useTr();
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
                    <Braces className="h-3 w-3" />
                    {tr("emailBuilder.prop.insertField", "Insert field")}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-0 max-h-72 overflow-y-auto">
                {fieldGroups.map((g) => (
                    <div key={g.category}>
                        <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {g.category}
                        </div>
                        {g.fields.map((f) => (
                            <button
                                key={f.token}
                                type="button"
                                onClick={() => onInsert(f.token)}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center justify-between gap-2"
                            >
                                <span className="truncate">{f.label}</span>
                                <code className="text-[10px] text-muted-foreground shrink-0">{f.token}</code>
                            </button>
                        ))}
                    </div>
                ))}
            </PopoverContent>
        </Popover>
    );
}

interface PropertyPanelProps {
    block: EmailBlock | null;
    onUpdate: (id: string, updates: Partial<EmailBlock>) => void;
    onDelete: (id: string) => void;
    onDuplicate: (id: string) => void;
    onToggleVisibility: (id: string) => void;
    /** Toggle a block's locked state (full editors only). */
    onToggleLock?: (id: string) => void;
    /** False = restricted editor: locked blocks are read-only and the lock toggle is hidden. */
    canManageLocks?: boolean;
    /** Personalization tokens (from useTemplateFields), shown for text-bearing blocks. */
    fieldGroups?: MergeFieldGroup[];
}

export function PropertyPanel({ block, onUpdate, onDelete, onDuplicate, onToggleVisibility, onToggleLock, canManageLocks = true, fieldGroups }: PropertyPanelProps) {
    const tr = useTr();
    if (!block) {
        return (
            <div className="h-full flex items-center justify-center p-4 text-center">
                <div>
                    <p className="text-sm text-muted-foreground">{tr("emailBuilder.prop.selectBlock", "Select a block to edit its properties")}</p>
                </div>
            </div>
        );
    }

    const update = (updates: Partial<any>) => onUpdate(block.id, updates);
    const readOnly = !!block.locked && !canManageLocks;

    return (
        <div className="h-full flex flex-col">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-sm capitalize">
                        {tr(`emailBuilder.block.${block.type}.label`, block.type)} {tr("emailBuilder.prop.block", "Block")}
                    </h3>
                </div>
                <div className="flex items-center gap-1">
                    {canManageLocks && onToggleLock && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggleLock(block.id)} title={block.locked ? tr("emailBuilder.prop.unlock", "Unlock") : tr("emailBuilder.prop.lock", "Lock")}>
                            {block.locked ? <Lock className="h-3.5 w-3.5 text-primary" /> : <Unlock className="h-3.5 w-3.5" />}
                        </Button>
                    )}
                    {!readOnly && (
                        <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggleVisibility(block.id)} title={block.hidden ? tr("emailBuilder.prop.show", "Show") : tr("emailBuilder.prop.hide", "Hide")}>
                                {block.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(block.id)} title={tr("emailBuilder.prop.duplicate", "Duplicate")}>
                                <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(block.id)} title={tr("emailBuilder.prop.delete", "Delete")}>
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <ScrollArea className="flex-1">
                {readOnly ? (
                    <div className="px-4 py-8 text-center">
                        <Lock className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">{tr("emailBuilder.prop.lockedNotice", "This block is locked and can't be edited.")}</p>
                    </div>
                ) : (
                <div className="px-4 pb-4 space-y-4">
                    {/* Type-specific properties */}
                    {block.type === "text" && <TextProps block={block} update={update} />}
                    {block.type === "heading" && <HeadingProps block={block} update={update} />}
                    {block.type === "image" && <ImageProps block={block} update={update} />}
                    {block.type === "button" && <ButtonProps block={block} update={update} />}
                    {block.type === "divider" && <DividerProps block={block} update={update} />}
                    {block.type === "spacer" && <SpacerProps block={block} update={update} />}
                    {block.type === "social" && <SocialProps block={block} update={update} />}
                    {block.type === "html" && <HtmlProps block={block} update={update} />}
                    {block.type === "logo" && <LogoProps block={block} update={update} />}
                    {block.type === "footer" && <FooterProps block={block} update={update} />}
                    {block.type === "video" && <VideoProps block={block} update={update} />}
                    {block.type === "quote" && <QuoteProps block={block} update={update} />}
                    {block.type === "columns" && <ColumnsProps block={block} update={update} />}

                    {/* Personalization — insert merge tags into any text-bearing block. */}
                    {fieldGroups && fieldGroups.length > 0 && "content" in block && (
                        <div>
                            <h4 className="text-xs font-medium text-muted-foreground mb-2">{tr("emailBuilder.prop.personalization", "PERSONALIZATION")}</h4>
                            <InsertFieldMenu
                                fieldGroups={fieldGroups}
                                onInsert={(token) =>
                                    update({ content: block.content ? `${block.content} ${token}` : token })
                                }
                            />
                        </div>
                    )}

                    <Separator />

                    {/* Common properties */}
                    <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">{tr("emailBuilder.prop.padding", "PADDING")}</h4>
                        <PaddingEditor padding={block.padding} onChange={(p) => update({ padding: p })} />
                    </div>

                    <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">{tr("emailBuilder.prop.background", "BACKGROUND")}</h4>
                        <ColorInput label={tr("emailBuilder.prop.color", "Color")} value={block.backgroundColor} onChange={(v) => update({ backgroundColor: v })} />
                    </div>
                </div>
                )}
            </ScrollArea>
        </div>
    );
}

// --- Type-specific property editors ---

function TextProps({ block, update }: { block: TextBlock; update: (u: Partial<TextBlock>) => void }) {
    const tr = useTr();
    return (
        <div className="space-y-3">
            <div>
                <Label className="text-xs">{tr("emailBuilder.prop.contentHtml", "Content (HTML)")}</Label>
                <textarea
                    className="w-full h-24 mt-1 text-xs p-2 border rounded-md bg-background resize-none font-mono"
                    value={block.content}
                    onChange={(e) => update({ content: e.target.value })}
                />
            </div>
            <ColorInput label={tr("emailBuilder.prop.textColor", "Text Color")} value={block.color} onChange={(v) => update({ color: v })} />
            <SliderField label={tr("emailBuilder.prop.fontSize", "Font Size")} value={block.fontSize} min={10} max={36} onChange={(v) => update({ fontSize: v })} suffix="px" />
            <SliderField label={tr("emailBuilder.prop.lineHeight", "Line Height")} value={block.lineHeight} min={1} max={3} step={0.1} onChange={(v) => update({ lineHeight: v })} />
            <FontFamilySelect value={block.fontFamily} onChange={(v) => update({ fontFamily: v })} />
            <AlignSelect value={block.textAlign} onChange={(v) => update({ textAlign: v })} />
        </div>
    );
}

function HeadingProps({ block, update }: { block: HeadingBlock; update: (u: Partial<HeadingBlock>) => void }) {
    const tr = useTr();
    return (
        <div className="space-y-3">
            <div>
                <Label className="text-xs">{tr("emailBuilder.prop.text", "Text")}</Label>
                <Input className="h-8 mt-1 text-sm" value={block.content} onChange={(e) => update({ content: e.target.value })} />
            </div>
            <div>
                <Label className="text-xs">{tr("emailBuilder.prop.level", "Level")}</Label>
                <Select value={String(block.level)} onValueChange={(v) => update({ level: Number(v) as 1 | 2 | 3 })}>
                    <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1">{tr("emailBuilder.prop.levelLarge", "H1 — Large")}</SelectItem>
                        <SelectItem value="2">{tr("emailBuilder.prop.levelMedium", "H2 — Medium")}</SelectItem>
                        <SelectItem value="3">{tr("emailBuilder.prop.levelSmall", "H3 — Small")}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <ColorInput label={tr("emailBuilder.prop.textColor", "Text Color")} value={block.color} onChange={(v) => update({ color: v })} />
            <FontFamilySelect value={block.fontFamily} onChange={(v) => update({ fontFamily: v })} />
            <AlignSelect value={block.textAlign} onChange={(v) => update({ textAlign: v })} />
        </div>
    );
}

/**
 * URL text field with an optional "upload" button. The button appears only when
 * the host passes `<EmailBuilder onImageUpload={…} />`; otherwise the field stays
 * URL-only. On pick it calls the host uploader and writes the returned URL.
 */
function ImageInput({ value, onChange, placeholder }: { value: string; onChange: (url: string) => void; placeholder?: string }) {
    const tr = useTr();
    const onImageUpload = useImageUpload();
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleFile = async (file: File | undefined) => {
        if (!file || !onImageUpload) return;
        setUploading(true);
        try {
            const url = await onImageUpload(file);
            if (url) onChange(url);
        } catch (err) {
            toast({
                title: tr("emailBuilder.prop.uploadFailed", "Image upload failed"),
                description: err instanceof Error ? err.message : undefined,
                variant: "destructive",
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="mt-1 flex items-center gap-1.5">
            <Input
                className="h-8 text-xs flex-1"
                placeholder={placeholder ?? "https://..."}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            {onImageUpload && (
                <>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            handleFile(e.target.files?.[0]);
                            e.target.value = ""; // allow re-picking the same file
                        }}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        disabled={uploading}
                        title={tr("emailBuilder.prop.uploadImage", "Upload image")}
                        onClick={() => inputRef.current?.click()}
                    >
                        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    </Button>
                </>
            )}
        </div>
    );
}

function ImageProps({ block, update }: { block: ImageBlock; update: (u: Partial<ImageBlock>) => void }) {
    const tr = useTr();
    return (
        <div className="space-y-3">
            <div>
                <Label className="text-xs">{tr("emailBuilder.prop.imageUrl", "Image URL")}</Label>
                <ImageInput value={block.src} onChange={(src) => update({ src })} />
            </div>
            <div>
                <Label className="text-xs">{tr("emailBuilder.prop.altText", "Alt Text")}</Label>
                <Input className="h-8 mt-1 text-xs" value={block.alt} onChange={(e) => update({ alt: e.target.value })} />
            </div>
            <div>
                <Label className="text-xs">{tr("emailBuilder.prop.linkUrl", "Link URL")}</Label>
                <Input className="h-8 mt-1 text-xs" placeholder="https://..." value={block.href} onChange={(e) => update({ href: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
                <input type="checkbox" id="img-full-width" checked={block.width === "auto"} onChange={(e) => update({ width: e.target.checked ? "auto" : 100 })} className="rounded" />
                <Label htmlFor="img-full-width" className="text-xs">{tr("emailBuilder.prop.fullWidth", "Full width")}</Label>
            </div>
            {block.width !== "auto" && (
                <SliderField label={tr("emailBuilder.prop.width", "Width")} value={block.width} min={10} max={100} onChange={(v) => update({ width: v })} suffix="%" />
            )}
            <AlignSelect value={block.align} onChange={(v) => update({ align: v })} />
            <SliderField label={tr("emailBuilder.prop.borderWidth", "Border Width")} value={block.border.width} min={0} max={10} onChange={(v) => update({ border: { ...block.border, width: v } })} suffix="px" />
            {block.border.width > 0 && (
                <ColorInput label={tr("emailBuilder.prop.borderColor", "Border Color")} value={block.border.color} onChange={(v) => update({ border: { ...block.border, color: v } })} />
            )}
            <SliderField label={tr("emailBuilder.prop.borderRadius", "Border Radius")} value={block.border.radius} min={0} max={50} onChange={(v) => update({ border: { ...block.border, radius: v } })} suffix="px" />
        </div>
    );
}

function ButtonProps({ block, update }: { block: ButtonBlock; update: (u: Partial<ButtonBlock>) => void }) {
    const tr = useTr();
    return (
        <div className="space-y-3">
            <div>
                <Label className="text-xs">{tr("emailBuilder.prop.buttonText", "Button Text")}</Label>
                <Input className="h-8 mt-1 text-sm" value={block.text} onChange={(e) => update({ text: e.target.value })} />
            </div>
            <div>
                <Label className="text-xs">{tr("emailBuilder.prop.linkUrl", "Link URL")}</Label>
                <Input className="h-8 mt-1 text-xs" placeholder="https://..." value={block.href} onChange={(e) => update({ href: e.target.value })} />
            </div>
            <ColorInput label={tr("emailBuilder.prop.buttonColor", "Button Color")} value={block.backgroundColor} onChange={(v) => update({ backgroundColor: v })} />
            <ColorInput label={tr("emailBuilder.prop.textColor", "Text Color")} value={block.color} onChange={(v) => update({ color: v })} />
            <SliderField label={tr("emailBuilder.prop.fontSize", "Font Size")} value={block.fontSize} min={12} max={24} onChange={(v) => update({ fontSize: v })} suffix="px" />
            <SliderField label={tr("emailBuilder.prop.borderRadius", "Border Radius")} value={block.borderRadius} min={0} max={50} onChange={(v) => update({ borderRadius: v })} suffix="px" />
            <AlignSelect value={block.align} onChange={(v) => update({ align: v })} />
            <div className="flex items-center gap-2">
                <input type="checkbox" id="fullWidth" checked={block.fullWidth} onChange={(e) => update({ fullWidth: e.target.checked })} className="rounded" />
                <Label htmlFor="fullWidth" className="text-xs">{tr("emailBuilder.prop.fullWidth", "Full Width")}</Label>
            </div>
        </div>
    );
}

function DividerProps({ block, update }: { block: DividerBlock; update: (u: Partial<DividerBlock>) => void }) {
    const tr = useTr();
    return (
        <div className="space-y-3">
            <ColorInput label={tr("emailBuilder.prop.color", "Color")} value={block.color} onChange={(v) => update({ color: v })} />
            <SliderField label={tr("emailBuilder.prop.thickness", "Thickness")} value={block.thickness} min={1} max={10} onChange={(v) => update({ thickness: v })} suffix="px" />
            <SliderField label={tr("emailBuilder.prop.width", "Width")} value={block.width} min={10} max={100} onChange={(v) => update({ width: v })} suffix="%" />
            <div>
                <Label className="text-xs">{tr("emailBuilder.prop.style", "Style")}</Label>
                <Select value={block.style} onValueChange={(v) => update({ style: v as any })}>
                    <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="solid">{tr("emailBuilder.prop.solid", "Solid")}</SelectItem>
                        <SelectItem value="dashed">{tr("emailBuilder.prop.dashed", "Dashed")}</SelectItem>
                        <SelectItem value="dotted">{tr("emailBuilder.prop.dotted", "Dotted")}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

function SpacerProps({ block, update }: { block: SpacerBlock; update: (u: Partial<SpacerBlock>) => void }) {
    const tr = useTr();
    return (
        <div className="space-y-3">
            <SliderField label={tr("emailBuilder.prop.height", "Height")} value={block.height} min={5} max={100} onChange={(v) => update({ height: v })} suffix="px" />
        </div>
    );
}

function SocialProps({ block, update }: { block: SocialBlock; update: (u: Partial<SocialBlock>) => void }) {
    const tr = useTr();
    return (
        <div className="space-y-3">
            <SliderField label={tr("emailBuilder.prop.iconSize", "Icon Size")} value={block.iconSize} min={16} max={64} onChange={(v) => update({ iconSize: v })} suffix="px" />
            <SliderField label={tr("emailBuilder.prop.gap", "Gap")} value={block.gap} min={0} max={30} onChange={(v) => update({ gap: v })} suffix="px" />
            <AlignSelect value={block.align} onChange={(v) => update({ align: v })} />
            <div>
                <Label className="text-xs">{tr("emailBuilder.prop.iconStyle", "Icon Style")}</Label>
                <Select value={block.iconStyle} onValueChange={(v) => update({ iconStyle: v as any })}>
                    <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="color">{tr("emailBuilder.prop.color", "Color")}</SelectItem>
                        <SelectItem value="dark">{tr("emailBuilder.prop.dark", "Dark")}</SelectItem>
                        <SelectItem value="light">{tr("emailBuilder.prop.light", "Light")}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Separator />
            <div className="space-y-2">
                <Label className="text-xs">{tr("emailBuilder.prop.links", "Links")}</Label>
                {block.links.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                        <span className="text-[10px] w-16 capitalize text-muted-foreground">{link.platform}</span>
                        <Input
                            className="h-7 text-xs flex-1"
                            value={link.url}
                            placeholder="URL"
                            onChange={(e) => {
                                const newLinks = [...block.links];
                                newLinks[idx] = { ...link, url: e.target.value };
                                update({ links: newLinks });
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

function HtmlProps({ block, update }: { block: HtmlBlock; update: (u: Partial<HtmlBlock>) => void }) {
    const tr = useTr();
    const [tab, setTab] = useState<"html" | "css">("html");
    return (
        <div className="space-y-2">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "html" | "css")}>
                <TabsList className="w-full">
                    <TabsTrigger value="html" className="flex-1">{tr("emailBuilder.prop.htmlTab", "HTML")}</TabsTrigger>
                    <TabsTrigger value="css" className="flex-1">{tr("emailBuilder.prop.cssTab", "CSS")}</TabsTrigger>
                </TabsList>
                <TabsContent value="html" className="mt-2">
                    <CodeEditor
                        language="html"
                        value={block.content}
                        onChange={(content) => update({ content })}
                        ariaLabel={tr("emailBuilder.prop.htmlCode", "HTML Code")}
                    />
                </TabsContent>
                <TabsContent value="css" className="mt-2">
                    <CodeEditor
                        language="css"
                        value={block.css ?? ""}
                        onChange={(css) => update({ css })}
                        ariaLabel={tr("emailBuilder.prop.cssCode", "CSS")}
                    />
                    <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
                        {tr("emailBuilder.prop.cssHint", "Added to the email <head>. CSS support varies by email client — inline styles are safest.")}
                    </p>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function LogoProps({ block, update }: { block: LogoBlock; update: (u: Partial<LogoBlock>) => void }) {
    const tr = useTr();
    const border = block.border ?? DEFAULT_BORDER;
    return (
        <div className="space-y-3">
            <div>
                <Label className="text-xs">{tr("emailBuilder.prop.logoUrl", "Logo URL")}</Label>
                <ImageInput value={block.src} onChange={(src) => update({ src })} />
            </div>
            <div>
                <Label className="text-xs">{tr("emailBuilder.prop.altText", "Alt Text")}</Label>
                <Input className="h-8 mt-1 text-xs" value={block.alt} onChange={(e) => update({ alt: e.target.value })} />
            </div>
            <div>
                <Label className="text-xs">{tr("emailBuilder.prop.linkUrl", "Link URL")}</Label>
                <Input className="h-8 mt-1 text-xs" placeholder="https://..." value={block.href} onChange={(e) => update({ href: e.target.value })} />
            </div>
            <SliderField label={tr("emailBuilder.prop.width", "Width")} value={block.width} min={50} max={400} onChange={(v) => update({ width: v })} suffix="px" />
            <AlignSelect value={block.align} onChange={(v) => update({ align: v })} />
            <SliderField label={tr("emailBuilder.prop.borderWidth", "Border Width")} value={border.width} min={0} max={10} onChange={(v) => update({ border: { ...border, width: v } })} suffix="px" />
            {border.width > 0 && (
                <ColorInput label={tr("emailBuilder.prop.borderColor", "Border Color")} value={border.color} onChange={(v) => update({ border: { ...border, color: v } })} />
            )}
            <SliderField label={tr("emailBuilder.prop.borderRadius", "Border Radius")} value={border.radius} min={0} max={50} onChange={(v) => update({ border: { ...border, radius: v } })} suffix="px" />
        </div>
    );
}

function FooterProps({ block, update }: { block: FooterBlock; update: (u: Partial<FooterBlock>) => void }) {
    const tr = useTr();
    return (
        <div className="space-y-3">
            <div>
                <Label className="text-xs">{tr("emailBuilder.prop.contentHtml", "Content (HTML)")}</Label>
                <textarea
                    className="w-full h-24 mt-1 text-xs p-2 border rounded-md bg-background resize-none font-mono"
                    value={block.content}
                    onChange={(e) => update({ content: e.target.value })}
                />
            </div>
            <ColorInput label={tr("emailBuilder.prop.textColor", "Text Color")} value={block.color} onChange={(v) => update({ color: v })} />
            <SliderField label={tr("emailBuilder.prop.fontSize", "Font Size")} value={block.fontSize} min={8} max={16} onChange={(v) => update({ fontSize: v })} suffix="px" />
            <AlignSelect value={block.textAlign} onChange={(v) => update({ textAlign: v })} />
        </div>
    );
}

function VideoProps({ block, update }: { block: VideoBlock; update: (u: Partial<VideoBlock>) => void }) {
    const tr = useTr();
    return (
        <div className="space-y-3">
            <div>
                <Label className="text-xs">{tr("emailBuilder.prop.thumbnailUrl", "Thumbnail URL")}</Label>
                <ImageInput value={block.thumbnailUrl} onChange={(url) => update({ thumbnailUrl: url })} />
            </div>
            <div>
                <Label className="text-xs">{tr("emailBuilder.prop.videoUrl", "Video URL")}</Label>
                <Input className="h-8 mt-1 text-xs" placeholder="https://youtube.com/..." value={block.videoUrl} onChange={(e) => update({ videoUrl: e.target.value })} />
            </div>
            <div>
                <Label className="text-xs">{tr("emailBuilder.prop.altText", "Alt Text")}</Label>
                <Input className="h-8 mt-1 text-xs" value={block.alt} onChange={(e) => update({ alt: e.target.value })} />
            </div>
            <AlignSelect value={block.align} onChange={(v) => update({ align: v })} />
        </div>
    );
}

function QuoteProps({ block, update }: { block: QuoteBlock; update: (u: Partial<QuoteBlock>) => void }) {
    const tr = useTr();
    return (
        <div className="space-y-3">
            <div>
                <Label className="text-xs">{tr("emailBuilder.prop.quoteText", "Quote Text")}</Label>
                <textarea
                    className="w-full h-20 mt-1 text-xs p-2 border rounded-md bg-background resize-none"
                    value={block.content}
                    onChange={(e) => update({ content: e.target.value })}
                />
            </div>
            <div>
                <Label className="text-xs">{tr("emailBuilder.prop.author", "Author")}</Label>
                <Input className="h-8 mt-1 text-xs" value={block.author} onChange={(e) => update({ author: e.target.value })} />
            </div>
            <ColorInput label={tr("emailBuilder.prop.textColor", "Text Color")} value={block.color} onChange={(v) => update({ color: v })} />
            <ColorInput label={tr("emailBuilder.prop.borderColor", "Border Color")} value={block.borderColor} onChange={(v) => update({ borderColor: v })} />
            <SliderField label={tr("emailBuilder.prop.fontSize", "Font Size")} value={block.fontSize} min={12} max={28} onChange={(v) => update({ fontSize: v })} suffix="px" />
            <AlignSelect value={block.textAlign} onChange={(v) => update({ textAlign: v })} />
        </div>
    );
}

const MAX_COLUMNS = 4;

function ColumnsProps({ block, update }: { block: ColumnsBlock; update: (u: Partial<ColumnsBlock>) => void }) {
    const tr = useTr();
    const presets: { label: string; widths: number[] }[] = [
        { label: "1", widths: [100] },
        { label: "2", widths: [50, 50] },
        { label: "3", widths: [33, 34, 33] },
        { label: "4", widths: [25, 25, 25, 25] },
        { label: "⅓ + ⅔", widths: [34, 66] },
        { label: "⅔ + ⅓", widths: [66, 34] },
        { label: "1·2·1", widths: [25, 50, 25] },
    ];
    const currentKey = block.columns.map((c) => c.width).join("-");
    const count = block.columns.length;

    // Rebuild the columns array to `widths`, preserving each column's children
    // by index; when shrinking, fold the removed columns' blocks into the last
    // remaining column so nothing is silently dropped.
    const withChildrenPreserved = (widths: number[]): ColumnConfig[] => {
        const next: ColumnConfig[] = widths.map((w, i) => ({
            width: w,
            blocks: block.columns[i]?.blocks ?? [],
        }));
        if (count > widths.length) {
            const overflow = block.columns.slice(widths.length).flatMap((c) => c.blocks);
            const last = next.length - 1;
            next[last] = { ...next[last], blocks: [...next[last].blocks, ...overflow] };
        }
        return next;
    };

    const equalWidths = (n: number): number[] => {
        const base = Math.floor(100 / n);
        return Array.from({ length: n }, (_, i) => (i === n - 1 ? 100 - base * (n - 1) : base));
    };

    const applyPreset = (widths: number[]) => update({ columns: withChildrenPreserved(widths) });
    const addColumn = () => count < MAX_COLUMNS && update({ columns: withChildrenPreserved(equalWidths(count + 1)) });
    const removeColumn = () => count > 1 && update({ columns: withChildrenPreserved(equalWidths(count - 1)) });
    const equalize = () => update({ columns: withChildrenPreserved(equalWidths(count)) });

    return (
        <div className="space-y-3">
            <div>
                <Label className="text-xs">{tr("emailBuilder.layout", "Layout")}</Label>
                <div className="flex flex-wrap items-center gap-1 mt-1">
                    {presets.map((p) => {
                        const active = p.widths.join("-") === currentKey;
                        return (
                            <Button
                                key={p.label}
                                variant={active ? "default" : "outline"}
                                size="sm"
                                className={`h-8 px-2 text-xs ${active ? "bg-primary" : ""}`}
                                onClick={() => applyPreset(p.widths)}
                            >
                                {p.label}
                            </Button>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={count <= 1} onClick={removeColumn}>
                    − {tr("emailBuilder.prop.column", "Column")}
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums w-4 text-center">{count}</span>
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={count >= MAX_COLUMNS} onClick={addColumn}>
                    + {tr("emailBuilder.prop.column", "Column")}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs ml-auto" onClick={equalize}>
                    {tr("emailBuilder.prop.equalize", "Equalize")}
                </Button>
            </div>

            <SliderField label={tr("emailBuilder.prop.gap", "Gap")} value={block.gap} min={0} max={40} onChange={(v) => update({ gap: v })} suffix="px" />

            <div>
                <Label className="text-xs">{tr("emailBuilder.prop.columnWidths", "Column widths (%)")}</Label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                    {block.columns.map((c, i) => (
                        <Input
                            key={i}
                            type="number"
                            className="h-7 text-xs"
                            value={c.width}
                            min={5}
                            max={100}
                            onChange={(e) => {
                                const w = parseInt(e.target.value) || 0;
                                update({
                                    columns: block.columns.map((col, idx) =>
                                        idx === i ? { ...col, width: w } : col,
                                    ),
                                });
                            }}
                        />
                    ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{tr("emailBuilder.prop.widthsHint", "Widths should add up to ~100%.")}</p>
            </div>
        </div>
    );
}

// --- Document-level settings (shown when no block is selected) ---

export function EmailSettingsPanel({
    settings,
    onUpdate,
}: {
    settings: EmailSettings;
    onUpdate: (u: Partial<EmailSettings>) => void;
}) {
    const tr = useTr();
    const border = settings.contentBorder ?? DEFAULT_BORDER;
    return (
        <div className="h-full flex flex-col">
            <div className="px-4 pt-4 pb-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    {tr("emailBuilder.settings", "Email settings")}
                </h3>
                <p className="text-[10px] text-muted-foreground">{tr("emailBuilder.settingsPanel.appliesToWhole", "Applies to the whole email")}</p>
            </div>
            <ScrollArea className="flex-1">
                <div className="px-4 pb-4 space-y-4">
                    <div>
                        <Label className="text-xs">{tr("emailBuilder.settingsPanel.preheader", "Preheader (inbox preview text)")}</Label>
                        <Input
                            className="h-8 mt-1 text-xs"
                            value={settings.preheaderText}
                            placeholder={tr("emailBuilder.settingsPanel.preheaderPlaceholder", "Shown after the subject in most inboxes")}
                            onChange={(e) => onUpdate({ preheaderText: e.target.value })}
                        />
                    </div>
                    <SliderField label={tr("emailBuilder.settingsPanel.contentWidth", "Content width")} value={settings.contentWidth} min={320} max={800} step={10} onChange={(v) => onUpdate({ contentWidth: v })} suffix="px" />
                    <FontFamilySelect value={settings.fontFamily} onChange={(v) => onUpdate({ fontFamily: v })} />
                    <Separator />
                    <ColorInput label={tr("emailBuilder.settingsPanel.bodyBackground", "Body background")} value={settings.backgroundColor} onChange={(v) => onUpdate({ backgroundColor: v })} />
                    <ColorInput label={tr("emailBuilder.settingsPanel.contentBackground", "Content background")} value={settings.contentBackgroundColor} onChange={(v) => onUpdate({ contentBackgroundColor: v })} />
                    <ColorInput label={tr("emailBuilder.settingsPanel.textColor", "Text color")} value={settings.textColor} onChange={(v) => onUpdate({ textColor: v })} />
                    <ColorInput label={tr("emailBuilder.settingsPanel.linkColor", "Link color")} value={settings.linkColor} onChange={(v) => onUpdate({ linkColor: v })} />
                    <Separator />
                    <div className="space-y-3">
                        <Label className="text-xs font-medium">{tr("emailBuilder.settingsPanel.border", "Border")}</Label>
                        <SliderField label={tr("emailBuilder.settingsPanel.borderWidth", "Width")} value={border.width} min={0} max={10} onChange={(v) => onUpdate({ contentBorder: { ...border, width: v } })} suffix="px" />
                        <div>
                            <Label className="text-xs">{tr("emailBuilder.settingsPanel.borderStyle", "Style")}</Label>
                            <Select value={border.style} onValueChange={(v) => onUpdate({ contentBorder: { ...border, style: v as BorderStyle["style"] } })}>
                                <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{tr("emailBuilder.settingsPanel.borderNone", "None")}</SelectItem>
                                    <SelectItem value="solid">{tr("emailBuilder.settingsPanel.borderSolid", "Solid")}</SelectItem>
                                    <SelectItem value="dashed">{tr("emailBuilder.settingsPanel.borderDashed", "Dashed")}</SelectItem>
                                    <SelectItem value="dotted">{tr("emailBuilder.settingsPanel.borderDotted", "Dotted")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <ColorInput label={tr("emailBuilder.settingsPanel.borderColor", "Color")} value={border.color} onChange={(v) => onUpdate({ contentBorder: { ...border, color: v } })} />
                        <SliderField label={tr("emailBuilder.settingsPanel.borderRadius", "Corner radius")} value={border.radius} min={0} max={40} onChange={(v) => onUpdate({ contentBorder: { ...border, radius: v } })} suffix="px" />
                    </div>
                    <Separator />
                    <div>
                        <Label className="text-xs">{tr("emailBuilder.settingsPanel.customCss", "Custom CSS")}</Label>
                        <p className="text-[10px] leading-snug text-muted-foreground mt-0.5 mb-1.5">
                            {tr("emailBuilder.settingsPanel.customCssHint", "Injected into the email <head>; applies to the whole email. Support varies by client — inline styles are safest.")}
                        </p>
                        <CodeEditor
                            language="css"
                            value={settings.customCss ?? ""}
                            onChange={(customCss) => onUpdate({ customCss })}
                            height={180}
                            ariaLabel={tr("emailBuilder.settingsPanel.customCss", "Custom CSS")}
                        />
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}

// --- Reusable field components ---

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div>
            <Label className="text-xs">{label}</Label>
            <div className="flex items-center gap-2 mt-1">
                <input
                    type="color"
                    value={value === "transparent" ? "#ffffff" : value}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-8 w-8 rounded cursor-pointer border"
                />
                <Input className="h-8 text-xs flex-1" value={value} onChange={(e) => onChange(e.target.value)} />
            </div>
        </div>
    );
}

function SliderField({ label, value, min, max, step = 1, onChange, suffix }: {
    label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string;
}) {
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">{label}</Label>
                <span className="text-[10px] text-muted-foreground">{value}{suffix}</span>
            </div>
            <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} className="mt-1" />
        </div>
    );
}

function FontFamilySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const tr = useTr();
    return (
        <div>
            <Label className="text-xs">{tr("emailBuilder.prop.fontFamily", "Font Family")}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                    <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
                    <SelectItem value="Georgia, serif">Georgia</SelectItem>
                    <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                    <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
                    <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}

function AlignSelect({ value, onChange }: { value: string; onChange: (v: any) => void }) {
    const tr = useTr();
    return (
        <div>
            <Label className="text-xs">{tr("emailBuilder.prop.alignment", "Alignment")}</Label>
            <div className="flex items-center gap-1 mt-1">
                {(["left", "center", "right"] as const).map((align) => {
                    const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
                    return (
                        <Button
                            key={align}
                            variant={value === align ? "default" : "outline"}
                            size="icon"
                            className={`h-8 w-8 ${value === align ? "bg-primary" : ""}`}
                            onClick={() => onChange(align)}
                        >
                            <Icon className="h-3.5 w-3.5" />
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}

function PaddingEditor({ padding, onChange }: { padding: Padding; onChange: (p: Padding) => void }) {
    const tr = useTr();
    const sideLabels: Record<"top" | "right" | "bottom" | "left", string> = {
        top: tr("emailBuilder.prop.top", "Top"),
        right: tr("emailBuilder.prop.right", "Right"),
        bottom: tr("emailBuilder.prop.bottom", "Bottom"),
        left: tr("emailBuilder.prop.left", "Left"),
    };
    return (
        <div className="grid grid-cols-2 gap-2">
            {(["top", "right", "bottom", "left"] as const).map((side) => (
                <div key={side}>
                    <Label className="text-[10px] text-muted-foreground">{sideLabels[side]}</Label>
                    <Input
                        type="number"
                        className="h-7 text-xs mt-0.5"
                        value={padding[side]}
                        min={0}
                        onChange={(e) => onChange({ ...padding, [side]: parseInt(e.target.value) || 0 })}
                    />
                </div>
            ))}
        </div>
    );
}
