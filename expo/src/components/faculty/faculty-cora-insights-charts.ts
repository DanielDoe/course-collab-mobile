import { FACULTY_CHART_COLORS } from "../../lib/faculty-dashboard-theme"
import { COLOR_HUNT } from "../../lib/flashcard-difficulty-theme"
import { COLOR_HUNT_COOL } from "../../lib/codebench-badge-theme"

const { pie, primary, primaryDark } = FACULTY_CHART_COLORS

export const CORA_CHART = {
  hourly: 148,
  donut: 176,
  row: 28,
} as const

export type CoraChartInk = {
  label: string
  muted: string
  grid: string
}

export const CORA_CHART_INK_DARK: CoraChartInk = {
  label: "#F1F5F9",
  muted: "#94A3B8",
  grid: "rgba(148,163,184,0.22)",
}

export const CORA_CHART_INK_LIGHT: CoraChartInk = {
  label: "#1E293B",
  muted: "#64748B",
  grid: "rgba(100,116,139,0.2)",
}

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
  html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
  .wrap { width: 100%; height: ${height}px; }
  svg { display: block; width: 100%; height: 100%; }
</style>
</head>
<body><div class="wrap"></div>${script}</body>
</html>`
}

export function coraBarsHeight(rows: number): number {
  return Math.max(96, 12 + Math.min(rows, 6) * CORA_CHART.row)
}

/** Compact 24-hour column chart. */
export function buildCoraHourlyAreaHtml(
  data: Array<{ hour: number; question_count: number }>,
  width: number,
  ink: CoraChartInk,
): string {
  const payload = escapeJson(data)
  const colors = escapeJson({ ...ink, bar: primary, peak: primaryDark })
  const height = CORA_CHART.hourly
  const script = `
<script>
(function () {
  const data = ${payload};
  const c = ${colors};
  const width = ${Math.max(280, Math.floor(width))};
  const height = ${height};
  const L = 22, R = width - 8, T = 10, B = height - 22;
  const innerW = R - L, innerH = B - T;
  const n = Math.max(data.length, 1);
  const maxVal = Math.max(1, ...data.map(function (d) { return d.question_count; }));
  const gap = 2;
  const slot = innerW / n;
  const barW = Math.max(3, slot - gap);
  let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg">';
  svg += '<line x1="' + L + '" y1="' + B + '" x2="' + R + '" y2="' + B + '" stroke="' + c.grid + '"/>';
  data.forEach(function (row, i) {
    const h = row.question_count > 0 ? Math.max(3, (row.question_count / maxVal) * innerH) : 0;
    const x = L + slot * i + gap / 2;
    const y = B - h;
    const peak = row.question_count === maxVal && maxVal > 0;
    svg += '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + h + '" rx="2" fill="' + (peak ? c.peak : c.bar) + '"/>';
  });
  [0, 6, 12, 18, 23].forEach(function (hour) {
    const i = data.findIndex(function (d) { return d.hour === hour; });
    if (i < 0) return;
    const x = L + slot * i + barW / 2;
    svg += '<text x="' + x + '" y="' + (height - 6) + '" fill="' + c.muted + '" font-size="10" font-weight="600" text-anchor="middle">' + hour + '</text>';
  });
  svg += '<text x="' + L + '" y="10" fill="' + c.muted + '" font-size="10" font-weight="600">' + maxVal + '</text>';
  svg += '</svg>';
  document.querySelector('.wrap').innerHTML = svg;
})();
</script>`
  return chartShell(script, height)
}

/** Label left, bar right — no text painted on the bar. */
export function buildCoraTopicBarsHtml(
  data: Array<{ label: string; count: number; color?: string }>,
  width: number,
  ink: CoraChartInk,
): string {
  const rows = data.slice(0, 6)
  const payload = escapeJson(rows)
  const colors = escapeJson({ ...ink, fallback: [...pie] })
  const height = coraBarsHeight(rows.length)
  const script = `
<script>
(function () {
  const data = ${payload};
  const c = ${colors};
  const width = ${Math.max(280, Math.floor(width))};
  const height = ${height};
  const labelW = Math.min(118, width * 0.38);
  const L = labelW + 8, R = width - 28, T = 4, B = height - 4;
  const innerW = Math.max(40, R - L);
  const n = Math.max(data.length, 1);
  const rowH = (B - T) / n;
  const barH = Math.min(14, rowH * 0.55);
  const maxVal = Math.max(1, ...data.map(function (d) { return d.count; }));
  let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg">';
  data.forEach(function (d, i) {
    const cy = T + rowH * i + rowH / 2;
    const w = Math.max(d.count > 0 ? 6 : 0, innerW * (d.count / maxVal));
    const fill = d.color || c.fallback[i % c.fallback.length];
    const label = d.label.length > 16 ? d.label.slice(0, 15) + '…' : d.label;
    svg += '<text x="' + (L - 8) + '" y="' + (cy + 4) + '" fill="' + c.label + '" font-size="11" font-weight="600" text-anchor="end">' + label + '</text>';
    svg += '<rect x="' + L + '" y="' + (cy - barH / 2) + '" width="' + innerW + '" height="' + barH + '" rx="7" fill="' + c.grid + '"/>';
    svg += '<rect x="' + L + '" y="' + (cy - barH / 2) + '" width="' + w + '" height="' + barH + '" rx="7" fill="' + fill + '"/>';
    svg += '<text x="' + (R + 6) + '" y="' + (cy + 4) + '" fill="' + c.muted + '" font-size="11" font-weight="700">' + d.count + '</text>';
  });
  svg += '</svg>';
  document.querySelector('.wrap').innerHTML = svg;
})();
</script>`
  return chartShell(script, height)
}

export function buildCoraDonutHtml(
  data: Array<{ name: string; value: number }>,
  width: number,
  ink: CoraChartInk,
): string {
  const rows = data.filter((row) => row.value > 0)
  const payload = escapeJson(rows)
  const pieColors = escapeJson([...pie])
  const colors = escapeJson(ink)
  const height = CORA_CHART.donut
  const script = `
<script>
(function () {
  const data = ${payload};
  const slice = ${pieColors};
  const ink = ${colors};
  const width = ${Math.max(280, Math.floor(width))};
  const height = ${height};
  const cx = width * 0.28;
  const cy = height * 0.5;
  const outerR = Math.min(width * 0.22, height * 0.36);
  const innerR = outerR * 0.62;
  const pad = 0.06;
  const total = data.reduce(function (s, d) { return s + d.value; }, 0) || 1;

  function donutSlice(start, end) {
    const large = end - start > Math.PI ? 1 : 0;
    return 'M ' + (cx + outerR * Math.cos(start)) + ' ' + (cy + outerR * Math.sin(start)) +
      ' A ' + outerR + ' ' + outerR + ' 0 ' + large + ' 1 ' + (cx + outerR * Math.cos(end)) + ' ' + (cy + outerR * Math.sin(end)) +
      ' L ' + (cx + innerR * Math.cos(end)) + ' ' + (cy + innerR * Math.sin(end)) +
      ' A ' + innerR + ' ' + innerR + ' 0 ' + large + ' 0 ' + (cx + innerR * Math.cos(start)) + ' ' + (cy + innerR * Math.sin(start)) + ' Z';
  }

  let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg">';
  let angle = -Math.PI / 2;
  data.forEach(function (d, i) {
    const sweep = (d.value / total) * (Math.PI * 2 - pad * data.length);
    svg += '<path d="' + donutSlice(angle, angle + sweep) + '" fill="' + slice[i % slice.length] + '"/>';
    angle += sweep + pad;
  });
  svg += '<text x="' + cx + '" y="' + (cy + 5) + '" fill="' + ink.label + '" font-size="18" font-weight="700" text-anchor="middle">' + total + '</text>';
  data.forEach(function (d, i) {
    const y = 28 + i * 28;
    const x = width * 0.54;
    svg += '<rect x="' + x + '" y="' + (y - 8) + '" width="8" height="8" rx="2" fill="' + slice[i % slice.length] + '"/>';
    svg += '<text x="' + (x + 14) + '" y="' + y + '" fill="' + ink.label + '" font-size="12" font-weight="600">' + d.name + '</text>';
    svg += '<text x="' + (width - 14) + '" y="' + y + '" fill="' + ink.muted + '" font-size="12" font-weight="700" text-anchor="end">' + d.value + '</text>';
  });
  svg += '</svg>';
  document.querySelector('.wrap').innerHTML = svg;
})();
</script>`
  return chartShell(script, height)
}

export function coraDifficultyColor(category?: string): string {
  switch (String(category ?? "").toLowerCase()) {
    case "very_hard":
    case "very hard":
      return COLOR_HUNT.pinkDeep
    case "hard":
      return COLOR_HUNT.orange
    case "moderate":
    case "medium":
      return COLOR_HUNT.amber
    default:
      return COLOR_HUNT_COOL.cyan
  }
}

export function coraTrendColor(trend?: string): string {
  if (trend === "rising") return COLOR_HUNT.orange
  if (trend === "falling") return COLOR_HUNT_COOL.cyan
  if (trend === "new") return COLOR_HUNT_COOL.gold
  return COLOR_HUNT_COOL.indigo
}

export function coraSeverityColor(severity?: string): string {
  switch (String(severity ?? "").toLowerCase()) {
    case "critical":
      return COLOR_HUNT.pinkDeep
    case "high":
      return COLOR_HUNT.orange
    case "medium":
      return COLOR_HUNT.amber
    default:
      return COLOR_HUNT_COOL.cyan
  }
}
