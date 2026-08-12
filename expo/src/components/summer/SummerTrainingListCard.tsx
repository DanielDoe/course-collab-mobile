import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import type { SummerTrainingEnrollment } from "../../lib/summer-camp-api"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultyStatusPill } from "../faculty/faculty-shared"
import { ProgressBar } from "../rewards/rewards-shared"
import {
  openSummerTrainingResume,
  summarizeSummerTrainingModules,
} from "./summer-training-navigation"
import { summerTrainingDetailRoute } from "./summer-training-routes"

function formatStatusLabel(
  training: SummerTrainingEnrollment,
  summary: ReturnType<typeof summarizeSummerTrainingModules>,
): string {
  if (summary.capstoneTotal > 0 && summary.capstoneCompleted >= summary.capstoneTotal && summary.curriculumComplete) {
    return "Complete"
  }
  if (summary.curriculumComplete && summary.nextCapstoneModule) return "Capstone phase"
  const pct = training.percent ?? 0
  if (pct >= 100) return "Complete"
  if (summary.curriculumCompleted > 0 || pct > 0) return "In progress"
  const raw = training.status?.replace(/_/g, " ")
  if (raw) return raw.replace(/\b\w/g, (c) => c.toUpperCase())
  return "Not started"
}

function statusTone(
  training: SummerTrainingEnrollment,
  summary: ReturnType<typeof summarizeSummerTrainingModules>,
): "success" | "warning" | "live" | "neutral" {
  const label = formatStatusLabel(training, summary)
  if (label === "Complete") return "success"
  if (label === "Capstone phase") return "live"
  if (label === "In progress") return "live"
  return "neutral"
}

function facultyLabel(training: SummerTrainingEnrollment): string | undefined {
  const extra = training as SummerTrainingEnrollment & Record<string, unknown>
  const name =
    (typeof extra.lead_faculty_name === "string" && extra.lead_faculty_name) ||
    (typeof extra.faculty_name === "string" && extra.faculty_name) ||
    (typeof extra.instructor_name === "string" && extra.instructor_name)
  if (!name) return undefined
  const role =
    typeof extra.faculty_role === "string"
      ? extra.faculty_role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "Lead faculty"
  return `${name} (${role})`
}

function ModuleStatusRow({
  icon,
  label,
  complete,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  complete?: boolean
  last?: boolean
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <View
      style={[
        styles.statusRow,
        !last && { borderBottomColor: native.separator, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <Ionicons
        name={complete ? "checkmark-circle-outline" : icon}
        size={16}
        color={complete ? tokens.success : native.tertiaryLabel}
      />
      <Text style={[type.caption, { color: native.label, flex: 1 }]} numberOfLines={2}>
        {label}
      </Text>
      {complete ? (
        <Text style={[type.caption, { color: tokens.success, fontWeight: "600" }]}>Done</Text>
      ) : null}
    </View>
  )
}

type Props = {
  training: SummerTrainingEnrollment
  studentId: string | null
  last?: boolean
}

export function SummerTrainingListCard({ training, studentId, last }: Props) {
  const router = useRouter()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const summary = summarizeSummerTrainingModules(training.modules)
  const mentor = facultyLabel(training)

  function handleResume() {
    if (!studentId) return
    void openSummerTrainingResume({
      router,
      studentId,
      trainingId: training.training_id,
      modules: training.modules,
    })
  }

  function handleViewDetails() {
    router.push(summerTrainingDetailRoute(training.training_id) as never)
  }

  return (
    <View style={[styles.row, { borderBottomColor: native.separator }, last && styles.rowLast]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: tokens.accentSoft }]}>
          <Ionicons name="sparkles-outline" size={18} color={tokens.accent} />
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={[type.bodyEmphasis, styles.title]} numberOfLines={2}>
              {training.training_title}
            </Text>
            <FacultyStatusPill
              label={formatStatusLabel(training, summary)}
              tone={statusTone(training, summary)}
            />
          </View>
          <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
            {training.camp_title}
          </Text>
        </View>
      </View>

      {mentor ? (
        <View style={styles.metaRow}>
          <Ionicons name="person-outline" size={14} color={native.tertiaryLabel} />
          <Text style={[type.caption, styles.metaText, { color: native.secondaryLabel }]} numberOfLines={1}>
            {mentor}
          </Text>
        </View>
      ) : null}

      <View style={styles.progressBlock}>
        <View style={styles.progressMeta}>
          <Text style={[type.caption, { color: native.secondaryLabel }]}>{summary.progressLabel}</Text>
          <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>{summary.progressPercent}%</Text>
        </View>
        <ProgressBar pct={summary.progressPercent} height={6} />
      </View>

      {training.modules?.length ? (
        <View style={[styles.statusCard, { backgroundColor: native.fill, borderColor: native.separator }]}>
          <ModuleStatusRow
            icon="book-outline"
            label={`Core modules ${summary.curriculumCompleted}/${summary.curriculumTotal}`}
            complete={summary.curriculumComplete}
            last={summary.capstoneTotal === 0}
          />
          {summary.capstoneTotal > 0 ? (
            <ModuleStatusRow
              icon="folder-open-outline"
              label={`Capstone projects ${summary.capstoneCompleted}/${summary.capstoneTotal}`}
              complete={summary.capstoneCompleted >= summary.capstoneTotal}
              last
            />
          ) : null}
          {summary.actionSubtitle ? (
            <Text style={[type.caption, styles.nextStep, { color: native.secondaryLabel }]} numberOfLines={2}>
              Next: {summary.actionSubtitle}
            </Text>
          ) : null}
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [
          styles.resumeBtn,
          { backgroundColor: tokens.accent },
          !studentId && styles.btnDisabled,
          pressed && studentId && { opacity: 0.92 },
        ]}
        onPress={handleResume}
        disabled={!studentId}
        accessibilityRole="button"
        accessibilityLabel={summary.actionLabel}
      >
        <Ionicons
          name={
            summary.curriculumComplete && summary.nextCapstoneModule
              ? "folder-open-outline"
              : "play-circle-outline"
          }
          size={20}
          color="#ffffff"
        />
        <View style={styles.resumeCopy}>
          <Text style={styles.resumeBtnText}>{summary.actionLabel}</Text>
          <Text style={styles.resumeBtnSub} numberOfLines={1}>
            {summary.actionSubtitle}
          </Text>
        </View>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.footer, pressed && { opacity: NATIVE.pressedOpacity }]}
        onPress={handleViewDetails}
        accessibilityRole="button"
        accessibilityLabel="View training details"
      >
        <Text style={[type.footnote, { color: native.tint, fontWeight: "600" }]}>View training details</Text>
        <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: { borderBottomWidth: 0 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  title: { flex: 1, fontSize: 16, lineHeight: 21 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 48 },
  metaText: { flex: 1 },
  progressBlock: { gap: 6, paddingLeft: 48 },
  progressMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  nextStep: {
    paddingTop: 4,
    paddingBottom: 6,
    lineHeight: 18,
  },
  resumeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
  },
  resumeCopy: { flex: 1, gap: 2 },
  resumeBtnText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  resumeBtnSub: { color: "rgba(255,255,255,0.86)", fontSize: 12, lineHeight: 16 },
  btnDisabled: { opacity: 0.55 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 2,
  },
})
