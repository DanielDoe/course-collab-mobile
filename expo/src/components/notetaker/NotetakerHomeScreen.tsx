import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import * as DocumentPicker from "expo-document-picker"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import type { Swipeable } from "react-native-gesture-handler"
import { ModuleScreen, ModuleSectionHeader } from "../modules/ModuleScreen"
import { StudentSearchToolbar } from "../student/student-search-toolbar"
import { CommEmptyState, CommSectionFooter } from "../faculty/faculty-communication-ui"
import { SignatureListCard } from "../theme/SignatureListCard"
import { signatureListStyles } from "../theme/TabbedModuleLayout"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import {
  notetakerApi,
  NotetakerTierError,
  notetakerNoteSegment,
  processNotetakerAudio,
  resolveLocalAudioDurationSeconds,
  type NotetakerLimits,
  type NotetakerNote,
  type NotetakerUsage,
} from "../../lib/notetaker-api"
import {
  archiveNotetakerNote,
  loadArchivedNoteIds,
  removeArchivedNotetakerNote,
  restoreNotetakerNote,
} from "../../lib/notetaker-archive-storage"
import { defaultNoteTitle } from "../../lib/notetaker-export"
import { appendNativeQuery, getModuleWebPath, openWebPath } from "../../constants/module-web-paths"
import { NotetakerTitleSheet } from "./NotetakerTitleSheet"
import { NotetakerNoteSwipeRow } from "./NotetakerNoteSwipeRow"
import {
  NotetakerProcessingOverlay,
  type NotetakerProcessingStep,
} from "./NotetakerProcessingOverlay"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function noteSubtitle(note: NotetakerNote): string {
  const parts = [note.course_name, note.lecture_date].filter(Boolean)
  return parts.length ? parts.join(" · ") : "No course set"
}

function statusIcon(status: string): keyof typeof Ionicons.glyphMap {
  if (status === "completed") return "checkmark-circle"
  if (status === "failed") return "close-circle"
  if (status === "draft") return "document-outline"
  if (status === "transcribing" || status === "summarizing") return "sync-outline"
  return "ellipse"
}

function noteStatusColor(status: string, tokens: ReturnType<typeof useAppThemeTokens>, SN: ReturnType<typeof useThemedStudentNative>) {
  if (status === "completed") return tokens.success
  if (status === "failed") return tokens.danger
  if (status === "transcribing" || status === "summarizing") return tokens.accent
  return SN.secondaryLabel
}

function PlanPanel({
  limits,
  usage,
  pctUsed,
  onUpgrade,
}: {
  limits: NotetakerLimits
  usage: NotetakerUsage
  pctUsed: number
  onUpgrade?: () => void
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const SN = useThemedStudentNative()

  return (
    <View style={[styles.planCard, tokens.cardShadow, { backgroundColor: native.secondaryGrouped, borderColor: tokens.border }]}>
      <Text style={[type.bodyEmphasis, styles.planTitle]}>{limits.tier}</Text>
      <Text style={[type.caption, styles.planBody]}>
        Up to {limits.maxNoteDurationMinutes} min per recording · ~{limits.transcriptionMinutes} transcription min /
        month · {usage.notesThisMonth} / {limits.maxNotesPerMonth} notes this month
        {!limits.chatEnabled ? " · AI chat requires Trailblazer" : ""}
      </Text>
      <View style={styles.progressBlock}>
        <View style={styles.progressMeta}>
          <Text style={[type.caption, styles.progressLabel]}>Transcription used</Text>
          <Text style={[type.footnote, styles.progressValue]}>
            {usage.transcriptionMinutesUsed} / {limits.transcriptionMinutes} min
          </Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: SN.fill }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(100, pctUsed)}%`, backgroundColor: tokens.accent },
            ]}
          />
        </View>
      </View>
      {!limits.chatEnabled && onUpgrade ? (
        <Pressable
          onPress={onUpgrade}
          style={({ pressed }) => [
            styles.planLinkRow,
            { borderTopColor: SN.separator },
            pressed && { opacity: NATIVE.pressedOpacity },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Upgrade for AI chat with notes"
        >
          <Text style={[styles.planLinkText, { color: tokens.accent }]}>Upgrade for AI chat with notes</Text>
          <Ionicons name="chevron-forward" size={16} color={SN.tertiaryLabel} />
        </Pressable>
      ) : null}
    </View>
  )
}

export function NotetakerHomeScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const SN = useThemedStudentNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [notes, setNotes] = useState<NotetakerNote[]>([])
  const [limits, setLimits] = useState<NotetakerLimits | null>(null)
  const [usage, setUsage] = useState<NotetakerUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [tierBlocked, setTierBlocked] = useState<string | null>(null)
  const [archivedIds, setArchivedIds] = useState<Set<number>>(new Set())
  const [renameTarget, setRenameTarget] = useState<NotetakerNote | null>(null)
  const [renameSaving, setRenameSaving] = useState(false)
  const openSwipeRef = useRef<Swipeable | null>(null)
  const [uploadPending, setUploadPending] = useState<{
    uri: string
    name: string
    mimeType: string
  } | null>(null)
  const [titleSheetOpen, setTitleSheetOpen] = useState(false)
  const [processingUpload, setProcessingUpload] = useState(false)
  const [processingLabel, setProcessingLabel] = useState("")
  const [processingStep, setProcessingStep] = useState<NotetakerProcessingStep>("upload")

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const data = await notetakerApi.list(session, debouncedSearch)
      setTierBlocked(null)
      setNotes(data.notes ?? [])
      setLimits(data.limits)
      setUsage(data.usage)
    } catch (err) {
      if (err instanceof NotetakerTierError) {
        setTierBlocked(err.message)
        setNotes([])
        setLimits(null)
        setUsage(null)
        return
      }
      setError(err instanceof ApiError ? err.message : "Could not load your notes.")
    }
  }, [session, debouncedSearch])

  useEffect(() => {
    if (!session) return
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [session, load])

  useEffect(() => {
    if (!session) return
    void loadArchivedNoteIds(session.databaseId).then(setArchivedIds)
  }, [session])

  const closeOpenSwipe = useCallback(() => {
    openSwipeRef.current?.close()
    openSwipeRef.current = null
  }, [])

  const handleSwipeOpen = useCallback((ref: Swipeable) => {
    if (openSwipeRef.current && openSwipeRef.current !== ref) {
      openSwipeRef.current.close()
    }
    openSwipeRef.current = ref
  }, [])

  const handleSwipeClose = useCallback((ref: Swipeable) => {
    if (openSwipeRef.current === ref) {
      openSwipeRef.current = null
    }
  }, [])

  const activeNotes = useMemo(
    () => notes.filter((note) => !archivedIds.has(note.id)),
    [notes, archivedIds],
  )

  const archivedNotes = useMemo(
    () => notes.filter((note) => archivedIds.has(note.id)),
    [notes, archivedIds],
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const pctUsed = useMemo(() => {
    if (!limits || !usage) return 0
    return Math.min(100, (usage.transcriptionMinutesUsed / Math.max(1, limits.transcriptionMinutes)) * 100)
  }, [limits, usage])

  const openWeb = useCallback(
    (path: string) => {
      openWebPath(router, appendNativeQuery(path))
    },
    [router],
  )

  const openRecord = useCallback(() => {
    router.push("/notetaker/capture" as never)
  }, [router])

  const searchDisabled = !!tierBlocked

  const openUpload = useCallback(async () => {
    if (searchDisabled) return
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ["audio/*", "public.audio", "public.mpeg-4-audio"],
        multiple: false,
      })
      if (result.canceled || !result.assets?.[0]) return
      const asset = result.assets[0]
      setUploadPending({
        uri: asset.uri,
        name: asset.name || `upload-${Date.now()}.m4a`,
        mimeType: asset.mimeType || "audio/m4a",
      })
      setTitleSheetOpen(true)
    } catch {
      AppAlert.alert("Upload failed", "Could not open the audio file picker.")
    }
  }, [searchDisabled])

  const submitUpload = useCallback(
    async (title: string) => {
      if (!session || !uploadPending) return
      setProcessingUpload(true)
      setProcessingStep("upload")
      setProcessingLabel("Uploading audio…")
      try {
        setProcessingStep("transcribe")
        setProcessingLabel("Transcribing with AI…")
        const durationSeconds = await resolveLocalAudioDurationSeconds(uploadPending.uri)
        const note = await processNotetakerAudio(session, {
          uri: uploadPending.uri,
          fileName: uploadPending.name,
          mimeType: uploadPending.mimeType,
          durationSeconds,
          title,
        })
        setTitleSheetOpen(false)
        setUploadPending(null)
        router.push(`/notetaker/${notetakerNoteSegment(note)}` as never)
      } catch (err) {
        AppAlert.alert(
          "Processing failed",
          err instanceof ApiError ? err.message : "Could not process this audio file.",
        )
      } finally {
        setProcessingUpload(false)
        setProcessingLabel("")
      }
    },
    [session, uploadPending, router],
  )

  const openNote = useCallback(
    (note: NotetakerNote) => {
      closeOpenSwipe()
      router.push(`/notetaker/${notetakerNoteSegment(note)}` as never)
    },
    [router, closeOpenSwipe],
  )

  const openMembership = useCallback(() => {
    openWeb(getModuleWebPath("membership"))
  }, [openWeb])

  const confirmArchive = useCallback(
    (note: NotetakerNote) => {
      if (!session) return
      AppAlert.alert("Move to Archived?", `"${note.title}" will move to Archived. You can restore it later.`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: () => {
            void archiveNotetakerNote(session.databaseId, note.id).then(setArchivedIds)
          },
        },
      ])
    },
    [session],
  )

  const confirmRestore = useCallback(
    (note: NotetakerNote) => {
      if (!session) return
      void restoreNotetakerNote(session.databaseId, note.id).then(setArchivedIds)
    },
    [session],
  )

  const submitRename = useCallback(
    async (title: string) => {
      if (!session || !renameTarget || !title.trim()) return
      setRenameSaving(true)
      try {
        await notetakerApi.patchNote(session, notetakerNoteSegment(renameTarget), { title: title.trim() })
        setRenameTarget(null)
        await load()
      } catch (err) {
        AppAlert.alert("Rename failed", err instanceof ApiError ? err.message : "Could not save the new title.")
      } finally {
        setRenameSaving(false)
      }
    },
    [session, renameTarget, load],
  )

  const confirmDelete = useCallback(
    (note: NotetakerNote) => {
      if (!session) return
      AppAlert.alert("Delete note?", `"${note.title}" will be removed permanently.`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void notetakerApi
              .deleteNote(session, note)
              .then(async () => {
                const ids = await removeArchivedNotetakerNote(session.databaseId, note.id)
                setArchivedIds(ids)
                await load()
              })
              .catch((err) => {
                AppAlert.alert(
                  "Delete failed",
                  err instanceof ApiError ? err.message : "Could not delete this note.",
                )
              })
          },
        },
      ])
    },
    [session, load],
  )

  const renderNoteRow = useCallback(
    (note: NotetakerNote, index: number, variant: "active" | "archived") => {
      const status = note.processing_status
      return (
        <NotetakerNoteSwipeRow
          key={note.id}
          index={index}
          variant={variant}
          title={note.title}
          subtitle={noteSubtitle(note)}
          meta={note.lecture_date ? `Recorded ${note.lecture_date}` : undefined}
          statusLabel={formatStatus(status)}
          statusColor={noteStatusColor(status, tokens, SN)}
          statusIcon={statusIcon(status)}
          accent={SN.accent}
          onOpen={() => openNote(note)}
          onEdit={() => setRenameTarget(note)}
          onArchive={() => confirmArchive(note)}
          onRestore={() => confirmRestore(note)}
          onDelete={() => confirmDelete(note)}
          onSwipeOpen={handleSwipeOpen}
          onSwipeClose={handleSwipeClose}
        />
      )
    },
    [SN, confirmArchive, confirmDelete, confirmRestore, handleSwipeClose, handleSwipeOpen, openNote, tokens],
  )

  return (
    <>
    <ModuleScreen
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      error={error}
      empty={false}
    >
      <StudentSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search notes…"
        showFilter={false}
      />

      {tierBlocked ? (
        <>
          <ModuleSectionHeader title="Membership" />
          <View style={signatureListStyles.list}>
            <SignatureListCard
              title="Upgrade required"
              subtitle={tierBlocked}
              meta="View plans and unlock AI Notetaker"
              icon="sparkles-outline"
              accent={SN.accent}
              onPress={openMembership}
            />
          </View>
        </>
      ) : null}

      {!tierBlocked && limits && usage ? (
        <>
          <ModuleSectionHeader title="Your Plan" />
          <PlanPanel limits={limits} usage={usage} pctUsed={pctUsed} onUpgrade={openMembership} />
          <CommSectionFooter>
            Transcription minutes reset monthly. Longer recordings use more of your allowance.
          </CommSectionFooter>
        </>
      ) : null}

      <ModuleSectionHeader title="Capture" />
      <View style={signatureListStyles.list}>
        <SignatureListCard
          index={0}
          title="Record audio"
          subtitle="Start a live capture session"
          meta="Live microphone capture"
          metaIcon="mic-outline"
          statusLabel="Recommended"
          statusColor={SN.accent}
          icon="mic-outline"
          accent={SN.accent}
          onPress={searchDisabled ? undefined : openRecord}
          disabled={searchDisabled}
        />
        <SignatureListCard
          index={1}
          title="Upload audio"
          subtitle="Import an existing recording"
          meta="MP3, M4A, WAV, and more"
          metaIcon="cloud-upload-outline"
          statusLabel="Import"
          statusColor={SN.secondaryLabel}
          icon="cloud-upload-outline"
          accent={SN.accent}
          onPress={searchDisabled ? undefined : openUpload}
          disabled={searchDisabled}
        />
      </View>

      <ModuleSectionHeader title="Recent Notes" />
      {tierBlocked ? (
        <CommEmptyState
          icon="lock-closed-outline"
          title="Notes unavailable"
          body="Upgrade to see your notes here."
        />
      ) : notes.length === 0 ? (
        <CommEmptyState
          icon="mic-outline"
          title="No notes yet"
          body="Record or upload audio — we transcribe and summarize when you finish."
        />
      ) : activeNotes.length === 0 ? (
        <CommEmptyState
          icon="archive-outline"
          title="No active notes"
          body="Archived notes appear below. Swipe a note left to archive, edit, or delete."
        />
      ) : (
        <View style={signatureListStyles.list}>
          {activeNotes.map((note, index) => renderNoteRow(note, index, "active"))}
        </View>
      )}

      {!tierBlocked && archivedNotes.length > 0 ? (
        <>
          <ModuleSectionHeader title="Archived" />
          <CommSectionFooter>
            Swipe left on a note for restore or delete. Archived notes stay on this device until you remove them.
          </CommSectionFooter>
          <View style={signatureListStyles.list}>
            {archivedNotes.map((note, index) => renderNoteRow(note, index, "archived"))}
          </View>
        </>
      ) : null}
    </ModuleScreen>

    <NotetakerTitleSheet
      visible={titleSheetOpen}
      initialTitle={defaultNoteTitle()}
      subtitle="We'll transcribe the file and generate structured notes."
      saving={processingUpload}
      onCancel={() => {
        if (processingUpload) return
        setTitleSheetOpen(false)
        setUploadPending(null)
      }}
      onSave={(title) => void submitUpload(title)}
    />

    <NotetakerTitleSheet
      visible={renameTarget != null}
      initialTitle={renameTarget?.title ?? ""}
      subtitle="Update the note title."
      saving={renameSaving}
      onCancel={() => {
        if (renameSaving) return
        setRenameTarget(null)
      }}
      onSave={(title) => void submitRename(title)}
    />

    <NotetakerProcessingOverlay
      visible={processingUpload}
      label={processingLabel}
      step={processingStep}
    />
    </>
  )
}

const styles = StyleSheet.create({
  planCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  planTitle: {
    marginBottom: 4,
  },
  planBody: {
    lineHeight: 18,
    marginBottom: 12,
  },
  progressBlock: {
    gap: 6,
    marginBottom: 4,
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  progressLabel: {
    flex: 1,
  },
  progressValue: {
    fontWeight: "600",
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  planLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  planLinkText: {
    fontSize: 14,
    fontWeight: "600",
  },
})
