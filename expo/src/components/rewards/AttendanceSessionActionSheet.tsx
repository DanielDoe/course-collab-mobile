import { StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useShellChrome } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import type { StudentAttendanceSessionItem } from "../../lib/rewards-api"
import {
  formatSessionDayLabel,
  formatSessionTimeRange,
  isStructuredSession,
  sessionStatusBadge,
  type StudentCheckInStatus,
} from "../../lib/student-attendance-session-utils"
import { GlassSheetBackground } from "../theme/GlassSurface"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import {
  GlassMenuList,
  GlassMenuRow,
  GlassMenuSectionGap,
  GlassSheetHandle,
} from "../theme/GlassActionSheetMenu"

type Props = {
  visible: boolean
  session: StudentAttendanceSessionItem | null
  onClose: () => void
  onSelfCheckIn: (session: StudentAttendanceSessionItem) => void
  onEnterCode: (session: StudentAttendanceSessionItem) => void
}

export function AttendanceSessionActionSheet({
  visible,
  session,
  onClose,
  onSelfCheckIn,
  onEnterCode,
}: Props) {
  const insets = useSafeAreaInsets()
  const chrome = useShellChrome()
  const type = useNativeType()

  function pick(action: () => void) {
    onClose()
    requestAnimationFrame(action)
  }

  if (!session) return null

  const badge = sessionStatusBadge(session.checkInStatus as StudentCheckInStatus, session.record?.status)
  const structured = isStructuredSession(session)
  const hasRecord = session.record != null
  const timeRange = formatSessionTimeRange(session.startTime, session.endTime)

  return (
    <GlassBottomSheetModal
      visible={visible}
      onClose={onClose}
      scrollable={false}
      accessibilityLabel="Close session actions"
      sheetHostStyle={styles.sheetHost}
    >
      <GlassSheetBackground style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <GlassSheetHandle />
        <Text style={[type.sheetTitle, styles.title, { color: chrome.label }]} numberOfLines={2}>
          {session.classTitle}
        </Text>
        <Text style={[type.caption, styles.subtitle, { color: chrome.secondaryLabel }]}>
          {formatSessionDayLabel(session.startTime)} · {timeRange}
        </Text>
        <Text style={[type.caption, styles.subtitle, { color: chrome.secondaryLabel }]}>
          {badge.label}
          {session.statusMessage ? ` · ${session.statusMessage}` : ""}
        </Text>

        <GlassMenuList>
          {hasRecord ? (
            <GlassMenuRow
              icon={
                String(session.record?.status ?? "present") === "absent"
                  ? "close-circle-outline"
                  : "checkmark-circle-outline"
              }
              label={
                String(session.record?.status ?? "present") === "absent"
                  ? "Marked absent"
                  : "Already checked in"
              }
              detail={String(session.record?.status ?? "present")}
              onPress={onClose}
            />
          ) : structured && session.canCheckIn ? (
            <GlassMenuRow
              icon="calendar-outline"
              label="Check in now"
              detail="Structured self check-in"
              onPress={() => pick(() => onSelfCheckIn(session))}
              showSeparator
            />
          ) : null}
          {!hasRecord && !structured && session.canCheckIn ? (
            <GlassMenuRow
              icon="keypad-outline"
              label="Enter attendance code"
              detail="Code from your instructor's screen"
              onPress={() => pick(() => onEnterCode(session))}
            />
          ) : null}
          {!hasRecord && !session.canCheckIn ? (
            <GlassMenuRow
              icon="information-circle-outline"
              label="Check-in not available"
              detail={session.statusMessage || "Outside the check-in window"}
              onPress={onClose}
            />
          ) : null}
        </GlassMenuList>
        <GlassMenuSectionGap />
      </GlassSheetBackground>
    </GlassBottomSheetModal>
  )
}

const styles = StyleSheet.create({
  sheetHost: { alignSelf: "stretch" },
  sheet: { paddingHorizontal: 16, paddingTop: 4 },
  title: { marginTop: 4, marginBottom: 4 },
  subtitle: { marginBottom: 4, lineHeight: 18 },
})
