import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { PlaygroundSession } from "../../lib/instructor-api"
import { formatFacultyRelativeTime } from "../../lib/instructor-api"
import {
  playgroundPhaseIcon,
  playgroundSessionHasBeenUsed,
  playgroundSessionHasLeaderboard,
  playgroundSessionLabel,
  playgroundSessionPhase,
  playgroundSessionStatusLabel,
} from "../../lib/faculty-playground-utils"
import {
  FACULTY_PLAYGROUND_COLOR,
  facultyPlaygroundPhaseColor,
  facultyPlaygroundSessionThumb,
  formatPlaygroundPasscode,
} from "../../lib/faculty-playground-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FacultySignatureListCard } from "./FacultyCollabListCards"

export function FacultyPlaygroundSessionCard({
  session,
  onPress,
}: {
  session: PlaygroundSession
  onPress: () => void
}) {
  const { native, type } = useModuleTheme()

  const phase = playgroundSessionPhase(session)
  const label = playgroundSessionLabel(session)
  const questionCount = session.question_count_actual ?? session.question_count ?? 0
  const hasBeenUsed = playgroundSessionHasBeenUsed(session)
  const hasLeaderboard = playgroundSessionHasLeaderboard(session)
  const phaseColor = facultyPlaygroundPhaseColor(phase)
  const thumb = facultyPlaygroundSessionThumb(String(session.id))

  return (
    <FacultySignatureListCard
      thumb={thumb}
      icon={playgroundPhaseIcon(phase)}
      title={label}
      description={session.session_code}
      metaLine={`${session.participant_count ?? 0} joined · ${questionCount} questions · ${session.duration_sec ?? 10}s timer${
        hasLeaderboard ? " · Scores available" : ""
      }`}
      status={{
        label: playgroundSessionStatusLabel(session),
        color: phaseColor,
        icon: playgroundPhaseIcon(phase),
      }}
      onPress={onPress}
      footer={
        <View style={styles.footer}>
          {phase !== "ended" && session.join_passcode ? (
            <View style={[styles.passcodeRow, { backgroundColor: `${FACULTY_PLAYGROUND_COLOR.passcode}12` }]}>
              <Ionicons name="key-outline" size={14} color={FACULTY_PLAYGROUND_COLOR.passcode} />
              <Text style={[type.caption, styles.passcodeLabel, { color: native.secondaryLabel }]}>Passcode</Text>
              <Text
                style={[type.bodyEmphasis, styles.passcodeValue, { color: FACULTY_PLAYGROUND_COLOR.passcode }]}
                numberOfLines={1}
              >
                {formatPlaygroundPasscode(session.join_passcode)}
              </Text>
            </View>
          ) : null}
          <View style={styles.footerMeta}>
            {session.created_at ? (
              <Text style={[type.caption, { color: native.tertiaryLabel, fontWeight: "600" }]}>
                {formatFacultyRelativeTime(session.created_at)}
              </Text>
            ) : (
              <View />
            )}
            {hasBeenUsed ? (
              <View style={[styles.usedBadge, { backgroundColor: native.fill }]}>
                <Ionicons name="time-outline" size={11} color={native.secondaryLabel} />
                <Text style={[type.caption, styles.usedBadgeText, { color: native.secondaryLabel }]}>Used before</Text>
              </View>
            ) : null}
            {hasLeaderboard ? (
              <View style={styles.leaderboardHint}>
                <Ionicons name="podium-outline" size={13} color={FACULTY_PLAYGROUND_COLOR.leaderboard} />
                <Text style={[type.caption, styles.leaderboardHintText, { color: FACULTY_PLAYGROUND_COLOR.leaderboard }]}>
                  Leaderboard
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      }
    />
  )
}

const styles = StyleSheet.create({
  footer: { gap: 10, paddingHorizontal: 12, paddingBottom: 12 },
  passcodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  passcodeLabel: { fontWeight: "700" },
  passcodeValue: {
    flex: 1,
    textAlign: "right",
    letterSpacing: 3,
    lineHeight: 22,
    fontSize: 15,
  },
  footerMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  usedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  usedBadgeText: { fontSize: 10, fontWeight: "700" },
  leaderboardHint: { flexDirection: "row", alignItems: "center", gap: 4 },
  leaderboardHintText: { fontWeight: "700" },
})
