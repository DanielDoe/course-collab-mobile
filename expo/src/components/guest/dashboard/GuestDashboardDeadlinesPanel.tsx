import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { formatListDate } from "../../../lib/course-info-api"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType, semanticSoft } from "../../../lib/themed-module-theme"
import type { GuestDeadlineItem } from "../../../lib/guest-dashboard-utils"

type Props = {
  items: GuestDeadlineItem[]
}

function urgencyColor(days: number, tokens: ReturnType<typeof useAppThemeTokens>): string {
  if (days <= 3) return tokens.danger
  if (days <= 7) return tokens.warning
  return tokens.accent
}

export function GuestDashboardDeadlinesPanel({ items }: Props) {
  const router = useRouter()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  if (items.length === 0) return null

  return (
    <View style={styles.list}>
      {items.map((item, index) => {
        const color = urgencyColor(item.daysRemaining, tokens)
        const urgencyLabel =
          item.daysRemaining <= 0
            ? "Due today"
            : item.daysRemaining === 1
              ? "Due tomorrow"
              : `${item.daysRemaining} days left`

        return (
          <Pressable
            key={item.id}
            style={[
              styles.row,
              { backgroundColor: native.fill },
              index < items.length - 1 && {
                borderBottomColor: native.separator,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
            onPress={() => router.push(`/recommendation/${item.id}` as never)}
          >
            <View style={[styles.dateBadge, { backgroundColor: semanticSoft(color, tokens.isDark, 0.14) }]}>
              <Text style={[type.footnote, { color, fontWeight: "800" }]}>{urgencyLabel}</Text>
            </View>
            <View style={styles.copy}>
              <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
                {formatListDate(item.deadline)}
                {item.instructorName ? ` · ${item.instructorName}` : ""}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { borderRadius: 12, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 58,
  },
  dateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 72,
    alignItems: "center",
  },
  copy: { flex: 1, gap: 2 },
})
