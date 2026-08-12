import { useCallback, useMemo, useState } from "react"
import { Text, View } from "react-native"
import {
  summerCampApi,
  type SummerGalleryAward,
  type SummerGalleryEntry,
  type SummerGalleryLeaderboardEntry,
  type SummerGalleryTab,
} from "../../lib/summer-camp-api"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultyEmptyState } from "../faculty/faculty-shared"
import {
  ModuleScreen,
  ModuleSection,
  ModuleSectionHeader,
  SummerSearchResultsBar,
  SummerSearchToolbar,
  SummerSegmentNav,
  matchesSummerSearch,
} from "./summer-module-shell"
import { SummerGalleryActionSheet } from "./SummerGalleryActionSheet"
import { SummerGalleryAwardCard, SummerGalleryLeaderboardCard } from "./SummerGalleryAwardCard"
import { SummerGalleryListCard } from "./SummerGalleryListCard"
import { useSummerLoader } from "./summer-module-hooks"

const TAB_OPTIONS = [
  { id: "projects" as const, label: "Showcase", icon: "images-outline" as const },
  { id: "awards" as const, label: "Awards", icon: "ribbon-outline" as const },
  { id: "peoples_choice" as const, label: "People's Choice", icon: "heart-outline" as const },
]

type GallerySelection =
  | { kind: "project"; item: SummerGalleryEntry }
  | { kind: "award"; item: SummerGalleryAward }
  | { kind: "leaderboard"; item: SummerGalleryLeaderboardEntry }

function emptyCopy(tab: SummerGalleryTab): {
  title: string
  body: string
  icon: "images-outline" | "ribbon-outline" | "heart-outline"
} {
  switch (tab) {
    case "awards":
      return {
        icon: "ribbon-outline",
        title: "No awards yet",
        body: "Faculty-selected camp awards will appear here after the showcase.",
      }
    case "peoples_choice":
      return {
        icon: "heart-outline",
        title: "No votes yet",
        body: "People's Choice rankings appear once campers start voting on showcase projects.",
      }
    default:
      return {
        icon: "images-outline",
        title: "Gallery is empty",
        body: "Submitted projects will appear in the camp gallery after faculty publishes the showcase.",
      }
  }
}

export function SummerGalleryScreen() {
  const native = useThemedNative()
  const type = useNativeType()
  const [tab, setTab] = useState<SummerGalleryTab>("projects")
  const [search, setSearch] = useState("")
  const [selection, setSelection] = useState<GallerySelection | null>(null)

  const fetchGallery = useCallback((studentId: string) => summerCampApi.getGallery(studentId), [])
  const { data, loading, refreshing, error, refresh } = useSummerLoader(fetchGallery)

  const entries = useMemo(
    () =>
      (data?.entries ?? []).filter((entry) =>
        matchesSummerSearch(search, entry.title, entry.student_name, entry.description, entry.training_title),
      ),
    [data?.entries, search],
  )

  const awards = useMemo(
    () =>
      (data?.awards ?? []).filter((award) =>
        matchesSummerSearch(
          search,
          award.title,
          award.student_name,
          award.description,
          award.award_label,
          award.project_title,
        ),
      ),
    [data?.awards, search],
  )

  const leaderboard = useMemo(
    () =>
      (data?.peoples_choice_leaderboard ?? []).filter((entry) =>
        matchesSummerSearch(search, entry.student_name, entry.project_title, String(entry.votes ?? "")),
      ),
    [data?.peoples_choice_leaderboard, search],
  )

  const activeItems = tab === "awards" ? awards : tab === "peoples_choice" ? leaderboard : entries
  const totalItems =
    tab === "awards"
      ? (data?.awards.length ?? 0)
      : tab === "peoples_choice"
        ? (data?.peoples_choice_leaderboard.length ?? 0)
        : (data?.entries.length ?? 0)
  const queryActive = search.trim().length > 0
  const empty = emptyCopy(tab)
  const awardTypes = Object.entries(data?.award_types ?? {})

  return (
    <ModuleScreen loading={loading} refreshing={refreshing} onRefresh={() => void refresh()} error={error}>
      <SummerSegmentNav tabs={TAB_OPTIONS} tab={tab} onChange={setTab} theme="student" />

      <SummerSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder={
          tab === "awards"
            ? "Search awards…"
            : tab === "peoples_choice"
              ? "Search vote leaders…"
              : "Search gallery projects…"
        }
        showFilter={false}
      />

      <SummerSearchResultsBar
        visible={queryActive && totalItems > 0}
        shown={activeItems.length}
        total={totalItems}
        query={search}
        onClear={() => setSearch("")}
      />

      {awardTypes.length > 0 && tab === "awards" ? (
        <View style={{ gap: 8 }}>
          <ModuleSectionHeader title="Award categories" />
          <ModuleSection>
            {awardTypes.map(([key, label], index) => (
              <View
                key={key}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderBottomWidth: index === awardTypes.length - 1 ? 0 : 0.5,
                  borderBottomColor: native.separator,
                }}
              >
                <Text style={[type.caption, { color: native.secondaryLabel }]}>{label}</Text>
              </View>
            ))}
          </ModuleSection>
        </View>
      ) : null}

      {totalItems === 0 ? (
        <FacultyEmptyState icon={empty.icon} title={empty.title} body={empty.body} />
      ) : activeItems.length === 0 ? (
        <FacultyEmptyState icon="search-outline" title="No matches" body="Try a different search term." />
      ) : tab === "projects" ? (
        <ModuleSection title="Showcase projects">
          {entries.map((entry, index) => (
            <SummerGalleryListCard
              key={entry.id}
              entry={entry}
              last={index === entries.length - 1}
              onPress={() => setSelection({ kind: "project", item: entry })}
            />
          ))}
        </ModuleSection>
      ) : tab === "awards" ? (
        <ModuleSection title="Camp awards">
          {awards.map((award, index) => (
            <SummerGalleryAwardCard
              key={award.id}
              award={award}
              last={index === awards.length - 1}
              onPress={() => setSelection({ kind: "award", item: award })}
            />
          ))}
        </ModuleSection>
      ) : (
        <ModuleSection title="People's Choice">
          {leaderboard.map((entry, index) => (
            <SummerGalleryLeaderboardCard
              key={`${entry.rank}-${entry.student_name}`}
              entry={entry}
              last={index === leaderboard.length - 1}
              onPress={() => setSelection({ kind: "leaderboard", item: entry })}
            />
          ))}
        </ModuleSection>
      )}

      <SummerGalleryActionSheet
        visible={selection != null}
        selection={selection}
        onClose={() => setSelection(null)}
      />
    </ModuleScreen>
  )
}
