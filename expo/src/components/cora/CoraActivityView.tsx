import { useCallback, useEffect, useState } from "react"
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { NATIVE } from "../../constants/faculty-native-theme"
import {
  activityToolLabel,
  loadCoraActivity,
} from "../../lib/cora/activity-store"
import type { CoraActivityEntry } from "../../lib/cora/types"

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
}

/** Optional Activity view — CourseCollab actions performed by Cora (not chat history). */
export function CoraActivityView() {
  const tokens = useAppThemeTokens()
  const router = useRouter()
  const [entries, setEntries] = useState<CoraActivityEntry[]>([])

  const refresh = useCallback(() => {
    void loadCoraActivity().then(setEntries)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const sections = entries.reduce<{ title: string; data: CoraActivityEntry[] }[]>((acc, entry) => {
    const title = dayLabel(entry.createdAt)
    const existing = acc.find((s) => s.title === title)
    if (existing) existing.data.push(entry)
    else acc.push({ title, data: [entry] })
    return acc
  }, [])

  if (!entries.length) {
    return (
      <View style={styles.empty}>
        <Ionicons name="sparkles-outline" size={28} color={tokens.native.secondaryLabel} />
        <Text style={[styles.emptyTitle, { color: tokens.native.label }]}>No Cora activity yet</Text>
        <Text style={[styles.emptyBody, { color: tokens.native.secondaryLabel }]}>
          When Cora publishes announcements, creates questions, or saves notes and flashcards, they
          appear here.
        </Text>
      </View>
    )
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderSectionHeader={({ section }) => (
        <Text style={[styles.section, { color: tokens.native.secondaryLabel }]}>{section.title}</Text>
      )}
      renderItem={({ item }) => (
        <Pressable
          style={[
            styles.row,
            {
              backgroundColor: tokens.isDark ? NATIVE.secondaryGrouped : "#FFFFFF",
              borderColor: tokens.native.separator,
            },
          ]}
          onPress={() => {
            if (item.route) router.push(item.route as never)
          }}
          disabled={!item.route}
        >
          <View style={[styles.icon, { backgroundColor: "rgba(52, 199, 89, 0.14)" }]}>
            <Ionicons name="checkmark" size={16} color="#34C759" />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: tokens.native.label }]}>
              {activityToolLabel(item.tool)}
            </Text>
            <Text style={[styles.rowSub, { color: tokens.native.secondaryLabel }]} numberOfLines={2}>
              {item.entityTitle || item.message}
            </Text>
          </View>
        </Pressable>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 8,
  },
  section: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  emptyBody: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
})
