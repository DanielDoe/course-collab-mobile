import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { WebView } from "react-native-webview"
import { ApiError } from "../../lib/api"
import { instructorApi, type InstructorLecture } from "../../lib/instructor-api"
import { mergeLectureDeckFromContent } from "../../lib/lecture-deck-url"
import { getAllowedWebViewOriginPrefixes } from "../../lib/trusted-origins"
import { buildFacultyDeckRequest, useResolvedLectureDeckSource } from "../../lib/use-lecture-deck-source"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { LectureSlidePreviewToolbar } from "../lectures/LectureSlidePreviewToolbar"
import { FacultyEmptyState } from "./faculty-shared"

type Props = {
  lectureId: number
}

function lectureDeckUrl(lecture: InstructorLecture | null): string | null {
  if (!lecture) return null
  return lecture.pdf_url || lecture.document_url || null
}

/** Native instructor slide preview — PDF deck only, no embedded web dashboard. */
export function FacultyLectureSlidePreviewScreen({ lectureId }: Props) {
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const { scope, ready } = useFacultyScope()

  const [lecture, setLecture] = useState<InstructorLecture | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!scope || !Number.isFinite(lectureId)) return
    setError("")
    try {
      const lectures = await instructorApi.getLectures(scope)
      const match = lectures.find((item) => item.id === lectureId) ?? null
      if (!match) {
        setError("This lecture could not be found.")
        setLecture(null)
        return
      }
      try {
        const content = await instructorApi.getLectureContent(scope, lectureId)
        setLecture(mergeLectureDeckFromContent(match, content))
      } catch {
        setLecture(match)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load lecture.")
      setLecture(null)
    }
  }, [scope, lectureId])

  useEffect(() => {
    if (!Number.isFinite(lectureId) || lectureId <= 0) {
      setLoading(false)
      setError("Invalid lecture.")
      setLecture(null)
      return
    }
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [ready, load, lectureId])

  const deckUrl = lectureDeckUrl(lecture)
  const deckRequest = useMemo(
    () => buildFacultyDeckRequest(deckUrl, scope ? { instructorId: scope.instructorId, courseId: scope.courseId } : undefined),
    [deckUrl, scope],
  )
  const { source: deckSource, loading: deckLoading, error: deckError } = useResolvedLectureDeckSource({
    deckUrl: deckRequest?.uri ?? null,
    headers: deckRequest?.headers,
    cacheKey: lectureId ? `faculty-lecture-${lectureId}` : undefined,
    enabled: Boolean(deckRequest?.uri),
  })

  const openExternally = () => {
    if (!deckSource?.uri) return
    void Linking.openURL(deckSource.uri)
  }

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <LectureSlidePreviewToolbar
        title="Slide preview"
        onBack={() => router.back()}
        trailing={
          deckSource ? (
            <Pressable
              style={[styles.iconBtn, { backgroundColor: tokens.accentSoftStrong }]}
              onPress={openExternally}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Open slide deck externally"
            >
              <Ionicons name="open-outline" size={18} color={tokens.accent} />
            </Pressable>
          ) : (
            <View style={styles.iconBtnSpacer} />
          )
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tokens.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <FacultyEmptyState icon="alert-circle-outline" title="Could not load" body={error} />
        </View>
      ) : !deckRequest ? (
        <View style={styles.center}>
          <FacultyEmptyState
            icon="document-outline"
            title="No slide deck"
            body="Upload a PDF or PPT deck from Manage lecture → Slide deck & settings."
          />
        </View>
      ) : deckLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tokens.accent} />
        </View>
      ) : deckError ? (
        <View style={styles.center}>
          <FacultyEmptyState icon="alert-circle-outline" title="Could not load slides" body={deckError} />
        </View>
      ) : deckSource ? (
        <View style={[styles.viewer, { backgroundColor: tokens.surface }]}>
          <WebView
            source={deckSource}
            style={styles.webview}
            originWhitelist={getAllowedWebViewOriginPrefixes({ lectureDeck: true })}
            startInLoadingState
            renderLoading={() => (
              <View style={[styles.loading, { backgroundColor: tokens.surface }]}>
                <ActivityIndicator size="large" color={tokens.accent} />
              </View>
            )}
          />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", padding: 24 },
  viewer: { flex: 1, minHeight: 0 },
  webview: { flex: 1 },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnSpacer: { width: 36, height: 36 },
})
