import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ModuleScreen } from "../modules/ModuleScreen"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { useSession } from "../../context/SessionProvider"
import { ApiError, studentApi, type QuizItem } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { hexToRgba } from "../../constants/app-themes"
import {
  assessmentStatusChipStyle,
  dueMeta,
  formatAssessmentType,
  issuesAssessmentType,
  type AssessmentListKind} from "./assessment-config"
import { buildAssessmentDetailActions } from "./assessment-detail-logic"
import { fetchAssessmentById } from "./assessment-list-logic"
import { AssessmentIssuesSheet } from "./AssessmentIssuesSheet"
import { useAssessmentTheme, useThemedStudentNative } from "../../lib/themed-module-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import {
  assessmentModuleHrefForKind,
  openAssessmentResults,
  openAssessmentTake} from "./assessment-navigation"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import {
  defaultExamWideTimerSeconds,
  isExamWideAssessmentType,
} from "../../lib/assessment-quiz/exam-wide-timer"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function formatAssessmentTitle(title: string): string {
  return title
    .replace(/\s+(\d+|[IVXLC]+)$/i, "\u00A0$1")
    .replace(/\s+(Part\s+\d+)$/i, "\u00A0$1")
}

function resolveListKind(typeParam: string): AssessmentListKind {
  const t = typeParam.toLowerCase().replace(/-/g, "_")
  if (t === "homework") return "homework"
  if (t === "mid_semester" || t === "midsem") return "mid_semester"
  if (t === "final") return "final"
  return "quiz"
}

async function fetchAssessmentItem(
  session: StudentSession,
  kind: AssessmentListKind,
  id: number,
): Promise<QuizItem | null> {
  return fetchAssessmentById(session, kind, id)
}

function DetailRow({
  icon,
  label,
  value}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
}) {
  const SN = useThemedStudentNative()
  const { tokens } = useAssessmentTheme()
  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIcon, { backgroundColor: hexToRgba(tokens.accent, 0.08) }]}>
        <Ionicons name={icon} size={16} color={tokens.accent} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={[styles.detailLabel, { color: SN.secondaryLabel }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: tokens.text }]}>{value}</Text>
      </View>
    </View>
  )
}

function ActionButton({
  label,
  onPress,
  variant = "primary",
  loading,
  disabled}: {
  label: string
  onPress: () => void
  variant?: "primary" | "secondary" | "ghost"
  loading?: boolean
  disabled?: boolean
}) {
  const { tokens } = useAssessmentTheme()
  if (variant === "primary") {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.actionPrimary,
          (pressed || disabled) && styles.actionPressed,
          disabled && styles.actionDisabled,
        ]}
        onPress={onPress}
        disabled={disabled || loading}
      >
        <LinearGradient
          colors={[tokens.accent, tokens.accentHover]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionPrimaryGradient}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.actionPrimaryText}>{label}</Text>
          )}
        </LinearGradient>
      </Pressable>
    )
  }

  return (
    <Pressable
      style={({ pressed }) => [
        variant === "secondary"
          ? [
              styles.actionSecondary,
              {
                borderColor: tokens.accent,
                backgroundColor: hexToRgba(tokens.accent, 0.06),
              },
            ]
          : [styles.actionGhost, { borderColor: tokens.border, backgroundColor: tokens.surface }],
        pressed && styles.actionPressed,
        disabled && styles.actionDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={tokens.accent} size="small" />
      ) : (
        <Text
          style={[
            variant === "secondary"
              ? [styles.actionSecondaryText, { color: tokens.accent }]
              : [styles.actionGhostText, { color: tokens.textSecondary }],
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  )
}

function AssessmentDetailShell({
  title,
  fallbackHref,
  children,
}: {
  title: string
  fallbackHref: string
  children: ReactNode
}) {
  const native = useThemedNative()
  return (
    <View style={[detailShellStyles.root, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title={title} fallbackHref={fallbackHref} />
      <View style={detailShellStyles.body}>{children}</View>
    </View>
  )
}

export function AssessmentDetailScreen() {
  const { id, type: typeParam } = useLocalSearchParams<{ id: string; type?: string }>()
  const quizId = Number(id)
  const session = useStudentSession()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const SN = useThemedStudentNative()
  const { configFor, scoreTone, tokens } = useAssessmentTheme()

  const kind = resolveListKind(typeParam ?? "quiz")
  const config = configFor(kind)
  const assessmentType = issuesAssessmentType(kind)
  const displayName = formatAssessmentType(kind === "quiz" ? "quiz" : kind)
  const moduleHref = assessmentModuleHrefForKind(kind)

  const [item, setItem] = useState<QuizItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [extending, setExtending] = useState(false)
  const [issuesOpen, setIssuesOpen] = useState(false)

  const load = useCallback(async () => {
    if (!session || !Number.isFinite(quizId)) return
    setError("")
    try {
      const found = await fetchAssessmentItem(session, kind, quizId)
      if (!found) {
        setError("Assessment not found or no longer available.")
        setItem(null)
        return
      }
      setItem(found)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load assessment.")
      setItem(null)
    }
  }, [session, kind, quizId])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useNotificationModuleRefresh(["assessments", "grades", "issues"], onRefresh)

  const actions = useMemo(
    () => (item ? buildAssessmentDetailActions(item, displayName) : null),
    [item, displayName],
  )

  const score = scoreTone(actions?.displayPercent ?? item?.best_score)
  const statusChip = assessmentStatusChipStyle(actions?.statusTone ?? "closed", tokens)

  const handleExtend = useCallback(async () => {
    if (!session || !item) return
    if (item.rollover_requires_upgrade) {
      AppAlert.alert(
        "Membership upgrade required",
        "Extend past the due date is available on Explorer and Trailblazer plans.",
      )
      return
    }
    setExtending(true)
    try {
      const res = await studentApi.applyRollover(session, item.id)
      if (res.success) {
        AppAlert.alert(
          "Extension applied",
          typeof res.message === "string"
            ? res.message
            : `You have ${item.rollover_hours ?? 24}h to complete this assessment.`,
        )
        await load()
      } else {
        AppAlert.alert("Could not apply extension", res.error ?? "Please try again later.")
      }
    } catch (err) {
      AppAlert.alert(
        "Could not apply extension",
        err instanceof ApiError ? err.message : "Please try again later.",
      )
    } finally {
      setExtending(false)
    }
  }, [session, item, load])

  if (!loading && (!item || !actions)) {
    return (
      <AssessmentDetailShell title={displayName} fallbackHref={moduleHref}>
        <ModuleScreen loading={false} error={error || "Assessment unavailable."} disableTopInsetAdjustment>
          <ActionButton label="Try again" onPress={onRefresh} variant="secondary" loading={refreshing} />
        </ModuleScreen>
      </AssessmentDetailShell>
    )
  }

  if (!item || !actions) {
    return (
      <AssessmentDetailShell title={displayName} fallbackHref={moduleHref}>
        <ModuleScreen loading={loading} disableTopInsetAdjustment>
          {null}
        </ModuleScreen>
      </AssessmentDetailShell>
    )
  }

  const due = dueMeta(item.available_until)
  const opens = item.available_from ? dueMeta(item.available_from) : null

  return (
    <>
      <AssessmentDetailShell title={item.title} fallbackHref={moduleHref}>
        <ModuleScreen
          loading={loading}
          refreshing={refreshing}
          onRefresh={onRefresh}
          error={error}
          disableTopInsetAdjustment
          stackedHeader
        >
        <View
          style={[
            styles.summaryCard,
            {
              marginBottom: insets.bottom > 0 ? 0 : 4,
              backgroundColor: tokens.surface,
              borderColor: tokens.border,
              shadowColor: tokens.accentDark,
            },
          ]}
        >
          <View style={styles.summaryTopRow}>
            <LinearGradient colors={config.gradient} style={styles.iconTile}>
              <Ionicons name={config.icon} size={20} color="#ffffff" />
            </LinearGradient>

            <View style={styles.badgeRow}>
              <View style={[styles.chip, { backgroundColor: statusChip.bg }]}>
                <Text style={[styles.chipText, { color: statusChip.text }]}>{actions.statusLabel}</Text>
              </View>
              {item.quiz_type === "admin" ? (
                <View style={styles.chipNeutral}>
                  <Ionicons name="shield-checkmark-outline" size={11} color={tokens.textSecondary} />
                  <Text style={[styles.chipNeutralText, { color: tokens.textSecondary }]}>Official</Text>
                </View>
              ) : null}
              <View style={[styles.chip, { backgroundColor: score.bg }]}>
                <Text style={[styles.chipText, { color: score.text }]}>{score.label}</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.summaryTitle, { color: tokens.text }]}>{formatAssessmentTitle(item.title)}</Text>

          {item.description ? (
            <Text style={[styles.summaryDescription, { color: tokens.textSecondary }]}>
              {item.description}
            </Text>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <Text style={[styles.cardTitle, { color: tokens.accentDark }]}>Details</Text>
          {item.question_count != null ? (
            <DetailRow
              icon="help-circle-outline"
              label="Questions"
              value={`${item.question_count} questions${
                isExamWideAssessmentType(assessmentType)
                  ? ` · ${Math.round(defaultExamWideTimerSeconds(assessmentType) / 60)} min total`
                  : item.time_per_question != null
                    ? ` · ${item.time_per_question}s each`
                    : ""
              }`}
            />
          ) : null}
          {opens && !opens.past ? (
            <DetailRow icon="time-outline" label="Opens" value={opens.label.replace("Due ", "")} />
          ) : null}
          <DetailRow icon="calendar-outline" label="Due" value={due.label} />
          {item.attempts_used != null && item.retake_limit != null ? (
            <DetailRow
              icon="repeat-outline"
              label="Attempts"
              value={`${item.attempts_used} of ${item.retake_limit} used`}
            />
          ) : null}
          {actions.retakeNote ? (
            <DetailRow icon="information-circle-outline" label="Retakes" value={actions.retakeNote} />
          ) : null}
          {item.rollover_active ? (
            <DetailRow icon="timer-outline" label="Extension" value="Active — complete before it expires" />
          ) : null}
        </View>

        <View style={[styles.actionsCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <Text style={[styles.cardTitle, { color: tokens.accentDark }]}>Actions</Text>

          {actions.showContinue ? (
            <ActionButton
              label="Continue assessment"
              onPress={() => openAssessmentTake(router, assessmentType, item.id, "continue")}
            />
          ) : null}

          {actions.showStart ? (
            <ActionButton
              label={actions.startLabel ?? `Start ${displayName}`}
              onPress={() => openAssessmentTake(router, assessmentType, item.id, "start")}
            />
          ) : null}

          {actions.showRetake ? (
            <ActionButton
              label={`Retake ${displayName}`}
              variant="secondary"
              onPress={() => openAssessmentTake(router, assessmentType, item.id, "retake")}
            />
          ) : null}

          {actions.showReport && item.attempt_id ? (
            <ActionButton
              label="View report"
              variant="secondary"
              onPress={() => openAssessmentResults(router, item.attempt_id!, assessmentType)}
            />
          ) : null}

          {actions.showExtend ? (
            <ActionButton
              label={actions.extendLabel ?? "Extend deadline"}
              variant="secondary"
              loading={extending}
              onPress={handleExtend}
            />
          ) : null}

          <ActionButton label="Report an issue" variant="ghost" onPress={() => setIssuesOpen(true)} />

          {actions.showClosed ? (
            <View style={[styles.noticeBox, { backgroundColor: SN.fill }]}>
              <Ionicons name="lock-closed-outline" size={18} color={SN.secondaryLabel} />
              <Text style={[styles.noticeText, { color: tokens.textSecondary }]}>
                This assessment is closed. View your report or report an issue if you completed it.
              </Text>
            </View>
          ) : null}

          {actions.showLocked && actions.lockedLabel ? (
            <View style={[styles.noticeBox, { backgroundColor: SN.fill }]}>
              <Ionicons name="hourglass-outline" size={18} color={tokens.warning} />
              <Text style={[styles.noticeText, { color: tokens.textSecondary }]}>{actions.lockedLabel}</Text>
            </View>
          ) : null}
        </View>
        </ModuleScreen>
      </AssessmentDetailShell>

      {session ? (
        <AssessmentIssuesSheet
          visible={issuesOpen}
          onClose={() => setIssuesOpen(false)}
          session={session}
          assessmentType={assessmentType}
          assessmentLabel={config.title}
          quizzes={[item]}
          initialTab="report"
          preselectedQuizId={item.id}
        />
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  summaryCard: {
    gap: 10,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 23,
  },
  badgeRow: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: { fontSize: 11, fontWeight: "600" },
  chipNeutral: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(100,116,139,0.1)",
  },
  chipNeutralText: { fontSize: 11, fontWeight: "700" },
  summaryDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    marginTop: 12,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  actionsCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCopy: { flex: 1, gap: 2 },
  detailLabel: { fontSize: 11, fontWeight: "700" },
  detailValue: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  actionPrimary: { borderRadius: 14, overflow: "hidden" },
  actionPrimaryGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPrimaryText: { fontSize: 15, fontWeight: "600", color: "#ffffff" },
  actionSecondary: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1.5,
  },
  actionSecondaryText: { fontSize: 15, fontWeight: "700" },
  actionGhost: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  actionGhostText: { fontSize: 14, fontWeight: "700" },
  actionPressed: { opacity: 0.92 },
  actionDisabled: { opacity: 0.55 },
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18 },
})

const detailShellStyles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
})
