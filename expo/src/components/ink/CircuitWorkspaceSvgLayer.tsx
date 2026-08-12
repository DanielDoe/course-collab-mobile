import type { ReactElement } from "react"
import { useMemo } from "react"
import Svg, { Ellipse, Image as SvgImage, Line, Polyline, Rect } from "react-native-svg"
import {
  resolveStrokeColorForTheme,
  type CircuitWorkspace,
  type WorkspacePaperPattern,
  type WorkspaceStroke,
} from "../../lib/circuit-workspace"

type Props = {
  strokes: WorkspaceStroke[]
  width: number
  height: number
  canvasWidth: number
  canvasHeight: number
  paperPattern?: WorkspacePaperPattern
  paperColor?: string
  lineColor?: string
  darkPaper?: boolean
}

function strokeOpacity(tool: string): number {
  if (tool === "highlighter") return 0.35
  return 1
}

function strokeToPolyline(
  stroke: WorkspaceStroke,
  scaleX: number,
  scaleY: number,
): string {
  return stroke.points.map((p) => `${p.x / scaleX},${p.y / scaleY}`).join(" ")
}

function renderPaperPattern(
  pattern: WorkspacePaperPattern,
  width: number,
  height: number,
  lineColor: string,
  scaleY: number,
) {
  const elements: ReactElement[] = []
  if (pattern === "ruled") {
    const step = 32 / scaleY
    for (let y = step; y < height; y += step) {
      elements.push(
        <Line key={`rule-${y}`} x1={0} y1={y} x2={width} y2={y} stroke={lineColor} strokeWidth={1} />,
      )
    }
  } else if (pattern === "grid") {
    const step = 32 / scaleY
    for (let y = step; y < height; y += step) {
      elements.push(
        <Line key={`gh-${y}`} x1={0} y1={y} x2={width} y2={y} stroke={lineColor} strokeWidth={0.5} />,
      )
    }
    for (let x = step; x < width; x += step) {
      elements.push(
        <Line key={`gv-${x}`} x1={x} y1={0} x2={x} y2={height} stroke={lineColor} strokeWidth={0.5} />,
      )
    }
  } else if (pattern === "dotted") {
    const step = 24 / scaleY
    for (let y = step; y < height; y += step) {
      for (let x = step; x < width; x += step) {
        elements.push(
          <Rect key={`dot-${x}-${y}`} x={x - 1} y={y - 1} width={2} height={2} fill={lineColor} />,
        )
      }
    }
  }
  return elements
}

export function CircuitWorkspaceSvgLayer({
  strokes,
  width,
  height,
  canvasWidth,
  canvasHeight,
  paperPattern = "ruled",
  paperColor = "#fffef8",
  lineColor = "#e2e8f0",
  darkPaper = false,
}: Props) {
  const scaleX = canvasWidth / width
  const scaleY = canvasHeight / height
  const theme = darkPaper ? "dark" : "light"

  const paperElements = useMemo(
    () => renderPaperPattern(paperPattern, width, height, lineColor, scaleY),
    [paperPattern, width, height, lineColor, scaleY],
  )

  return (
    <Svg width={width} height={height} style={{ backgroundColor: paperColor }}>
      {paperElements}
      {strokes.map((stroke) => {
        const color = resolveStrokeColorForTheme(stroke.color, theme)
        const sw = (stroke.width ?? 4) / scaleX
        const opacity = strokeOpacity(stroke.tool)

        if (stroke.tool === "line" && stroke.points.length >= 2) {
          const a = stroke.points[0]!
          const b = stroke.points[stroke.points.length - 1]!
          return (
            <Line
              key={stroke.id}
              x1={a.x / scaleX}
              y1={a.y / scaleY}
              x2={b.x / scaleX}
              y2={b.y / scaleY}
              stroke={color}
              strokeWidth={sw}
              strokeLinecap="round"
              opacity={opacity}
            />
          )
        }

        if (stroke.tool === "rect" && stroke.points.length >= 2) {
          const a = stroke.points[0]!
          const b = stroke.points[stroke.points.length - 1]!
          const x = Math.min(a.x, b.x) / scaleX
          const y = Math.min(a.y, b.y) / scaleY
          const w = Math.abs(b.x - a.x) / scaleX
          const h = Math.abs(b.y - a.y) / scaleY
          return (
            <Rect
              key={stroke.id}
              x={x}
              y={y}
              width={w}
              height={h}
              stroke={color}
              strokeWidth={sw}
              fill="none"
              opacity={opacity}
            />
          )
        }

        if (stroke.tool === "ellipse" && stroke.points.length >= 2) {
          const a = stroke.points[0]!
          const b = stroke.points[stroke.points.length - 1]!
          const cx = (a.x + b.x) / 2 / scaleX
          const cy = (a.y + b.y) / 2 / scaleY
          const rx = Math.abs(b.x - a.x) / 2 / scaleX
          const ry = Math.abs(b.y - a.y) / 2 / scaleY
          return (
            <Ellipse
              key={stroke.id}
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              stroke={color}
              strokeWidth={sw}
              fill="none"
              opacity={opacity}
            />
          )
        }

        if (stroke.tool === "image" && stroke.imageDataUrl && stroke.points.length >= 2) {
          const a = stroke.points[0]!
          const b = stroke.points[stroke.points.length - 1]!
          const x = Math.min(a.x, b.x) / scaleX
          const y = Math.min(a.y, b.y) / scaleY
          const w = Math.max(Math.abs(b.x - a.x) / scaleX, 1)
          const h = Math.max(Math.abs(b.y - a.y) / scaleY, 1)
          return (
            <SvgImage
              key={stroke.id}
              x={x}
              y={y}
              width={w}
              height={h}
              href={stroke.imageDataUrl}
              preserveAspectRatio="xMidYMid meet"
            />
          )
        }

        if (stroke.points.length < 2) return null
        return (
          <Polyline
            key={stroke.id}
            points={strokeToPolyline(stroke, scaleX, scaleY)}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={opacity}
          />
        )
      })}
    </Svg>
  )
}

export function CircuitWorkspaceViewerSvg({
  workspace,
  width,
  height,
  darkPaper,
}: {
  workspace: CircuitWorkspace
  width: number
  height: number
  darkPaper?: boolean
}) {
  const page = workspace.pages[Math.min(workspace.activePageIndex, workspace.pages.length - 1)]!
  const dims = workspace.paperSize
    ? undefined
    : { width: 1200, height: 1600 }
  const canvasWidth = dims?.width ?? 1200
  const canvasHeight = dims?.height ?? 1600

  return (
    <CircuitWorkspaceSvgLayer
      strokes={page.strokes}
      width={width}
      height={height}
      canvasWidth={canvasWidth}
      canvasHeight={canvasHeight}
      paperPattern={workspace.paperPattern ?? "ruled"}
      darkPaper={darkPaper}
    />
  )
}
