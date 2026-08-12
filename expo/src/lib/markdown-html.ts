export type MarkdownHtmlVariant = "default" | "reading" | "chat"

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
  const codeBg = isDark ? "rgba(255,255,255,0.14)" : "#f1f5f9"
  const codeText = isDark ? "#F2F2F7" : text
  const preBg = isDark ? "#1c1c1e" : "#0f172a"
  const preText = isDark ? "#f2f2f7" : "#e2e8f0"
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
  .md-content { word-wrap: break-word; overflow-wrap: anywhere; }
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
  .md-content { word-wrap: break-word; overflow-wrap: anywhere; }
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
  .md-content { word-wrap: break-word; overflow-wrap: anywhere; }
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
}

/** WebView HTML for syllabus / policy / AI narrative markdown (headings, lists, links, KaTeX). */
export function buildMarkdownHtml(
  markdown: string,
  variant: MarkdownHtmlVariant = "default",
  theme?: MarkdownHtmlTheme,
): string {
  const payload = JSON.stringify(markdown)
  const css = applyMarkdownTheme(`${VARIANT_STYLES[variant]}${BASE_MATH_AND_SCRIPT}`, theme)

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<script src="https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"/>
<style>${css}</style>
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

  function applyInlineMath(html) {
    html = html.replace(/(?<!\\\\)\\$([^$\\n]+?)\\$(?!\\$)/g, function(_, expr) {
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
