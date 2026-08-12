import { useMemo, useState } from "react"
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { NATIVE } from "../../constants/faculty-native-theme"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi } from "../../lib/instructor-api"
import {
  getReviewPeriodConfig,
  REVIEW_PERIOD_OPTIONS,
  type ProgressReviewBatchResult,
  type ProgressReviewPeriod} from "../../lib/progress-review-utils"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FACULTY_SHEET_COLOR } from "../../lib/faculty-sheet-theme"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetErrorBanner,
  FacultySheetField,
  FacultySheetOutlineButton,
  FacultySheetSection,
  FacultySheetSubmitButton,
  FacultySheetTextInput,
  FacultySheetToggleRow
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import { FacultyModuleTabBar } from "./faculty-module-shell"

type Scope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  scope: Scope | null
  period: ProgressReviewPeriod
  asOfDate: string
  missingCount: number
  onClose: () => void
  onComplete: () => void
  onPeriodChange: (period: ProgressReviewPeriod) => void
  onAsOfDateChange: (value: string) => void
}

function useProgressReviewRunStyles() {
  const { native, tokens, type } = useModuleTheme()
  return useMemo(
    () =>
      StyleSheet.create({
        periodHint: { marginTop: 4, ...type.caption, color: native.secondaryLabel, fontWeight: "600" },
        resultGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
        resultStat: {
          minWidth: "30%",
          flexGrow: 1,
          borderRadius: NATIVE.sectionRadius,
          padding: 10,
          alignItems: "center",
          gap: 2,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          backgroundColor: native.secondaryGrouped,
        },
        resultValue: { fontSize: 18, fontWeight: "600", color: native.label },
        resultLabel: { fontSize: 11, fontWeight: "600", color: native.secondaryLabel },
        resultErrors: { marginTop: 4, ...type.caption, color: tokens.danger, fontWeight: "600" },
        runningBox: { alignItems: "center", gap: 10, paddingVertical: 16 },
        runningText: { textAlign: "center", ...type.caption, color: native.secondaryLabel, fontWeight: "600" },
      }),
    [native, tokens, type],
  )
}

export function FacultyProgressReviewRunSheet({
  visible,
  scope,
  period,
  asOfDate,
  missingCount,
  onClose,
  onComplete,
  onPeriodChange,
  onAsOfDateChange}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const { tokens } = useModuleTheme()
  const styles = useProgressReviewRunStyles()
  const insets = useSafeAreaInsets()
  const [dryRun, setDryRun] = useState(true)
  const [sendEmail, setSendEmail] = useState(true)
  const [createAnnouncement, setCreateAnnouncement] = useState(true)
  const [createNotification, setCreateNotification] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState("")
  const [lastResult, setLastResult] = useState<ProgressReviewBatchResult | null>(null)

  const periodCfg = getReviewPeriodConfig(period)

  function validateCustomDate(): boolean {
    if (period !== "custom") return true
    if (asOfDate.trim()) return true
    AppAlert.alert("Select a date", "Custom progress reviews need an as-of date for the snapshot.")
    return false
  }

  async function executeBatch(payload: Parameters<typeof instructorApi.runProgressReviewBatch>[1]) {
    if (!scope) return
    if (!validateCustomDate()) return
    setRunning(true)
    setError("")
    try {
      const res = await instructorApi.runProgressReviewBatch(scope, {
        reviewPeriod: period,
        asOfDate: period === "custom" ? asOfDate.trim() : undefined,
        sendEmail,
        createAnnouncement,
        createNotification,
        ...payload,
      })
      if (!res.success || !res.result) {
        throw new ApiError(res.error ?? "Request failed", 400)
      }
      setLastResult(res.result)
      onComplete()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not run progress reviews.")
    } finally {
      setRunning(false)
    }
  }

  function confirmSendAll() {
    if (!validateCustomDate()) return
    AppAlert.alert(
      "Send progress reviews?",
      `This generates AI reviews for all enrolled students and delivers email${sendEmail ? "" : " (off)"}, announcements${createAnnouncement ? "" : " (off)"}, and notifications${createNotification ? "" : " (off)"} for ${periodCfg.label}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          style: "default",
          onPress: () => void executeBatch({ dryRun: false }),
        },
      ],
    )
  }

  function confirmDeliverSaved() {
    if (!validateCustomDate()) return
    AppAlert.alert(
      "Deliver saved reviews?",
      `Send already-generated ${periodCfg.label} reviews without regenerating. Students who were already emailed are skipped.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deliver",
          onPress: () => void executeBatch({ deliverSaved: true, dryRun: false }),
        },
      ],
    )
  }

  if (!visible) return null

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Generate reviews" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={collabSheetStyles.introText}>
            Generate AI progress reviews and deliver them the same way as the web app — email, private announcement, and in-app notification.
          </Text>

          <FacultySheetSection label="Review period" tone={SHEET_SECTION.edit}>
            <FacultyModuleTabBar
              scrollable
              tabs={REVIEW_PERIOD_OPTIONS.map((opt) => ({
                id: opt.id,
                label: opt.shortLabel,
                icon:
                  opt.id === "midterm"
                    ? ("school-outline" as const)
                    : opt.id === "final"
                      ? ("ribbon-outline" as const)
                      : ("calendar-outline" as const),
              }))}
              tab={period}
              onChange={onPeriodChange}
            />
            <Text style={styles.periodHint}>{periodCfg.description}</Text>
            {period === "custom" ? (
              <FacultySheetField label="As-of date">
                <FacultySheetTextInput
                  value={asOfDate}
                  onChangeText={onAsOfDateChange}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </FacultySheetField>
            ) : null}
          </FacultySheetSection>

          <FacultySheetSection label="Delivery channels" tone={SHEET_SECTION.workflow}>
            <FacultySheetToggleRow
              icon="flask-outline"
              title="Dry run (save only)"
              subtitle="Generate and save without emailing students"
              value={dryRun}
              onValueChange={setDryRun}
            />
            <FacultySheetToggleRow
              icon="mail-outline"
              title="Email"
              subtitle="Send the progress review email"
              value={sendEmail}
              onValueChange={setSendEmail}
            />
            <FacultySheetToggleRow
              icon="megaphone-outline"
              title="Announcement"
              subtitle="Post a private announcement to each student"
              value={createAnnouncement}
              onValueChange={setCreateAnnouncement}
            />
            <FacultySheetToggleRow
              icon="notifications-outline"
              title="Notification"
              subtitle="In-app alert linking to their progress review"
              value={createNotification}
              onValueChange={setCreateNotification}
            />
          </FacultySheetSection>

          {error ? <FacultySheetErrorBanner message={error} /> : null}

          {lastResult ? (
            <FacultySheetSection label="Last run" tone={SHEET_SECTION.tools}>
              <View style={styles.resultGrid}>
                <ResultStat label="Students" value={String(lastResult.total)} />
                <ResultStat label="Generated" value={String(lastResult.generated)} />
                <ResultStat label="Delivered" value={String(lastResult.dispatched)} />
                <ResultStat label="Emails" value={String(lastResult.emailsSent)} />
                <ResultStat label="Skipped" value={String(lastResult.skipped)} />
              </View>
              {lastResult.errors.length > 0 ? (
                <Text style={styles.resultErrors}>
                  {lastResult.errors.length} error(s): {lastResult.errors[0]?.error}
                </Text>
              ) : null}
            </FacultySheetSection>
          ) : null}

          <FacultySheetSection label="Actions" tone={SHEET_SECTION.highlight}>
            {running ? (
              <View style={styles.runningBox}>
                <ActivityIndicator color={FACULTY_SHEET_COLOR.link} />
                <Text style={styles.runningText}>Running batch… this may take a minute.</Text>
              </View>
            ) : (
              <>
                <FacultySheetOutlineButton
                  icon="sparkles-outline"
                  label={dryRun ? "Generate & save (dry run)" : "Generate & send to all"}
                  onPress={() => (dryRun ? void executeBatch({ dryRun: true }) : confirmSendAll())}
                />
                {missingCount > 0 ? (
                  <FacultySheetOutlineButton
                    icon="person-add-outline"
                    label={`Save missing only (${missingCount})`}
                    onPress={() => void executeBatch({ dryRun: true, onlyMissing: true })}
                  />
                ) : null}
                {!dryRun ? (
                  <FacultySheetSubmitButton label="Send to all enrolled" onPress={confirmSendAll} />
                ) : null}
                <FacultySheetOutlineButton
                  icon="send-outline"
                  label="Deliver saved reviews"
                  onPress={confirmDeliverSaved}
                />
              </>
            )}
          </FacultySheetSection>
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

function ResultStat({ label, value }: { label: string; value: string }) {
  const styles = useProgressReviewRunStyles()
  return (
    <View style={styles.resultStat}>
      <Text style={styles.resultValue}>{value}</Text>
      <Text style={styles.resultLabel}>{label}</Text>
    </View>
  )
}
