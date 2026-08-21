import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { SUPPORT_QUEUES } from "../../constants/faculty-communication-theme"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { instructorApi, type InstructorPasswordResetRequest } from "../../lib/instructor-api"
import { FACULTY_COMMUNICATION_COLOR, facultySupportGuideThumb } from "../../lib/faculty-communication-theme"
import { FacultySupportResetCard } from "./FacultyCommunicationListCards"
import {
  CommEmptyState,
  CommGroupedList,
  CommListRow,
  CommSectionFooter,
  CommTintButton,
  useFacultyCommunicationTheme,
} from "./faculty-communication-ui"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { useFacultyStickyHeaderScrollLayout, FacultyModuleStickyHeader, FacultyModuleTabBar, FacultySearchToolbar } from "./faculty-module-shell"
import { useModuleTheme } from "../../lib/themed-module-shell"
import {
  filterSupportGuides,
  groupSupportGuidesByCategory,
  INSTRUCTOR_SUPPORT_GUIDES} from "../../constants/support-guides"

type Tab = "queues" | "resets" | "guides"

const FAQ_GUIDES = INSTRUCTOR_SUPPORT_GUIDES

function resetIsPending(status?: string): boolean {
  return status === "pending" || status === "requested"
}

export function FacultyStudentSupportScreen() {
  const { styles: moduleStyles } = useModuleTheme()
  const comm = useFacultyCommunicationTheme()
  const insets = useSafeAreaInsets()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const router = useRouter()
  const { scope, ready } = useFacultyScope()
  const { badges, refreshFacultyData } = useFacultyShell()

  const [tab, setTab] = useState<Tab>("queues")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [resets, setResets] = useState<InstructorPasswordResetRequest[]>([])
  const [actingId, setActingId] = useState<number | null>(null)
  const [openFaq, setOpenFaq] = useState<string | null>("login")
  const [guideSearch, setGuideSearch] = useState("")

  const screenStyles = useMemo(() => createScreenStyles(comm), [comm])

  const load = useCallback(async () => {
    if (!scope) return
    setResets(await instructorApi.getPasswordResets(scope))
  }, [scope])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [ready, load])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await Promise.all([load(), refreshFacultyData?.(undefined, { force: true })])
    } finally {
      setRefreshing(false)
    }
  }

  const pendingResets = useMemo(() => resets.filter((r) => resetIsPending(r.status)), [resets])

  const queueCounts = useMemo(
    () => ({
      password: pendingResets.length,
      "office-hours": badges?.officeHours ?? 0,
      issues: badges?.pendingIssues ?? 0,
      faq: FAQ_GUIDES.length}),
    [pendingResets.length, badges?.officeHours, badges?.pendingIssues],
  )

  const filteredGuides = useMemo(() => filterSupportGuides(FAQ_GUIDES, guideSearch), [guideSearch])
  const guideCategories = useMemo(() => groupSupportGuidesByCategory(filteredGuides), [filteredGuides])

  const navTabs = useMemo(
    () => [
      { id: "queues" as const, label: "Queues", icon: "layers-outline" as const },
      {
        id: "resets" as const,
        label: "Resets",
        icon: "key-outline" as const,
        count: pendingResets.length},
      { id: "guides" as const, label: "Guides", icon: "book-outline" as const },
    ],
    [pendingResets.length],
  )

  async function approveReset(row: InstructorPasswordResetRequest) {
    if (!scope) return
    setActingId(row.id)
    try {
      const res = await instructorApi.approvePasswordReset(scope, row.id)
      AppAlert.alert("Approved", res.message ?? "Password reset approved.")
      await load()
      await refreshFacultyData?.(undefined, { force: true })
    } catch (err) {
      AppAlert.alert("Could Not Approve", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setActingId(null)
    }
  }

  async function rejectReset(row: InstructorPasswordResetRequest) {
    if (!scope) return
    setActingId(row.id)
    try {
      await instructorApi.rejectPasswordReset(scope, row.id)
      await load()
      await refreshFacultyData?.(undefined, { force: true })
    } catch (err) {
      AppAlert.alert("Could Not Reject", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setActingId(null)
    }
  }

  if (!ready) {
    return (
      <View style={[moduleStyles.root, styles.root]}>
        <CommEmptyState
          icon="help-circle-outline"
          title="Select a Course"
          body="Student support queues are scoped to your active course."
        />
      </View>
    )
  }

  return (
    <View style={[moduleStyles.root, styles.root]}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar tabs={navTabs} tab={tab} onChange={setTab} scrollable />

        {tab === "guides" ? (
          <FacultySearchToolbar
            value={guideSearch}
            onChange={setGuideSearch}
            placeholder="Search guides…"
            showFilter={false}
          />
        ) : null}
      </FacultyModuleStickyHeader>

      <ScrollView
        style={moduleStyles.scroll}
        contentContainerStyle={[styles.content, listScrollPad]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_COMMUNICATION_COLOR.link} />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {tab === "queues" ? (
        <>
          <CommGroupedList>
            {SUPPORT_QUEUES.map((queue, index) => {
              const count = queueCounts[queue.id as keyof typeof queueCounts] ?? 0
              return (
                <CommListRow
                  key={queue.id}
                  queueId={queue.id}
                  icon={queue.icon}
                  iconColor={queue.color}
                  iconSoft={queue.soft}
                  title={queue.title}
                  subtitle={queue.subtitle}
                  badge={count > 0 && queue.id !== "faq" ? count : undefined}
                  onPress={() => {
                    if (queue.id === "password") {
                      setTab("resets")
                      return
                    }
                    if (queue.id === "faq") {
                      setTab("guides")
                      return
                    }
                    if (queue.route) router.push(queue.route as never)
                  }}
                  isLast={index === SUPPORT_QUEUES.length - 1}
                />
              )
            })}
          </CommGroupedList>
          <CommSectionFooter>Open a queue to review items that need your attention.</CommSectionFooter>
        </>
      ) : null}

      {tab === "resets" ? (
        <>
          {loading ? (
            <View style={screenStyles.stateWrap}>
              <ActivityIndicator color={FACULTY_COMMUNICATION_COLOR.link} />
            </View>
          ) : resets.length === 0 ? (
            <View style={screenStyles.stateWrap}>
              <CommEmptyState
                icon="key-outline"
                title="No Reset Requests"
                body="When students request a password reset, they appear here for approval."
              />
            </View>
          ) : (
            <View style={styles.resetList}>
              {resets.map((row) => (
                <FacultySupportResetCard
                  key={row.id}
                  row={row}
                  acting={actingId === row.id}
                  onApprove={() => void approveReset(row)}
                  onReject={() => void rejectReset(row)}
                />
              ))}
            </View>
          )}
          <CommSectionFooter>Approved resets issue a temporary password for the student&apos;s next sign-in.</CommSectionFooter>
          <CommTintButton label="Open Student Directory" onPress={() => router.push("/module/students" as never)} />
        </>
      ) : null}

      {tab === "guides" ? (
        <>
          {filteredGuides.length === 0 ? (
            <View style={screenStyles.stateWrap}>
              <CommEmptyState
                icon="search-outline"
                title="No Guides Found"
                body="Try a different search term or browse all topics."
              />
            </View>
          ) : (
            guideCategories.map((category) => (
              <View key={category} style={screenStyles.guideSection}>
                <Text style={screenStyles.guideCategory}>{category}</Text>
                <CommGroupedList>
                  {filteredGuides
                    .filter((item) => item.category === category)
                    .map((item, index, items) => {
                      const open = openFaq === item.id
                      const isLast = index === items.length - 1
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => setOpenFaq(open ? null : item.id)}
                          style={({ pressed }) => [pressed && screenStyles.pressed]}
                          accessibilityRole="button"
                          accessibilityState={{ expanded: open }}
                        >
                          <View style={[screenStyles.faqRow, !isLast && screenStyles.rowBorder]}>
                            <View style={screenStyles.faqHead}>
                              <SolidListThumbTile thumb={facultySupportGuideThumb(item.id)} icon="help-circle-outline" size="compact" />
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
                                    <Ionicons name="arrow-forward" size={14} color={FACULTY_COMMUNICATION_COLOR.link} />
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
            {`${FAQ_GUIDES.length} guides across ${new Set(FAQ_GUIDES.map((g) => g.category)).size} topics — tap to expand answers aligned with student and web app flows.`}
          </CommSectionFooter>
        </>
      ) : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  resetList: { gap: 12 },
})

function createScreenStyles(comm: ReturnType<typeof useFacultyCommunicationTheme>) {
  const { native, type, layout } = comm
  return StyleSheet.create({
    stateWrap: {
      backgroundColor: native.secondaryGrouped,
      borderRadius: layout.sectionRadius,
      minHeight: 160,
      justifyContent: "center",
    },
    pressed: { opacity: 0.55 },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: native.separator,
    },
    faqRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 8, backgroundColor: native.secondaryGrouped },
    faqHead: { flexDirection: "row", alignItems: "center", gap: 10 },
    faqQ: { ...type.body, flex: 1, letterSpacing: -0.3, lineHeight: 21 },
    faqA: { ...type.secondary, paddingLeft: 46, lineHeight: 21 },
    guideSection: { gap: 6 },
    guideCategory: { ...type.sectionHeader, paddingHorizontal: 4, textTransform: "none" },
    guideLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingLeft: 46,
      paddingTop: 4,
    },
    guideLinkText: { fontSize: 14, fontWeight: "600", color: FACULTY_COMMUNICATION_COLOR.link },
  })
}
