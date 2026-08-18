import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useSession } from "../../context/SessionProvider"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { ApiError } from "../../lib/api"
import { guestApi, type StudentRecommendationDetail } from "../../lib/guest-api"
import {
  PROFILE_FIELD_LABELS,
  formatRecommendationDeadline,
  formatRecommendationDeadlineShort,
  getRecommendationJourney,
  getRecommendationPipelineTone,
  getRecommendationStatTones,
  recommendationPurposeLabel,
  recommendationStatusLabel,
  recommendationStatusTone,
} from "../../lib/faculty-recommendation-utils"
import {
  guestCanCancel,
  guestCanDownload,
  guestCanEditLetter,
  guestCanEditQuestionnaire,
  guestCanPickDraft,
  guestCanRespondToInfo,
  guestCanSubmitLetter,
  guestCanSubmitQuestionnaire,
  guestDeliveryStatusLabel,
} from "../../lib/guest-recommendation-utils"
import {
  buildRecommendationPdfSource,
  hasRecommendationLetterPdf,
  type RecommendationPdfSource,
} from "../../lib/recommendation-letter-url"
import type { GuestSession } from "../../lib/session"
import { SegmentedTabs } from "../collaboration/collab-module-ui"
import { InfoSectionCard, useCourseInfoTheme } from "../course-info/course-info-shared"
import { FacultyStatusPill } from "../faculty/faculty-shared"
import {
  FacultySheetActionRow,
  FacultySheetErrorBanner,
  FacultySheetNotice,
  FacultySheetPipelineProgress,
  FacultySheetSection,
  FacultySheetStatChip,
  FacultySheetStatRow,
  useCollabSheetStyles,
} from "../faculty/faculty-collab-sheet-ui"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { GuestLetterPdfSheet } from "./GuestLetterPdfSheet"
import { GuestRecommendationBriefPanel } from "./GuestRecommendationBriefPanel"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { useChromeScrollPadding } from "../../context/ChromeInsetContext"

type WorkspaceTab = "overview" | "questionnaire" | "letter"

const TABS: Array<{ id: WorkspaceTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "overview", label: "Overview", icon: "information-circle-outline" },
  { id: "questionnaire", label: "Questionnaire", icon: "list-outline" },
  { id: "letter", label: "Letter", icon: "document-text-outline" },
]

export function GuestRecommendationDetailScreen() {
  const insets = useSafeAreaInsets()
  const scrollPad = useChromeScrollPadding(24)
  const router = useRouter()
  const { id: idParam } = useLocalSearchParams<{ id: string }>()
  const requestId = Number(idParam)
  const { session } = useSession()
  const guestSession = session?.portal === "guest" ? (session as GuestSession) : null
  const theme = useCourseInfoTheme()
  const native = useThemedNative()
  const type = useNativeType()
  const collabSheetStyles = useCollabSheetStyles()

  const [tab, setTab] = useState<WorkspaceTab>("overview")
  const [bundle, setBundle] = useState<StudentRecommendationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")

  const [profileFields, setProfileFields] = useState<Record<string, string>>({})
  const [letterText, setLetterText] = useState("")
  const [infoResponse, setInfoResponse] = useState("")
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [pdfSource, setPdfSource] = useState<RecommendationPdfSource | null>(null)
  const letterDirtyRef = useRef(false)

  const req = bundle?.request
  const status = req?.status ?? ""

  const load = useCallback(async () => {
    if (!guestSession || !Number.isFinite(requestId)) return
    setError("")
    try {
      const detail = await guestApi.getRecommendationDetail(guestSession, requestId)
      setBundle(detail)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load recommendation.")
    }
  }, [guestSession, requestId])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useNotificationModuleRefresh("recommendations", onRefresh)

  useEffect(() => {
    if (!bundle?.profile) return
    const next: Record<string, string> = {}
    for (const field of PROFILE_FIELD_LABELS) {
      const value = bundle.profile?.[field.key as keyof typeof bundle.profile]
      next[field.key] = typeof value === "string" ? value : ""
    }
    setProfileFields(next)
  }, [bundle?.profile])

  useEffect(() => {
    if (!req || letterDirtyRef.current) return
    setLetterText(String(req.final_letter_text ?? ""))
  }, [req?.updated_at, req?.final_letter_text])

  const journey = useMemo(
    () =>
      getRecommendationJourney({
        status,
        hasQuestionnaire: Boolean(bundle?.profile),
        aiDraftCount: bundle?.drafts?.length ?? 0,
      }),
    [status, bundle?.profile, bundle?.drafts?.length],
  )

  const pipelineTone = getRecommendationPipelineTone(status, journey.step)
  const statTones = getRecommendationStatTones(status, journey.step)
  const hasPdf = hasRecommendationLetterPdf(bundle?.files, req)
  const deliveryMode = req?.delivery_mode ?? null
  const deliveryNotice = guestDeliveryStatusLabel(deliveryMode, status)
  const canDownload = guestCanDownload(status, deliveryMode)

  useEffect(() => {
    let cancelled = false
    if (!guestSession || !hasPdf || !canDownload || !Number.isFinite(requestId)) {
      setPdfSource(null)
      return
    }
    void buildRecommendationPdfSource(guestSession, requestId)
      .then((source) => {
        if (!cancelled) setPdfSource(source)
      })
      .catch(() => {
        if (!cancelled) setPdfSource(null)
      })
    return () => {
      cancelled = true
    }
  }, [guestSession, hasPdf, canDownload, requestId])

  async function runPatch(action: string, body: Record<string, unknown> = {}) {
    if (!guestSession || !Number.isFinite(requestId)) return
    setBusy(action)
    setError("")
    try {
      await guestApi.patchRecommendation(guestSession, requestId, action as never, body)
      letterDirtyRef.current = false
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.")
    } finally {
      setBusy(null)
    }
  }

  async function saveProfile() {
    await runPatch("save_profile", { profile: profileFields })
  }

  async function submitQuestionnaire() {
    await runPatch("submit_questionnaire", { profile: profileFields })
  }

  async function saveLetter() {
    setError("")
    if (!letterText.trim()) {
      setError("Write or paste your letter before submitting.")
      return
    }
    setError("Letter text stays on this screen until you submit it for instructor review.")
  }

  async function submitLetter() {
    await runPatch("submit_for_review", { finalLetterText: letterText })
  }

  function openLetterPreview() {
    if (!pdfSource) {
      setError("PDF is not available yet.")
      return
    }
    if (status === "finalized") {
      void runPatch("download_letter")
    }
    setPdfPreviewOpen(true)
  }

  async function pickDraft(draftId: number) {
    await runPatch("pick_ai_draft", { draftId })
    setTab("letter")
  }

  function confirmCancel() {
    AppAlert.alert("Cancel request?", "Your instructor will no longer process this letter request.", [
      { text: "Keep request", style: "cancel" },
      {
        text: "Cancel request",
        style: "destructive",
        onPress: () => {
          void (async () => {
            if (!guestSession || !Number.isFinite(requestId)) return
            setBusy("cancel_request")
            setError("")
            try {
              await guestApi.withdrawRecommendation(guestSession, requestId)
              router.replace("/module/recommendations")
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Could not cancel this request.")
            } finally {
              setBusy(null)
            }
          })()
        },
      },
    ])
  }

  if (!guestSession) return null

  if (!Number.isFinite(requestId)) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <Text style={[type.secondary]}>Invalid recommendation request.</Text>
      </View>
    )
  }

  if (loading && !bundle) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <ActivityIndicator size="large" color={native.tint} />
      </View>
    )
  }

  if (!req) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <Text style={[type.secondary]}>Recommendation request not found.</Text>
      </View>
    )
  }

  return (
    <>
      <NotetakerScreenHeader title="Letter workspace" fallbackHref="/module/recommendations" />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: native.groupedBackground }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView
        style={[collabSheetStyles.root, { backgroundColor: native.groupedBackground }]}
        contentContainerStyle={[collabSheetStyles.scroll, scrollPad]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        showsVerticalScrollIndicator={false}
      >
      <InfoSectionCard title={recommendationPurposeLabel(req.purpose)} icon="document-text-outline">
        <View style={styles.heroRow}>
          <View style={styles.heroCopy}>
            <Text style={[type.bodyEmphasis]}>
              {req.instructor_name ?? "Instructor"} · {req.course_code ?? "Course"}
            </Text>
            <Text style={[type.caption, { color: native.secondaryLabel }]}>
              {req.course_description ?? "Recommendation letter workspace"}
            </Text>
          </View>
          <FacultyStatusPill label={recommendationStatusLabel(status)} tone={recommendationStatusTone(status)} />
        </View>
      </InfoSectionCard>

      <FacultySheetPipelineProgress
        step={journey.step}
        total={journey.total}
        headline={journey.headline}
        subline={journey.subline}
        tone={pipelineTone}
      />

      <FacultySheetStatRow>
        <FacultySheetStatChip
          icon="footsteps-outline"
          label="Step"
          value={`${journey.step}/${journey.total}`}
          tone={statTones.step}
        />
        <FacultySheetStatChip
          icon="layers-outline"
          label="Stage"
          value={journey.pillar}
          tone={statTones.stage}
        />
        <FacultySheetStatChip
          icon="calendar-outline"
          label="Deadline"
          value={formatRecommendationDeadlineShort(req.deadline)}
          tone={statTones.deadline}
        />
      </FacultySheetStatRow>

      {error ? <FacultySheetErrorBanner message={error} /> : null}

      {status === "info_requested" && req.info_request_note ? (
        <FacultySheetNotice message={`Instructor requested more information: ${String(req.info_request_note)}`} />
      ) : null}

      {status === "revision_requested" ? (
        <FacultySheetNotice message="Revisions requested — update your letter and submit it again for instructor review." />
      ) : null}

      {req.rejection_reason?.trim() ? (
        <FacultySheetNotice message={`Request declined: ${String(req.rejection_reason).trim()}`} />
      ) : null}

      {(bundle?.attachments?.length ?? 0) > 0 ? (
        <FacultySheetSection label="Supporting documents">
          {(bundle?.attachments ?? []).map((attachment) => (
            <FacultySheetActionRow
              key={attachment.id}
              icon="attach-outline"
              label={attachment.file_name ?? "Attachment"}
              subtitle={attachment.file_type ?? "Tap to open"}
              onPress={() => {
                if (attachment.file_url) void Linking.openURL(attachment.file_url)
              }}
            />
          ))}
        </FacultySheetSection>
      ) : null}

      {deliveryNotice ? <FacultySheetNotice message={deliveryNotice} /> : null}

      {guestCanDownload(status, deliveryMode) && pdfSource ? (
        <FacultySheetSection label="Final PDF">
          <FacultySheetActionRow
            icon="document-text-outline"
            label="Preview letter PDF"
            subtitle="View in app · save or share from preview"
            onPress={() => void openLetterPreview()}
            loading={busy === "download_letter"}
          />
        </FacultySheetSection>
      ) : null}

      <View style={styles.tabWrap}>
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          accent={theme.primary}
          accentDark={theme.primaryDark}
          options={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon }))}
        />
      </View>

      {tab === "overview" ? (
        <>
          <GuestRecommendationBriefPanel requestId={requestId} />

          <FacultySheetSection label="Request summary">
            <Text style={[type.secondary, styles.summaryText]}>
              {req.student_request_description?.trim() || "No additional description provided."}
            </Text>
            <Text style={[type.caption, { color: native.secondaryLabel }]}>
              Deadline: {formatRecommendationDeadline(req.deadline)}
            </Text>
          </FacultySheetSection>

          {status === "requested" ? (
            <FacultySheetSection label="Waiting on instructor">
              <Text style={[type.secondary, styles.summaryText]}>
                Your instructor created this request. They approve it before the questionnaire and letter workflow open.
              </Text>
            </FacultySheetSection>
          ) : null}

          {status === "info_requested" && req.info_request_note ? (
            <FacultySheetSection label="Instructor note">
              <Text style={[type.secondary, styles.summaryText]}>{String(req.info_request_note)}</Text>
            </FacultySheetSection>
          ) : null}

          {guestCanRespondToInfo(status) ? (
            <FacultySheetSection label="Reply to instructor">
              <TextInput
                style={[styles.input, styles.textArea, { borderColor: native.separator, color: native.label, backgroundColor: native.fill }]}
                placeholder="Share the details your instructor asked for"
                placeholderTextColor={native.tertiaryLabel}
                value={infoResponse}
                onChangeText={setInfoResponse}
                multiline
              />
              <ActionButton
                label="Send response"
                icon="send-outline"
                onPress={() => void runPatch("respond_to_info_request", { response: infoResponse.trim() })}
                loading={busy === "respond_to_info_request"}
                accent={theme.primary}
              />
            </FacultySheetSection>
          ) : null}

          {guestCanCancel(status) ? (
            <Pressable style={styles.cancelBtn} onPress={confirmCancel}>
              <Text style={[type.destructive]}>Cancel request</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

      {tab === "questionnaire" ? (
        <FacultySheetSection label="Tell your instructor about yourself">
          {!guestCanEditQuestionnaire(status) ? (
            <Text style={[type.secondary, styles.summaryText]}>
              The questionnaire is locked at this stage. You can review your answers below.
            </Text>
          ) : null}
          {PROFILE_FIELD_LABELS.map((field) => (
            <View key={field.key} style={styles.fieldBlock}>
              <Text style={[type.sectionHeader, styles.fieldLabel]}>{field.label}</Text>
              <TextInput
                style={[styles.input, styles.textArea, { borderColor: native.separator, color: native.label, backgroundColor: native.fill }]}
                value={profileFields[field.key] ?? ""}
                onChangeText={(value) => setProfileFields((prev) => ({ ...prev, [field.key]: value }))}
                editable={guestCanEditQuestionnaire(status)}
                multiline
                placeholder={`${field.label}…`}
                placeholderTextColor={native.tertiaryLabel}
              />
            </View>
          ))}
          {guestCanEditQuestionnaire(status) ? (
            <View style={styles.actionStack}>
              <ActionButton
                label="Save questionnaire"
                icon="save-outline"
                onPress={() => void saveProfile()}
                loading={busy === "save_profile"}
                accent={theme.primary}
              />
              {guestCanSubmitQuestionnaire(status) ? (
                <ActionButton
                  label="Submit questionnaire"
                  icon="paper-plane-outline"
                  onPress={() => void submitQuestionnaire()}
                  loading={busy === "submit_questionnaire"}
                  accent={theme.primaryDark}
                />
              ) : null}
            </View>
          ) : null}
        </FacultySheetSection>
      ) : null}

      {tab === "letter" ? (
        <>
          {guestCanPickDraft(status) && (bundle?.drafts?.length ?? 0) > 0 ? (
            <FacultySheetSection label="Choose a draft">
              {bundle?.drafts.map((draft) => (
                <Pressable
                  key={draft.id}
                  style={[styles.draftCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}
                  onPress={() => void pickDraft(draft.id)}
                >
                  <Text style={[type.bodyEmphasis]}>{draft.version_label ?? `Draft ${draft.id}`}</Text>
                  <Text style={[type.secondary, styles.draftPreview]} numberOfLines={4}>
                    {draft.letter_text ?? "No preview"}
                  </Text>
                </Pressable>
              ))}
            </FacultySheetSection>
          ) : null}

          <FacultySheetSection label="Letter text">
            {!guestCanEditLetter(status) ? (
              <Text style={[type.secondary, styles.summaryText]}>
                Your letter is with your instructor or finalized. Review the text below.
              </Text>
            ) : null}
            <TextInput
              style={[styles.input, styles.letterArea, { borderColor: native.separator, color: native.label, backgroundColor: native.fill }]}
              value={letterText}
              onChangeText={(value) => {
                letterDirtyRef.current = true
                setLetterText(value)
              }}
              editable={guestCanEditLetter(status)}
              multiline
              textAlignVertical="top"
              placeholder="Write or paste your recommendation letter draft…"
              placeholderTextColor={native.tertiaryLabel}
            />
            {guestCanEditLetter(status) ? (
              <View style={styles.actionStack}>
                <ActionButton
                  label="Save letter"
                  icon="save-outline"
                  onPress={() => void saveLetter()}
                  loading={busy === "save_bring_own_draft" || busy === "save_letter" || busy === "save_final_letter"}
                  accent={theme.primary}
                />
                {guestCanSubmitLetter(status) ? (
                  <ActionButton
                    label="Submit for instructor review"
                    icon="send-outline"
                    onPress={() => void submitLetter()}
                    loading={busy === "submit_for_review"}
                    accent={theme.primaryDark}
                  />
                ) : null}
              </View>
            ) : null}
          </FacultySheetSection>
        </>
      ) : null}

      <Pressable
        style={[styles.refreshBtn, { borderColor: native.separator }]}
        onPress={() => {
          setRefreshing(true)
          load().finally(() => setRefreshing(false))
        }}
      >
        <Ionicons name="refresh-outline" size={16} color={native.secondaryLabel} />
        <Text style={[type.caption, { color: native.secondaryLabel }]}>
          {refreshing ? "Refreshing…" : "Refresh workspace"}
        </Text>
      </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>

      {pdfSource ? (
        <GuestLetterPdfSheet
          visible={pdfPreviewOpen}
          pdfSource={pdfSource}
          title={`${recommendationPurposeLabel(req.purpose)} letter`}
          onClose={() => setPdfPreviewOpen(false)}
          onDownloaded={() => {
            if (!guestSession || status !== "finalized") return
            void guestApi.markRecommendationDownloaded(guestSession, requestId).then(() => load())
          }}
        />
      ) : null}
    </>
  )
}

function ActionButton({
  label,
  icon,
  onPress,
  loading,
  accent,
}: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  loading?: boolean
  accent: string
}) {
  return (
    <Pressable
      style={[styles.actionBtn, { backgroundColor: accent }, loading && styles.actionBtnDisabled]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <Ionicons name={icon} size={16} color="#ffffff" />
      )}
      <Text style={styles.actionBtnText}>{loading ? "Working…" : label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  heroCopy: { flex: 1, gap: 4 },
  tabWrap: { marginTop: 4 },
  summaryText: { lineHeight: 21 },
  fieldBlock: { gap: 6, marginBottom: 10 },
  fieldLabel: { marginBottom: 0 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  textArea: { minHeight: 88, textAlignVertical: "top" },
  letterArea: { minHeight: 220, textAlignVertical: "top" },
  actionStack: { gap: 8, marginTop: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 13,
  },
  actionBtnDisabled: { opacity: 0.65 },
  actionBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  draftCard: { borderRadius: 999, padding: 12, gap: 6, borderWidth: 1, marginBottom: 8 },
  draftPreview: { lineHeight: 20 },
  cancelBtn: { alignItems: "center", paddingVertical: 8 },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
})
