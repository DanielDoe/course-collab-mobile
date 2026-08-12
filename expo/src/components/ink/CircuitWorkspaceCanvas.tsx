import { useCallback, useMemo, useRef, useState } from "react"
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from "react-native"
import {
  createStrokeFromPoints,
  eraseStrokesAtPoint,
  getActivePage,
  getWorkspaceCanvasSize,
} from "../../lib/circuit-workspace-mutations"
import {
  resolveWorkspaceColorForTool,
  type CircuitWorkspace,
  type WorkspacePoint,
  type WorkspaceStroke,
  type WorkspaceTool,
} from "../../lib/circuit-workspace"
import { CircuitWorkspaceSvgLayer } from "./CircuitWorkspaceSvgLayer"

type Props = {
  workspace: CircuitWorkspace
  onChange: (next: CircuitWorkspace) => void
  disabled?: boolean
  darkPaper?: boolean
}

const DRAWING_TOOLS: WorkspaceTool[] = ["pen", "highlighter", "line", "rect", "ellipse"]
const ERASER_THROTTLE_MS = 32

export function CircuitWorkspaceCanvas({
  workspace,
  onChange,
  disabled,
  darkPaper,
}: Props) {
  const [layout, setLayout] = useState({ width: 300, height: 400 })
  const [liveStroke, setLiveStroke] = useState<WorkspaceStroke | null>(null)

  const workspaceRef = useRef(workspace)
  const onChangeRef = useRef(onChange)
  const disabledRef = useRef(disabled)
  const darkPaperRef = useRef(darkPaper)
  const activeStrokeRef = useRef<WorkspaceStroke | null>(null)
  const startPointRef = useRef<WorkspacePoint | null>(null)
  const lastEraserAtRef = useRef(0)

  workspaceRef.current = workspace
  onChangeRef.current = onChange
  disabledRef.current = disabled
  darkPaperRef.current = darkPaper

  const { width: canvasWidth, height: canvasHeight } = getWorkspaceCanvasSize(workspace)
  const scaleX = canvasWidth / layout.width
  const scaleY = canvasHeight / layout.height

  const page = getActivePage(workspace)
  const strokes = liveStroke ? [...page.strokes, liveStroke] : page.strokes

  const toCanvasPoint = useCallback(
    (locationX: number, locationY: number): WorkspacePoint => ({
      x: locationX * scaleX,
      y: locationY * scaleY,
      p: 0.5,
    }),
    [scaleX, scaleY],
  )

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    if (width > 0 && height > 0) setLayout({ width, height })
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabledRef.current,
        onMoveShouldSetPanResponder: () => !disabledRef.current,
        onPanResponderGrant: (evt) => {
          if (disabledRef.current) return
          const { locationX, locationY } = evt.nativeEvent
          const point = toCanvasPoint(locationX, locationY)
          const ws = workspaceRef.current
          const activeTool = ws.tool ?? "pen"

          if (activeTool === "eraser") {
            onChangeRef.current(eraseStrokesAtPoint(ws, point, (ws.eraserWidth ?? 24) / 2))
            return
          }

          if (!DRAWING_TOOLS.includes(activeTool)) return

          startPointRef.current = point
          const theme = darkPaperRef.current ? "dark" : "light"
          const color = resolveWorkspaceColorForTool(activeTool, ws, theme)
          const stroke = createStrokeFromPoints({ ...ws, color, tool: activeTool }, [point], activeTool)
          activeStrokeRef.current = stroke
          setLiveStroke(stroke)
        },
        onPanResponderMove: (evt) => {
          if (disabledRef.current) return
          const { locationX, locationY } = evt.nativeEvent
          const point = toCanvasPoint(locationX, locationY)
          const ws = workspaceRef.current
          const activeTool = ws.tool ?? "pen"

          if (activeTool === "eraser") {
            const now = Date.now()
            if (now - lastEraserAtRef.current < ERASER_THROTTLE_MS) return
            lastEraserAtRef.current = now
            onChangeRef.current(eraseStrokesAtPoint(ws, point, (ws.eraserWidth ?? 24) / 2))
            return
          }

          if (!activeStrokeRef.current) return

          if (activeTool === "line" || activeTool === "rect" || activeTool === "ellipse") {
            const start = startPointRef.current ?? point
            const next = { ...activeStrokeRef.current, points: [start, point] }
            activeStrokeRef.current = next
            setLiveStroke(next)
            return
          }

          const next = {
            ...activeStrokeRef.current,
            points: [...activeStrokeRef.current.points, point],
          }
          activeStrokeRef.current = next
          setLiveStroke(next)
        },
        onPanResponderRelease: () => {
          const ws = workspaceRef.current
          const activeTool = ws.tool ?? "pen"
          if (activeTool === "eraser") return

          const stroke = activeStrokeRef.current
          if (stroke) {
            const committed =
              stroke.points.length >= 2
                ? stroke
                : stroke.points.length === 1
                  ? { ...stroke, points: [stroke.points[0]!, stroke.points[0]!] }
                  : null
            if (committed) {
              onChangeRef.current({
                ...ws,
                pages: ws.pages.map((p, i) =>
                  i === ws.activePageIndex ? { ...p, strokes: [...p.strokes, committed] } : p,
                ),
              })
            }
          }
          activeStrokeRef.current = null
          startPointRef.current = null
          setLiveStroke(null)
        },
        onPanResponderTerminate: () => {
          activeStrokeRef.current = null
          startPointRef.current = null
          setLiveStroke(null)
        },
      }),
    [toCanvasPoint],
  )

  return (
    <View style={styles.canvasWrap} onLayout={onLayout} {...panResponder.panHandlers}>
      <CircuitWorkspaceSvgLayer
        strokes={strokes}
        width={layout.width}
        height={layout.height}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        paperPattern={workspace.paperPattern ?? "ruled"}
        darkPaper={darkPaper}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  canvasWrap: {
    width: "100%",
    aspectRatio: 1200 / 1600,
    borderRadius: 12,
    overflow: "hidden",
  },
})
