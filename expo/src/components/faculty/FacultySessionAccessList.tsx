import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { InstructorSession } from "../../lib/instructor-api"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { NativeSwitch } from "../NativeSwitch"

type Props = {
  sessions: InstructorSession[]
  sessionAccess: Record<string, boolean> | undefined
  quizId: number
  togglingKey: string | null
  onToggleSession: (quizId: number, sessionCode: string, next: boolean) => void
  compact?: boolean
}

export function FacultySessionAccessList({
  sessions,
  sessionAccess,
  quizId,
  togglingKey,
  onToggleSession,
  compact = false,
}: Props) {
  const { native, tokens, type } = useModuleTheme()
  const busy = togglingKey?.startsWith(`${quizId}:`) ?? false
  const duplicateCodes = new Set(
    sessions.filter((s, i, arr) => arr.findIndex((x) => x.code === s.code) !== i).map((s) => s.code),
  )

  function sessionLabel(session: InstructorSession): string {
    if (duplicateCodes.has(session.code) && session.description && session.description !== session.code) {
      return `${session.code} · ${session.description}`
    }
    return session.code
  }

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.group,
          compact && styles.groupCompact,
          { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
        ]}
      >
        {sessions.map((session, index) => {
          const active = Boolean(sessionAccess?.[session.code])
          const key = `${quizId}:${session.code}`
          const isLast = index === sessions.length - 1
          const rowBusy = togglingKey === key

          return (
            <View
              key={session.id}
              style={[
                styles.row,
                { backgroundColor: native.secondaryGrouped },
                !isLast && { borderBottomColor: native.separator, borderBottomWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <Pressable
                style={({ pressed }) => [styles.rowCopy, pressed && { opacity: 0.88 }]}
                onPress={() => {
                  if (rowBusy) return
                  onToggleSession(quizId, session.code, !active)
                }}
                accessibilityRole="switch"
                accessibilityState={{ checked: active, disabled: rowBusy }}
                accessibilityLabel={`${sessionLabel(session)}, ${active ? "open" : "closed"}`}
              >
                <Text style={[type.bodyEmphasis, { color: native.label, fontSize: 16, letterSpacing: -0.2 }]}>
                  {sessionLabel(session)}
                </Text>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: active ? tokens.success : native.tertiaryLabel },
                    ]}
                  />
                  <Text style={[type.caption, { color: active ? native.label : native.secondaryLabel, fontWeight: "500" }]}>
                    {active ? "Open to students" : "Closed"}
                  </Text>
                </View>
              </Pressable>
              {rowBusy ? (
                <ActivityIndicator size="small" color={native.secondaryLabel} />
              ) : (
                <NativeSwitch value={active} onValueChange={(next) => onToggleSession(quizId, session.code, next)} />
              )}
            </View>
          )
        })}
      </View>
      {busy ? (
        <View style={styles.busyRow}>
          <ActivityIndicator size="small" color={native.secondaryLabel} />
          <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>Updating access…</Text>
        </View>
      ) : null}
      {!compact ? (
        <View style={styles.footerHint}>
          <Ionicons name="information-circle-outline" size={14} color={native.tertiaryLabel} />
          <Text style={[type.caption, { color: native.tertiaryLabel, flex: 1, lineHeight: 17 }]}>
            Tap a row or use the switch to open or close a section.
          </Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  group: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  groupCompact: { borderRadius: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 11 : 10,
  },
  rowCopy: { flex: 1, gap: 4, paddingVertical: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  busyRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 },
  footerHint: { flexDirection: "row", alignItems: "flex-start", gap: 6, paddingHorizontal: 2 },
})
