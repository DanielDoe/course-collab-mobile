import { resolveThemeTokens } from "../../constants/app-themes"
import { DEFAULT_APPEARANCE_PREFS } from "../../lib/appearance-preferences"
import type { GradeTrendPoint, PerformanceComparison } from "../../types/dashboard"

export type ChartThemeColors = {
  accent: string
  accentDark: string
  warning: string
  success: string
  textMuted: string
}

function defaultChartColors(): ChartThemeColors {
  const tokens = resolveThemeTokens(
    DEFAULT_APPEARANCE_PREFS.themeId,
    DEFAULT_APPEARANCE_PREFS.appearanceMode,
    null,
  )
  return {
    accent: tokens.accent,
    accentDark: tokens.accentDark,
    warning: tokens.warning,
    success: tokens.success,
    textMuted: tokens.textMuted,
  }
}

const DEFAULT_CHART_COLORS: ChartThemeColors = defaultChartColors()

function escapeJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}

function chartShell(script: string, height: number): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: transparent;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .wrap { width: 100%; height: ${height}px; }
  svg { display: block; width: 100%; height: 100%; }
</style>
</head>
<body><div class="wrap"></div>${script}</body>
</html>`
}

export function buildGradeTrendChartHtml(
  data: GradeTrendPoint[],
  width: number,
  colors: ChartThemeColors = DEFAULT_CHART_COLORS,
): string {
  const payload = escapeJson(data)
  const chartHeight = 240

  const script = `
<script>
(function () {
  const data = ${payload};
  const width = ${Math.max(280, Math.floor(width))};
  const height = ${chartHeight};
  const pad = { top: 10, right: 10, bottom: 30, left: 38 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const baselineY = pad.top + innerH;
  const ticks = [0, 25, 50, 75, 100];
  const colors = { overall: "${colors.success}", quiz: "${colors.accent}", homework: "${colors.warning}" };

  function yAt(v) { return pad.top + innerH * (1 - Math.max(0, Math.min(100, v)) / 100); }
  function xAt(i) { return pad.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW); }

  function monotonePath(values) {
    const points = values.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
    if (!points.length) return "";
    if (points.length === 1) return "M " + points[0].x + " " + points[0].y;
    let d = "M " + points[0].x + " " + points[0].y;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += " C " + cp1x + " " + cp1y + ", " + cp2x + " " + cp2y + ", " + p2.x + " " + p2.y;
    }
    return d;
  }

  function areaPath(values) {
    const points = values.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
    if (!points.length) return "";
    let d = "M " + points[0].x + " " + baselineY + " L " + points[0].x + " " + points[0].y;
    for (let i = 1; i < points.length; i++) d += " L " + points[i].x + " " + points[i].y;
    d += " L " + points[points.length - 1].x + " " + baselineY + " Z";
    return d;
  }

  let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg">';
  svg += '<defs>';
  svg += '<linearGradient id="quizArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + colors.quiz + '" stop-opacity="0.35"/><stop offset="100%" stop-color="' + colors.quiz + '" stop-opacity="0"/></linearGradient>';
  svg += '<linearGradient id="hwArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + colors.homework + '" stop-opacity="0.35"/><stop offset="100%" stop-color="' + colors.homework + '" stop-opacity="0"/></linearGradient>';
  svg += '</defs>';

  ticks.forEach(function (tick) {
    const y = yAt(tick);
    svg += '<line x1="' + pad.left + '" y1="' + y + '" x2="' + (width - pad.right) + '" y2="' + y + '" stroke="rgba(148,163,184,0.2)" stroke-dasharray="3 3"/>';
    svg += '<text x="' + (pad.left - 6) + '" y="' + (y + 4) + '" fill="${colors.textMuted}" font-size="10" text-anchor="end" font-weight="500">' + tick + '%</text>';
  });

  const targetY = yAt(80);
  svg += '<line x1="' + pad.left + '" y1="' + targetY + '" x2="' + (width - pad.right) + '" y2="' + targetY + '" stroke="rgba(234,179,8,0.5)" stroke-dasharray="6 4" stroke-width="1.5"/>';

  data.forEach(function (point, i) {
    svg += '<text x="' + xAt(i) + '" y="' + (height - 8) + '" fill="${colors.textMuted}" font-size="10" text-anchor="middle" font-weight="500">' + point.label + '</text>';
  });

  const quizValues = data.map(function (d) { return d.quiz; });
  const hwValues = data.map(function (d) { return d.homework; });

  svg += '<path d="' + areaPath(quizValues) + '" fill="url(#quizArea)"/>';
  svg += '<path d="' + areaPath(hwValues) + '" fill="url(#hwArea)"/>';
  svg += '<path d="' + monotonePath(quizValues) + '" fill="none" stroke="' + colors.quiz + '" stroke-width="2.5"/>';
  svg += '<path d="' + monotonePath(hwValues) + '" fill="none" stroke="' + colors.homework + '" stroke-width="2.5"/>';

  data.forEach(function (point, i) {
    svg += '<circle cx="' + xAt(i) + '" cy="' + yAt(point.quiz) + '" r="4" fill="' + colors.quiz + '" stroke="#fff" stroke-width="2"/>';
    svg += '<circle cx="' + xAt(i) + '" cy="' + yAt(point.homework) + '" r="4" fill="' + colors.homework + '" stroke="#fff" stroke-width="2"/>';
    svg += '<circle cx="' + xAt(i) + '" cy="' + yAt(point.overall != null ? point.overall : 0) + '" r="4" fill="' + colors.overall + '" stroke="#fff" stroke-width="2"/>';
  });

  svg += '</svg>';
  document.querySelector('.wrap').innerHTML = svg;
})();
</script>`

  return chartShell(script, chartHeight)
}

export function buildPerformanceComparisonChartHtml(
  data: PerformanceComparison[],
  width: number,
  colors: ChartThemeColors = DEFAULT_CHART_COLORS,
): string {
  const payload = escapeJson(data)
  const chartHeight = 200

  const script = `
<script>
(function () {
  const data = ${payload};
  const width = ${Math.max(280, Math.floor(width))};
  const height = ${chartHeight};
  const pad = { top: 8, right: 10, bottom: 28, left: 78 };
  const innerW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const barH = 14;
  const barGap = 6;
  const ticks = [0, 25, 50, 75, 100];
  const youColors = ["${colors.accent}", "${colors.accentDark}", "${colors.warning}"];
  const classColors = ["rgba(148,163,184,0.4)", "rgba(148,163,184,0.35)", "rgba(148,163,184,0.3)"];

  function xAt(pct) { return pad.left + (pct / 100) * innerW; }

  let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg">';

  ticks.forEach(function (tick) {
    const x = xAt(tick);
    svg += '<line x1="' + x + '" y1="' + pad.top + '" x2="' + x + '" y2="' + (height - pad.bottom) + '" stroke="rgba(148,163,184,0.15)" stroke-dasharray="3 3"/>';
    svg += '<text x="' + x + '" y="' + (height - 8) + '" fill="${colors.textMuted}" font-size="10" text-anchor="middle" font-weight="500">' + tick + '%</text>';
  });

  data.forEach(function (row, index) {
    const groupH = plotH / data.length;
    const blockH = barH * 2 + barGap;
    const groupTop = pad.top + index * groupH + (groupH - blockH) / 2;
    const youY = groupTop;
    const classY = groupTop + barH + barGap;
    const labelY = groupTop + blockH / 2 + 4;
    const youWidth = Math.max(2, (row.you / 100) * innerW);
    const classWidth = Math.max(2, (row.classAvg / 100) * innerW);

    svg += '<text x="' + (pad.left - 8) + '" y="' + labelY + '" fill="${colors.textMuted}" font-size="10" text-anchor="end" font-weight="500">' + row.label + '</text>';
    svg += '<rect x="' + pad.left + '" y="' + youY + '" width="' + youWidth + '" height="' + barH + '" rx="4" fill="' + youColors[index % 3] + '"/>';
    svg += '<rect x="' + pad.left + '" y="' + classY + '" width="' + classWidth + '" height="' + barH + '" rx="4" fill="' + classColors[index % 3] + '" stroke="rgba(148,163,184,0.25)" stroke-width="1"/>';
  });

  svg += '</svg>';
  document.querySelector('.wrap').innerHTML = svg;
})();
</script>`

  return chartShell(script, chartHeight)
}
