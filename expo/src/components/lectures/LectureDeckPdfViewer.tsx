import { useMemo, useState, type ComponentType } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { ensurePdfFileUri } from "../../lib/lecture-deck-loader"
import { isNativePdfAvailable } from "../../lib/native-pdf"
import { useResolvedLectureDeckSource } from "../../lib/use-lecture-deck-source"
import { FacultyEmptyState } from "../faculty/faculty-shared"
import { LectureDeckPdfFallback } from "./LectureDeckPdfFallback"

type NativePdfProps = {
  source: { uri: string; headers?: Record<string, string>; cache?: boolean }
  page?: number
  style?: object
  fitPolicy?: number
  spacing?: number
  enablePaging?: boolean
  trustAllCerts?: boolean
  onLoadComplete?: (numberOfPages: number) => void
  onPageChanged?: (page: number, numberOfPages: number) => void
  onError?: (error: unknown) => void
}

function loadNativePdf(): ComponentType<NativePdfProps> | null {
  if (!isNativePdfAvailable()) return null
  try {
    return require("react-native-pdf").default as ComponentType<NativePdfProps>
  } catch {
    return null
  }
}

const Pdf = loadNativePdf()

type Props = {
  deckUrl: string | null | undefined
  headers?: Record<string, string>
  cacheKey: string
  enabled?: boolean
  initialPage?: number
  onDocumentLoaded?: (totalPages: number) => void
  onPageChange?: (page: number, totalPages: number) => void
}

/** Native lecture slide deck — authenticated prefetch + in-app PDF rendering. */
export function LectureDeckPdfViewer({
  deckUrl,
  headers,
  cacheKey,
  enabled = true,
  initialPage = 1,
  onDocumentLoaded,
  onPageChange,
}: Props) {
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
      {Pdf ? (
        <Pdf
          key={`${pdfSource.uri}-${cacheKey}`}
          source={pdfSource}
          page={initialPage}
          style={[styles.pdf, { backgroundColor: native.secondaryGrouped }]}
          fitPolicy={0}
          spacing={0}
          enablePaging={false}
          trustAllCerts={false}
          onLoadComplete={(numberOfPages) => {
            setRenderError("")
            onDocumentLoaded?.(numberOfPages)
          }}
          onPageChanged={(page, numberOfPages) => {
            onPageChange?.(page, numberOfPages)
          }}
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
      ) : (
        <LectureDeckPdfFallback
          source={pdfSource}
          backgroundColor={native.secondaryGrouped}
          onDocumentLoaded={onDocumentLoaded}
          onError={setRenderError}
        />
      )}
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
