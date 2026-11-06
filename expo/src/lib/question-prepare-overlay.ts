/** Keep the prepare modal up until fetch/prepare finish and WebViews have painted. */
export function shouldShowQuestionPrepareOverlay(args: {
  enabled: boolean
  ready: boolean
  fetching: boolean
  visible: boolean
  hideUntilReady: boolean
  textCount: number
  paintReady?: boolean
}): boolean {
  if (!args.enabled) return false
  if (args.hideUntilReady && args.paintReady === false) return true
  if (args.ready) return false
  return args.fetching || args.visible || (args.hideUntilReady && args.textCount > 0)
}
