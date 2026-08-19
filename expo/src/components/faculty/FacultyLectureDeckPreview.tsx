import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { WebView } from "react-native-webview"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { FACULTY_SHEET_COLOR } from "../../lib/faculty-sheet-theme"
import { semanticSoft } from "../../lib/themed-module-theme"
import { getAllowedWebViewOriginPrefixes } from "../../lib/trusted-origins"
import { buildFacultyDeckRequest, useResolvedLectureDeckSource } from "../../lib/use-lecture-deck-source"
import { FacultyEmptyState } from "./faculty-shared"

type Props = {
  pdfUrl: string
  title?: string
  cacheKey?: string
}

export function FacultyLectureDeckPreview({ pdfUrl, title, cacheKey }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const { scope } = useFacultyScope()
  const request = buildFacultyDeckRequest(
    pdfUrl,
    scope ? { instructorId: scope.instructorId, courseId: scope.courseId } : undefined,
  )
  const { source, loading, error } = useResolvedLectureDeckSource({
    deckUrl: request?.uri ?? null,
    headers: request?.headers,
    cacheKey: cacheKey ?? pdfUrl,
    enabled: Boolean(request?.uri),
  })

  if (!request) return null

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.headCopy}>
          <Text style={[styles.label, { color: tokens.text }]}>Live preview</Text>
          <Text style={[styles.hint, { color: tokens.textSecondary }]}>
            Same PDF students see in the lecture viewer
          </Text>
        </View>
        <Pressable
          style={[
            styles.openBtn,
            {
              backgroundColor: semanticSoft(FACULTY_SHEET_COLOR.link, tokens.isDark),
              borderColor: tokens.border,
            },
          ]}
          onPress={() => void Linking.openURL(source?.uri ?? request.uri)}
          disabled={!source && !request.uri}
        >
          <Ionicons name="expand-outline" size={14} color={FACULTY_SHEET_COLOR.link} />
          <Text style={[styles.openText, { color: FACULTY_SHEET_COLOR.link }]}>Open</Text>
        </Pressable>
      </View>
      <View style={[styles.frame, { borderColor: native.separator, backgroundColor: tokens.surface }]}>
        {loading ? (
          <View style={[styles.loading, { backgroundColor: tokens.surface }]}>
            <ActivityIndicator color={FACULTY_SHEET_COLOR.link} />
          </View>
        ) : error ? (
          <View style={[styles.loading, { backgroundColor: tokens.surface, paddingHorizontal: 16 }]}>
            <FacultyEmptyState icon="alert-circle-outline" title="Preview unavailable" body={error} />
          </View>
        ) : source ? (
          <WebView
            source={source}
            style={[styles.webview, { backgroundColor: tokens.surface }]}
            originWhitelist={getAllowedWebViewOriginPrefixes({ lectureDeck: true })}
            startInLoadingState
            renderLoading={() => (
              <View style={[styles.loading, { backgroundColor: tokens.surface }]}>
                <ActivityIndicator color={FACULTY_SHEET_COLOR.link} />
              </View>
            )}
          />
        ) : null}
      </View>
      {title ? (
        <Text style={[styles.caption, { color: tokens.textSecondary }]} numberOfLines={2}>
          {title}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  head: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  headCopy: { flex: 1, gap: 2 },
  label: { fontSize: 13, fontWeight: "600" },
  hint: { fontSize: 12, fontWeight: "600", lineHeight: 16 },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  openText: { fontSize: 12, fontWeight: "700" },
  frame: {
    height: 280,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  webview: { flex: 1 },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  caption: { fontSize: 12, fontWeight: "600" },
})
