import type { ViewStyle } from "react-native"

export const lectureViewerRootStyle: ViewStyle = {
  flex: 1,
  overflow: "hidden",
}

/** Web slide deck — flex below native toolbar; never overlap the header (release WebView paints opaque). */
export const lectureViewerWebHostStyle: ViewStyle = {
  flex: 1,
  minHeight: 0,
  position: "relative",
}
