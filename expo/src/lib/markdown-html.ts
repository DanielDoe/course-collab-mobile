export type MarkdownHtmlVariant = "default" | "reading" | "chat" | "flashcard"

export type MarkdownHtmlTheme = {
  accent: string
  accentSoft?: string
  text?: string
  textSecondary?: string
  heading?: string
  border?: string
  isDark?: boolean
}

function resolveMarkdownTheme(theme?: MarkdownHtmlTheme) {
  const isDark = theme?.isDark ?? false
  const accent = theme?.accent ?? "#582c83"
  const accentSoft = theme?.accentSoft ?? (isDark ? "rgba(255,255,255,0.08)" : "rgba(88, 44, 131, 0.06)")
  const text = theme?.text ?? (isDark ? "#F5F7FA" : "#334155")
  const textSecondary = theme?.textSecondary ?? (isDark ? "#98A2B3" : "#475569")
  const heading = theme?.heading ?? text
  const border = theme?.border ?? (isDark ? "rgba(255,255,255,0.12)" : "rgba(226, 232, 240, 0.95)")
  const codeBg = isDark ? "rgba(255,255,255,0.12)" : "#eef2ff"
  const codeText = isDark ? "#F2F2F7" : text
  const preBg = isDark ? "#0d1117" : "#0f172a"
  const preText = isDark ? "#e6edf3" : "#e2e8f0"
  const tableHeadBg = isDark ? "rgba(255,255,255,0.06)" : accentSoft
  return { accent, accentSoft, text, textSecondary, heading, border, codeBg, codeText, preBg, preText, tableHeadBg }
}

function applyMarkdownTheme(css: string, theme?: MarkdownHtmlTheme): string {
  const vars = resolveMarkdownTheme(theme)
  return css
    .replaceAll("__ACCENT__", vars.accent)
    .replaceAll("__ACCENT_SOFT__", vars.accentSoft)
    .replaceAll("__TEXT__", vars.text)
    .replaceAll("__TEXT_SECONDARY__", vars.textSecondary)
    .replaceAll("__HEADING__", vars.heading)
    .replaceAll("__BORDER__", vars.border)
    .replaceAll("__CODE_BG__", vars.codeBg)
    .replaceAll("__CODE_TEXT__", vars.codeText)
    .replaceAll("__PRE_BG__", vars.preBg)
    .replaceAll("__PRE_TEXT__", vars.preText)
    .replaceAll("__TABLE_HEAD_BG__", vars.tableHeadBg)
}

const BASE_MATH_AND_SCRIPT = `
  .md-display {
    margin: 12px 0 14px;
    overflow-x: auto;
    text-align: center;
  }
  .md-display .katex-display { margin: 0; }
  .md-inline {
    display: inline-block;
    margin: 0 0.08em;
    vertical-align: -0.08em;
  }
  .math-fallback {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.92em;
    color: __TEXT_SECONDARY__;
  }
  .katex { color: __TEXT__; }
  .md-content img {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    margin: 10px 0;
    display: block;
  }
  /* Editor-like fenced code */
  .md-content pre {
    margin: 0 0 14px !important;
    padding: 14px 16px !important;
    background: __PRE_BG__ !important;
    color: __PRE_TEXT__ !important;
    border-radius: 12px !important;
    border: 1px solid __BORDER__;
    overflow-x: auto;
    font-size: 13.5px !important;
    line-height: 1.7 !important;
    tab-size: 2;
    -webkit-overflow-scrolling: touch;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
  }
  .md-content pre code,
  .md-content pre code.hljs {
    display: block;
    background: transparent !important;
    padding: 0 !important;
    margin: 0 !important;
    border-radius: 0 !important;
    color: inherit !important;
    font-family: "SF Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace !important;
    font-size: inherit !important;
    line-height: inherit !important;
    white-space: pre;
    overflow-wrap: normal;
    word-break: normal;
  }
  .md-content .hljs-keyword,
  .md-content .hljs-selector-tag,
  .md-content .hljs-literal,
  .md-content .hljs-section,
  .md-content .hljs-link { color: #ff7b72; }
  .md-content .hljs-function .hljs-title,
  .md-content .hljs-title.function_,
  .md-content .hljs-title { color: #d2a8ff; }
  .md-content .hljs-built_in,
  .md-content .hljs-type { color: #79c0ff; }
  .md-content .hljs-string,
  .md-content .hljs-attr,
  .md-content .hljs-symbol,
  .md-content .hljs-bullet,
  .md-content .hljs-addition { color: #a5d6ff; }
  .md-content .hljs-comment,
  .md-content .hljs-quote,
  .md-content .hljs-deletion,
  .md-content .hljs-meta { color: #8b949e; font-style: italic; }
  .md-content .hljs-number,
  .md-content .hljs-regexp { color: #ffa657; }
  .md-content .hljs-variable,
  .md-content .hljs-template-variable,
  .md-content .hljs-params { color: #ffa198; }
  .md-content .hljs-name,
  .md-content .hljs-attribute { color: #7ee787; }
`

const VARIANT_STYLES: Record<MarkdownHtmlVariant, string> = {
  default: `
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 15px;
    line-height: 1.65;
    color: __TEXT__;
    background: transparent;
  }
  .md-content { word-wrap: break-word; overflow-wrap: break-word; word-spacing: normal; }
  .md-content > :first-child { margin-top: 0; }
  .md-content > :last-child { margin-bottom: 0; }
  .md-content h1 {
    font-size: 20px;
    font-weight: 800;
    color: __HEADING__;
    margin: 0 0 12px;
    letter-spacing: -0.2px;
  }
  .md-content h2 {
    font-size: 17px;
    font-weight: 700;
    color: __HEADING__;
    margin: 20px 0 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid __BORDER__;
  }
  .md-content h2:first-child { margin-top: 0; }
  .md-content h3 {
    font-size: 15px;
    font-weight: 700;
    color: __ACCENT__;
    margin: 16px 0 8px;
    padding: 6px 10px;
    background: __ACCENT_SOFT__;
    border-radius: 8px;
  }
  .md-content h4 {
    font-size: 14px;
    font-weight: 700;
    color: __TEXT_SECONDARY__;
    margin: 14px 0 6px;
  }
  .md-content p { margin: 0 0 12px; color: __TEXT__; }
  .md-content ul,
  .md-content ol {
    margin: 0 0 12px;
    padding-left: 22px;
    color: __TEXT__;
  }
  .md-content li { margin: 0 0 6px; color: __TEXT__; }
  .md-content li > p { margin: 0 0 6px; }
  .md-content strong { font-weight: 700; color: __HEADING__; }
  .md-content em { font-style: italic; }
  .md-content a {
    color: __ACCENT__;
    font-weight: 600;
    text-decoration: underline;
  }
  .md-content blockquote {
    margin: 0 0 12px;
    padding: 10px 12px;
    border-left: 3px solid __ACCENT__;
    background: __ACCENT_SOFT__;
    border-radius: 0 10px 10px 0;
    color: __TEXT_SECONDARY__;
  }
  .md-content hr {
    border: none;
    border-top: 1px solid __BORDER__;
    margin: 16px 0;
  }
  .md-content code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.92em;
    background: __CODE_BG__;
    padding: 0.12em 0.35em;
    border-radius: 6px;
    color: __CODE_TEXT__;
  }
  .md-content pre {
    margin: 0 0 12px;
    padding: 12px;
    background: __PRE_BG__;
    color: __PRE_TEXT__;
    border-radius: 10px;
    overflow-x: auto;
    font-size: 13px;
    line-height: 1.5;
  }
  .md-content pre code {
    background: transparent;
    padding: 0;
    color: inherit;
  }
  .md-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 12px;
    font-size: 13px;
    color: __TEXT__;
  }
  .md-content th,
  .md-content td {
    border: 1px solid __BORDER__;
    padding: 8px;
    text-align: left;
    vertical-align: top;
  }
  .md-content th {
    background: __TABLE_HEAD_BG__;
    color: __ACCENT__;
    font-weight: 700;
  }
  .md-content td { color: __TEXT__; }`,
  reading: `
  body {
    margin: 0;
    padding: 16px 18px 18px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 16px;
    line-height: 1.72;
    color: __TEXT__;
    background: transparent;
    -webkit-font-smoothing: antialiased;
  }
  .md-content { word-wrap: break-word; overflow-wrap: break-word; word-spacing: normal; }
  .md-content > :first-child { margin-top: 0; }
  .md-content > :last-child { margin-bottom: 0; }
  .md-content h1 {
    font-size: 22px;
    font-weight: 700;
    color: __HEADING__;
    margin: 0 0 14px;
    letter-spacing: -0.35px;
    line-height: 1.25;
  }
  .md-content h2 {
    font-size: 17px;
    font-weight: 600;
    color: __HEADING__;
    margin: 28px 0 12px;
    padding: 0;
    border: none;
    letter-spacing: -0.2px;
  }
  .md-content h2:first-child { margin-top: 0; }
  .md-content h3 {
    font-size: 15px;
    font-weight: 600;
    color: __HEADING__;
    margin: 24px 0 10px;
    padding: 0;
    background: none;
    border-radius: 0;
    letter-spacing: -0.1px;
  }
  .md-content h4 {
    font-size: 14px;
    font-weight: 600;
    color: __TEXT_SECONDARY__;
    margin: 18px 0 8px;
  }
  .md-content p {
    margin: 0 0 16px;
    color: __TEXT__;
  }
  .md-content ul,
  .md-content ol {
    margin: 0 0 18px;
    padding-left: 20px;
    color: __TEXT__;
  }
  .md-content li {
    margin: 0 0 10px;
    padding-left: 2px;
    color: __TEXT__;
  }
  .md-content li > p { margin: 0 0 8px; }
  .md-content strong { font-weight: 600; color: __HEADING__; }
  .md-content em { font-style: italic; }
  .md-content a {
    color: __ACCENT__;
    font-weight: 500;
    text-decoration: none;
  }
  .md-content blockquote {
    margin: 0 0 16px;
    padding: 0 0 0 14px;
    border-left: 2px solid __BORDER__;
    background: none;
    border-radius: 0;
    color: __TEXT_SECONDARY__;
  }
  .md-content hr {
    border: none;
    border-top: 1px solid __BORDER__;
    margin: 24px 0;
  }
  .md-content code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.9em;
    background: __CODE_BG__;
    padding: 0.12em 0.35em;
    border-radius: 6px;
    color: __CODE_TEXT__;
  }
  .md-content pre {
    margin: 0 0 16px;
    padding: 14px;
    background: __PRE_BG__;
    color: __PRE_TEXT__;
    border-radius: 12px;
    overflow-x: auto;
    font-size: 13px;
    line-height: 1.55;
  }
  .md-content pre code {
    background: transparent;
    padding: 0;
    color: inherit;
  }
  .md-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 16px;
    font-size: 14px;
    color: __TEXT__;
  }
  .md-content th,
  .md-content td {
    border: 1px solid __BORDER__;
    padding: 10px;
    text-align: left;
    vertical-align: top;
  }
  .md-content th {
    background: __TABLE_HEAD_BG__;
    color: __HEADING__;
    font-weight: 600;
  }
  .md-content td { color: __TEXT__; }`,
  chat: `
  body {
    margin: 0;
    padding: 10px 12px 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 15px;
    line-height: 1.58;
    color: __TEXT__;
    background: transparent;
    -webkit-font-smoothing: antialiased;
  }
  .md-content { word-wrap: break-word; overflow-wrap: break-word; word-spacing: normal; }
  .md-content > :first-child { margin-top: 0; }
  .md-content > :last-child { margin-bottom: 0; }
  .md-content h1 {
    font-size: 18px;
    font-weight: 700;
    color: __HEADING__;
    margin: 0 0 10px;
    letter-spacing: -0.25px;
    line-height: 1.3;
  }
  .md-content h2 {
    font-size: 16px;
    font-weight: 700;
    color: __HEADING__;
    margin: 16px 0 8px;
    padding: 0;
    border: none;
    letter-spacing: -0.15px;
  }
  .md-content h2:first-child { margin-top: 0; }
  .md-content h3 {
    font-size: 15px;
    font-weight: 700;
    color: __HEADING__;
    margin: 14px 0 6px;
    padding: 0;
    background: none;
    border-radius: 0;
  }
  .md-content h4 {
    font-size: 14px;
    font-weight: 600;
    color: __TEXT_SECONDARY__;
    margin: 12px 0 4px;
  }
  .md-content p { margin: 0 0 10px; color: __TEXT__; }
  .md-content ul,
  .md-content ol {
    margin: 0 0 10px;
    padding-left: 20px;
    color: __TEXT__;
  }
  .md-content li { margin: 0 0 5px; color: __TEXT__; }
  .md-content li > p { margin: 0 0 4px; }
  .md-content strong { font-weight: 700; color: __HEADING__; }
  .md-content em { font-style: italic; }
  .md-content a {
    color: __ACCENT__;
    font-weight: 600;
    text-decoration: underline;
  }
  .md-content blockquote {
    margin: 0 0 10px;
    padding: 8px 10px;
    border-left: 3px solid __ACCENT__;
    background: __ACCENT_SOFT__;
    border-radius: 0 8px 8px 0;
    color: __TEXT_SECONDARY__;
  }
  .md-content hr {
    border: none;
    border-top: 1px solid __BORDER__;
    margin: 12px 0;
  }
  .md-content code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.9em;
    background: __CODE_BG__;
    padding: 0.1em 0.35em;
    border-radius: 5px;
    color: __CODE_TEXT__;
  }
  .md-content pre {
    margin: 0 0 10px;
    padding: 10px 12px;
    background: __PRE_BG__;
    color: __PRE_TEXT__;
    border-radius: 10px;
    overflow-x: auto;
    font-size: 13px;
    line-height: 1.45;
  }
  .md-content pre code {
    background: transparent;
    padding: 0;
    color: inherit;
  }
  .md-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 10px;
    font-size: 13px;
    color: __TEXT__;
  }
  .md-content th,
  .md-content td {
    border: 1px solid __BORDER__;
    padding: 7px 8px;
    text-align: left;
    vertical-align: top;
  }
  .md-content th {
    background: __TABLE_HEAD_BG__;
    color: __ACCENT__;
    font-weight: 700;
  }
  .md-content td { color: __TEXT__; }`,
  flashcard: `
  body {
    margin: 0;
    padding: 4px 8px 8px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 17px;
    line-height: 1.5;
    color: __TEXT__;
    background: transparent;
    -webkit-font-smoothing: antialiased;
    text-align: center;
  }
  .md-content {
    word-wrap: break-word;
    overflow-wrap: break-word;
    text-align: center;
  }
  .md-content > :first-child { margin-top: 0; }
  .md-content > :last-child { margin-bottom: 0; }
  .md-content h1,
  .md-content h2,
  .md-content h3,
  .md-content h4 {
    font-size: 18px;
    font-weight: 700;
    color: __HEADING__;
    margin: 0 0 10px;
    letter-spacing: -0.2px;
    line-height: 1.35;
    text-align: center;
  }
  .md-content p {
    margin: 0 0 10px;
    color: __TEXT__;
    text-align: center;
  }
  .md-content ul,
  .md-content ol {
    margin: 0 auto 10px;
    padding-left: 20px;
    color: __TEXT__;
    display: inline-block;
    text-align: left;
  }
  .md-content li { margin: 0 0 6px; color: __TEXT__; }
  .md-content li > p { margin: 0 0 4px; text-align: left; }
  .md-content strong { font-weight: 700; color: __HEADING__; }
  .md-content em { font-style: italic; }
  .md-content code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.9em;
    background: __CODE_BG__;
    padding: 0.1em 0.35em;
    border-radius: 5px;
    color: __CODE_TEXT__;
  }
  .md-content pre {
    margin: 0 auto 10px;
    padding: 10px 12px;
    background: __PRE_BG__;
    color: __PRE_TEXT__;
    border-radius: 10px;
    overflow-x: auto;
    font-size: 13px;
    line-height: 1.45;
    text-align: left;
    max-width: 100%;
  }
  .md-content pre code {
    background: transparent;
    padding: 0;
    color: inherit;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    white-space: pre;
  }
  .md-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 auto 10px;
    font-size: 14px;
    color: __TEXT__;
  }
  .md-content th,
  .md-content td {
    border: 1px solid __BORDER__;
    padding: 8px;
    text-align: center;
    vertical-align: middle;
  }
  .md-content th {
    background: __TABLE_HEAD_BG__;
    color: __HEADING__;
    font-weight: 700;
  }
  .md-content td { color: __TEXT__; }
  .md-display { margin: 8px 0 10px; }
  .md-inline { vertical-align: -0.12em; }`,
}

function noSelectCss(disableSelection?: boolean): string {
  if (!disableSelection) return ""
  return `
  html, body, #content, #content * {
    -webkit-user-select: none !important;
    user-select: none !important;
    -webkit-touch-callout: none !important;
    -webkit-user-drag: none !important;
  }
  img { pointer-events: none !important; }
`
}

/** WebView HTML for syllabus / policy / AI narrative markdown (headings, lists, links, KaTeX). */
export function buildMarkdownHtml(
  markdown: string,
  variant: MarkdownHtmlVariant = "default",
  theme?: MarkdownHtmlTheme,
  options?: { disableSelection?: boolean; compact?: boolean },
): string {
  const payload = JSON.stringify(markdown)
  const compactCss = options?.compact ? "body{padding:0!important;}" : ""
  const css = applyMarkdownTheme(`${VARIANT_STYLES[variant]}${BASE_MATH_AND_SCRIPT}${compactCss}`, theme)

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<script src="https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"/>
<script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/highlight.min.js"></script>
<style>${noSelectCss(options?.disableSelection)}${css}</style>
</head>
<body>
<div id="content" class="md-content"></div>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<script>
  var markdown = ${payload};
  var root = document.getElementById("content");

  function postHeight() {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(String(document.body.scrollHeight));
    }
  }

  function renderMath(expr, display) {
    try {
      if (typeof katex === "undefined") return '<span class="math-fallback">' + expr + "</span>";
      return katex.renderToString(expr, {
        displayMode: display,
        throwOnError: false,
        strict: "ignore",
        trust: false});
    } catch (e) {
      return '<span class="math-fallback">' + expr + "</span>";
    }
  }

  function isCurrencyProse(expr) {
    var trimmed = String(expr || "").trim();
    if (!/^\\d[\\d,]*(?:\\.\\d+)?\\b/.test(trimmed) || !/\\s/.test(expr)) return false;
    if (/\\\\[a-zA-Z]/.test(expr)) return false;
    if (/[A-Za-z]_[A-Za-z0-9]/.test(expr)) return false;
    return true;
  }

  function applyInlineMath(html) {
    html = html.replace(/(?<!\\\\)\\$([^$\\n]+?)\\$(?!\\$)/g, function(full, expr) {
      if (isCurrencyProse(expr)) return full;
      return '<span class="md-inline">' + renderMath(expr.trim(), false) + "</span>";
    });
    return html;
  }

  var mathStore = [];

  function stashMath(source) {
    var out = source || "";
    out = out.replace(/\\\\\\[([\\s\\S]+?)\\\\\\]/g, function(_, expr) {
      var id = mathStore.length;
      mathStore.push(renderMath(expr.trim(), true));
      return "\\n\\nMATHBLOCK_" + id + "_\\n\\n";
    });
    out = out.replace(/\\\\\\(([\\s\\S]+?)\\\\\\)/g, function(_, expr) {
      var id = mathStore.length;
      mathStore.push(renderMath(expr.trim(), false));
      return "MATHINLINE_" + id + "_";
    });
    out = out.replace(/\\$\\$([\\s\\S]+?)\\$\\$/g, function(_, expr) {
      var id = mathStore.length;
      mathStore.push(renderMath(expr.trim(), true));
      return "\\n\\nMATHBLOCK_" + id + "_\\n\\n";
    });
    out = out.replace(/(?<!\\\\)\\$([^$\\n]+?)\\$(?!\\$)/g, function(_, expr) {
      var id = mathStore.length;
      mathStore.push(renderMath(expr.trim(), false));
      return "MATHINLINE_" + id + "_";
    });
    return out;
  }

  function restoreMath(html) {
    html = html.replace(/MATHBLOCK_(\\d+)_/g, function(_, id) {
      var rendered = mathStore[Number(id)];
      return rendered ? '<div class="md-display">' + rendered + "</div>" : "";
    });
    html = html.replace(/MATHINLINE_(\\d+)_/g, function(_, id) {
      var rendered = mathStore[Number(id)];
      return rendered ? '<span class="md-inline">' + rendered + "</span>" : "";
    });
    return html;
  }

  try {
    if (typeof marked !== "undefined" && marked.parse) {
      marked.setOptions({ gfm: true, breaks: true });
      mathStore = [];
      var prepared = stashMath(markdown || "");
      root.innerHTML = applyInlineMath(restoreMath(marked.parse(prepared)));
      if (typeof hljs !== "undefined") {
        root.querySelectorAll("pre code").forEach(function(block) {
          try { hljs.highlightElement(block); } catch (e) {}
        });
      }
    } else {
      root.textContent = markdown || "";
    }
  } catch (e) {
    root.textContent = markdown || "";
  }

  postHeight();
  requestAnimationFrame(postHeight);
  if (typeof ResizeObserver !== "undefined") {
    try {
      new ResizeObserver(postHeight).observe(document.body);
    } catch (e) {}
  }
</script>
</body>
</html>`
}
