import { useState } from "react";
import { Input, Label, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/primitives";
import { useTr } from "../i18n";
import type { MergeFieldGroup } from "../types";

/**
 * Small link form shared by the rich-text toolbar and the property panel: a URL
 * field plus (when the host provides `fieldGroups`) a "link to a field" picker so
 * the href can be a merge tag (e.g. `{{event_url}}`). `onApply` receives the raw
 * href — the caller wraps the current selection with it.
 *
 * Buttons `preventDefault` on mousedown so opening/using this form from the
 * floating toolbar doesn't blur the editor before the link is applied.
 */
export function LinkEditor({ fieldGroups, initialUrl = "https://", onApply, onCancel }: {
    fieldGroups?: MergeFieldGroup[];
    initialUrl?: string;
    onApply: (href: string) => void;
    onCancel: () => void;
}) {
    const tr = useTr();
    const [url, setUrl] = useState(initialUrl);
    const hasTags = !!fieldGroups && fieldGroups.length > 0;
    const apply = () => { const v = url.trim(); if (v) onApply(v); };
    return (
        <div className="w-64 space-y-2">
            <Label className="text-xs">{tr("emailBuilder.richText.linkUrl", "Link URL")}</Label>
            <Input
                autoFocus
                className="h-8 text-xs"
                value={url}
                placeholder={tr("emailBuilder.richText.linkPlaceholder", "https://…  or  {{tag}}")}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } }}
            />
            {hasTags && (
                <div>
                    <Label className="text-[11px] text-muted-foreground">{tr("emailBuilder.richText.orLinkToField", "…or link to a field")}</Label>
                    <Select value="" onValueChange={(token) => setUrl(token)}>
                        <SelectTrigger className="h-8 mt-1 text-xs">
                            <SelectValue placeholder={tr("emailBuilder.richText.selectTag", "Insert a field tag")} />
                        </SelectTrigger>
                        <SelectContent>
                            {fieldGroups!.flatMap((g) =>
                                g.fields.map((f) => (
                                    <SelectItem key={f.token} value={f.token}>
                                        {f.label} <span className="text-muted-foreground">{f.token}</span>
                                    </SelectItem>
                                )),
                            )}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onMouseDown={(e) => e.preventDefault()} onClick={onCancel}>
                    {tr("emailBuilder.cancel", "Cancel")}
                </Button>
                <Button size="sm" className="h-7 px-2 text-xs bg-primary" onMouseDown={(e) => e.preventDefault()} onClick={apply}>
                    {tr("emailBuilder.richText.applyLink", "Add link")}
                </Button>
            </div>
        </div>
    );
}
