import { useEffect, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import type { ClassroomPointRow } from "../../lib/instructor-api"
import { instructorApi } from "../../lib/instructor-api"
import {
  classroomPointTitle,
  formatClassroomPoints,
} from "../../lib/faculty-classroom-points-utils"
import { categoryLabel } from "../../lib/rewards-api"
import { formatFacultyRelativeTime } from "../../lib/instructor-api"
import { FACULTY_CLASSROOM_POINTS_COLOR } from "../../lib/faculty-classroom-points-theme"
import { semanticSoft } from "../../lib/themed-module-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { NativeSelect } from "../NativeSelect"
import { POINT_AWARD_OPTIONS, withCurrentOption } from "./FacultyNativePickers"
import { FacultySubmissionReviewPanel } from "./FacultySubmissionReviewPanel"
import { FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetField,
  FacultySheetHero,
  FacultySheetNotice,
  FacultySheetSection,
  FacultySheetStatChip,
  FacultySheetStatRow,
  FACULTY_SHEET_CHIP_RADIUS,
} from "./faculty-collab-sheet-ui"
import { SHEET_CLASSROOM_POINTS } from "./faculty-sheet-semantics"

type Scope = { instructorId: number; courseId: number }

type Props = {
  point: ClassroomPointRow | null
  scope: Scope | null
  /** Review pending submissions (approve/reject). Award mode is read-only with optional revoke. */
  variant?: "review" | "award"
  onClose: () => void
  onUpdated: () => void
}

export function FacultyClassroomPointDetailModal({ point, scope, variant, onClose, onUpdated }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const { native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const [customPoints, setCustomPoints] = useState("")
  const [acting, setActing] = useState(false)

  useEffect(() => {
    setCustomPoints("")
  }, [point?.id])

  if (!point) return null

  const title = classroomPointTitle(point)
  const suggested = formatClassroomPoints(point.points)
  const isDuplicate = Boolean(point.isDuplicate)
  const isAward =
    variant === "award" ||
    (variant !== "review" && String(point.status ?? "").toLowerCase() === "approved")

  async function handleRevoke() {
    if (!scope || !point) return
    AppAlert.alert("Revoke award?", "This removes the points record for this student.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Revoke",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setActing(true)
            try {
              await instructorApi.deleteClassroomPoint(scope, point.id)
              onUpdated()
              onClose()
            } catch (err) {
              AppAlert.alert("Revoke failed", err instanceof ApiError ? err.message : "Try again.")
            } finally {
              setActing(false)
            }
          })()
        },
      },
    ])
  }

  async function handleApprove() {
    if (!scope || !point || isDuplicate) return
    setActing(true)
    try {
      const parsed = customPoints.trim() ? Number(customPoints) : undefined
      const res = await instructorApi.approveClassroomPoint(scope, point.id, parsed)
      AppAlert.alert("Approved", res.duplicateWarning ?? res.message ?? "Points awarded.")
      onUpdated()
      onClose()
    } catch (err) {
      AppAlert.alert("Approve failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setActing(false)
    }
  }

  function handleReject() {
    if (!scope || !point) return
    AppAlert.alert("Reject submission?", "The student will not receive points.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setActing(true)
            try {
              await instructorApi.rejectClassroomPoint(scope, point.id)
              onUpdated()
              onClose()
            } catch (err) {
              AppAlert.alert("Reject failed", err instanceof ApiError ? err.message : "Try again.")
            } finally {
              setActing(false)
            }
          })()
        },
      },
    ])
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome
          topInset={insets.top}
          title={isAward ? "Award details" : "Classroom points"}
          onClose={onClose}
        />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={title}
            subtitle={point.student_name ?? "Student"}
            icon="trophy-outline"
            pills={
              <>
                <FacultyStatusPill label={categoryLabel(point.category)} tone="neutral" />
                {point.session ? <FacultyStatusPill label={point.session} tone="neutral" /> : null}
                {point.ai_suspicion ? <FacultyStatusPill label="AI flag" tone="warning" /> : null}
                {isDuplicate ? <FacultyStatusPill label="Duplicate" tone="danger" /> : null}
                {point.highestInGroup ? <FacultyStatusPill label="Best attempt" tone="success" /> : null}
              </>
            }
          />

          <FacultySheetStatRow>
            <FacultySheetStatChip label="Points" value={`${suggested} pts`} tone={SHEET_CLASSROOM_POINTS.award} />
            <FacultySheetStatChip
              label={isAward ? "When" : "Submitted"}
              value={formatFacultyRelativeTime(isAward ? point.awarded_at ?? point.created_at : point.created_at)}
              tone={SHEET_CLASSROOM_POINTS.leaderboard}
            />
            {point.authenticity_score != null ? (
              <FacultySheetStatChip
                label="Authenticity"
                value={`${Math.round(point.authenticity_score)}%`}
                tone={SHEET_CLASSROOM_POINTS.review}
              />
            ) : (
              <FacultySheetStatChip
                label="Student ID"
                value={point.student_number ?? "—"}
                tone={SHEET_CLASSROOM_POINTS.bulk}
              />
            )}
          </FacultySheetStatRow>

          {isDuplicate ? (
            <FacultySheetNotice
              tone="warning"
              message={`Lower-scoring duplicate — approve the highest attempt in this group instead.${
                point.highestScoreInGroup != null ? ` Top score: ${point.highestScoreInGroup} pts.` : ""
              }`}
            />
          ) : null}

          <FacultySheetSection label="Submission details">
            <FacultySheetStatRow>
              <FacultySheetStatChip
                label="Student ID"
                value={point.student_number ?? "—"}
                tone={SHEET_CLASSROOM_POINTS.bulk}
              />
              {point.point_booster && point.point_booster > 1 ? (
                <FacultySheetStatChip
                  label="Booster"
                  value={`${point.point_booster}×`}
                  tone={SHEET_CLASSROOM_POINTS.award}
                />
              ) : null}
            </FacultySheetStatRow>
            {point.reason?.trim() ? (
              <Text style={collabSheetStyles.bodyText}>{point.reason.trim()}</Text>
            ) : null}
            {point.instructor_name ? (
              <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600", marginTop: 6 }]}>
                Awarded by {point.instructor_name}
              </Text>
            ) : null}
          </FacultySheetSection>

          {point.authorship_reasoning ? (
            <FacultySheetSection label="AI authorship review" tone={SHEET_CLASSROOM_POINTS.review}>
              <Text style={collabSheetStyles.bodyText}>{point.authorship_reasoning}</Text>
              {point.flagged_features?.length ? (
                <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                  Flags: {point.flagged_features.join(", ")}
                </Text>
              ) : null}
            </FacultySheetSection>
          ) : null}

          <FacultySubmissionReviewPanel point={point} />

          {isAward ? (
            <FacultySheetSection label="Actions" tone={SHEET_CLASSROOM_POINTS.assignment}>
              <Pressable
                style={[
                  localStyles.btn,
                  {
                    backgroundColor: semanticSoft(tokens.danger, tokens.isDark),
                    borderColor: `${tokens.danger}33`,
                  },
                ]}
                onPress={handleRevoke}
                disabled={acting}
              >
                {acting ? (
                  <ActivityIndicator color={tokens.danger} />
                ) : (
                  <Text style={[type.bodyEmphasis, { color: tokens.danger }]}>Revoke award</Text>
                )}
              </Pressable>
            </FacultySheetSection>
          ) : !isDuplicate ? (
            <FacultySheetSection
              label="Award points"
              hint={`Leave blank to use suggested ${suggested} pts (AI grading runs on approve).`}
              tone={SHEET_CLASSROOM_POINTS.review}
            >
              <FacultySheetField label="Custom points">
                <NativeSelect
                  placeholder={`Suggested ${suggested} pts`}
                  value={customPoints}
                  options={[
                    { value: "", label: `Suggested ${suggested} pts` },
                    ...withCurrentOption(POINT_AWARD_OPTIONS, customPoints, `${customPoints} pts`),
                  ]}
                  onChange={setCustomPoints}
                />
              </FacultySheetField>
              <View style={localStyles.actions}>
                <Pressable
                  style={[
                    localStyles.btn,
                    {
                      backgroundColor: semanticSoft(tokens.danger, tokens.isDark),
                      borderColor: `${tokens.danger}33`,
                    },
                  ]}
                  onPress={handleReject}
                  disabled={acting}
                >
                  <Text style={[type.bodyEmphasis, { color: tokens.danger }]}>Reject</Text>
                </Pressable>
                <Pressable
                  style={[localStyles.btn, { backgroundColor: FACULTY_CLASSROOM_POINTS_COLOR.action }]}
                  onPress={() => void handleApprove()}
                  disabled={acting}
                >
                  {acting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={[type.bodyEmphasis, { color: "#ffffff" }]}>Approve</Text>
                  )}
                </Pressable>
              </View>
            </FacultySheetSection>
          ) : null}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const localStyles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 8 },
  btn: {
    flex: 1,
    borderRadius: FACULTY_SHEET_CHIP_RADIUS,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
})
