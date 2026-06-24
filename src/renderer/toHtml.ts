import { EmailBlock, EmailDocument, EmailSettings, Padding } from "../types";

/**
 * Email-safe PNG icons per social platform. Hosted (icons8) so they render in
 * the preview AND real email clients (inline SVG/lucide won't render in email).
 * Swap these URLs if you prefer a different icon set / host.
 */
const SOCIAL_ICON: Record<string, string> = {
    facebook: "https://img.icons8.com/color/96/facebook-new.png",
    twitter: "https://img.icons8.com/color/96/twitterx.png",
    instagram: "https://img.icons8.com/color/96/instagram-new.png",
    linkedin: "https://img.icons8.com/color/96/linkedin.png",
    youtube: "https://img.icons8.com/color/96/youtube-play.png",
    tiktok: "https://img.icons8.com/color/96/tiktok.png",
    website: "https://img.icons8.com/color/96/domain.png",
};

/**
 * Renders an EmailDocument to a self-contained HTML string
 * suitable for email clients (table-based layout for max compatibility).
 */
export function renderToHtml(doc: EmailDocument): string {
    const { settings, blocks } = doc;

    const bodyContent = blocks
        .filter((b) => !b.hidden)
        .map((b) => renderBlock(b, settings))
        .join("\n");

    return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Email</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:AllowPNG/>
<o:PixelPerInch>96</o:PixelPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style>
  body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table { border-spacing: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  a { color: ${settings.linkColor}; }
  p { margin: 0 0 10px 0; }
</style>
${settings.preheaderText ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(settings.preheaderText)}</div>` : ""}
</head>
<body style="margin:0;padding:0;background-color:${settings.backgroundColor};font-family:${settings.fontFamily};color:${settings.textColor};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${settings.backgroundColor};">
<tr><td align="center" style="padding:20px 0;">
<table role="presentation" width="${settings.contentWidth}" cellpadding="0" cellspacing="0" border="0" style="max-width:${settings.contentWidth}px;width:100%;background-color:${settings.contentBackgroundColor};">
${bodyContent}
</table>
</td></tr>
</table>
</body>
</html>`;
}

function pad(p: Padding): string {
    return `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`;
}

function escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapRow(content: string, block: EmailBlock): string {
    const bg = block.backgroundColor !== "transparent" ? `background-color:${block.backgroundColor};` : "";
    return `<tr><td style="padding:${pad(block.padding)};${bg}">${content}</td></tr>`;
}

function renderBlock(block: EmailBlock, settings: EmailSettings): string {
    switch (block.type) {
        case "text":
            return wrapRow(
                `<div style="color:${block.color};font-size:${block.fontSize}px;font-family:${block.fontFamily};line-height:${block.lineHeight};text-align:${block.textAlign};">${block.content}</div>`,
                block
            );

        case "heading": {
            const sizes = { 1: "28px", 2: "22px", 3: "18px" };
            return wrapRow(
                `<h${block.level} style="margin:0;color:${block.color};font-family:${block.fontFamily};text-align:${block.textAlign};font-size:${sizes[block.level]};">${escapeHtml(block.content)}</h${block.level}>`,
                block
            );
        }

        case "image": {
            const imgWidth = block.width === "auto" ? "100%" : `${block.width}%`;
            const borderCss = block.border.width > 0 ? `border:${block.border.width}px ${block.border.style} ${block.border.color};` : "";
            const radiusCss = block.border.radius > 0 ? `border-radius:${block.border.radius}px;` : "";
            const img = `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" width="${imgWidth}" style="display:block;max-width:100%;${borderCss}${radiusCss}" />`;
            const linked = block.href ? `<a href="${escapeHtml(block.href)}" target="_blank">${img}</a>` : img;
            return wrapRow(`<div style="text-align:${block.align};">${linked}</div>`, block);
        }

        case "button": {
            // box-sizing so width:100% INCLUDES the padding (otherwise the
            // button is 100% + 56px and overflows the content width — making it
            // look wider than in the editor).
            const widthAttr = block.fullWidth ? `width:100%;display:block;box-sizing:border-box;` : `display:inline-block;`;
            return wrapRow(
                `<div style="text-align:${block.align};">` +
                `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeHtml(block.href)}" style="height:auto;v-text-anchor:middle;${widthAttr}" arcsize="${Math.round(block.borderRadius / 40 * 100)}%" stroke="f" fillcolor="${block.backgroundColor}"><w:anchorlock/><center><![endif]-->` +
                `<a href="${escapeHtml(block.href)}" target="_blank" style="${widthAttr}background-color:${block.backgroundColor};color:${block.color};font-size:${block.fontSize}px;font-family:${block.fontFamily};border-radius:${block.borderRadius}px;padding:12px 28px;text-decoration:none;font-weight:bold;text-align:center;mso-padding-alt:0;">${escapeHtml(block.text)}</a>` +
                `<!--[if mso]></center></v:roundrect><![endif]-->` +
                `</div>`,
                block
            );
        }

        case "divider":
            return wrapRow(
                `<hr style="border:none;border-top:${block.thickness}px ${block.style} ${block.color};width:${block.width}%;margin:0 auto;" />`,
                block
            );

        case "spacer":
            return `<tr><td style="height:${block.height}px;font-size:0;line-height:0;">&nbsp;</td></tr>`;

        case "columns": {
            const colHtml = block.columns.map((col) => {
                const innerBlocks = col.blocks
                    .filter((b) => !b.hidden)
                    .map((b) => renderBlock(b, settings))
                    .join("");
                return `<td valign="top" width="${col.width}%" style="width:${col.width}%;padding:0 ${block.gap / 2}px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${innerBlocks}
</table></td>`;
            }).join("");

            return wrapRow(
                `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${colHtml}</tr></table>`,
                block
            );
        }

        case "social": {
            const visibleLinks = block.links.filter((l) => l.url && l.url !== "#" && l.url.trim() !== "");
            if (visibleLinks.length === 0) return "";
            const links = visibleLinks.map((link) => {
                const icon = SOCIAL_ICON[link.platform] ?? SOCIAL_ICON.website;
                return `<a href="${escapeHtml(link.url)}" target="_blank" style="display:inline-block;margin:0 ${block.gap / 2}px;text-decoration:none;"><img src="${icon}" alt="${escapeHtml(link.platform)}" width="${block.iconSize}" height="${block.iconSize}" style="display:inline-block;border:0;outline:none;border-radius:50%;" /></a>`;
            }).join("");
            return wrapRow(`<div style="text-align:${block.align};">${links}</div>`, block);
        }

        case "logo": {
            const img = block.src
                ? `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" width="${block.width}" style="display:inline-block;max-width:100%;" />`
                : "";
            const linked = block.href ? `<a href="${escapeHtml(block.href)}" target="_blank">${img}</a>` : img;
            return wrapRow(`<div style="text-align:${block.align};">${linked}</div>`, block);
        }

        case "footer":
            return wrapRow(
                `<div style="color:${block.color};font-size:${block.fontSize}px;text-align:${block.textAlign};line-height:1.5;">${block.content}</div>`,
                block
            );

        case "video": {
            const thumb = block.thumbnailUrl
                ? `<img src="${escapeHtml(block.thumbnailUrl)}" alt="${escapeHtml(block.alt)}" style="max-width:100%;display:block;border-radius:8px;" />`
                : `<div style="width:100%;height:200px;background:#1a1a2e;border-radius:8px;text-align:center;line-height:200px;color:#999;font-size:14px;">▶ ${escapeHtml(block.alt)}</div>`;
            const linked = block.videoUrl ? `<a href="${escapeHtml(block.videoUrl)}" target="_blank">${thumb}</a>` : thumb;
            return wrapRow(`<div style="text-align:${block.align};">${linked}</div>`, block);
        }

        case "quote":
            return wrapRow(
                `<div style="border-left:4px solid ${block.borderColor};padding-left:16px;text-align:${block.textAlign};">` +
                `<p style="color:${block.color};font-size:${block.fontSize}px;font-style:${block.fontStyle};margin:0 0 8px 0;line-height:1.6;">"${escapeHtml(block.content)}"</p>` +
                (block.author ? `<p style="color:#999;font-size:${block.fontSize - 2}px;margin:0;">${escapeHtml(block.author)}</p>` : "") +
                `</div>`,
                block
            );

        case "html":
            return wrapRow(block.content, block);

        default:
            return "";
    }
}

/**
 * Compile the document to final email HTML. Async wrapper around the (synchronous)
 * hand-rolled `renderToHtml` — kept as a stable seam for save/export/preview so an
 * alternative renderer could be slotted in later without touching callers.
 */
export async function renderEmailHtml(doc: EmailDocument): Promise<string> {
    return renderToHtml(doc);
}

/**
 * Export the document as a JSON string for saving/sharing
 */
export function exportToJson(doc: EmailDocument): string {
    return JSON.stringify(doc, null, 2);
}

/**
 * Import a document from a JSON string
 */
export function importFromJson(json: string): EmailDocument | null {
    try {
        const parsed = JSON.parse(json);
        if (parsed.settings && parsed.blocks) return parsed;
        return null;
    } catch {
        return null;
    }
}
