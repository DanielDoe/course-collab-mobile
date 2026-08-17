import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { countLiveSections, formatAssessmentWindow } from "../../lib/faculty-assessment-utils"
import type { InstructorQuiz, InstructorSession } from "../../lib/instructor-api"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  FACULTY_ASSESSMENT_COLOR,
  facultyAssessmentThumb,
} from "../../lib/faculty-assessment-theme"
import { FacultyStatusPill } from "./faculty-shared"
import { FacultySessionAccessList } from "./FacultySessionAccessList"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

export function FacultyAssessmentCard({
  quiz,
  sessions,
  togglingKey,
  onToggleSession,
  onOpen,
  onPreview,
  onEdit,
  onDelete,
}: {
  quiz: InstructorQuiz
  sessions: InstructorSession[]
  togglingKey: string | null
  onToggleSession: (quizId: number, sessionCode: string, next: boolean) => void
  onOpen: () => void
  onPreview: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const liveSections = countLiveSections(quiz, sessions)
  const windowLabel = formatAssessmentWindow(quiz.available_from, quiz.available_until)
  const thumb = facultyAssessmentThumb(quiz.id)
  const statusColor = quiz.is_active ? FACULTY_ASSESSMENT_COLOR.live : FACULTY_ASSESSMENT_COLOR.closed

  function handleDeletePress() {
    AppAlert.alert(
      "Move to trash?",
      `"${quiz.title}" will be moved to trash and can be restored within 24 hours.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ],
    )
  }

  return (
    <View
      style={[
        styles.card,
        tokens.cardShadow,
        { backgroundColor: native.secondaryGrouped, borderColor: tokens.border },
      ]}
    >
      <Pressable
        style={({ pressed }) => [{ opacity: pressed ? NATIVE.pressedOpacity : 1 }]}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={quiz.title}
      >
        <View style={styles.headRow}>
          <SolidListThumbTile thumb={thumb} icon="clipboard-outline" size="compact" />
          <View style={styles.headCopy}>
            <View style={styles.head}>
              <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={2}>
                {quiz.title}
              </Text>
              <FacultyStatusPill label={quiz.is_active ? "Live" : "Closed"} tone={quiz.is_active ? "live" : "neutral"} />
            </View>
            <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
              {quiz.question_count ?? 0} questions · {quiz.total_attempts ?? 0} attempts · {liveSections}/
              {sessions.length} sections open
            </Text>
            {windowLabel ? (
              <View style={styles.windowRow}>
                <Ionicons name="time-outline" size={14} color={FACULTY_ASSESSMENT_COLOR.window} />
                <Text
                  style={[type.caption, { color: FACULTY_ASSESSMENT_COLOR.window, fontWeight: "600", flex: 1 }]}
                >
                  {windowLabel}
                </Text>
              </View>
            ) : null}
            <View style={styles.statusRow}>
              <Ionicons name="ellipse" size={8} color={statusColor} />
              <Text style={[type.footnote, { color: statusColor, fontWeight: "600" }]}>
                {quiz.is_active ? "Live" : "Closed"}
              </Text>
              <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
                · Tap for details
              </Text>
              <Ionicons name="chevron-forward" size={14} color={native.tertiaryLabel} style={styles.chevron} />
            </View>
          </View>
        </View>
      </Pressable>

      <Text style={[type.caption, styles.sectionLabel, { color: native.secondaryLabel }]}>Section access</Text>
      <FacultySessionAccessList
        sessions={sessions}
        sessionAccess={quiz.session_access}
        quizId={quiz.id}
        togglingKey={togglingKey}
        onToggleSession={onToggleSession}
        compact
      />

      <View style={[styles.actions, { borderTopColor: native.separator }]}>
        <CardAction icon="eye-outline" label="Preview" onPress={onPreview} />
        <CardAction icon="create-outline" label="Edit" onPress={onEdit} />
        <CardAction icon="trash-outline" label="Delete" tone="danger" onPress={handleDeletePress} />
      </View>
    </View>
  )
}

function CardAction({
  icon,
  label,
  tone = "default",
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  tone?: "default" | "danger"
  onPress: () => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const danger = tone === "danger"
  const accent = danger ? FACULTY_ASSESSMENT_COLOR.danger : FACULTY_ASSESSMENT_COLOR.link

  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionBtn,
        {
          backgroundColor: danger ? `${FACULTY_ASSESSMENT_COLOR.danger}14` : native.fill,
          borderColor: danger ? `${FACULTY_ASSESSMENT_COLOR.danger}33` : native.separator,
        },
        pressed && { opacity: 0.85 },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={15} color={accent} />
      <Text style={[type.caption, { fontWeight: "700", color: danger ? accent : native.label }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
    overflow: "hidden",
  },
  headRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  headCopy: { flex: 1, gap: 6, minWidth: 0 },
  head: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  title: { flex: 1, fontSize: 16, lineHeight: 22 },
  windowRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  chevron: { marginLeft: "auto" },
  sectionLabel: { letterSpacing: 0.6, marginTop: 2 },
  actions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
  },
})
