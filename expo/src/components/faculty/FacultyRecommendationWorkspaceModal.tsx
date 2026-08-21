import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import {
  instructorApi,
  type InstructorRecommendationDetail,
  type InstructorRecommendationRequest} from "../../lib/instructor-api"
import {
  PROFILE_FIELD_LABELS,
  formatLetterSalutationPreview,
  formatRecommendationDeadline,
  formatRecommendationDeadlineShort,
  formatRecommendationReLine,
  getRecommendationJourney,
  getRecommendationPipelineTone,
  getRecommendationStatTones,
  instructorCanClassicFinalize,
  instructorCanDecideInitialRequest,
  instructorCanEditRequestMetadata,
  instructorCanReleaseLetter,
  instructorCanRequestMoreInfo,
  instructorCanRequestRevision,
  recommendationPillarShort,
  recommendationPurposeLabel,
  recommendationPurposeShort,
  recommendationStatusLabel,
  recommendationStatusTone} from "../../lib/faculty-recommendations-utils"
import { FACULTY_RECOMMENDATIONS_COLOR } from "../../lib/faculty-recommendations-theme"
import {
  buildInstructorRecommendationPdfSource,
  instructorCanPreviewRecommendationLetter,
  type RecommendationPdfSource,
} from "../../lib/recommendation-letter-url"
import { useThemedNative } from "../../context/AppearanceProvider"
import { FacultyStatusPill } from "./faculty-shared"
import { FacultyModuleTabBar } from "./faculty-module-shell"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetActionRow,
  FacultySheetChrome,
  FacultySheetConfirm,
  FacultySheetErrorBanner,
  FacultySheetField,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetNotice,
  FacultySheetPipelineProgress,
  FacultySheetSaveChip,
  FacultySheetSection,
  FacultySheetStatChip,
  FacultySheetStatRow,
  FacultySheetWorkflow
} from "./faculty-collab-sheet-ui"
import { FacultySummerCampDatePicker } from "./FacultySummerCampDatePicker"
import { GuestLetterPdfSheet } from "../guest/GuestLetterPdfSheet"

type Scope = { instructorId: number; courseId: number }

type WorkspaceTab = "overview" | "letter" | "questionnaire" | "activity"

const TABS: Array<{ id: WorkspaceTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "overview", label: "Overview", icon: "information-circle-outline" },
  { id: "letter", label: "Letter", icon: "document-text-outline" },
  { id: "questionnaire", label: "Questionnaire", icon: "list-outline" },
  { id: "activity", label: "Activity", icon: "time-outline" },
]

type Props = {
  visible: boolean
  scope: Scope | null
  requestId: number | null
  initialTab?: WorkspaceTab
  onClose: () => void
  onUpdated: () => void
}

export function FacultyRecommendationWorkspaceModal({
  visible,
  scope,
  requestId,
  initialTab = "overview",
  onClose,
  onUpdated}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const native = useThemedNative()
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState<WorkspaceTab>("overview")
  const [bundle, setBundle] = useState<InstructorRecommendationDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [finalText, setFinalText] = useState("")
  const letterTextDirtyRef = useRef(false)
  const letterHeadingDirtyRef = useRef(false)

  const [greetingName, setGreetingName] = useState("")
  const [greetingOrg, setGreetingOrg] = useState("")
  const [greetingAddress, setGreetingAddress] = useState("")
  const [letterPurpose, setLetterPurpose] = useState("scholarship")
  const [letterPurposeOther, setLetterPurposeOther] = useState("")
  const [deadline, setDeadline] = useState("")
  const [studentDesc, setStudentDesc] = useState("")

  const [rejectReason, setRejectReason] = useState("")
  const [infoNote, setInfoNote] = useState("")
  const [revisionNote, setRevisionNote] = useState("")
  const [pdfPreviewSource, setPdfPreviewSource] = useState<RecommendationPdfSource | null>(null)

  const req = bundle?.request
  const status = req?.status ?? ""

  const load = useCallback(async () => {
    if (!scope || requestId == null) return
    setError("")
    setLoading(true)
    try {
      const detail = await instructorApi.getRecommendationDetail(scope, requestId)
      setBundle(detail)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load recommendation.")
    } finally {
      setLoading(false)
    }
  }, [scope, requestId])

  useEffect(() => {
    if (!visible || requestId == null) return
    setTab(initialTab)
    void load()
  }, [visible, requestId, initialTab, load])

  useEffect(() => {
    if (!req) return
    if (!letterTextDirtyRef.current) setFinalText(String(req.final_letter_text ?? ""))
    if (!letterHeadingDirtyRef.current) {
      setGreetingName(String(req.recipient_name ?? ""))
      setGreetingOrg(String(req.recipient_organization ?? ""))
      setGreetingAddress(String(req.recipient_address ?? ""))
      setLetterPurpose(String(req.purpose ?? "scholarship"))
      setLetterPurposeOther(String(req.purpose_other_detail ?? ""))
      setDeadline(req.deadline ? String(req.deadline).slice(0, 10) : "")
      setStudentDesc(String(req.student_request_description ?? ""))
    }
  }, [req?.updated_at, req])

  useEffect(() => {
    if (!visible) {
      setBundle(null)
      setError("")
      setRejectReason("")
      setInfoNote("")
      setRevisionNote("")
      setPdfPreviewSource(null)
      letterTextDirtyRef.current = false
      letterHeadingDirtyRef.current = false
    }
  }, [visible])

  const journey = useMemo(
    () =>
      getRecommendationJourney({
        status,
        hasQuestionnaire: Boolean(bundle?.profile),
        aiDraftCount: bundle?.drafts?.length ?? 0}),
    [status, bundle?.profile, bundle?.drafts?.length],
  )

  const greetingPreview = useMemo(
    () => formatLetterSalutationPreview(greetingName, greetingOrg),
    [greetingName, greetingOrg],
  )

  const reLinePreview = useMemo(() => {
    const studentName = String(req?.student_full_name ?? req?.student_name ?? "Student")
    return formatRecommendationReLine(studentName, letterPurpose, letterPurposeOther)
  }, [req, letterPurpose, letterPurposeOther])

  const canPreviewLetterPdf = useMemo(
    () => instructorCanPreviewRecommendationLetter(req, finalText),
    [req, finalText],
  )

  async function openLetterPdfPreview() {
    if (!scope || requestId == null) return
    if (!instructorCanPreviewRecommendationLetter(req, finalText)) {
      setError("Add letter text before previewing the PDF.")
      return
    }
    setBusy("pdf")
    setError("")
    try {
      if (letterHeadingDirtyRef.current) await saveLetterHeading()
      if (letterTextDirtyRef.current) await saveLetter(false)
      setPdfPreviewSource(await buildInstructorRecommendationPdfSource(scope, requestId))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not prepare PDF preview.")
    } finally {
      setBusy(null)
    }
  }

  async function runPatch(action: string, body: Record<string, unknown> = {}) {
    if (!scope || requestId == null) return
    setBusy(action)
    setError("")
    try {
      await instructorApi.patchRecommendation(scope, requestId, action as never, body)
      letterTextDirtyRef.current = false
      letterHeadingDirtyRef.current = false
      await load()
      onUpdated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.")
    } finally {
      setBusy(null)
    }
  }

  async function saveLetterHeading() {
    if (!scope || requestId == null) return
    if (letterPurpose === "other" && letterPurposeOther.trim().length < 2) {
      setError('When purpose is "Other", add a short phrase for the Re: line.')
      return
    }
    const hasRecipient =
      greetingName.trim().length > 0 || greetingOrg.trim().length > 0 || greetingAddress.trim().length > 0
    setBusy("heading")
    setError("")
    try {
      await instructorApi.patchRecommendationRequestDetails(scope, requestId, {
        purpose: letterPurpose,
        purposeOtherDetail: letterPurpose === "other" ? letterPurposeOther.trim().slice(0, 500) : null,
        recipientName: greetingName.trim() || null,
        recipientOrganization: greetingOrg.trim() || null,
        recipientAddress: hasRecipient ? greetingAddress.trim().slice(0, 2000) || null : null,
        letterIsSpecific: hasRecipient,
        deadline: deadline.trim() || null,
        studentRequestDescription: studentDesc.trim() || null})
      letterHeadingDirtyRef.current = false
      await load()
      onUpdated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save details.")
    } finally {
      setBusy(null)
    }
  }

  async function saveLetter(finalizeAfter = false) {
    if (!scope || requestId == null) return
    const action = finalizeAfter ? "finalize" : "update_final_text"
    setBusy(finalizeAfter ? "finalize" : "save")
    setError("")
    try {
      if (letterHeadingDirtyRef.current) {
        if (letterPurpose === "other" && letterPurposeOther.trim().length < 2) {
          setError('When purpose is "Other", add a short phrase for the Re: line.')
          return
        }
        const hasRecipient =
          greetingName.trim().length > 0 || greetingOrg.trim().length > 0 || greetingAddress.trim().length > 0
        await instructorApi.patchRecommendationRequestDetails(scope, requestId, {
          purpose: letterPurpose,
          purposeOtherDetail: letterPurpose === "other" ? letterPurposeOther.trim().slice(0, 500) : null,
          recipientName: greetingName.trim() || null,
          recipientOrganization: greetingOrg.trim() || null,
          recipientAddress: hasRecipient ? greetingAddress.trim().slice(0, 2000) || null : null,
          letterIsSpecific: hasRecipient,
          deadline: deadline.trim() || null,
          studentRequestDescription: studentDesc.trim() || null})
        letterHeadingDirtyRef.current = false
      }
      await instructorApi.patchRecommendation(scope, requestId, action, { finalLetterText: finalText })
      letterTextDirtyRef.current = false
      await load()
      onUpdated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save letter.")
    } finally {
      setBusy(null)
    }
  }

  async function notifyStudent() {
    if (!scope || requestId == null) return
    setBusy("notify")
    setError("")
    try {
      if (letterHeadingDirtyRef.current) await saveLetterHeading()
      await instructorApi.patchRecommendation(scope, requestId, "notify_student_letter_ready", {
        finalLetterText: finalText})
      letterTextDirtyRef.current = false
      await load()
      onUpdated()
      AppAlert.alert("Student notified", "The student can now download their letter PDF.")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not notify student.")
    } finally {
      setBusy(null)
    }
  }

  async function runAiSuggest() {
    if (!scope || requestId == null) return
    setBusy("ai")
    setError("")
    try {
      const res = await instructorApi.suggestRecommendationLetter(scope, requestId)
      setFinalText(String(res.text ?? ""))
      letterTextDirtyRef.current = true
      setTab("letter")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "AI suggestion failed.")
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete() {
    if (!scope || requestId == null) return
    setBusy("delete")
    try {
      await instructorApi.deleteRecommendationRequest(scope, requestId)
      setDeleteOpen(false)
      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete request.")
    } finally {
      setBusy(null)
    }
  }

  const studentInitials = useMemo(() => {
    const name = String(req?.student_name ?? req?.student_full_name ?? "S")
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("")
  }, [req])

  const earlyInfoEligible = instructorCanRequestMoreInfo(status) && !instructorCanRequestRevision(status)

  const pipelineTone = getRecommendationPipelineTone(status, journey.step)
  const statTones = getRecommendationStatTones(status, journey.step)

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome
          topInset={insets.top}
          title="Recommendation"
          onClose={onClose}
          rightSlot={
            req ? (
              <Pressable hitSlop={8} onPress={() => setDeleteOpen(true)} accessibilityLabel="Delete request">
                <Ionicons name="trash-outline" size={20} color="#dc2626" />
              </Pressable>
            ) : null
          }
        />

        {loading && !bundle ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={FACULTY_RECOMMENDATIONS_COLOR.link} />
          </View>
        ) : !req ? (
          <View style={styles.center}>
            <Text style={[styles.muted, { color: native.secondaryLabel }]}>No request selected.</Text>
          </View>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
              keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <FacultySheetHero
                title={String(req.student_name ?? req.student_full_name ?? "Student")}
                subtitle={[req.course_code, recommendationPurposeLabel(req.purpose)].filter(Boolean).join(" · ")}
                initials={studentInitials}
                pills={
                  <FacultyStatusPill
                    label={recommendationStatusLabel(status)}
                    tone={recommendationStatusTone(status)}
                  />
                }
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
                  value={recommendationPillarShort(journey.pillar)}
                  tone={statTones.stage}
                />
                <FacultySheetStatChip
                  icon="calendar-outline"
                  label="Deadline"
                  value={formatRecommendationDeadlineShort(req.deadline)}
                  tone={statTones.deadline}
                />
              </FacultySheetStatRow>

              <FacultySheetPipelineProgress
                step={journey.step}
                total={journey.total}
                headline={journey.headline}
                subline={journey.subline}
                tone={pipelineTone}
              />

              {error ? <FacultySheetErrorBanner message={error} /> : null}

              <FacultyModuleTabBar tabs={TABS} tab={tab} onChange={setTab} scrollable />

              {tab === "overview" ? (
                <>
                  {instructorCanDecideInitialRequest(status) ? (
                    <FacultySheetSection label="Decline reason" hint="Optional — shown to the student" tone="rose">
                      <TextInput
                        style={[collabSheetStyles.fieldInput, collabSheetStyles.textArea]}
                        multiline
                        placeholder="Reason (optional)"
                        value={rejectReason}
                        onChangeText={setRejectReason}
                      />
                    </FacultySheetSection>
                  ) : null}

                  {instructorCanDecideInitialRequest(status) ? (
                    <FacultySheetWorkflow
                      title="Initial decision"
                      body="Approve so the student can complete their questionnaire and letter. Decline to turn down the request."
                      acting={busy === "approve" || busy === "reject"}
                      approveLabel="Approve request"
                      rejectLabel="Decline"
                      onApprove={() => void runPatch("approve")}
                      onReject={() => {
                        AppAlert.alert("Decline request?", "The student will be notified.", [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Decline",
                            style: "destructive",
                            onPress: () => void runPatch("reject", { reason: rejectReason })},
                        ])
                      }}
                    />
                  ) : null}

                  <FacultySheetSection label="Request details">
                    <FacultySheetMetricRow icon="flag-outline" label="Purpose" value={recommendationPurposeLabel(req.purpose)} />
                    <FacultySheetMetricRow icon="calendar-outline" label="Deadline" value={formatRecommendationDeadline(req.deadline)} />
                    <FacultySheetMetricRow
                      icon="person-outline"
                      label="Recipient"
                      value={
                        req.letter_is_specific
                          ? [req.recipient_name, req.recipient_organization].filter(Boolean).join(" · ") || "Specific"
                          : "General letter"
                      }
                    />
                    {req.student_request_description ? (
                      <FacultySheetMetricRow
                        icon="chatbubble-outline"
                        label="Student context"
                        value={req.student_request_description}
                        numberOfLines={4}
                        isLast
                      />
                    ) : (
                      <FacultySheetMetricRow icon="school-outline" label="Course" value={req.course_code ?? "—"} isLast />
                    )}
                  </FacultySheetSection>

                  {status === "rejected" && req.rejection_reason ? (
                    <FacultySheetNotice tone="danger" message={`Declined: ${req.rejection_reason}`} />
                  ) : null}

                  {status === "info_requested" && req.info_request_note ? (
                    <FacultySheetNotice message={`Information requested: ${req.info_request_note}`} />
                  ) : null}

                  {status === "revision_requested" && req.info_request_note ? (
                    <FacultySheetNotice message={`Revision note: ${req.info_request_note}`} />
                  ) : null}

                  {earlyInfoEligible ? (
                    <FacultySheetSection label="Ask for more detail" hint="Sets status to information requested" tone="amber">
                      <TextInput
                        style={[collabSheetStyles.fieldInput, collabSheetStyles.textArea]}
                        multiline
                        placeholder="Note to student"
                        value={infoNote}
                        onChangeText={setInfoNote}
                      />
                      <FacultySheetActionRow
                        icon="help-circle-outline"
                        label="Send information request"
                        disabled={!infoNote.trim() || !!busy}
                        loading={busy === "request_info"}
                        onPress={() => void runPatch("request_info", { note: infoNote.trim() }).then(() => setInfoNote(""))}
                      />
                    </FacultySheetSection>
                  ) : null}

                  {instructorCanRequestRevision(status) ? (
                    <FacultySheetSection label="Send back for edits" hint="Student can revise and resubmit" tone="rose">
                      <TextInput
                        style={[collabSheetStyles.fieldInput, collabSheetStyles.textArea]}
                        multiline
                        placeholder="What needs to change?"
                        value={revisionNote}
                        onChangeText={setRevisionNote}
                      />
                      <FacultySheetActionRow
                        icon="return-down-back-outline"
                        label="Request student revisions"
                        tone="danger"
                        disabled={!revisionNote.trim() || !!busy}
                        loading={busy === "request_student_revision"}
                        onPress={() =>
                          void runPatch("request_student_revision", { note: revisionNote.trim() }).then(() =>
                            setRevisionNote(""),
                          )
                        }
                      />
                    </FacultySheetSection>
                  ) : null}

                  {canPreviewLetterPdf ? (
                    <FacultySheetActionRow
                      icon="document-outline"
                      label="Preview letter PDF"
                      subtitle="Letterhead layout — same as the student download"
                      loading={busy === "pdf"}
                      disabled={!!busy && busy !== "pdf"}
                      onPress={() => void openLetterPdfPreview()}
                    />
                  ) : null}

                  {instructorCanEditRequestMetadata(status) ? (
                    <FacultySheetSection
                      label="Edit metadata"
                      hint="Deadline and student context"
                      action={
                        <FacultySheetSaveChip
                          saving={busy === "heading"}
                          onPress={() => void saveLetterHeading()}
                        />
                      }
                    >
                      <FacultySheetField label="Deadline">
                        <FacultySummerCampDatePicker
                          value={deadline}
                          onChange={(v) => {
                            letterHeadingDirtyRef.current = true
                            setDeadline(v)
                          }}
                          accessibilityLabel="Deadline"
                        />
                      </FacultySheetField>
                      <FacultySheetField label="Student context">
                        <TextInput
                          style={[collabSheetStyles.fieldInput, collabSheetStyles.textArea]}
                          multiline
                          value={studentDesc}
                          onChangeText={(v) => {
                            letterHeadingDirtyRef.current = true
                            setStudentDesc(v)
                          }}
                        />
                      </FacultySheetField>
                    </FacultySheetSection>
                  ) : null}
                </>
              ) : null}

              {tab === "letter" ? (
                <>
                  {status === "requested" ? (
                    <FacultySheetNotice message="Approve the request on the Overview tab before editing the letter." />
                  ) : (
                    <>
                      <FacultySheetSection
                        label="PDF greeting"
                        hint="Salutation and Re: line appear on the formal letterhead"
                        tone="teal"
                      >
                        <FacultySheetField label="Greeting addressee">
                          <TextInput
                            style={collabSheetStyles.fieldInput}
                            value={greetingName}
                            onChangeText={(v) => {
                              letterHeadingDirtyRef.current = true
                              setGreetingName(v)
                            }}
                            placeholder="e.g. Selection Committee"
                          />
                        </FacultySheetField>
                        <FacultySheetField label="Organization (optional)">
                          <TextInput
                            style={collabSheetStyles.fieldInput}
                            value={greetingOrg}
                            onChangeText={(v) => {
                              letterHeadingDirtyRef.current = true
                              setGreetingOrg(v)
                            }}
                          />
                        </FacultySheetField>
                        <FacultySheetField label="Preview">
                          <Text style={[collabSheetStyles.fieldInput, styles.previewLine, styles.previewLineTinted, { color: native.label, borderColor: native.separator, backgroundColor: native.fill }]}>
                            {greetingPreview}
                          </Text>
                        </FacultySheetField>
                        <FacultySheetField label="Mailing address (optional)">
                          <TextInput
                            style={[collabSheetStyles.fieldInput, collabSheetStyles.textArea]}
                            multiline
                            value={greetingAddress}
                            onChangeText={(v) => {
                              letterHeadingDirtyRef.current = true
                              setGreetingAddress(v.slice(0, 2000))
                            }}
                          />
                        </FacultySheetField>
                        <FacultySheetField label="Re: line">
                          <Text style={[collabSheetStyles.fieldInput, styles.previewLine, styles.previewLineTinted, { color: native.label, borderColor: native.separator, backgroundColor: native.fill }]}>
                            {reLinePreview}
                          </Text>
                        </FacultySheetField>
                        {letterPurpose === "other" ? (
                          <FacultySheetField label="Other purpose detail">
                            <TextInput
                              style={collabSheetStyles.fieldInput}
                              value={letterPurposeOther}
                              onChangeText={(v) => {
                                letterHeadingDirtyRef.current = true
                                setLetterPurposeOther(v)
                              }}
                            />
                          </FacultySheetField>
                        ) : null}
                      </FacultySheetSection>

                      <FacultySheetSection label="Letter body" hint="Edit before saving or notifying the student">
                        <TextInput
                          style={[collabSheetStyles.fieldInput, collabSheetStyles.textArea, styles.letterBody]}
                          multiline
                          textAlignVertical="top"
                          value={finalText}
                          onChangeText={(v) => {
                            letterTextDirtyRef.current = true
                            setFinalText(v)
                          }}
                          placeholder="Write or paste the recommendation letter…"
                        />
                      </FacultySheetSection>

                      {(bundle?.drafts?.length ?? 0) > 0 ? (
                        <FacultySheetSection label="Student / AI drafts" hint="Load a draft into the editor">
                          {bundle!.drafts.map((draft) => (
                            <FacultySheetActionRow
                              key={draft.id}
                              icon="copy-outline"
                              label={draft.version_label?.trim() || `Draft #${draft.id}`}
                              subtitle={
                                draft.selected
                                  ? "Selected by student"
                                  : draft.ai_model
                                    ? `AI · ${draft.ai_model}`
                                    : undefined
                              }
                              onPress={() => {
                                setFinalText(String(draft.letter_text ?? ""))
                                letterTextDirtyRef.current = true
                              }}
                            />
                          ))}
                        </FacultySheetSection>
                      ) : null}

                      <FacultySheetSection label="Letter actions">
                        {canPreviewLetterPdf ? (
                          <FacultySheetActionRow
                            icon="document-text-outline"
                            label="Preview letter PDF"
                            subtitle="Uses your saved letter text and letterhead settings"
                            loading={busy === "pdf"}
                            disabled={!!busy && busy !== "pdf"}
                            onPress={() => void openLetterPdfPreview()}
                          />
                        ) : null}

                        <FacultySheetActionRow
                          icon="sparkles-outline"
                          label="AI suggest letter"
                          subtitle={bundle?.profile ? "Uses questionnaire answers" : "Requires student questionnaire"}
                          loading={busy === "ai"}
                          disabled={!!busy || !bundle?.profile}
                          onPress={() => void runAiSuggest()}
                        />

                        <FacultySheetActionRow
                          icon="save-outline"
                          label="Save draft"
                          loading={busy === "save" || busy === "heading"}
                          disabled={!!busy}
                          onPress={() => void saveLetter(false)}
                        />

                        {instructorCanClassicFinalize(status) ? (
                          <FacultySheetActionRow
                            icon="checkmark-done-outline"
                            label="Finalize letter"
                            tone="primary"
                            loading={busy === "finalize"}
                            disabled={!!busy || !finalText.trim()}
                            onPress={() => void saveLetter(true)}
                          />
                        ) : null}

                        {instructorCanReleaseLetter(status) && status !== "requested" ? (
                          <FacultySheetActionRow
                            icon="mail-outline"
                            label="Notify student · letter ready"
                            subtitle="Releases PDF download to student"
                            tone="primary"
                            loading={busy === "notify"}
                            disabled={!!busy || !finalText.trim()}
                            onPress={() => void notifyStudent()}
                          />
                        ) : null}
                      </FacultySheetSection>
                    </>
                  )}
                </>
              ) : null}

              {tab === "questionnaire" ? (
                <>
                  {!bundle?.profile ? (
                    <FacultySheetNotice message="The student has not submitted their questionnaire yet. Approve the request and wait for them to complete it." />
                  ) : (
                    <>
                      <FacultySheetSection label="Student questionnaire">
                        {PROFILE_FIELD_LABELS.map(({ key, label }) => {
                          const value = String((bundle.profile as Record<string, unknown>)[key] ?? "").trim()
                          if (!value) return null
                          return (
                            <View key={key} style={[styles.qBlock, { borderBottomColor: native.separator }]}>
                              <Text style={[styles.qLabel, { color: native.tertiaryLabel }]}>{label}</Text>
                              <Text style={collabSheetStyles.bodyText}>{value}</Text>
                            </View>
                          )
                        })}
                      </FacultySheetSection>

                      {(bundle.attachments?.length ?? 0) > 0 ? (
                        <FacultySheetSection label="Attachments">
                          {bundle.attachments!.map((file, idx) => (
                            <FacultySheetActionRow
                              key={file.id}
                              icon="attach-outline"
                              label={file.file_name ?? `Attachment ${file.id}`}
                              subtitle={file.file_type}
                              onPress={() => {
                                if (!file.file_url) return
                                const name = String(file.file_type ?? file.file_name ?? "").toLowerCase()
                                if (name.includes("pdf")) {
                                  setPdfPreviewSource({ uri: file.file_url })
                                  return
                                }
                                void Linking.openURL(file.file_url)
                              }}
                            />
                          ))}
                        </FacultySheetSection>
                      ) : null}
                    </>
                  )}
                </>
              ) : null}

              {tab === "activity" ? (
                <FacultySheetSection label="Audit log" hint="Recent actions on this request">
                  {(bundle?.audit?.length ?? 0) === 0 ? (
                    <Text style={collabSheetStyles.emptyText}>No activity recorded yet.</Text>
                  ) : (
                    bundle!.audit!.slice(0, 12).map((entry, idx, arr) => (
                      <FacultySheetMetricRow
                        key={entry.id}
                        icon="pulse-outline"
                        label={entry.action.replace(/_/g, " ")}
                        value={new Date(entry.created_at).toLocaleString()}
                        isLast={idx === arr.length - 1}
                      />
                    ))
                  )}
                </FacultySheetSection>
              ) : null}
            </ScrollView>

            {deleteOpen ? (
              <FacultySheetConfirm
                title="Delete request?"
                body="This permanently removes the recommendation request and all related data."
                confirmLabel="Delete"
                onCancel={() => setDeleteOpen(false)}
                onConfirm={() => void handleDelete()}
              />
            ) : null}
          </>
        )}
      </FacultySheetContainer>

      {pdfPreviewSource ? (
        <GuestLetterPdfSheet
          visible={pdfPreviewSource != null}
          pdfSource={pdfPreviewSource}
          title="Recommendation letter"
          onClose={() => setPdfPreviewSource(null)}
        />
      ) : null}
    </Modal>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  muted: { fontSize: 14, fontWeight: "600" },
  letterBody: { minHeight: 220, lineHeight: 22 },
  previewLine: {
    fontSize: 15,
    fontStyle: "italic",
  },
  previewLineTinted: {
    opacity: 0.92,
  },
  qBlock: {
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  qLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
})