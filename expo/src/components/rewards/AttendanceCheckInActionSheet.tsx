import { StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useShellChrome } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import type { StudentAttendanceSessionItem } from "../../lib/rewards-api"
import { isStructuredSession } from "../../lib/student-attendance-session-utils"
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
  onClose: () => void
  openSession: StudentAttendanceSessionItem | null
  onSelfCheckIn: (session: StudentAttendanceSessionItem) => void
  onEnterCode: (session: StudentAttendanceSessionItem) => void
  onManualCode: () => void
  onBrowseSessions: () => void
}

export function AttendanceCheckInActionSheet({
  visible,
  onClose,
  openSession,
  onSelfCheckIn,
  onEnterCode,
  onManualCode,
  onBrowseSessions,
}: Props) {
  const insets = useSafeAreaInsets()
  const chrome = useShellChrome()
  const type = useNativeType()

  function pick(action: () => void) {
    onClose()
    requestAnimationFrame(action)
  }

  const structuredOpen = openSession && isStructuredSession(openSession) && openSession.canCheckIn
  const codeOpen = openSession && !isStructuredSession(openSession) && openSession.canCheckIn

  return (
    <GlassBottomSheetModal
      visible={visible}
      onClose={onClose}
      scrollable={false}
      accessibilityLabel="Close check-in actions"
      sheetHostStyle={styles.sheetHost}
    >
      <GlassSheetBackground style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <GlassSheetHandle />
        <Text style={[type.sheetTitle, styles.title, { color: chrome.label }]}>Check in</Text>
        <Text style={[type.caption, styles.subtitle, { color: chrome.secondaryLabel }]}>
          Choose how you want to mark attendance.
        </Text>

        <GlassMenuList>
          {structuredOpen && openSession ? (
            <GlassMenuRow
              icon="calendar-outline"
              label="Check in to open session"
              detail={openSession.classTitle}
              onPress={() => pick(() => onSelfCheckIn(openSession))}
              showSeparator
            />
          ) : null}
          {codeOpen && openSession ? (
            <GlassMenuRow
              icon="keypad-outline"
              label="Enter code for open session"
              detail={openSession.classTitle}
              onPress={() => pick(() => onEnterCode(openSession))}
              showSeparator
            />
          ) : null}
          <GlassMenuRow
            icon="list-outline"
            label="Browse class sessions"
            detail="View schedule and pick a session"
            onPress={() => pick(onBrowseSessions)}
            showSeparator
          />
          <GlassMenuRow
            icon="create-outline"
            label="Enter code manually"
            detail="Session ID and attendance code"
            onPress={() => pick(onManualCode)}
          />
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
  subtitle: { marginBottom: 8, lineHeight: 18 },
})
