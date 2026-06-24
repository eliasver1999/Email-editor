// Email Builder — Public API
// Consumer should import styles: import "@eventora/email-builder/styles.css"
export { EmailBuilder } from "./EmailBuilder";
export { EmailBuilderToaster } from "./ui/Toaster";
export { renderToHtml, renderEmailHtml, exportToJson, importFromJson } from "./renderer/toHtml";
export { createBlock } from "./defaults";
export type {
    EmailBlock,
    EmailDocument,
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
    VideoBlock,
    QuoteBlock,
    Padding,
    BorderStyle,
} from "./types";
export { DEFAULT_SETTINGS, BLOCK_CATALOG } from "./types";
