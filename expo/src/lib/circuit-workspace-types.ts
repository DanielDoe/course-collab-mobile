/** @deprecated Import from `./circuit-workspace` — kept for backward compatibility. */
export {
  WORKSPACE_CANVAS_WIDTH,
  WORKSPACE_CANVAS_HEIGHT,
  createEmptyWorkspace,
  newWorkspacePageId,
  newWorkspaceStrokeId,
  parseCircuitWorkspace,
  workspaceHasContent,
  type CircuitWorkspace,
  type WorkspacePage,
  type WorkspacePoint,
  type WorkspaceStroke,
} from "./circuit-workspace"

export {
  appendStroke,
  getActivePage,
  undoLastStroke,
} from "./circuit-workspace-mutations"
