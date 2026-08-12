/** Detect stored HTML from the rich-text editor vs legacy plain / markdown. */
export function isAnnouncementHtml(content: string): boolean {
  const trimmed = content.trim()
  if (!trimmed) return false
  if (/^\s*</.test(trimmed)) return true
  return /<(p|h[1-6]|ul|ol|li|table|thead|tbody|tr|td|th|blockquote|strong|em|u|a|div|span|hr)\b/i.test(
    content,
  )
}

/** Plain text for previews, notifications, and card excerpts. */
export function announcementPlainText(content: string, maxLength?: number): string {
  if (!content) return ""
  let plain = content
  if (isAnnouncementHtml(content)) {
    plain = content
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
  } else {
    plain = content
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
  }
  plain = plain.replace(/\s+/g, " ").trim()
  if (maxLength != null && plain.length > maxLength) {
    return `${plain.slice(0, maxLength).trim()}…`
  }
  return plain
}

export function extractBulletPoints(content: string): string[] {
  if (!content) return []
  const items: string[] = []
  if (isAnnouncementHtml(content)) {
    const matches = content.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)
    for (const match of matches) {
      const text = announcementPlainText(match[1] ?? "")
      if (text.length > 8) items.push(text)
    }
  } else {
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*[-*•]\s+(.+)/)
      if (m?.[1]) items.push(m[1].trim())
    }
  }
  return items
}

import { resolveThemeTokens, type AppThemeTokens } from "../constants/app-themes"
import { DEFAULT_APPEARANCE_PREFS } from "./appearance-preferences"

const DEFAULT_TOKENS = resolveThemeTokens(
  DEFAULT_APPEARANCE_PREFS.themeId,
  DEFAULT_APPEARANCE_PREFS.appearanceMode,
  null,
)

const DEFAULT_ACCENT = DEFAULT_TOKENS.accent

/** Minimal sanitization — strips scripts/event handlers before WebView render. */
function sanitizeAnnouncementHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
}

/** Rich-text from the web app often embeds light-mode inline colors — strip so theme CSS applies. */
function stripInlineThemeColors(html: string): string {
  return html
    .replace(/\sstyle=(["'])([\s\S]*?)\1/gi, (_match, quote, styles: string) => {
      const cleaned = styles
        .replace(/\bcolor\s*:\s*[^;]+;?/gi, "")
        .replace(/\bbackground-color\s*:\s*[^;]+;?/gi, "")
        .replace(/;\s*;/g, ";")
        .replace(/^;|;$/g, "")
        .trim()
      return cleaned ? ` style=${quote}${cleaned}${quote}` : ""
    })
    .replace(/\scolor=(["'])[^"']*\1/gi, "")
    .replace(/<font\b[^>]*>/gi, (tag) => tag.replace(/\scolor=(["'])[^"']*\1/gi, ""))
}

export function buildAnnouncementHtml(
  content: string,
  options?: {
    accentColor?: string
    paddingHorizontal?: number
    tokens?: AppThemeTokens
  },
): string {
  const themeTokens = options?.tokens ?? DEFAULT_TOKENS
  const accent = options?.accentColor ?? themeTokens.accent
  const padX = options?.paddingHorizontal ?? 0
  const text = themeTokens.text
  const textSecondary = themeTokens.textSecondary
  const border = themeTokens.border
  const surface = themeTokens.surface
  const elevated = themeTokens.elevatedSurface ?? themeTokens.surface
  const blockquoteBg = themeTokens.isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)"
  const codeBg = themeTokens.isDark ? "rgba(255,255,255,0.08)" : "#f8fafc"

  if (!content.trim()) {
    return `<!DOCTYPE html><html><body></body></html>`
  }

  const body = isAnnouncementHtml(content)
    ? stripInlineThemeColors(sanitizeAnnouncementHtml(content))
    : content
        .split(/\n\n+/)
        .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
        .join("")

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 2px ${padX}px 6px;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
    font-size: 16px;
    line-height: 1.6;
    color: ${text};
    background: transparent;
    -webkit-font-smoothing: antialiased;
  }
  p { margin: 0 0 14px; color: ${text}; }
  p:last-child { margin-bottom: 0; }
  strong, b { font-weight: 700; color: ${text}; }
  h1,h2,h3,h4 { margin: 18px 0 10px; line-height: 1.25; color: ${text}; font-weight: 700; }
  h1 { font-size: 22px; }
  h2 { font-size: 19px; }
  h3 { font-size: 17px; }
  ul,ol { margin: 0 0 14px; padding-left: 20px; color: ${text}; }
  li { margin-bottom: 8px; padding-left: 2px; color: ${text}; }
  li::marker { color: ${accent}; }
  a {
    color: ${accent};
    text-decoration: none;
    font-weight: 600;
    word-break: break-word;
  }
  blockquote {
    margin: 14px 0;
    padding: 12px 14px;
    border-left: 3px solid ${accent};
    background: ${blockquoteBg};
    border-radius: 0 12px 12px 0;
    color: ${textSecondary};
  }
  table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 15px; color: ${text}; }
  th, td { border: 1px solid ${border}; padding: 10px 12px; text-align: left; vertical-align: top; }
  th { background: ${elevated}; font-weight: 700; color: ${text}; }
  td { color: ${textSecondary}; }
  img { max-width: 100%; height: auto; border-radius: 12px; margin: 8px 0; }
  pre, code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px; color: ${text}; }
  pre {
    overflow-x: auto;
    padding: 12px;
    background: ${codeBg};
    border-radius: 12px;
    border: 1px solid ${border};
  }
  span, div { color: inherit; }
</style>
</head>
<body><div id="content">${body}</div>
<script>
  function postHeight() {
    var h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(String(h));
  }
  window.addEventListener('load', postHeight);
  setTimeout(postHeight, 120);
  setTimeout(postHeight, 400);
  setTimeout(postHeight, 900);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(postHeight).observe(document.body);
  }
</script>
</body>
</html>`
}

export const ANNOUNCEMENT_LOCKED_MESSAGE =
  "This announcement is locked until your instructor unlocks it in class."

/** Plain text for mobile composer when editing rich HTML from the web app. */
export function announcementContentForEditor(content: string): string {
  if (!content.trim()) return ""
  if (!isAnnouncementHtml(content)) return content
  return content
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3}/g, "\n\n")
    .trim()
}

/** Persist mobile edits — wrap plain text like the web rich editor output. */
export function announcementContentForSave(content: string, originalContent?: string): string {
  const trimmed = content.trim()
  if (!trimmed) return ""
  if (isAnnouncementHtml(trimmed)) return trimmed
  if (originalContent && isAnnouncementHtml(originalContent)) {
    return trimmed
      .split(/\n\n+/)
      .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
      .join("")
  }
  return trimmed
}
