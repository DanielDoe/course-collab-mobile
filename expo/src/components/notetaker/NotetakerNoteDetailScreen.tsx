import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useNavigation } from "@react-navigation/native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio"
import {
  CommEmptyState,
  CommGroupedList,
  CommSectionFooter,
  CommStatusChip,
} from "../faculty/faculty-communication-ui"
import { ModuleListRow, ModuleScreen, ModuleSection, ModuleSectionHeader } from "../modules/ModuleScreen"
import { MarkdownNotePreview } from "../notes/MarkdownNotePreview"
import { FacultySheetChrome, FacultySheetContainer } from "../faculty/faculty-collab-sheet-ui"
import { NotetakerScreenHeader } from "./NotetakerScreenHeader"
import { NotetakerSaveFlash } from "./NotetakerSaveFlash"
import { NotetakerChatPanel } from "./NotetakerChatPanel"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { useSession } from "../../context/SessionProvider"
import type { StudentSession } from "../../lib/session"
import { ApiError } from "../../lib/student-api"
import { safeRouterBack } from "../../lib/safe-router-back"
import {
  isNotetakerProcessing,
  notetakerApi,
  notetakerAudioUrl,
  notetakerNoteSegment,
  type NotetakerKeyPoints,
  type NotetakerLimits,
  type NotetakerNoteDetail,
} from "../../lib/notetaker-api"
import { digitalNotesApi, type RosterStudent } from "../../lib/digital-notes-api"
import { formatNotetakerNoteBody } from "../../lib/notetaker-export"

type DetailTab = "summary" | "transcript" | "chat"

const DETAIL_TABS: Array<{ id: DetailTab; label: string }> = [
  { id: "summary", label: "Summary" },
  { id: "transcript", label: "Transcript" },
  { id: "chat", label: "AI Chat" },
]

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function keyPointsMarkdown(kp: NotetakerKeyPoints | null | undefined): string {
  if (!kp) return ""
  const lines: string[] = []
  if (kp.shortSummary) lines.push(kp.shortSummary)
  if (kp.keyConcepts?.length) {
    lines.push("", "## Key concepts", ...kp.keyConcepts.map((c) => `- ${c}`))
  }
  if (kp.importantDefinitions?.length) {
    lines.push("", "## Important definitions", ...kp.importantDefinitions.map((c) => `- ${c}`))
  }
  if (kp.actionItems?.length) {
    lines.push("", "## Action items / review", ...kp.actionItems.map((c) => `- ${c}`))
  }
  if (kp.possibleQuizQuestions?.length) {
    lines.push("", "## Possible quiz questions", ...kp.possibleQuizQuestions.map((c) => `- ${c}`))
  }
  return lines.join("\n")
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function normalizeLectureDate(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  return null
}

function snapshotFromNote(n: NotetakerNoteDetail) {
  return {
    title: (n.title || "").trim(),
    course: (n.course_name || "").trim(),
    lectureDate: n.lecture_date ? String(n.lecture_date).slice(0, 10) : "",
  }
}

export function NotetakerNoteDetailScreen() {
  const { noteRef } = useLocalSearchParams<{ noteRef: string }>()
  const session = useStudentSession()
  const router = useRouter()
  const navigation = useNavigation()
  const allowExitRef = useRef(false)
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [note, setNote] = useState<NotetakerNoteDetail | null>(null)
  const [limits, setLimits] = useState<NotetakerLimits | null>(null)
  const [tab, setTab] = useState<DetailTab>("summary")
  const [title, setTitle] = useState("")
  const [course, setCourse] = useState("")
  const [lectureDate, setLectureDate] = useState("")
  const [savingMeta, setSavingMeta] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [moving, setMoving] = useState(false)
  const [movedDigitalNoteId, setMovedDigitalNoteId] = useState<number | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareSaving, setShareSaving] = useState(false)
  const [roster, setRoster] = useState<RosterStudent[]>([])
  const [selectedShareIds, setSelectedShareIds] = useState<number[]>([])
  const [saveFlashVisible, setSaveFlashVisible] = useState(false)

  const isDirty = useMemo(() => {
    if (!note) return false
    const saved = snapshotFromNote(note)
    const nextDate = normalizeLectureDate(lectureDate)
    const savedDate = normalizeLectureDate(saved.lectureDate)
    return (
      title.trim() !== saved.title ||
      course.trim() !== saved.course ||
      (nextDate ?? "") !== (savedDate ?? "")
    )
  }, [note, title, course, lectureDate])

  const exitAfterSave = useCallback(() => {
    allowExitRef.current = true
    setSaveFlashVisible(true)
    setTimeout(() => {
      setSaveFlashVisible(false)
      safeRouterBack(router, "/module/ai-notetaker")
    }, 850)
  }, [router])

  const leaveWithoutSaving = useCallback(() => {
    allowExitRef.current = true
    safeRouterBack(router, "/module/ai-notetaker")
  }, [router])

  const promptUnsavedExit = useCallback(() => {
    AppAlert.alert("Save changes?", "You have unsaved edits. Save before leaving so nothing is lost.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: leaveWithoutSaving },
      { text: "Save", onPress: () => void saveAndExitRef.current?.() },
    ])
  }, [leaveWithoutSaving])

  const saveAndExitRef = useRef<(() => Promise<void>) | null>(null)

  const load = useCallback(async () => {
    if (!session || !noteRef) return
    setError("")
    try {
      const data = await notetakerApi.getNote(session, noteRef)
      const n = data.note
      setNote(n)
      setLimits(data.limits ?? null)
      setTitle(n.title || "")
      setCourse(n.course_name || "")
      setLectureDate(n.lecture_date ? String(n.lecture_date).slice(0, 10) : "")
      if (n.slug && n.slug !== noteRef) {
        router.replace(`/notetaker/${notetakerNoteSegment(n)}` as never)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load note.")
    }
  }, [session, noteRef, router])

  useEffect(() => {
    if (!session || !noteRef) return
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [session, noteRef, load])

  useEffect(() => {
    if (!note || !session) return
    if (!isNotetakerProcessing(note.processing_status)) return
    const timer = setInterval(() => {
      void load().catch(() => {})
    }, 3000)
    return () => clearInterval(timer)
  }, [note?.processing_status, session, load, note])

  const summaryMarkdown = useMemo(() => {
    if (!note) return ""
    if (note.summary?.trim()) return note.summary.trim()
    return keyPointsMarkdown(note.key_points)
  }, [note])

  const persistMeta = useCallback(async (): Promise<boolean> => {
    if (!session || !note) return false

    const normalizedDate = normalizeLectureDate(lectureDate)
    if (lectureDate.trim() && !normalizedDate) {
      AppAlert.alert("Invalid date", "Use YYYY-MM-DD for the lecture date, or leave it blank.")
      return false
    }

    setSavingMeta(true)
    try {
      const updated = await notetakerApi.patchNote(session, notetakerNoteSegment(note), {
        title: title.trim() || note.title,
        course_name: course.trim() || null,
        lecture_date: normalizedDate,
      })
      setNote(updated)
      setTitle(updated.title || "")
      setCourse(updated.course_name || "")
      setLectureDate(updated.lecture_date ? String(updated.lecture_date).slice(0, 10) : "")
      if (updated.slug && updated.slug !== noteRef) {
        router.replace(`/notetaker/${notetakerNoteSegment(updated)}` as never)
      }
      return true
    } catch (err) {
      AppAlert.alert("Save failed", err instanceof ApiError ? err.message : "Could not save changes.")
      return false
    } finally {
      setSavingMeta(false)
    }
  }, [session, note, title, course, lectureDate, noteRef, router])

  const saveAndExit = useCallback(async () => {
    if (!isDirty) {
      exitAfterSave()
      return
    }
    const ok = await persistMeta()
    if (ok) exitAfterSave()
  }, [isDirty, persistMeta, exitAfterSave])

  saveAndExitRef.current = saveAndExit

  const handleBack = useCallback(() => {
    if (!isDirty) {
      leaveWithoutSaving()
      return
    }
    promptUnsavedExit()
  }, [isDirty, leaveWithoutSaving, promptUnsavedExit])

  useEffect(() => {
    const sub = navigation.addListener("beforeRemove", (event) => {
      if (allowExitRef.current || !isDirty || savingMeta || saveFlashVisible) return
      event.preventDefault()
      promptUnsavedExit()
    })
    return sub
  }, [navigation, isDirty, savingMeta, saveFlashVisible, promptUnsavedExit])

  const ensureDigitalNote = useCallback(async (): Promise<number> => {
    if (!session || !note) throw new Error("Missing session")
    if (movedDigitalNoteId) return movedDigitalNoteId
    const body = formatNotetakerNoteBody(note)
    const created = await digitalNotesApi.createNote(session, {
      title: title.trim() || note.title,
      bodyText: body,
    })
    setMovedDigitalNoteId(created.note.id)
    return created.note.id
  }, [session, note, movedDigitalNoteId, title])

  const moveToMyNotes = useCallback(async () => {
    if (!session || !note) return
    if (note.processing_status !== "completed") {
      AppAlert.alert("Still processing", "Wait until transcription and summarization finish.")
      return
    }
    setMoving(true)
    try {
      const digitalId = await ensureDigitalNote()
      router.push(`/notes/${digitalId}` as never)
    } catch (err) {
      AppAlert.alert("Move failed", err instanceof ApiError ? err.message : "Could not save to My Notes.")
    } finally {
      setMoving(false)
    }
  }, [session, note, ensureDigitalNote, router])

  const shareText = useCallback(async () => {
    if (!note || note.processing_status !== "completed") {
      AppAlert.alert("Still processing", "Notes aren't ready to share yet.")
      return
    }
    const body = formatNotetakerNoteBody(note)
    try {
      await Share.share({
        title: title.trim() || note.title,
        message: `${title.trim() || note.title}\n\n${body}`,
      })
    } catch {
      // user dismissed
    }
  }, [note, title])

  const openClassmateShare = useCallback(async () => {
    if (!session || !note) return
    if (note.processing_status !== "completed") {
      AppAlert.alert("Still processing", "Notes aren't ready to share yet.")
      return
    }
    setShareOpen(true)
    setShareLoading(true)
    try {
      await ensureDigitalNote()
      const rosterRes = await digitalNotesApi.listClassmates(session)
      setRoster(rosterRes.students ?? [])
    } catch (err) {
      setShareOpen(false)
      AppAlert.alert("Share failed", err instanceof ApiError ? err.message : "Could not load classmates.")
    } finally {
      setShareLoading(false)
    }
  }, [session, note, ensureDigitalNote])

  const saveClassmateShares = useCallback(async () => {
    if (!session || !movedDigitalNoteId) return
    setShareSaving(true)
    try {
      await digitalNotesApi.updateShares(session, movedDigitalNoteId, selectedShareIds)
      setShareOpen(false)
      AppAlert.alert("Shared", "Classmates can now view this note in My Notes.")
    } catch (err) {
      AppAlert.alert("Share failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setShareSaving(false)
    }
  }, [session, movedDigitalNoteId, selectedShareIds])

  const confirmDelete = useCallback(() => {
    if (!session || !note) return
    AppAlert.alert("Delete note?", `"${note.title}" will be removed from AI Notetaker.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setDeleting(true)
          void notetakerApi
            .deleteNote(session, note)
            .then(() => router.replace("/module/ai-notetaker" as never))
            .catch((err) => {
              AppAlert.alert("Delete failed", err instanceof ApiError ? err.message : "Could not delete.")
            })
            .finally(() => setDeleting(false))
        },
      },
    ])
  }, [session, note, router])

  const audioUrl = useMemo(() => {
    if (!session || !note?.audio_storage_key) return null
    return notetakerAudioUrl(session, notetakerNoteSegment(note))
  }, [session, note])

  const audioPlayer = useAudioPlayer(audioUrl)
  const audioStatus = useAudioPlayerStatus(audioPlayer)

  const togglePlayback = useCallback(() => {
    if (!audioUrl) return
    if (audioStatus.playing) {
      audioPlayer.pause()
      return
    }
    if (audioStatus.currentTime >= (audioStatus.duration || 0) - 0.25) {
      audioPlayer.seekTo(0)
    }
    audioPlayer.play()
  }, [audioUrl, audioStatus.playing, audioStatus.currentTime, audioStatus.duration, audioPlayer])

  const playbackLabel = useMemo(() => {
    if (!audioStatus.duration) return "Play recording"
    const current = Math.floor(audioStatus.currentTime)
    const total = Math.floor(audioStatus.duration)
    const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`
    return audioStatus.playing ? `${fmt(current)} / ${fmt(total)}` : `Play recording · ${fmt(total)}`
  }, [audioStatus.currentTime, audioStatus.duration, audioStatus.playing])

  const openMembership = useCallback(() => {
    router.push("/membership" as never)
  }, [router])

  if (!session || !noteRef) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <Text style={[type.body, { color: native.secondaryLabel }]}>Invalid note.</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <ActivityIndicator color={tokens.accent} />
      </View>
    )
  }

  if (error || !note) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <Text style={[type.body, { color: tokens.danger }]}>{error || "Note not found."}</Text>
        <Pressable
          onPress={() => safeRouterBack(router, "/module/ai-notetaker")}
          style={styles.backBtn}
        >
          <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>Go back</Text>
        </Pressable>
      </View>
    )
  }

  const processing = isNotetakerProcessing(note.processing_status)
  const failed = note.processing_status === "failed"

  return (
    <>
      <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
        <NotetakerScreenHeader
          title="Note"
          onBackPress={handleBack}
          rightSlot={
            savingMeta ? (
              <ActivityIndicator size="small" color={tokens.accent} />
            ) : (
              <Pressable
                onPress={() => void saveAndExit()}
                hitSlop={8}
                accessibilityLabel="Save note"
              >
                <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>Save</Text>
              </Pressable>
            )
          }
        />

        <ModuleScreen
          loading={false}
          empty={false}
          disableTopInsetAdjustment
          contentStyle={{ paddingTop: 8 }}
        >
          <View style={styles.statusRow}>
            <CommStatusChip
              label={formatStatus(note.processing_status)}
              color={failed ? tokens.danger : processing ? tokens.accent : tokens.success}
              soft={
                failed
                  ? `${tokens.danger}18`
                  : processing
                    ? tokens.accentSoft
                    : `${tokens.success}18`
              }
            />
            {note.duration_seconds ? (
              <Text style={[type.caption, { color: native.secondaryLabel }]}>
                {Math.round(note.duration_seconds / 60)} min recorded
              </Text>
            ) : null}
          </View>

          {processing ? (
            <CommEmptyState
              icon="sparkles-outline"
              title="Creating your notes"
              body="Transcribing audio and summarizing with AI. This usually takes under a minute."
            />
          ) : null}

          {failed ? (
            <CommEmptyState
              icon="alert-circle-outline"
              title="Processing failed"
              body={note.failure_reason || "Something went wrong while processing this recording."}
            />
          ) : null}

          {!processing && !failed ? (
            <>
              {audioUrl ? (
                <ModuleSection>
                  <ModuleListRow
                    title={playbackLabel}
                    subtitle="Listen back to verify what was captured"
                    icon={audioStatus.playing ? "pause-circle-outline" : "play-circle-outline"}
                    iconBg={tokens.accentSoft}
                    iconColor={tokens.accent}
                    onPress={togglePlayback}
                  />
                </ModuleSection>
              ) : null}

              <View style={[styles.segmentTrack, { backgroundColor: native.fill }]}>
                {DETAIL_TABS.map(({ id, label }) => (
                  <Pressable
                    key={id}
                    style={[
                      styles.segmentBtn,
                      tab === id && [styles.segmentBtnActive, { backgroundColor: native.secondaryGrouped }],
                    ]}
                    onPress={() => setTab(id)}
                  >
                    <Text
                      style={[
                        type.caption,
                        styles.segmentLabel,
                        { color: tab === id ? native.label : native.secondaryLabel },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {tab === "summary" ? (
                summaryMarkdown ? (
                  <MarkdownNotePreview markdown={summaryMarkdown} paddingHorizontal={4} minHeight={160} />
                ) : (
                  <CommEmptyState icon="document-text-outline" title="No summary yet" body="" />
                )
              ) : tab === "transcript" ? (
                note.transcript?.trim() ? (
                  <View style={[styles.transcriptBox, { backgroundColor: native.secondaryGrouped }]}>
                    <Text style={[type.body, { color: native.label, lineHeight: 22 }]}>{note.transcript}</Text>
                  </View>
                ) : (
                  <CommEmptyState icon="text-outline" title="No transcript" body="" />
                )
              ) : (
                <NotetakerChatPanel
                  session={session}
                  note={note}
                  chatEnabled={Boolean(limits?.chatEnabled)}
                  onUpgrade={openMembership}
                />
              )}

              <CommSectionFooter>
                Compare Summary and Transcript to verify accuracy. Live captions during recording are a preview — the
                server transcript is the source of truth for AI notes.
              </CommSectionFooter>
            </>
          ) : null}

          <ModuleSectionHeader title="Details" />
          <CommGroupedList>
            <View style={styles.fieldBlock}>
              <Text style={[type.caption, styles.fieldLabel]}>Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Title"
                placeholderTextColor={native.tertiaryLabel}
                style={[styles.fieldInput, type.body, { color: native.label, borderColor: native.separator }]}
              />
            </View>
            <View style={styles.fieldBlock}>
              <Text style={[type.caption, styles.fieldLabel]}>Course</Text>
              <TextInput
                value={course}
                onChangeText={setCourse}
                placeholder="Optional course name"
                placeholderTextColor={native.tertiaryLabel}
                style={[styles.fieldInput, type.body, { color: native.label, borderColor: native.separator }]}
              />
            </View>
            <View style={[styles.fieldBlock, styles.fieldBlockLast]}>
              <Text style={[type.caption, styles.fieldLabel]}>Date</Text>
              <TextInput
                value={lectureDate}
                onChangeText={setLectureDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={native.tertiaryLabel}
                style={[styles.fieldInput, type.body, { color: native.label, borderColor: native.separator }]}
                autoCapitalize="none"
              />
            </View>
          </CommGroupedList>

          <ModuleSectionHeader title="Actions" />
          <ModuleSection>
            <ModuleListRow
              title="Move to My Notes"
              subtitle="Save a copy you can edit and organize"
              icon="document-text-outline"
              iconBg={tokens.accentSoft}
              iconColor={tokens.accent}
              onPress={() => void moveToMyNotes()}
              trailing={moving ? <ActivityIndicator size="small" color={tokens.accent} /> : undefined}
            />
            <ModuleListRow
              title="Share with classmates"
              subtitle="Copy to My Notes and share with your section"
              icon="people-outline"
              iconBg={native.fill}
              iconColor={native.secondaryLabel}
              onPress={() => void openClassmateShare()}
            />
            <ModuleListRow
              title="Share text"
              subtitle="Send summary via Messages, Mail, or other apps"
              icon="share-outline"
              iconBg={native.fill}
              iconColor={native.secondaryLabel}
              onPress={() => void shareText()}
            />
            <ModuleListRow
              title="Delete note"
              subtitle="Remove from AI Notetaker"
              icon="trash-outline"
              iconBg={`${tokens.danger}18`}
              iconColor={tokens.danger}
              onPress={confirmDelete}
              trailing={deleting ? <ActivityIndicator size="small" color={tokens.danger} /> : undefined}
              last
            />
          </ModuleSection>
          <CommSectionFooter>
            Deleting removes this note from AI Notetaker. Notes moved to My Notes stay in your notebook.
          </CommSectionFooter>
        </ModuleScreen>
      </View>

      <Modal visible={shareOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShareOpen(false)}>
        <FacultySheetContainer>
          <FacultySheetChrome
            topInset={insets.top}
            title="Share with classmates"
            onClose={() => setShareOpen(false)}
            rightSlot={
              shareSaving ? (
                <ActivityIndicator size="small" color={tokens.accent} />
              ) : (
                <Pressable onPress={() => void saveClassmateShares()} hitSlop={8}>
                  <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>Share</Text>
                </Pressable>
              )
            }
          />
          {shareLoading ? (
            <View style={styles.shareLoading}>
              <ActivityIndicator color={tokens.accent} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
              {roster.length === 0 ? (
                <CommEmptyState icon="people-outline" title="No classmates found" body="Check that your section is set in your profile." />
              ) : (
                <ModuleSection>
                  {roster.map((student, index) => {
                    const selected = selectedShareIds.includes(student.id)
                    return (
                      <ModuleListRow
                        key={student.id}
                        title={student.full_name}
                        subtitle={student.student_id}
                        icon={selected ? "checkmark-circle" : "ellipse-outline"}
                        iconBg={selected ? tokens.accentSoft : native.fill}
                        iconColor={selected ? tokens.accent : native.secondaryLabel}
                        onPress={() => {
                          setSelectedShareIds((prev) =>
                            prev.includes(student.id)
                              ? prev.filter((id) => id !== student.id)
                              : [...prev, student.id],
                          )
                        }}
                        last={index === roster.length - 1}
                      />
                    )
                  })}
                </ModuleSection>
              )}
            </ScrollView>
          )}
        </FacultySheetContainer>
      </Modal>

      <NotetakerSaveFlash visible={saveFlashVisible} />
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  backBtn: { padding: 8 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  segmentTrack: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentBtnActive: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentLabel: { fontWeight: "600" },
  transcriptBox: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  fieldBlock: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  fieldBlockLast: {
    paddingBottom: 12,
  },
  fieldLabel: {
    marginBottom: 6,
    textTransform: "none",
  },
  fieldInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
  },
  shareLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
})
