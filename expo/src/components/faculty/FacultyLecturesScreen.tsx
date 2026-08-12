import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { ApiError } from "../../lib/api"
import { instructorApi, type InstructorLecture } from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FACULTY_COLLAB_COLOR } from "../../lib/faculty-collab-theme"
import { solidListThumbFixed } from "../../lib/solid-list-thumb"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { FacultyEmptyState, FacultyStatusPill } from "./faculty-shared"
import { FacultySearchToolbar } from "./faculty-module-shell"
import { FacultyLectureActionSheet } from "./FacultyLectureActionSheet"
import { FacultyLectureEditorModal } from "./FacultyLectureEditorModal"
import { FacultyLectureSamplePracticeModal } from "./FacultyLectureSamplePracticeModal"
import { FacultyLectureWorkspaceModal } from "./FacultyLectureWorkspaceModal"
import { useModuleTheme } from "../../lib/themed-module-shell"

const SHEET_DISMISS_MS = 280

function lectureHasDeck(lecture: InstructorLecture): boolean {
  return Boolean(lecture.pdf_url || lecture.document_url)
}

export function FacultyLecturesScreen() {

  const scrollPad = useModuleScrollContentPadding(24)
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const { styles, type } = useModuleTheme()
  const { scope, ready } = useFacultyScope()

  const [lectures, setLectures] = useState<InstructorLecture[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  const [selected, setSelected] = useState<InstructorLecture | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorTarget, setEditorTarget] = useState<InstructorLecture | null>(null)
  const [createMode, setCreateMode] = useState(false)
  const [createWeek, setCreateWeek] = useState(1)
  const [samplePracticeOpen, setSamplePracticeOpen] = useState(false)
  const [samplePracticeTarget, setSamplePracticeTarget] = useState<InstructorLecture | null>(null)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [workspaceTarget, setWorkspaceTarget] = useState<InstructorLecture | null>(null)

  const load = useCallback(async () => {
    if (!scope) return
    setLectures(await instructorApi.getLectures(scope))
  }, [scope])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load lectures."))
      .finally(() => setLoading(false))
  }, [ready, load])

  const filtered = useMemo(() => {
    if (!search.trim()) return lectures
    const q = search.trim().toLowerCase()
    return lectures.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        String(l.week).includes(q) ||
        (l.description?.toLowerCase().includes(q) ?? false),
    )
  }, [lectures, search])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }, [load])

  useNotificationModuleRefresh("lectures", handleRefresh)

  async function handleUpdated() {
    if (!scope) return
    const next = await instructorApi.getLectures(scope)
    setLectures(next)
    if (selected) {
      const fresh = next.find((l) => l.id === selected.id)
      if (fresh) setSelected(fresh)
    }
    if (editorTarget) {
      const fresh = next.find((l) => l.id === editorTarget.id)
      if (fresh) setEditorTarget(fresh)
    }
  }

  function openAdd() {
    const nextWeek = lectures.length ? Math.max(...lectures.map((l) => l.week)) + 1 : 1
    setCreateMode(true)
    setCreateWeek(nextWeek)
    setEditorTarget(null)
    setEditorOpen(true)
  }

  async function deleteLecture(lecture: InstructorLecture) {
    if (!scope) return
    setSubmitting(true)
    setError("")
    try {
      await instructorApi.deleteLecture(scope, lecture.id)
      setSelected(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete lecture.")
    } finally {
      setSubmitting(false)
    }
  }

  function afterActionSheetDismiss(action: () => void) {
    setSelected(null)
    // iOS cannot stack pageSheet modals — dismiss the action sheet first.
    setTimeout(action, SHEET_DISMISS_MS)
  }

  function openPreview(lecture: InstructorLecture) {
    afterActionSheetDismiss(() => {
      router.push({
        pathname: "/faculty/lecture/[id]",
        params: { id: String(lecture.id) },
      } as never)
    })
  }

  function openEditor(lecture: InstructorLecture) {
    afterActionSheetDismiss(() => {
      setCreateMode(false)
      setEditorTarget(lecture)
      setEditorOpen(true)
    })
  }

  function openSamplePractice(lecture: InstructorLecture) {
    afterActionSheetDismiss(() => {
      setSamplePracticeTarget(lecture)
      setSamplePracticeOpen(true)
    })
  }

  function openWorkspace(lecture: InstructorLecture) {
    afterActionSheetDismiss(() => {
      setWorkspaceTarget(lecture)
      setWorkspaceOpen(true)
    })
  }

  if (!ready) {
    return <FacultyEmptyState icon="easel-outline" title="Select a course" body="Lecture management requires an active course." />
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, scrollPad]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_COLLAB_COLOR.link} />}
        keyboardShouldPersistTaps="handled"
      >
        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search lectures…"
          showFilter={false}
          trailingAction={{
            onPress: openAdd,
            accessibilityLabel: "Add lecture"}}
        />
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={tokens.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={FACULTY_COLLAB_COLOR.link} style={{ marginTop: 32 }} />
        ) : filtered.length === 0 ? (
          <FacultyEmptyState
            icon="easel-outline"
            title={lectures.length === 0 ? "No lectures yet" : "No matches"}
            body={lectures.length === 0 ? "Use + in the search bar to create your first lecture week." : "Try another search."}
          />
        ) : (
          filtered.map((lecture) => {
            const published = lecture.is_published ?? lecture.is_active ?? false
            const weekThumb = solidListThumbFixed(FACULTY_COLLAB_COLOR.tabActive)
            return (
              <Pressable
                key={lecture.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => setSelected(lecture)}
              >
                <View style={styles.cardTop}>
                  <SolidListThumbTile thumb={weekThumb} size="compact">
                    <Text style={[type.caption, { fontWeight: "700", color: weekThumb.icon, fontSize: 11 }]}>
                      W{lecture.week}
                    </Text>
                  </SolidListThumbTile>
                  <View style={styles.cardCopy}>
                    <View style={localStyles.titleRow}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {lecture.title}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color={native.tertiaryLabel} />
                    </View>
                    {lecture.description ? (
                      <Text style={[type.caption, localStyles.cardDesc]} numberOfLines={2}>
                        {lecture.description}
                      </Text>
                    ) : null}
                    <View style={localStyles.metaRow}>
                      <FacultyStatusPill label={published ? "Published" : "Draft"} tone={published ? "success" : "warning"} />
                      {lectureHasDeck(lecture) ? (
                        <FacultyStatusPill label="Deck" tone="neutral" />
                      ) : null}
                    </View>
                  </View>
                </View>
              </Pressable>
            )
          })
        )}
      </ScrollView>

      <FacultyLectureActionSheet
        visible={selected != null}
        lecture={selected}
        onClose={() => setSelected(null)}
        onUpdated={() => void handleUpdated()}
        onOpenEditor={openEditor}
        onOpenPreview={openPreview}
        onOpenSamplePractice={openSamplePractice}
        onOpenWorkspace={openWorkspace}
        onDelete={(lecture) => afterActionSheetDismiss(() => void deleteLecture(lecture))}
      />

      <FacultyLectureEditorModal
        visible={editorOpen}
        lecture={editorTarget}
        createMode={createMode}
        defaultWeek={createWeek}
        onClose={() => {
          setEditorOpen(false)
          setEditorTarget(null)
          setCreateMode(false)
        }}
        onSaved={() => void handleUpdated()}
      />

      <FacultyLectureSamplePracticeModal
        visible={samplePracticeOpen}
        lecture={samplePracticeTarget}
        onClose={() => {
          setSamplePracticeOpen(false)
          setSamplePracticeTarget(null)
        }}
      />

      <FacultyLectureWorkspaceModal
        visible={workspaceOpen}
        lecture={workspaceTarget}
        onClose={() => {
          setWorkspaceOpen(false)
          setWorkspaceTarget(null)
        }}
      />
    </View>
  )
}

const localStyles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  cardDesc: { lineHeight: 18, fontWeight: "500" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
})
