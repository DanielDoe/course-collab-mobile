import { useState } from "react"
import { LayoutChangeEvent, StyleSheet, View } from "react-native"
import { CommGroupedList } from "../faculty/faculty-communication-ui"
import { getWorkspaceCanvasSize } from "../../lib/circuit-workspace-mutations"
import type { CircuitWorkspace } from "../../lib/circuit-workspace"
import { CircuitWorkspaceSvgLayer } from "./CircuitWorkspaceSvgLayer"

type Props = {
  workspace: CircuitWorkspace
  darkPaper?: boolean
}

export function CircuitWorkspaceViewer({ workspace, darkPaper }: Props) {
  const [layout, setLayout] = useState({ width: 300, height: 400 })
  const page = workspace.pages[Math.min(workspace.activePageIndex, workspace.pages.length - 1)]!
  const { width: canvasWidth, height: canvasHeight } = getWorkspaceCanvasSize(workspace)

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    if (width > 0 && height > 0) setLayout({ width, height })
  }

  return (
    <CommGroupedList>
      <View style={styles.wrap} onLayout={onLayout}>
        <CircuitWorkspaceSvgLayer
          strokes={page.strokes}
          width={layout.width}
          height={layout.height}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          paperPattern={workspace.paperPattern ?? "ruled"}
          darkPaper={darkPaper}
        />
      </View>
    </CommGroupedList>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    aspectRatio: 1200 / 1600,
    overflow: "hidden",
  },
})
