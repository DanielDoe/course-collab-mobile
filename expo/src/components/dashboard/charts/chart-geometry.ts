/** Pure geometry helpers shared by the native SVG dashboard charts. */

export type Pt = { x: number; y: number }

export type Scale = {
  xAt: (index: number) => number
  yAt: (value: number) => number
  baselineY: number
  innerW: number
  innerH: number
  padLeft: number
  padTop: number
  padRight: number
  padBottom: number
}

export function makeScale(opts: {
  width: number
  height: number
  count: number
  min?: number
  max?: number
  padLeft?: number
  padTop?: number
  padRight?: number
  padBottom?: number
}): Scale {
  const padLeft = opts.padLeft ?? 34
  const padTop = opts.padTop ?? 12
  const padRight = opts.padRight ?? 12
  const padBottom = opts.padBottom ?? 26
  const min = opts.min ?? 0
  const max = opts.max ?? 100
  const innerW = Math.max(1, opts.width - padLeft - padRight)
  const innerH = Math.max(1, opts.height - padTop - padBottom)
  const span = max - min || 1

  return {
    padLeft,
    padTop,
    padRight,
    padBottom,
    innerW,
    innerH,
    baselineY: padTop + innerH,
    xAt: (i) => padLeft + (opts.count <= 1 ? innerW / 2 : (i / (opts.count - 1)) * innerW),
    yAt: (v) => {
      const clamped = Math.max(min, Math.min(max, v))
      return padTop + innerH * (1 - (clamped - min) / span)
    },
  }
}

/**
 * Monotone-ish cubic through the points. Uses the Catmull-Rom tangent but
 * clamps any control point that would overshoot the segment's own range, so a
 * flat-then-rising grade series never dips below the data.
 */
export function smoothPath(points: Pt[]): string {
  if (points.length === 0) return ""
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`

  let d = `M ${points[0]!.x} ${points[0]!.y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[i + 2] ?? p2

    const loY = Math.min(p1.y, p2.y)
    const hiY = Math.max(p1.y, p2.y)
    const clamp = (y: number) => Math.max(loY, Math.min(hiY, y))

    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = clamp(p1.y + (p2.y - p0.y) / 6)
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = clamp(p2.y - (p3.y - p1.y) / 6)

    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return d
}

/** Closes a line path down to the baseline so it can be filled as an area. */
export function areaFromLine(points: Pt[], baselineY: number): string {
  if (points.length === 0) return ""
  const line = smoothPath(points)
  const first = points[0]!
  const last = points[points.length - 1]!
  return `${line} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`
}

/** Soft wash that hugs the line instead of flooding down to 0%. */
export function areaRibbon(points: Pt[], depth: number, maxY: number): string {
  if (points.length < 2) return ""
  const line = smoothPath(points)
  const last = points[points.length - 1]!
  const first = points[0]!
  let d = `${line} L ${last.x} ${Math.min(maxY, last.y + depth)}`
  for (let i = points.length - 2; i >= 0; i--) {
    const p = points[i]!
    d += ` L ${p.x} ${Math.min(maxY, p.y + depth)}`
  }
  return `${d} L ${first.x} ${first.y} Z`
}

/** Rounded-top bar anchored to the baseline (data-end rounding only). */
export function barPath(x: number, y: number, w: number, baselineY: number, radius = 4): string {
  const h = Math.max(0, baselineY - y)
  const r = Math.max(0, Math.min(radius, w / 2, h))
  if (h <= 0) return ""
  return [
    `M ${x} ${baselineY}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `L ${x + w - r} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + r}`,
    `L ${x + w} ${baselineY}`,
    "Z",
  ].join(" ")
}

/** Index of the data point nearest a touch x, for the crosshair layer. */
export function nearestIndex(touchX: number, count: number, scale: Scale): number {
  if (count <= 1) return 0
  let best = 0
  let bestDist = Number.POSITIVE_INFINITY
  for (let i = 0; i < count; i++) {
    const d = Math.abs(scale.xAt(i) - touchX)
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return best
}
