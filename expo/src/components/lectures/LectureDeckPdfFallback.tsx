import { ActivityIndicator, StyleSheet, View } from "react-native"
import { WebView } from "react-native-webview"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { getAllowedWebViewOriginPrefixes } from "../../lib/trusted-origins"

type PdfSource = {
  uri: string
  headers?: Record<string, string>
}

type Props = {
  source: PdfSource
  backgroundColor: string
  onDocumentLoaded?: (totalPages: number) => void
  onError?: (message: string) => void
}

/** In-app PDF when react-native-pdf is not linked (Expo Go). */
export function LectureDeckPdfFallback({
  source,
  backgroundColor,
  onDocumentLoaded,
  onError,
}: Props) {
  const tokens = useAppThemeTokens()
  const webSource =
    source.headers && !source.uri.startsWith("file://")
      ? { uri: source.uri, headers: source.headers }
      : { uri: source.uri }

  return (
    <WebView
      source={webSource}
      style={[styles.web, { backgroundColor }]}
      originWhitelist={["file://", "http://*", "https://*", ...getAllowedWebViewOriginPrefixes({ lectureDeck: true })]}
      allowFileAccess
      allowingReadAccessToURL={source.uri.startsWith("file://") ? source.uri : undefined}
      startInLoadingState
      renderLoading={() => (
        <View style={[styles.loading, { backgroundColor }]}>
          <ActivityIndicator size="large" color={tokens.accent} />
        </View>
      )}
      onLoadEnd={() => onDocumentLoaded?.(1)}
      onError={() => onError?.("Could not render slide deck.")}
      onHttpError={() => onError?.("Could not render slide deck.")}
    />
  )
}

const styles = StyleSheet.create({
  web: { flex: 1, width: "100%" },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
})
