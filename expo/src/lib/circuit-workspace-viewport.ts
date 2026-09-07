/** Largest box that fits `canvas` inside `available` without stretching. */
export function fitWorkspaceViewport(
  availableWidth: number,
  availableHeight: number,
  canvasWidth: number,
  canvasHeight: number,
): { width: number; height: number } {
  if (availableWidth <= 0 || availableHeight <= 0 || canvasWidth <= 0 || canvasHeight <= 0) {
    return { width: 0, height: 0 }
  }
  const scale = Math.min(availableWidth / canvasWidth, availableHeight / canvasHeight)
  return {
    width: Math.floor(canvasWidth * scale),
    height: Math.floor(canvasHeight * scale),
  }
}
