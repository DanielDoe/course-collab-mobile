import { useMemo, useState } from "react"
import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import type { SupportTicket } from "../../lib/support-tickets"
import {
  formatSupportTicketWhen,
  supportTicketStatusLabel,
  supportTicketStatusTone,
} from "../../lib/support-tickets"
import { semanticSoft, useNativeType } from "../../lib/themed-module-theme"
import { FacultyEmptyState } from "../faculty/faculty-shared"
import { MobbinPillSegmentControl } from "../theme/MobbinPillSegmentControl"
import type { IoniconName } from "@/components/icons/AppIcon"

type Props = {
  tickets: SupportTicket[]
  emptyTitle?: string
  emptyBody?: string
}

export function SupportTicketHistoryPanel({
  tickets,
  emptyTitle = "No submissions yet",
  emptyBody = "Reports you send appear here with live status from admin system logs.",
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null)
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  const styles = useMemo(
    () =>
      StyleSheet.create({
        list: {
          borderRadius: NATIVE.sectionRadius,
          overflow: "hidden",
          backgroundColor: native.secondaryGrouped,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
        },
        row: {
          paddingHorizontal: 14,
          paddingVertical: 12,
          gap: 8,
          backgroundColor: native.secondaryGrouped,
        },
        rowBorder: {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: native.separator,
        },
        head: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
        copy: { flex: 1, gap: 4 },
        subject: { ...type.bodyEmphasis, color: native.label, lineHeight: 21 },
        meta: { ...type.caption, color: native.secondaryLabel },
        badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
        pill: {
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 999,
          borderWidth: StyleSheet.hairlineWidth,
        },
        pillText: { ...type.caption, fontWeight: "700", fontSize: 11 },
        body: { ...type.secondary, color: native.label, lineHeight: 20, paddingTop: 4 },
        chevron: { marginTop: 4 },
      }),
    [native, type],
  )

  function pillColors(tone: ReturnType<typeof supportTicketStatusTone>) {
    const accent = tokens.accent ?? tokens.native.tint
    const success = tokens.success ?? "#34C759"
    const warning = tokens.warning ?? "#FF9F0A"

    switch (tone) {
      case "resolved":
        return {
          bg: semanticSoft(success, tokens.isDark, 0.16),
          border: semanticSoft(success, tokens.isDark, 0.35),
          text: success,
        }
      case "progress":
        return {
          bg: semanticSoft(warning, tokens.isDark, 0.16),
          border: semanticSoft(warning, tokens.isDark, 0.35),
          text: warning,
        }
      case "open":
        return {
          bg: semanticSoft(accent, tokens.isDark, 0.16),
          border: semanticSoft(accent, tokens.isDark, 0.35),
          text: accent,
        }
      default:
        return {
          bg: native.fill,
          border: native.separator,
          text: native.secondaryLabel,
        }
    }
  }

  if (tickets.length === 0) {
    return <FacultyEmptyState icon="time-outline" title={emptyTitle} body={emptyBody} />
  }

  return (
    <View style={styles.list}>
      {tickets.map((ticket, index) => {
        const open = openId === ticket.id
        const statusTone = supportTicketStatusTone(String(ticket.status))
        const statusColors = pillColors(statusTone)
        const isLast = index === tickets.length - 1

        return (
          <Pressable
            key={ticket.id}
            onPress={() => setOpenId(open ? null : ticket.id)}
            style={({ pressed }) => [styles.row, !isLast && styles.rowBorder, pressed && { opacity: NATIVE.pressedOpacity }]}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
          >
            <View style={styles.head}>
              <View style={styles.copy}>
                <Text style={styles.subject} numberOfLines={open ? undefined : 2}>
                  {ticket.subject}
                </Text>
                <Text style={styles.meta}>
                  {formatSupportTicketWhen(ticket.createdAt)}
                  {ticket.moduleLabel ? ` · ${ticket.moduleLabel}` : ""}
                </Text>
                <View style={styles.badges}>
                  <View style={[styles.pill, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
                    <Text style={[styles.pillText, { color: statusColors.text }]}>
                      {supportTicketStatusLabel(String(ticket.status))}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons
                name={open ? "chevron-up" : "chevron-down"}
                size={18}
                color={native.tertiaryLabel}
                style={styles.chevron}
              />
            </View>
            {open ? <Text style={styles.body}>{ticket.description}</Text> : null}
          </Pressable>
        )
      })}
    </View>
  )
}

type TabProps<T extends string> = {
  tabs: Array<{ id: T; label: string; icon?: IoniconName }>
  tab: T
  onChange: (tab: T) => void
}

/** Student-style pill tabs — lavender track + gliding white selection pill. */
export function SupportTabBar<T extends string>({ tabs, tab, onChange }: TabProps<T>) {
  const options = tabs.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
  }))

  return (
    <MobbinPillSegmentControl
      options={options}
      value={tab}
      onChange={onChange}
      scrollable={false}
    />
  )
}
