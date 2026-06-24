import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { BLOCK_CATALOG, BlockType, BlockCatalogItem } from "../types";
import { ScrollArea, Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/primitives";
import { useTr } from "../i18n";
import {
    Type,
    Heading,
    Image,
    MousePointerClick,
    Minus,
    MoveVertical,
    Columns3,
    Share2,
    Code,
    Crown,
    Play,
    Quote,
    PanelBottom,
    GripVertical,
    LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
    Type,
    Heading,
    Image,
    MousePointerClick,
    Minus,
    MoveVertical,
    Columns3,
    Share2,
    Code,
    Crown,
    Play,
    Quote,
    PanelBottom,
};

function DraggableCatalogItem({ item, onClickAdd }: { item: BlockCatalogItem; onClickAdd?: (type: BlockType) => void }) {
    const tr = useTr();
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `catalog-${item.type}`,
        data: { type: "catalog", blockType: item.type },
    });

    const Icon = iconMap[item.icon] || Type;

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            onDoubleClick={() => onClickAdd?.(item.type)}
            className={`flex items-center gap-3 p-2.5 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50 ring-2 ring-primary" : ""}`}
        >
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{tr(`emailBuilder.block.${item.type}.label`, item.label)}</p>
                <p className="text-[10px] text-muted-foreground truncate">{tr(`emailBuilder.block.${item.type}.desc`, item.description)}</p>
            </div>
            <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
        </div>
    );
}

interface BlockSidebarProps {
    onAddBlock?: (type: BlockType) => void;
}

export function BlockSidebar({ onAddBlock }: BlockSidebarProps) {
    const tr = useTr();
    const [tab, setTab] = useState("components");

    // Two tabs: structural Layout blocks vs. the Components (content/media/etc).
    const layout = BLOCK_CATALOG.filter((b) => b.category === "layout");
    const components = BLOCK_CATALOG.filter((b) => b.category !== "layout");

    const renderItems = (items: BlockCatalogItem[]) => (
        <div className="space-y-1.5">
            {items.map((item) => (
                <DraggableCatalogItem key={item.type} item={item} onClickAdd={onAddBlock} />
            ))}
        </div>
    );

    return (
        <div className="h-full flex flex-col">
            <div className="px-4 pt-4 pb-2">
                <h3 className="font-semibold text-sm">{tr("emailBuilder.blocks", "Blocks")}</h3>
                <p className="text-[10px] text-muted-foreground">{tr("emailBuilder.dragHint", "Drag onto the canvas, or double-click to add")}</p>
            </div>
            <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="mx-4 grid grid-cols-2">
                    <TabsTrigger value="components">{tr("emailBuilder.components", "Components")}</TabsTrigger>
                    <TabsTrigger value="layout">{tr("emailBuilder.layout", "Layout")}</TabsTrigger>
                </TabsList>
                <ScrollArea className="flex-1">
                    <div className="px-4 py-3">
                        <TabsContent value="components">{renderItems(components)}</TabsContent>
                        <TabsContent value="layout">{renderItems(layout)}</TabsContent>
                    </div>
                </ScrollArea>
            </Tabs>
        </div>
    );
}
