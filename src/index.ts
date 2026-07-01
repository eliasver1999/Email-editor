// Email Builder — Public API
// Consumer should import styles: import "email-block-builder/styles.css"
export { EmailBuilder } from "./EmailBuilder";
export type { EmailBuilderProps, MultiLocaleSaveMeta, EmailBuilderTheme } from "./EmailBuilder";
export { EmailBuilderToaster } from "./ui/Toaster";
export { renderToHtml, renderEmailHtml, exportToJson, importFromJson, defineBlock } from "./renderer/toHtml";
export type { BlockRenderer, BlockDefinition, BlockRenderContext, RenderOptions } from "./renderer/toHtml";
export { renderToText } from "./renderer/toText";
export type { RenderTextOptions } from "./renderer/toText";
export { createBlock, createStarterDocument } from "./defaults";
export { validate } from "./validate";
export type { ValidationIssue, ValidationLevel, ValidateOptions } from "./validate";
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
    FooterBlock,
    QuoteBlock,
    FileBlock,
    Padding,
    BorderStyle,
} from "./types";
export { DEFAULT_SETTINGS, BLOCK_CATALOG } from "./types";
