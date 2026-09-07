import { useCallback, useMemo, useRef, useState } from "react"
import { LayoutChangeEvent, PanResponder, Platform, StyleSheet, View } from "react-native"
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
import { fitWorkspaceViewport } from "../../lib/circuit-workspace-viewport"

type Props = {
  workspace: CircuitWorkspace
  onChange: (next: CircuitWorkspace) => void
  disabled?: boolean
  darkPaper?: boolean
  onDrawingActiveChange?: (active: boolean) => void
  /** Fill the parent while keeping the paper aspect ratio (expanded viewer). */
  contain?: boolean
}

const DRAWING_TOOLS: WorkspaceTool[] = ["pen", "highlighter", "line", "rect", "ellipse"]
const ERASER_THROTTLE_MS = 32

export function CircuitWorkspaceCanvas({
  workspace,
  onChange,
  disabled,
  darkPaper,
  onDrawingActiveChange,
  contain,
}: Props) {
  const [layout, setLayout] = useState({ width: 300, height: 400 })
  const [stage, setStage] = useState({ width: 0, height: 0 })
  const [liveStroke, setLiveStroke] = useState<WorkspaceStroke | null>(null)

  const workspaceRef = useRef(workspace)
  const onChangeRef = useRef(onChange)
  const disabledRef = useRef(disabled)
  const darkPaperRef = useRef(darkPaper)
  const drawingActiveRef = useRef(onDrawingActiveChange)
  const activeStrokeRef = useRef<WorkspaceStroke | null>(null)
  const startPointRef = useRef<WorkspacePoint | null>(null)
  const lastEraserAtRef = useRef(0)

  workspaceRef.current = workspace
  onChangeRef.current = onChange
  disabledRef.current = disabled
  darkPaperRef.current = darkPaper
  drawingActiveRef.current = onDrawingActiveChange

  const setDrawingActive = (active: boolean) => {
    drawingActiveRef.current?.(active)
  }

  const { width: canvasWidth, height: canvasHeight } = getWorkspaceCanvasSize(workspace)
  const fitted = contain
    ? fitWorkspaceViewport(stage.width, stage.height, canvasWidth, canvasHeight)
    : null
  const drawWidth = fitted && fitted.width > 0 ? fitted.width : layout.width
  const drawHeight = fitted && fitted.height > 0 ? fitted.height : layout.height
  const scaleX = canvasWidth / Math.max(drawWidth, 1)
  const scaleY = canvasHeight / Math.max(drawHeight, 1)

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
        onStartShouldSetPanResponderCapture: () => !disabledRef.current,
        onMoveShouldSetPanResponderCapture: () => !disabledRef.current,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (evt) => {
          if (disabledRef.current) return
          setDrawingActive(true)
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
          if (activeTool === "eraser") {
            setDrawingActive(false)
            return
          }

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
          setDrawingActive(false)
        },
        onPanResponderTerminate: () => {
          activeStrokeRef.current = null
          startPointRef.current = null
          setLiveStroke(null)
          setDrawingActive(false)
        },
      }),
    [toCanvasPoint],
  )

  const paper = (
    <View
      style={[
        styles.canvasWrap,
        contain
          ? [
              styles.canvasContained,
              fitted && fitted.width > 0
                ? { width: fitted.width, height: fitted.height }
                : null,
            ]
          : null,
        Platform.OS === "web" ? ({ touchAction: "none", userSelect: "none" } as object) : null,
      ]}
      onLayout={contain ? undefined : onLayout}
      collapsable={false}
      {...panResponder.panHandlers}
    >
      <CircuitWorkspaceSvgLayer
        strokes={strokes}
        width={drawWidth}
        height={drawHeight}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        paperPattern={workspace.paperPattern ?? "ruled"}
        darkPaper={darkPaper}
      />
    </View>
  )

  if (!contain) return paper

  return (
    <View
      style={styles.containHost}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout
        if (width > 0 && height > 0) setStage({ width, height })
      }}
      collapsable={false}
    >
      {paper}
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
  containHost: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  canvasContained: {
    aspectRatio: undefined,
    borderRadius: 0,
    maxWidth: "100%",
    maxHeight: "100%",
  },
})
