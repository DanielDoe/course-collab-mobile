import {
  createEmptyWorkspacePage,
  getWorkspacePaperDimensions,
  newWorkspaceStrokeId,
  WORKSPACE_MAX_PAGES,
  type CircuitWorkspace,
  type WorkspacePoint,
  type WorkspaceStroke,
  type WorkspaceTool,
} from "./circuit-workspace"

export function getActivePage(workspace: CircuitWorkspace) {
  const idx = Math.min(Math.max(0, workspace.activePageIndex), workspace.pages.length - 1)
  return workspace.pages[idx]!
}

export function appendStroke(workspace: CircuitWorkspace, stroke: WorkspaceStroke): CircuitWorkspace {
  const idx = Math.min(Math.max(0, workspace.activePageIndex), workspace.pages.length - 1)
  const pages = workspace.pages.map((p, i) =>
    i === idx ? { ...p, strokes: [...p.strokes, stroke] } : p,
  )
  return { ...workspace, pages }
}

export function replaceActivePageStrokes(
  workspace: CircuitWorkspace,
  strokes: WorkspaceStroke[],
): CircuitWorkspace {
  const idx = Math.min(Math.max(0, workspace.activePageIndex), workspace.pages.length - 1)
  const pages = workspace.pages.map((p, i) => (i === idx ? { ...p, strokes } : p))
  return { ...workspace, pages }
}

export function setWorkspaceTool(workspace: CircuitWorkspace, tool: WorkspaceTool): CircuitWorkspace {
  return { ...workspace, tool }
}

export function setWorkspaceColor(
  workspace: CircuitWorkspace,
  color: string,
  tool?: WorkspaceTool,
): CircuitWorkspace {
  const activeTool = tool ?? workspace.tool ?? "pen"
  return {
    ...workspace,
    color,
    colorsByTool: { ...workspace.colorsByTool, [activeTool]: color },
  }
}

export function setWorkspaceWidth(workspace: CircuitWorkspace, width: number): CircuitWorkspace {
  return { ...workspace, width }
}

export function setWorkspaceEraserWidth(workspace: CircuitWorkspace, eraserWidth: number): CircuitWorkspace {
  return { ...workspace, eraserWidth }
}

export function setActivePageIndex(workspace: CircuitWorkspace, index: number): CircuitWorkspace {
  const next = Math.min(Math.max(0, index), workspace.pages.length - 1)
  return { ...workspace, activePageIndex: next }
}

export function addWorkspacePage(workspace: CircuitWorkspace): CircuitWorkspace {
  if (workspace.pages.length >= WORKSPACE_MAX_PAGES) return workspace
  const pages = [...workspace.pages, createEmptyWorkspacePage()]
  return { ...workspace, pages, activePageIndex: pages.length - 1 }
}

export function deleteWorkspacePage(workspace: CircuitWorkspace, index: number): CircuitWorkspace {
  if (workspace.pages.length <= 1) {
    return replaceActivePageStrokes(workspace, [])
  }
  const pages = workspace.pages.filter((_, i) => i !== index)
  const activePageIndex = Math.min(workspace.activePageIndex, pages.length - 1)
  return { ...workspace, pages, activePageIndex }
}

export function clearActivePage(workspace: CircuitWorkspace): CircuitWorkspace {
  return replaceActivePageStrokes(workspace, [])
}

export function createStrokeFromPoints(
  workspace: CircuitWorkspace,
  points: WorkspacePoint[],
  tool?: WorkspaceTool,
): WorkspaceStroke | null {
  if (points.length < 1) return null
  const activeTool = tool ?? workspace.tool ?? "pen"
  return {
    id: newWorkspaceStrokeId(),
    tool: activeTool,
    color: workspace.color ?? "#1c1c1e",
    width: workspace.width ?? 4,
    points,
  }
}

/** Remove strokes whose polyline is within eraser radius of point. */
export function eraseStrokesAtPoint(
  workspace: CircuitWorkspace,
  point: WorkspacePoint,
  radius: number,
): CircuitWorkspace {
  const eraserR = radius * radius
  const page = getActivePage(workspace)
  const remaining = page.strokes.filter((stroke) => {
    if (stroke.tool === "image") return true
    return !stroke.points.some((pt) => {
      const dx = pt.x - point.x
      const dy = pt.y - point.y
      return dx * dx + dy * dy <= eraserR
    })
  })
  if (remaining.length === page.strokes.length) return workspace
  return replaceActivePageStrokes(workspace, remaining)
}

export function distancePointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1
  const dy = y2 - y1
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1)
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
  const cx = x1 + t * dx
  const cy = y1 + t * dy
  return Math.hypot(px - cx, py - cy)
}

export function strokeHitRadius(stroke: WorkspaceStroke, scale: number): number {
  const base = stroke.width ?? 4
  if (stroke.tool === "highlighter") return Math.max(base * 2, 12) * scale
  return Math.max(base, 8) * scale
}

export function undoLastStroke(workspace: CircuitWorkspace): CircuitWorkspace {
  const page = getActivePage(workspace)
  if (!page.strokes.length) return workspace
  return replaceActivePageStrokes(workspace, page.strokes.slice(0, -1))
}

export function getWorkspaceCanvasSize(workspace: CircuitWorkspace): { width: number; height: number } {
  return getWorkspacePaperDimensions(workspace)
}
