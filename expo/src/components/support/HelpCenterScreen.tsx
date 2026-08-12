import { useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { ModuleScreen } from "../modules/ModuleScreen"
import { CollabSearch } from "../collaboration/collab-shared"
import { InfoSectionCard } from "../course-info/course-info-shared"
import { HELP_CENTER_SECTION } from "../../lib/support-color-theme"
import { FaqItem, SupportQuickLink, useSupportTheme } from "./support-shared"
import {
  filterSupportGuides,
  groupSupportGuidesByCategory,
  STUDENT_SUPPORT_GUIDES,
} from "../../constants/support-guides"

const FAQ = STUDENT_SUPPORT_GUIDES

export function HelpCenterScreen() {
  const router = useRouter()
  const theme = useSupportTheme()
  const tokens = useAppThemeTokens()
  const [search, setSearch] = useState("")
  const [openId, setOpenId] = useState<string | null>("login")

  const styles = useMemo(
    () =>
      StyleSheet.create({
        empty: { alignItems: "center", gap: 8, paddingVertical: 24 },
        emptyTitle: { fontSize: 16, fontWeight: "600", color: tokens.text },
        emptyBody: { fontSize: 13, color: tokens.textMuted, textAlign: "center", lineHeight: 19 },
      }),
    [tokens],
  )

  const filtered = useMemo(() => filterSupportGuides(FAQ, search), [search])

  const categories = useMemo(() => groupSupportGuidesByCategory(filtered), [filtered])

  return (
    <ModuleScreen>

      <CollabSearch value={search} onChange={setSearch} placeholder="Search help articles…" />

      <InfoSectionCard
        title="Quick actions"
        icon="flash-outline"
        iconThumb={HELP_CENTER_SECTION.quickActions}
        theme={theme}
      >
        <SupportQuickLink
          icon="send-outline"
          label="Submit a ticket"
          sub="Get help from the CourseCollab team"
          onPress={() => router.push("/module/submit-ticket" as never)}
        />
        <SupportQuickLink
          icon="bug-outline"
          label="Report a bug"
          sub="Something broken? Tell us what happened"
          onPress={() => router.push("/module/report-bug" as never)}
        />
        <SupportQuickLink
          icon="sparkles-outline"
          label="Request a feature"
          sub="Share an idea to improve the app"
          onPress={() => router.push("/module/feature-requests" as never)}
        />
        <SupportQuickLink
          icon="diamond-outline"
          label="View membership plans"
          sub="Compare Scholar, Explorer & Trailblazer"
          onPress={() => router.push("/membership" as never)}
        />
        <SupportQuickLink
          icon="settings-outline"
          label="Account settings"
          sub="Profile, password & notifications"
          onPress={() => router.push("/settings" as never)}
        />
      </InfoSectionCard>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="search-outline" size={32} color={tokens.textMuted} />
          <Text style={styles.emptyTitle}>No articles found</Text>
          <Text style={styles.emptyBody}>Try a different search or submit a support ticket.</Text>
        </View>
      ) : (
        categories.map((category) => (
          <InfoSectionCard
            key={category}
            title={category}
            icon="book-outline"
            iconThumb={HELP_CENTER_SECTION.faq}
            theme={theme}
          >
            {filtered
              .filter((item) => item.category === category)
              .map((item) => (
                <FaqItem
                  key={item.id}
                  question={item.q}
                  answer={item.a}
                  open={openId === item.id}
                  onToggle={() => setOpenId(openId === item.id ? null : item.id)}
                />
              ))}
          </InfoSectionCard>
        ))
      )}
    </ModuleScreen>
  )
}
