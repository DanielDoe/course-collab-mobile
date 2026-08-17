import { useMemo, useState } from "react"
import { Linking, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import {
  summerCampApi,
  type SummerBadge,
  type SummerGraduationRequirement,
  type SummerGraduationTraining,
} from "../../lib/summer-camp-api"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultyEmptyState, FacultyStatusPill } from "../faculty/faculty-shared"
import {
  ModuleScreen,
  ModuleSection,
  ModuleSectionHeader,
  SummerFilterSheet,
  SummerSearchResultsBar,
  SummerSearchToolbar,
  SummerSegmentNav,
  matchesSummerSearch,
} from "./summer-module-shell"
import { SummerBadgeListCard } from "./SummerBadgeListCard"
import { SummerGraduationActionSheet } from "./SummerGraduationActionSheet"
import { SummerGraduationRequirementCard } from "./SummerGraduationRequirementCard"
import { useSummerLoader, useSummerStudentId } from "./summer-module-hooks"

type GraduationTab = "progress" | "badges"
type BadgeFilter = "all" | "earned" | "locked"

type Selection =
  | { kind: "badge"; item: SummerBadge }
  | { kind: "requirement"; item: SummerGraduationRequirement; training: SummerGraduationTraining }

const TAB_OPTIONS = [
  { id: "progress" as const, label: "Progress", icon: "school-outline" as const },
  { id: "badges" as const, label: "Badges", icon: "ribbon-outline" as const },
]

const FILTER_OPTIONS = [
  { value: "all", label: "All badges" },
  { value: "earned", label: "Earned" },
  { value: "locked", label: "Locked" },
] as const

export function SummerGraduationScreen() {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const { data, loading, refreshing, error, refresh } = useSummerLoader(summerCampApi.getGraduation)
  const studentId = useSummerStudentId()
  const [tab, setTab] = useState<GraduationTab>("progress")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<BadgeFilter>("all")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [selection, setSelection] = useState<Selection | null>(null)

  const training = data?.trainings[0]
  const badges = useMemo(() => {
    return (data?.badges ?? []).filter((badge) => {
      if (filter === "earned" && !badge.earned) return false
      if (filter === "locked" && badge.earned) return false
      return matchesSummerSearch(search, badge.title, badge.description, badge.emoji, badge.id)
    })
  }, [data?.badges, filter, search])

  const requirements = useMemo(() => {
    if (!training) return []
    if (!search.trim()) return training.requirements
    return training.requirements.filter((requirement) =>
      matchesSummerSearch(search, requirement.label, requirement.detail, training.training_title),
    )
  }, [training, search])

  const totalBadges = data?.badges.length ?? 0
  const earnedBadges = data?.badges.filter((badge) => badge.earned).length ?? 0
  const filtersActive = filter !== "all"
  const queryActive = search.trim().length > 0 || (tab === "badges" && filtersActive)

  return (
    <ModuleScreen loading={loading} refreshing={refreshing} onRefresh={() => void refresh()} error={error}>
      <SummerSegmentNav tabs={TAB_OPTIONS} tab={tab} onChange={setTab} theme="student" />

      <SummerSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder={tab === "badges" ? "Search graduation badges…" : "Search requirements…"}
        filterActive={tab === "badges" && filtersActive}
        onOpenFilter={tab === "badges" ? () => setFilterSheetOpen(true) : undefined}
        showFilter={tab === "badges"}
      />

      <SummerFilterSheet
        visible={filterSheetOpen}
        title="Badge status"
        subtitle="Filter camp badges by progress."
        options={[...FILTER_OPTIONS]}
        value={filter}
        onSelect={(value) => {
          setFilter(value as BadgeFilter)
          setFilterSheetOpen(false)
        }}
        onClose={() => setFilterSheetOpen(false)}
      />

      <SummerSearchResultsBar
        visible={queryActive && (tab === "badges" ? totalBadges > 0 : (training?.requirements.length ?? 0) > 0)}
        shown={tab === "badges" ? badges.length : requirements.length}
        total={tab === "badges" ? totalBadges : training?.requirements.length ?? 0}
        query={search}
        onClear={() => {
          setSearch("")
          setFilter("all")
        }}
      />

      {tab === "progress" ? (
        !training ? (
          <FacultyEmptyState
            icon="school-outline"
            title="No graduation track yet"
            body="Enroll in a camp training to see graduation requirements."
          />
        ) : (
          <>
            <ModuleSection title={training.training_title}>
              <View style={styles.summaryRow}>
                <View style={[styles.summaryIcon, { backgroundColor: tokens.accentSoft }]}>
                  <Ionicons name="ribbon-outline" size={18} color={tokens.accent} />
                </View>
                <View style={styles.summaryCopy}>
                  <Text style={[type.bodyEmphasis, { color: native.label }]}>Total camp XP</Text>
                  <Text style={[type.caption, { color: native.secondaryLabel }]}>
                    {training.camp_title} · {earnedBadges}/{totalBadges} badges earned
                  </Text>
                </View>
                <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>{data?.total_xp ?? training.total_xp} XP</Text>
              </View>
              <View style={[styles.summaryRow, { borderTopWidth: 0.5, borderTopColor: native.separator }]}>
                <View style={[styles.summaryIcon, { backgroundColor: `${tokens.success}18` }]}>
                  <Ionicons name="flag-outline" size={18} color={tokens.success} />
                </View>
                <View style={styles.summaryCopy}>
                  <Text style={[type.bodyEmphasis, { color: native.label }]}>Graduation status</Text>
                  <Text style={[type.caption, { color: native.secondaryLabel }]}>
                    {training.modules_completed}/{training.modules_total} modules complete
                  </Text>
                </View>
                <FacultyStatusPill
                  label={training.ready_to_graduate ? "Ready" : "In progress"}
                  tone={training.ready_to_graduate ? "success" : "warning"}
                />
              </View>
            </ModuleSection>

            {training.certificate ? (
              <View style={{ gap: 8 }}>
                <ModuleSectionHeader title="Certificate" />
                <ModuleSection>
                  <View style={styles.summaryRow}>
                    <View style={[styles.summaryIcon, { backgroundColor: tokens.accentSoft }]}>
                      <Ionicons name="document-text-outline" size={18} color={tokens.accent} />
                    </View>
                    <View style={styles.summaryCopy}>
                      <Text style={[type.bodyEmphasis, { color: native.label }]}>Camp certificate issued</Text>
                      <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
                        {training.certificate.verification_code}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.certActions}>
                    <Pressable
                      style={[styles.certBtn, { backgroundColor: tokens.accentSoft, borderColor: tokens.accentBorder }]}
                      onPress={() => {
                        if (!studentId || !training.certificate?.id) return
                        void Linking.openURL(summerCampApi.getCertificatePreviewUrl(studentId, training.certificate.id))
                      }}
                    >
                      <Ionicons name="eye-outline" size={16} color={tokens.accent} />
                      <Text style={[type.caption, { color: tokens.accentDark, fontWeight: "700" }]}>Preview</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.certBtn, { backgroundColor: tokens.accentSoft, borderColor: tokens.accentBorder }]}
                      onPress={() => {
                        if (!studentId || !training.certificate?.id) return
                        void Linking.openURL(summerCampApi.getCertificateDownloadUrl(studentId, training.certificate.id))
                      }}
                    >
                      <Ionicons name="download-outline" size={16} color={tokens.accent} />
                      <Text style={[type.caption, { color: tokens.accentDark, fontWeight: "700" }]}>Download</Text>
                    </Pressable>
                    {training.certificate.linkedin_share_url ? (
                      <Pressable
                        style={[styles.certBtn, { backgroundColor: tokens.accentSoft, borderColor: tokens.accentBorder }]}
                        onPress={() => void Linking.openURL(training.certificate!.linkedin_share_url!)}
                      >
                        <Ionicons name="logo-linkedin" size={16} color={tokens.accent} />
                        <Text style={[type.caption, { color: tokens.accentDark, fontWeight: "700" }]}>LinkedIn</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </ModuleSection>
              </View>
            ) : null}

            <View style={{ gap: 8 }}>
              <ModuleSectionHeader title="Requirements" />
              {requirements.length === 0 ? (
                <FacultyEmptyState icon="search-outline" title="No matches" body="Try a different search term." />
              ) : (
                <ModuleSection>
                  {requirements.map((requirement, index) => (
                    <SummerGraduationRequirementCard
                      key={requirement.id}
                      requirement={requirement}
                      last={index === requirements.length - 1}
                      onPress={() => setSelection({ kind: "requirement", item: requirement, training })}
                    />
                  ))}
                </ModuleSection>
              )}
            </View>
          </>
        )
      ) : !totalBadges ? (
        <FacultyEmptyState
          icon="medal-outline"
          title="No badges yet"
          body="Complete modules and participate in camp activities to earn graduation badges."
        />
      ) : badges.length === 0 ? (
        <FacultyEmptyState icon="search-outline" title="No matches" body="Try a different search or reset your filters." />
      ) : (
        <ModuleSection title="Graduation badges">
          {badges.map((badge, index) => (
            <SummerBadgeListCard
              key={badge.id}
              badge={badge}
              last={index === badges.length - 1}
              onPress={() => setSelection({ kind: "badge", item: badge })}
            />
          ))}
        </ModuleSection>
      )}

      <SummerGraduationActionSheet
        visible={selection != null}
        selection={selection}
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
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  summaryCopy: { flex: 1, minWidth: 0, gap: 2 },
  certActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  certBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
})
