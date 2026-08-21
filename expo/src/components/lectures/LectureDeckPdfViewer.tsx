import { useMemo, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import Pdf from "react-native-pdf"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { ensurePdfFileUri } from "../../lib/lecture-deck-loader"
import { useResolvedLectureDeckSource } from "../../lib/use-lecture-deck-source"
import { FacultyEmptyState } from "../faculty/faculty-shared"

type Props = {
  deckUrl: string | null | undefined
  headers?: Record<string, string>
  cacheKey: string
  enabled?: boolean
}

/** Native lecture slide deck — authenticated prefetch + in-app PDF rendering. */
export function LectureDeckPdfViewer({ deckUrl, headers, cacheKey, enabled = true }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const [renderError, setRenderError] = useState("")
  const { source, loading, error, retry } = useResolvedLectureDeckSource({
    deckUrl,
    headers,
    cacheKey,
    enabled: enabled && Boolean(deckUrl?.trim()),
  })

  const pdfSource = useMemo(() => {
    if (!source?.uri) return null
    const uri = ensurePdfFileUri(source.uri)
    if (source.headers && !uri.startsWith("file://")) {
      return { uri, headers: source.headers, cache: true }
    }
    return { uri, cache: true }
  }, [source])

  if (!deckUrl?.trim()) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <FacultyEmptyState
          icon="document-outline"
          title="No slide deck"
          body="This lecture does not have slides attached yet."
        />
      </View>
    )
  }

  if (loading && !source) {
    return (
      <View style={[styles.center, { backgroundColor: native.secondaryGrouped }]}>
        <ActivityIndicator size="large" color={tokens.accent} />
        <Text style={[type.caption, { color: native.secondaryLabel }]}>Loading slides…</Text>
      </View>
    )
  }

  if (error && !source) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground, padding: 24 }]}>
        <FacultyEmptyState icon="cloud-offline-outline" title="Could not load slides" body={error} />
        <Pressable
          style={[styles.retryBtn, { backgroundColor: tokens.accent }]}
          onPress={retry}
          accessibilityRole="button"
          accessibilityLabel="Retry loading slides"
        >
          <Text style={[type.bodyEmphasis, styles.retryText]}>Try again</Text>
        </Pressable>
      </View>
    )
  }

  if (!pdfSource) {
    return (
      <View style={[styles.center, { backgroundColor: native.secondaryGrouped }]}>
        <ActivityIndicator size="large" color={tokens.accent} />
        <Text style={[type.caption, { color: native.secondaryLabel }]}>Preparing slides…</Text>
      </View>
    )
  }

  const displayError = renderError || error

  return (
    <View style={[styles.root, { backgroundColor: native.secondaryGrouped }]}>
      {loading ? (
        <View style={[styles.loadingOverlay, { backgroundColor: native.secondaryGrouped }]}>
          <ActivityIndicator size="large" color={tokens.accent} />
        </View>
      ) : null}
      {displayError ? (
        <View style={[styles.errorBanner, { backgroundColor: native.groupedBackground, borderColor: native.separator }]}>
          <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={2}>
            {displayError}
          </Text>
          <Pressable onPress={retry} accessibilityRole="button" accessibilityLabel="Retry loading slides">
            <Text style={[type.caption, { color: tokens.accent, fontWeight: "600" }]}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      <Pdf
        key={`${pdfSource.uri}-${cacheKey}`}
        source={pdfSource}
        style={[styles.pdf, { backgroundColor: native.secondaryGrouped }]}
        fitPolicy={0}
        spacing={0}
        enablePaging={false}
        trustAllCerts={false}
        onLoadComplete={() => setRenderError("")}
        onError={(err) => {
          const message =
            typeof err === "string"
              ? err
              : err instanceof Error
                ? err.message
                : "Could not render slide deck."
          setRenderError(message)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  pdf: { flex: 1, width: "100%" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 3,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryText: { color: "#fff" },
})
