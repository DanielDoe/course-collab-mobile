import { useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { summerCampApi, type SummerBadge } from "../../lib/summer-camp-api"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultyEmptyState, FacultyStatusPill } from "../faculty/faculty-shared"
import {
  ModuleScreen,
  ModuleSection,
  SummerFilterSheet,
  SummerSearchResultsBar,
  SummerSearchToolbar,
  matchesSummerSearch,
} from "./summer-module-shell"
import { SummerAchievementActionSheet } from "./SummerAchievementActionSheet"
import { SummerBadgeListCard } from "./SummerBadgeListCard"
import { useSummerLoader } from "./summer-module-hooks"

type BadgeFilter = "all" | "earned" | "locked"

const FILTER_OPTIONS = [
  { value: "all", label: "All badges" },
  { value: "earned", label: "Earned" },
  { value: "locked", label: "In progress" },
] as const

export function SummerAchievementsScreen() {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const { data, loading, refreshing, error, refresh } = useSummerLoader(summerCampApi.getAchievements)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<BadgeFilter>("all")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [selection, setSelection] = useState<SummerBadge | null>(null)

  const allBadges = data?.badges ?? []
  const earnedCount = allBadges.filter((badge) => badge.earned).length
  const lockedCount = allBadges.length - earnedCount
  const filtersActive = filter !== "all"
  const queryActive = search.trim().length > 0 || filtersActive

  const badges = useMemo(() => {
    return allBadges.filter((badge) => {
      if (filter === "earned" && !badge.earned) return false
      if (filter === "locked" && badge.earned) return false
      return matchesSummerSearch(search, badge.title, badge.description, badge.emoji, badge.id)
    })
  }, [allBadges, filter, search])

  return (
    <ModuleScreen loading={loading} refreshing={refreshing} onRefresh={() => void refresh()} error={error}>
      <SummerSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search badges…"
        filterActive={filtersActive}
        onOpenFilter={() => setFilterSheetOpen(true)}
      />

      <SummerFilterSheet
        visible={filterSheetOpen}
        title="Achievement status"
        subtitle="Filter badges by progress."
        options={[...FILTER_OPTIONS]}
        value={filter}
        onSelect={(value) => {
          setFilter(value as BadgeFilter)
          setFilterSheetOpen(false)
        }}
        onClose={() => setFilterSheetOpen(false)}
      />

      <SummerSearchResultsBar
        visible={queryActive && allBadges.length > 0}
        shown={badges.length}
        total={allBadges.length}
        query={search}
        onClear={() => {
          setSearch("")
          setFilter("all")
        }}
      />

      {!allBadges.length ? (
        <FacultyEmptyState
          icon="medal-outline"
          title="No achievements yet"
          body="Complete modules and participate to earn badges."
        />
      ) : badges.length === 0 ? (
        <FacultyEmptyState icon="search-outline" title="No matches" body="Try a different search or filter." />
      ) : (
        <>
          {!queryActive ? (
            <ModuleSection title="Your progress">
              <View style={styles.summaryRow}>
                <View style={[styles.summaryIcon, { backgroundColor: `${tokens.success}18` }]}>
                  <Ionicons name="ribbon-outline" size={18} color={tokens.success} />
                </View>
                <View style={styles.summaryCopy}>
                  <Text style={[type.bodyEmphasis, { color: native.label }]}>Badges earned</Text>
                  <Text style={[type.caption, { color: native.secondaryLabel }]}>
                    {earnedCount} of {allBadges.length} camp achievements unlocked
                  </Text>
                </View>
                <FacultyStatusPill label={`${earnedCount}/${allBadges.length}`} tone="success" />
              </View>
              <View style={[styles.summaryRow, styles.summaryRowBorder, { borderTopColor: native.separator }]}>
                <View style={[styles.summaryIcon, { backgroundColor: native.fill }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={native.tertiaryLabel} />
                </View>
                <View style={styles.summaryCopy}>
                  <Text style={[type.bodyEmphasis, { color: native.label }]}>Still in progress</Text>
                  <Text style={[type.caption, { color: native.secondaryLabel }]}>
                    {lockedCount} badge{lockedCount === 1 ? "" : "s"} left to unlock
                  </Text>
                </View>
                <FacultyStatusPill label={String(lockedCount)} tone="neutral" />
              </View>
            </ModuleSection>
          ) : null}

          <ModuleSection title="Certificates & achievements">
            {badges.map((badge, index) => (
              <SummerBadgeListCard
                key={badge.id}
                badge={badge}
                last={index === badges.length - 1}
                lockedLabel="In progress"
                onPress={() => setSelection(badge)}
              />
            ))}
          </ModuleSection>
        </>
      )}

      <SummerAchievementActionSheet
        visible={selection != null}
        badge={selection}
        earnedCount={earnedCount}
        totalCount={allBadges.length}
        onClose={() => setSelection(null)}
      />
    </ModuleScreen>
  )
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summaryRowBorder: { borderTopWidth: StyleSheet.hairlineWidth },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  summaryCopy: { flex: 1, minWidth: 0, gap: 2 },
})
