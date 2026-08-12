import { useMemo } from "react"
import { StyleSheet } from "react-native"
import { WebView } from "react-native-webview"

type Props = {
  html: string
  height: number
}

export function DashboardChartWebView({ html, height }: Props) {
  const chartKey = useMemo(
    () => `${height}:${html.length}:${html.slice(0, 48)}`,
    [html, height],
  )

  if (!html) return null

  return (
    <WebView
      key={chartKey}
      source={{ html, baseUrl: "about:blank" }}
      style={[styles.webview, { height }]}
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled
      automaticallyAdjustContentInsets={false}
      setBuiltInZoomControls={false}
      setDisplayZoomControls={false}
      nestedScrollEnabled={false}
      androidLayerType="hardware"
      cacheEnabled={false}
    />
  )
}

const styles = StyleSheet.create({
  webview: {
    width: "100%",
    backgroundColor: "transparent",
    opacity: 0.99}})
