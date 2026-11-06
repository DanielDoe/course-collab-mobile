/**
 * A fully-open drawer must close when drawerOpen becomes false (nav tap),
 * even if a swipe left `dragging` true after the gesture was torn down.
 * Edge-open previews never became fully open — leave those to the gesture.
 */
export function shouldAnimateDrawerClosed(input: {
  drawerOpen: boolean
  dragging: boolean
  wasFullyOpen: boolean
}): boolean {
  if (input.drawerOpen) return false
  if (input.wasFullyOpen) return true
  return !input.dragging
}
