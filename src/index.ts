// Email Builder — Public API
// Consumer should import styles: import "email-block-builder/styles.css"
export { EmailBuilder } from "./EmailBuilder";
export type { EmailBuilderProps, MultiLocaleSaveMeta } from "./EmailBuilder";
export { EmailBuilderToaster } from "./ui/Toaster";
export { renderToHtml, renderEmailHtml, exportToJson, importFromJson, defineBlock } from "./renderer/toHtml";
export type { BlockRenderer, BlockDefinition, BlockRenderContext, RenderOptions } from "./renderer/toHtml";
export { createBlock, createStarterDocument } from "./defaults";
export type { ImageUploadFn } from "./upload";
export type {
    EmailBlock,
    CustomBlock,
    AnyBlock,
    EmailDocument,
    EmailLocale,
    EmailSettings,
    BlockType,
    TextBlock,
    HeadingBlock,
    ImageBlock,
    ButtonBlock,
    DividerBlock,
    SpacerBlock,
    ColumnsBlock,
    SocialBlock,
    HtmlBlock,
    LogoBlock,
    FooterBlock,
    QuoteBlock,
    Padding,
    BorderStyle,
} from "./types";
export { DEFAULT_SETTINGS, BLOCK_CATALOG } from "./types";
