import { useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { summerCampApi } from "../../lib/summer-camp-api"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultyEmptyState } from "../faculty/faculty-shared"
import {
  ModuleScreen,
  ModuleSection,
  ModuleSectionHeader,
  SummerSearchResultsBar,
  SummerSearchToolbar,
  matchesSummerSearch,
} from "./summer-module-shell"
import { SummerLeaderboardListCard } from "./SummerLeaderboardListCard"
import { SummerLeaderboardPodium } from "./SummerLeaderboardPodium"
import { useSummerLoader } from "./summer-module-hooks"

export function SummerLeaderboardScreen() {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const { data, loading, refreshing, error, refresh } = useSummerLoader(summerCampApi.getLeaderboard)
  const [search, setSearch] = useState("")

  const allEntries = data?.leaderboard ?? []
  const searchActive = search.trim().length > 0

  const filtered = useMemo(
    () =>
      allEntries.filter((entry) =>
        matchesSummerSearch(search, entry.full_name, String(entry.total_xp), String(entry.rank)),
      ),
    [allEntries, search],
  )

  const podiumEntries = useMemo(() => {
    if (searchActive) return []
    return allEntries.slice(0, 3)
  }, [allEntries, searchActive])

  const listEntries = useMemo(() => {
    if (searchActive) return filtered
    return allEntries.slice(3)
  }, [allEntries, filtered, searchActive])

  const currentUser = data?.current_user
  const queryActive = searchActive

  return (
    <ModuleScreen loading={loading} refreshing={refreshing} onRefresh={() => void refresh()} error={error}>
      <SummerSearchToolbar value={search} onChange={setSearch} placeholder="Search campers…" showFilter={false} />

      <SummerSearchResultsBar
        visible={queryActive && allEntries.length > 0}
        shown={filtered.length}
        total={allEntries.length}
        query={search}
        onClear={() => setSearch("")}
      />

      {!allEntries.length ? (
        <FacultyEmptyState
          icon="podium-outline"
          title="Leaderboard empty"
          body="Complete modules to earn XP and climb the ranks."
        />
      ) : filtered.length === 0 ? (
        <FacultyEmptyState icon="search-outline" title="No matches" body="Try a different search term." />
      ) : (
        <>
          {!searchActive && currentUser ? (
            <View style={[styles.statsCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
              <View style={[styles.statsIcon, { backgroundColor: tokens.accentSoft }]}>
                <Ionicons name="flash-outline" size={18} color={tokens.accent} />
              </View>
              <View style={styles.statsCopy}>
                <Text style={[type.bodyEmphasis, { color: native.label }]}>Your standing</Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>
                  Rank #{currentUser.rank} · {currentUser.total_xp.toLocaleString()} XP
                  {currentUser.modules_completed != null ? ` · ${currentUser.modules_completed} modules` : ""}
                  {currentUser.badges_earned != null ? ` · ${currentUser.badges_earned} badges` : ""}
                </Text>
              </View>
            </View>
          ) : null}

          {!searchActive && podiumEntries.length ? <SummerLeaderboardPodium entries={podiumEntries} /> : null}

          {listEntries.length ? (
            <ModuleSection>
              {!searchActive ? (
                <ModuleSectionHeader title={`All campers · ${allEntries.length} ranked`} />
              ) : null}
              {listEntries.map((entry, index, arr) => (
                <SummerLeaderboardListCard
                  key={`${entry.rank}-${entry.student_id}`}
                  entry={entry}
                  last={index === arr.length - 1}
                />
              ))}
            </ModuleSection>
          ) : null}
        </>
      )}
    </ModuleScreen>
  )
}

const styles = StyleSheet.create({
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 14,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statsIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statsCopy: { flex: 1, gap: 2 },
})
