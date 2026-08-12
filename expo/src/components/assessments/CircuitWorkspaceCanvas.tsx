import { useMemo, useRef, useState } from "react"
import { LayoutChangeEvent, PanResponder, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import Svg, { Line, Polyline } from "react-native-svg"
import {
  WORKSPACE_CANVAS_HEIGHT,
  WORKSPACE_CANVAS_WIDTH,
  newWorkspaceStrokeId,
  type CircuitWorkspace,
  type WorkspacePoint,
  type WorkspaceStroke,
} from "../../lib/circuit-workspace"
import {
  appendStroke,
  getActivePage,
  undoLastStroke,
} from "../../lib/circuit-workspace-mutations"

type Props = {
  workspace: CircuitWorkspace
  onChange: (next: CircuitWorkspace) => void
  disabled?: boolean
  paperColor?: string
  lineColor?: string
}

function strokeToPolyline(stroke: WorkspaceStroke, scaleX: number, scaleY: number): string {
  return stroke.points
    .map((p) => `${p.x / scaleX},${p.y / scaleY}`)
    .join(" ")
}

export function CircuitWorkspaceCanvas({
  workspace,
  onChange,
  disabled,
  paperColor = "#fffef8",
  lineColor = "#e2e8f0",
}: Props) {
  const [layout, setLayout] = useState({ width: 300, height: 400 })
  const activeStrokeRef = useRef<WorkspaceStroke | null>(null)

  const scaleX = WORKSPACE_CANVAS_WIDTH / layout.width
  const scaleY = WORKSPACE_CANVAS_HEIGHT / layout.height

  const [liveStroke, setLiveStroke] = useState<WorkspaceStroke | null>(null)

  const page = getActivePage(workspace)
  const strokes = liveStroke ? [...page.strokes, liveStroke] : page.strokes

  const ruledLines = useMemo(() => {
    const lines: { y: number }[] = []
    const step = 32 / scaleY
    for (let y = step; y < layout.height; y += step) {
      lines.push({ y })
    }
    return lines
  }, [layout.height, scaleY])

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    if (width > 0 && height > 0) setLayout({ width, height })
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (evt) => {
          if (disabled) return
          const { locationX, locationY } = evt.nativeEvent
          const point: WorkspacePoint = {
            x: locationX * scaleX,
            y: locationY * scaleY,
            p: 0.5,
          }
          activeStrokeRef.current = {
            id: newWorkspaceStrokeId(),
            tool: "pen",
            color: workspace.color ?? "#1c1c1e",
            width: workspace.width ?? 4,
            points: [point],
          }
        },
        onPanResponderMove: (evt) => {
          if (disabled || !activeStrokeRef.current) return
          const { locationX, locationY } = evt.nativeEvent
          const next: WorkspaceStroke = {
            ...activeStrokeRef.current,
            points: [
              ...activeStrokeRef.current.points,
              { x: locationX * scaleX, y: locationY * scaleY, p: 0.5 },
            ],
          }
          activeStrokeRef.current = next
          setLiveStroke(next)
        },
        onPanResponderRelease: () => {
          if (activeStrokeRef.current && activeStrokeRef.current.points.length > 1) {
            onChange(appendStroke(workspace, activeStrokeRef.current))
          }
          activeStrokeRef.current = null
          setLiveStroke(null)
        },
        onPanResponderTerminate: () => {
          activeStrokeRef.current = null
          setLiveStroke(null)
        },
      }),
    [disabled, onChange, scaleX, scaleY, workspace],
  )

  return (
    <View
      style={[styles.canvasWrap, { backgroundColor: paperColor, borderColor: lineColor }]}
      onLayout={onLayout}
      {...panResponder.panHandlers}
    >
      <Svg width={layout.width} height={layout.height} style={StyleSheet.absoluteFill}>
        {ruledLines.map((l, i) => (
          <Line
            key={`rule-${i}`}
            x1={0}
            y1={l.y}
            x2={layout.width}
            y2={l.y}
            stroke={lineColor}
            strokeWidth={1}
          />
        ))}
        {strokes.map((stroke) => (
          <Polyline
            key={stroke.id}
            points={strokeToPolyline(stroke, scaleX, scaleY)}
            fill="none"
            stroke={stroke.color}
            strokeWidth={(stroke.width ?? 4) / scaleX}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </View>
  )
}

export function CircuitWorkspaceToolbar({
  workspace,
  onChange,
  disabled,
  accentColor = "#6D5EF6",
}: {
  workspace: CircuitWorkspace
  onChange: (next: CircuitWorkspace) => void
  disabled?: boolean
  accentColor?: string
}) {
  const canUndo = getActivePage(workspace).strokes.length > 0
  return (
    <View style={styles.toolbar}>
      <View style={[styles.toolDot, { backgroundColor: workspace.color ?? "#1c1c1e" }]} />
      <Pressable
        style={[styles.undoInner, !canUndo && styles.undoDisabled]}
        onPress={() => {
          if (!disabled && canUndo) onChange(undoLastStroke(workspace))
        }}
        disabled={disabled || !canUndo}
      >
        <Ionicons name="arrow-undo-outline" size={16} color={accentColor} />
        <Text style={[styles.undoText, { color: accentColor }]}>Undo</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  canvasWrap: {
    width: "100%",
    aspectRatio: WORKSPACE_CANVAS_WIDTH / WORKSPACE_CANVAS_HEIGHT,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  toolDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: "#cbd5e1" },
  undoInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  undoDisabled: { opacity: 0.4 },
  undoText: { fontSize: 13, fontWeight: "600" },
})
