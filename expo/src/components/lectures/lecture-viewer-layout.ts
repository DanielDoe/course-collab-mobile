import type { ViewStyle } from "react-native"

/** Pull the lecture WebView up to close the gap below the native title bar. */
export const LECTURE_WEBVIEW_TOP_PULL = 44

export const lectureViewerRootStyle: ViewStyle = {
  flex: 1,
  overflow: "hidden",
}

export const lectureViewerWebHostStyle: ViewStyle = {
  flex: 1,
  minHeight: 0,
  marginTop: -LECTURE_WEBVIEW_TOP_PULL,
}
