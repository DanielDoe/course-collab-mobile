import type { InstructorDashboardCharts } from "../../lib/instructor-api"
import { FACULTY_CHART_COLORS } from "../../lib/faculty-dashboard-theme"

const { primary, primaryDark, primaryLight, pie, grid, tick, targetLine } = FACULTY_CHART_COLORS
export const FACULTY_CHART_HEIGHT = 260

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
    margin: 0; padding: 0; background: transparent; overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .wrap { width: 100%; height: ${height}px; }
  svg { display: block; width: 100%; height: 100%; }
</style>
</head>
<body><div class="wrap"></div>${script}</body>
</html>`
}


/** Submissions (Last 7 Days) — matches web BarChart with gradient bars + grid. */
export function buildFacultySubmissionsChartHtml(
  data: InstructorDashboardCharts["submissionsOverTime"],
  width: number,
): string {
  const payload = escapeJson(data)
  const chartHeight = FACULTY_CHART_HEIGHT
  const colors = escapeJson({ primary, slate: tick, grid })

  const script = `
<script>
(function () {
  const data = ${payload};
  const colors = ${colors};
  const width = ${Math.max(280, Math.floor(width))};
  const height = ${chartHeight};
  const plotLeft = 34;
  const plotRight = width - 16;
  const plotTop = 16;
  const plotBottom = height - 32;
  const innerW = plotRight - plotLeft;
  const innerH = plotBottom - plotTop;
  const maxVal = Math.max(1, ...data.map(function (d) { return d.count; }));
  const step = Math.max(1, Math.ceil(maxVal / 5));
  const yMax = Math.ceil(maxVal / step) * step || 1;
  const yTicks = [];
  for (var v = 0; v <= yMax; v += step) yTicks.push(v);
  if (yTicks.length < 2) yTicks.push(yMax);

  function yAt(v) { return plotTop + innerH * (1 - v / yMax); }
  const slotW = innerW / Math.max(data.length, 1);
  const barW = Math.min(48, Math.max(14, slotW - 12));

  let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg">';
  svg += '<defs><linearGradient id="subBarGrad" x1="0" y1="0" x2="0" y2="1">';
  svg += '<stop offset="0%" stop-color="' + colors.primary + '" stop-opacity="0.9"/>';
  svg += '<stop offset="100%" stop-color="' + colors.primary + '" stop-opacity="0.4"/>';
  svg += '</linearGradient></defs>';

  yTicks.forEach(function (tick) {
    const y = yAt(tick);
    svg += '<line x1="' + plotLeft + '" y1="' + y + '" x2="' + plotRight + '" y2="' + y + '" stroke="' + colors.grid + '" stroke-dasharray="3 3"/>';
    svg += '<text x="' + (plotLeft - 6) + '" y="' + (y + 4) + '" fill="' + colors.slate + '" font-size="11" font-weight="500" text-anchor="end">' + tick + '</text>';
  });

  data.forEach(function (d, i) {
    const cx = plotLeft + slotW * i + slotW / 2;
    const h = Math.max(d.count > 0 ? 4 : 0, (d.count / yMax) * innerH);
    const x = cx - barW / 2;
    const y = plotBottom - h;
    svg += '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + h + '" rx="6" ry="6" fill="url(#subBarGrad)"/>';
    const short = d.label && d.label.indexOf(",") > -1 ? d.label.split(",")[0].trim() : (d.label || "");
    svg += '<text x="' + cx + '" y="' + (height - 10) + '" fill="' + colors.slate + '" font-size="11" font-weight="500" text-anchor="middle">' + short + '</text>';
  });

  svg += '</svg>';
  document.querySelector(".wrap").innerHTML = svg;
})();
</script>`

  return chartShell(script, chartHeight)
}

/** Submissions by Type — matches web PieChart donut + legend. */
export function buildFacultyBreakdownChartHtml(
  data: InstructorDashboardCharts["assessmentBreakdown"],
  width: number,
): string {
  const payload = escapeJson(data)
  const chartHeight = FACULTY_CHART_HEIGHT
  const pieColors = escapeJson([...pie])

  const script = `
<script>
(function () {
  const data = ${payload};
  const colors = ${pieColors};
  const width = ${Math.max(280, Math.floor(width))};
  const height = ${chartHeight};
  const legendRows = Math.ceil(data.length / 2);
  const legendH = legendRows * 22 + 16;
  const chartH = height - legendH;
  const cx = width / 2;
  const cy = chartH * 0.5;
  const outerR = Math.min(width * 0.32, chartH * 0.38);
  const innerR = outerR * 0.67;
  const padAngle = (Math.PI / 180) * 2;
  const total = data.reduce(function (s, d) { return s + d.value; }, 0) || 1;
  const sliceAngle = Math.PI * 2 - padAngle * Math.max(data.length, 1);

  function donutSlice(start, end) {
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = cx + outerR * Math.cos(start);
    const y1 = cy + outerR * Math.sin(start);
    const x2 = cx + outerR * Math.cos(end);
    const y2 = cy + outerR * Math.sin(end);
    const x3 = cx + innerR * Math.cos(end);
    const y3 = cy + innerR * Math.sin(end);
    const x4 = cx + innerR * Math.cos(start);
    const y4 = cy + innerR * Math.sin(start);
    return 'M ' + x1 + ' ' + y1 + ' A ' + outerR + ' ' + outerR + ' 0 ' + large + ' 1 ' + x2 + ' ' + y2 +
      ' L ' + x3 + ' ' + y3 + ' A ' + innerR + ' ' + innerR + ' 0 ' + large + ' 0 ' + x4 + ' ' + y4 + ' Z';
  }

  let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg">';
  let angle = -Math.PI / 2;

  data.forEach(function (d, i) {
    const sweep = (d.value / total) * sliceAngle;
    const start = angle;
    const end = angle + sweep;
    svg += '<path d="' + donutSlice(start, end) + '" fill="' + colors[i % colors.length] + '"/>';
    angle = end + padAngle;
  });

  const colW = width / 2;
  data.forEach(function (d, i) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col * colW + 20;
    const y = chartH + 18 + row * 22;
    svg += '<rect x="' + x + '" y="' + (y - 9) + '" width="10" height="10" rx="2" fill="' + colors[i % colors.length] + '"/>';
    svg += '<text x="' + (x + 16) + '" y="' + y + '" fill="#475569" font-size="12" font-weight="500">' + d.name + ': ' + d.value + '</text>';
  });

  svg += '</svg>';
  document.querySelector(".wrap").innerHTML = svg;
})();
</script>`

  return chartShell(script, chartHeight)
}

/** Class Average Score (Last 6 Weeks) — matches web AreaChart with monotone curve. */
export function buildFacultyScoreTrendChartHtml(
  data: InstructorDashboardCharts["scoreTrend"],
  width: number,
): string {
  const payload = escapeJson(data)
  const chartHeight = FACULTY_CHART_HEIGHT

  const script = `
<script>
(function () {
  const data = ${payload};
  const width = ${Math.max(280, Math.floor(width))};
  const height = ${chartHeight};
  const margin = { top: 16, right: 16, left: 0, bottom: 0 };
  const plotLeft = 38;
  const plotRight = width - margin.right;
  const plotTop = margin.top;
  const plotBottom = height - 28;
  const innerW = plotRight - plotLeft;
  const innerH = plotBottom - plotTop;
  const yTicks = [0, 25, 50, 75, 100];

  function yAt(v) { return plotTop + innerH * (1 - Math.max(0, Math.min(100, v)) / 100); }
  function xAt(i) { return plotLeft + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW); }

  function monotonePath(values) {
    const points = values.map(function (v, i) { return { x: xAt(i), y: yAt(v) }; });
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
    const line = monotonePath(values);
    if (!line || !data.length) return "";
    const lastX = xAt(data.length - 1);
    const firstX = xAt(0);
    return line + " L " + lastX + " " + plotBottom + " L " + firstX + " " + plotBottom + " Z";
  }

  const scores = data.map(function (d) { return d.avgScore; });

  let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg">';
  svg += '<defs>';
  svg += '<linearGradient id="scoreArea" x1="0" y1="0" x2="0" y2="1">';
  svg += '<stop offset="0%" stop-color="${primary}" stop-opacity="0.4"/>';
  svg += '<stop offset="100%" stop-color="${primary}" stop-opacity="0"/>';
  svg += '</linearGradient>';
  svg += '<linearGradient id="scoreStroke" x1="0" y1="0" x2="1" y2="0">';
  svg += '<stop offset="0%" stop-color="${primaryDark}"/>';
  svg += '<stop offset="100%" stop-color="${primaryLight}"/>';
  svg += '</linearGradient>';
  svg += '</defs>';

  yTicks.forEach(function (tick) {
    const y = yAt(tick);
    svg += '<line x1="' + plotLeft + '" y1="' + y + '" x2="' + plotRight + '" y2="' + y + '" stroke="${grid}" stroke-dasharray="3 3"/>';
    svg += '<text x="' + (plotLeft - 6) + '" y="' + (y + 4) + '" fill="${tick}" font-size="11" font-weight="500" text-anchor="end">' + tick + '%</text>';
  });

  const targetY = yAt(80);
  svg += '<line x1="' + plotLeft + '" y1="' + targetY + '" x2="' + plotRight + '" y2="' + targetY + '" stroke="${targetLine}" stroke-dasharray="6 4" stroke-width="1.5"/>';

  data.forEach(function (d, i) {
    svg += '<text x="' + xAt(i) + '" y="' + (height - 8) + '" fill="${tick}" font-size="11" font-weight="500" text-anchor="middle">' + d.week + '</text>';
  });

  svg += '<path d="' + areaPath(scores) + '" fill="url(#scoreArea)"/>';
  svg += '<path d="' + monotonePath(scores) + '" fill="none" stroke="url(#scoreStroke)" stroke-width="2.5"/>';

  data.forEach(function (d, i) {
    svg += '<circle cx="' + xAt(i) + '" cy="' + yAt(d.avgScore) + '" r="4" fill="${primary}" stroke="#fff" stroke-width="2"/>';
  });

  svg += '</svg>';
  document.querySelector(".wrap").innerHTML = svg;
})();
</script>`

  return chartShell(script, chartHeight)
}

export function hasSubmissionsChartData(data: InstructorDashboardCharts["submissionsOverTime"]): boolean {
  return data.some((d) => d.count > 0)
}

export function hasBreakdownChartData(data: InstructorDashboardCharts["assessmentBreakdown"]): boolean {
  return data.some((d) => d.value > 0)
}

export function hasScoreTrendChartData(data: InstructorDashboardCharts["scoreTrend"]): boolean {
  return data.some((d) => d.avgScore > 0 || d.attempts > 0)
}
