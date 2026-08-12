import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import {
  resolveThemeTokens,
} from "../../constants/app-themes"
import { DEFAULT_APPEARANCE_PREFS } from "../../lib/appearance-preferences"
import { sectionThemeFromTokens, useNativeType, useStudentSectionTheme } from "../../lib/themed-module-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { FacultyAdaptiveSegmentNav } from "../faculty/faculty-module-shell"

export function useCollabTheme() {
  return useStudentSectionTheme("collaboration", "Collaboration")
}

/** @deprecated Use useCollabTheme() — static default does not follow live appearance theme. */
export const COLLAB_THEME = sectionThemeFromTokens(
  resolveThemeTokens(DEFAULT_APPEARANCE_PREFS.themeId, DEFAULT_APPEARANCE_PREFS.appearanceMode, null),
  "collaboration",
  "Collaboration",
)

export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ id: T; label: string; icon?: keyof typeof Ionicons.glyphMap }>
  scrollable?: boolean
  accent?: string
  accentDark?: string
}) {
  return (
    <FacultyAdaptiveSegmentNav
      tabs={options.map((opt) => ({ id: opt.id, label: opt.label, icon: opt.icon }))}
      tab={value}
      onChange={onChange}
      theme="student"
    />
  )
}

export function MemberCapacityBar({ count, max = 4 }: { count: number; max?: number }) {
  const theme = useCollabTheme()
  const native = useThemedNative()
  const type = useNativeType()
  const pct = Math.min(100, Math.round((count / max) * 100))
  return (
    <View style={styles.capacityRow}>
      <View style={[styles.capacityTrack, { backgroundColor: native.fill }]}>
        <View style={[styles.capacityFill, { width: `${pct}%` as `${number}%`, backgroundColor: theme.primary }]} />
      </View>
      <Text style={[type.footnote, styles.capacityText, { color: theme.primaryDark }]}>
        {count}/{max}
      </Text>
    </View>
  )
}

export function AvatarStack({ names, max = 3 }: { names: string[]; max?: number }) {
  const theme = useCollabTheme()
  const native = useThemedNative()
  const visible = names.slice(0, max)
  return (
    <View style={styles.avatarStack}>
      {visible.map((name, index) => (
        <View
          key={`${name}-${index}`}
          style={[
            styles.avatarCircle,
            { marginLeft: index === 0 ? 0 : -10, zIndex: max - index, backgroundColor: theme.primary, borderColor: native.secondaryGrouped },
          ]}
        >
          <Text style={styles.avatarInitial}>{(name.trim()[0] ?? "?").toUpperCase()}</Text>
        </View>
      ))}
      {names.length > max ? (
        <View
          style={[
            styles.avatarCircle,
            styles.avatarMore,
            { marginLeft: -10, backgroundColor: theme.primaryLight, borderColor: native.secondaryGrouped },
          ]}
        >
          <Text style={styles.avatarInitial}>+{names.length - max}</Text>
        </View>
      ) : null}
    </View>
  )
}

export function ApprovalProgressBar({ pct }: { pct: number }) {
  const theme = useCollabTheme()
  const native = useThemedNative()
  const type = useNativeType()
  return (
    <View style={styles.approvalWrap}>
      <View style={[styles.approvalTrack, { backgroundColor: native.fill }]}>
        <View style={[styles.approvalFill, { width: `${pct}%` as `${number}%`, backgroundColor: theme.primary }]} />
      </View>
      <Text style={[type.footnote, styles.approvalLabel]}>{pct}% approved</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  capacityRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  capacityTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  capacityFill: { height: "100%", borderRadius: 999 },
  capacityText: {
    fontWeight: "600",
    minWidth: 28,
  },
  avatarStack: { flexDirection: "row", alignItems: "center" },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarMore: {},
  avatarInitial: { fontSize: 10, fontWeight: "600", color: "#ffffff" },
  approvalWrap: { gap: 6 },
  approvalTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  approvalFill: { height: "100%", borderRadius: 999 },
  approvalLabel: { fontWeight: "600" },
})
