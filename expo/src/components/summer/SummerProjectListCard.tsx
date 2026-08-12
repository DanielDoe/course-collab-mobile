import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { SummerProject } from "../../lib/summer-camp-api"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultyStatusPill } from "../faculty/faculty-shared"
import { ProgressBar } from "../rewards/rewards-shared"

function formatProjectStatus(project: SummerProject): string {
  if (project.status === "complete" || project.is_complete) return "Complete"
  if (project.status === "in_progress") return "In progress"
  return "Not started"
}

function statusTone(project: SummerProject): "success" | "warning" | "live" | "neutral" {
  if (project.status === "complete" || project.is_complete) return "success"
  if (project.status === "in_progress") return "live"
  return "neutral"
}

function projectMeta(project: SummerProject): string {
  const parts = [
    project.project_number != null ? `Project ${project.project_number}` : undefined,
    project.training_title,
    project.camp_title,
  ].filter(Boolean)
  return parts.join(" · ")
}

type Props = {
  project: SummerProject
  onPress?: () => void
  last?: boolean
}

export function SummerProjectListCard({ project, onPress, last }: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const percent = Math.min(
    100,
    Math.max(0, project.progress_percent ?? (project.is_complete ? 100 : 0)),
  )
  const tasksLabel =
    project.tasks_total != null
      ? `Tasks ${project.tasks_completed ?? 0}/${project.tasks_total}`
      : undefined
  const checkpointsLabel =
    project.checkpoints_total != null
      ? `Checkpoints ${project.checkpoints_completed ?? 0}/${project.checkpoints_total}`
      : undefined

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: native.separator },
        last && styles.rowLast,
        pressed && { opacity: NATIVE.pressedOpacity },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: tokens.accentSoft }]}>
          <Ionicons name="folder-open-outline" size={18} color={tokens.accent} />
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={[type.bodyEmphasis, styles.title]} numberOfLines={2}>
              {project.project_title}
            </Text>
            <FacultyStatusPill label={formatProjectStatus(project)} tone={statusTone(project)} />
          </View>
          <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
            {projectMeta(project)}
          </Text>
        </View>
      </View>

      {project.summary ? (
        <Text style={[type.caption, styles.summary, { color: native.secondaryLabel }]} numberOfLines={2}>
          {project.summary}
        </Text>
      ) : null}

      {project.instructor_name ? (
        <View style={styles.metaRow}>
          <Ionicons name="person-outline" size={14} color={native.tertiaryLabel} />
          <Text style={[type.caption, styles.metaText, { color: native.secondaryLabel }]} numberOfLines={1}>
            Instructor: {project.instructor_name}
          </Text>
        </View>
      ) : null}

      {project.badge_title ? (
        <View style={styles.metaRow}>
          <Ionicons name="ribbon-outline" size={14} color={tokens.warning} />
          <Text style={[type.caption, styles.metaText, { color: native.secondaryLabel }]} numberOfLines={1}>
            Badge: {project.badge_title}
          </Text>
        </View>
      ) : null}

      <View style={styles.progressBlock}>
        <View style={styles.progressMeta}>
          <Text style={[type.caption, { color: native.secondaryLabel }]}>
            {tasksLabel ?? checkpointsLabel ?? "Progress"}
          </Text>
          <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>{percent}%</Text>
        </View>
        <ProgressBar pct={percent} height={6} />
        {tasksLabel && checkpointsLabel ? (
          <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
            {tasksLabel} · {checkpointsLabel}
          </Text>
        ) : null}
      </View>

      {project.xp_reward != null ? (
        <View style={styles.metaRow}>
          <Ionicons name="flash-outline" size={14} color={tokens.accent} />
          <Text style={[type.caption, styles.metaText, { color: native.secondaryLabel }]}>
            {project.xp_reward} XP reward
          </Text>
        </View>
      ) : null}

      {onPress ? (
        <View style={styles.footer}>
          <Text style={[type.footnote, { color: native.tint, fontWeight: "600" }]}>
            {project.status === "not_started" && !project.is_complete ? "Start project" : "Open project"}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
        </View>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
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
  summary: { paddingLeft: 48 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 48 },
  metaText: { flex: 1 },
  progressBlock: { gap: 6, paddingLeft: 48 },
  progressMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 48,
    paddingTop: 2,
  },
})
