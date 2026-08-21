import { useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import {
  filterSupportGuides,
  groupSupportGuidesByCategory,
  INSTRUCTOR_SUPPORT_GUIDES,
} from "../../constants/support-guides"
import { FACULTY_ADMIN_COLOR } from "../../lib/faculty-admin-theme"
import { facultySupportGuideThumb } from "../../lib/faculty-communication-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import {
  CommEmptyState,
  CommGroupedList,
  CommSectionFooter,
  useFacultyCommunicationTheme,
} from "./faculty-communication-ui"
import {
  FacultyModuleStickyHeader,
  FacultySearchToolbar,
  useFacultyStickyHeaderScrollLayout,
} from "./faculty-module-shell"

const GUIDES = INSTRUCTOR_SUPPORT_GUIDES

export function FacultyHelpCenterScreen() {
  const router = useRouter()
  const { styles: moduleStyles } = useModuleTheme()
  const comm = useFacultyCommunicationTheme()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const [search, setSearch] = useState("")
  const [openId, setOpenId] = useState<string | null>("mobile-web")

  const filtered = useMemo(() => filterSupportGuides(GUIDES, search), [search])
  const categories = useMemo(() => groupSupportGuidesByCategory(filtered), [filtered])

  const screenStyles = useMemo(() => createScreenStyles(comm), [comm])

  return (
    <View style={[moduleStyles.root, styles.root]}>
      <FacultyModuleStickyHeader>
        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search help articles…"
          showFilter={false}
        />
      </FacultyModuleStickyHeader>

      <ScrollView
        style={moduleStyles.scroll}
        contentContainerStyle={[styles.content, listScrollPad]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text style={screenStyles.introTitle}>Help Center</Text>
        <Text style={screenStyles.introBody}>
          Answers for teaching workflows on mobile and web. For platform bugs or product ideas, use the
          quick actions below.
        </Text>

        <View style={screenStyles.quickSection}>
          <Text style={screenStyles.guideCategory}>Quick Actions</Text>
          <CommGroupedList>
            <QuickActionRow
              icon="send-outline"
              label="Submit Ticket"
              sub="Contact the CourseCollab team"
              onPress={() => router.push("/module/submit-ticket" as never)}
            />
            <QuickActionRow
              icon="bug-outline"
              label="Report Bug"
              sub="Something broken? Tell us what happened"
              onPress={() => router.push("/module/report-bug" as never)}
            />
            <QuickActionRow
              icon="sparkles-outline"
              label="Feature Request"
              sub="Suggest an improvement for faculty tools"
              onPress={() => router.push("/module/feature-requests" as never)}
            />
            <QuickActionRow
              icon="diamond-outline"
              label="View Plans"
              sub="Compare Free, Pro, and Enterprise"
              onPress={() => router.push("/membership" as never)}
              isLast
            />
          </CommGroupedList>
        </View>

        {filtered.length === 0 ? (
          <View style={screenStyles.stateWrap}>
            <CommEmptyState
              icon="search-outline"
              title="No Articles Found"
              body="Try a different search or submit a support ticket."
            />
          </View>
        ) : (
          categories.map((category) => (
            <View key={category} style={screenStyles.guideSection}>
              <Text style={screenStyles.guideCategory}>{category}</Text>
              <CommGroupedList>
                {filtered
                  .filter((item) => item.category === category)
                  .map((item, index, items) => {
                    const open = openId === item.id
                    const isLast = index === items.length - 1
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => setOpenId(open ? null : item.id)}
                        style={({ pressed }) => [pressed && screenStyles.pressed]}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: open }}
                      >
                        <View style={[screenStyles.faqRow, !isLast && screenStyles.rowBorder]}>
                          <View style={screenStyles.faqHead}>
                            <SolidListThumbTile
                              thumb={facultySupportGuideThumb(item.id)}
                              icon="help-circle-outline"
                              size="compact"
                            />
                            <Text style={screenStyles.faqQ}>{item.q}</Text>
                            <Ionicons
                              name={open ? "chevron-up" : "chevron-down"}
                              size={18}
                              color={comm.native.tertiaryLabel}
                            />
                          </View>
                          {open ? (
                            <>
                              <Text style={screenStyles.faqA}>{item.a}</Text>
                              {item.route ? (
                                <Pressable
                                  style={({ pressed }) => [screenStyles.guideLink, pressed && screenStyles.pressed]}
                                  onPress={() => router.push(item.route as never)}
                                  accessibilityRole="button"
                                >
                                  <Text style={screenStyles.guideLinkText}>Open related module</Text>
                                  <Ionicons name="arrow-forward" size={14} color={FACULTY_ADMIN_COLOR.link} />
                                </Pressable>
                              ) : null}
                            </>
                          ) : null}
                        </View>
                      </Pressable>
                    )
                  })}
              </CommGroupedList>
            </View>
          ))
        )}

        <CommSectionFooter>
          {`${GUIDES.length} articles across ${new Set(GUIDES.map((g) => g.category)).size} topics.`}
        </CommSectionFooter>
      </ScrollView>
    </View>
  )
}

function QuickActionRow({
  icon,
  label,
  sub,
  onPress,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  sub: string
  onPress: () => void
  isLast?: boolean
}) {
  const comm = useFacultyCommunicationTheme()
  const screenStyles = useMemo(() => createScreenStyles(comm), [comm])

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [screenStyles.quickRow, !isLast && screenStyles.rowBorder, pressed && screenStyles.pressed]}
      accessibilityRole="button"
    >
      <SolidListThumbTile thumb={facultySupportGuideThumb(label)} icon={icon} size="compact" />
      <View style={screenStyles.quickCopy}>
        <Text style={screenStyles.quickLabel}>{label}</Text>
        <Text style={screenStyles.quickSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={comm.native.tertiaryLabel} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
})

function createScreenStyles(comm: ReturnType<typeof useFacultyCommunicationTheme>) {
  const { native, type } = comm
  return StyleSheet.create({
    introTitle: { ...type.sheetTitle, color: native.label },
    introBody: { ...type.secondary, color: native.secondaryLabel, lineHeight: 21 },
    quickSection: { gap: 8 },
    guideSection: { gap: 8 },
    guideCategory: { ...type.sectionHeader, color: native.secondaryLabel, paddingHorizontal: 4 },
    stateWrap: { paddingVertical: 24 },
    faqRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
    faqHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    faqQ: { ...type.bodyEmphasis, flex: 1, color: native.label, lineHeight: 21 },
    faqA: { ...type.secondary, color: native.label, lineHeight: 21, paddingLeft: 46 },
    guideLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingLeft: 46,
      paddingTop: 4,
    },
    guideLinkText: { ...type.caption, color: FACULTY_ADMIN_COLOR.link, fontWeight: "600" },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: native.separator },
    pressed: { opacity: 0.55 },
    quickRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    quickCopy: { flex: 1, gap: 2 },
    quickLabel: { ...type.bodyEmphasis, color: native.label },
    quickSub: { ...type.caption, color: native.secondaryLabel },
  })
}
