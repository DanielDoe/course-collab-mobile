import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { ScrollView } from "react-native-gesture-handler"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useSession } from "../../context/SessionProvider"
import { formatStudentModuleError } from "../../lib/student-api"
import { type TopicProgress } from "../../lib/practice-api"
import { useStudentPracticeHub } from "../../hooks/query/useStudentPracticeHub"
import { QueryRefreshBanner } from "../query/QueryRefreshBanner"
import { QuerySkeleton } from "../query/QuerySkeleton"
import {
  isPracticeTopicLocked,
  practiceTopicUnlockedCount,
} from "../../lib/practice-session-count"
import type { StudentSession } from "../../lib/session"
import type { MembershipTier } from "../../types/dashboard"
import { type FlashcardDeck } from "../../lib/flashcards-api"
import { useStudentShell } from "../../context/StudentShellContext"
import {
  flashcardDeckAccessMetaForAccess,
  flashcardUpgradeMessageForAccess,
  isFlashcardDeckStudyLockedForAccess,
  resolveFlashcardTierAccess,
} from "../../lib/flashcard-access"
import { FlashcardDeckListCard } from "../flashcards/FlashcardDeckListCard"
import { PillSwipeTabs } from "../theme/PillSwipeTabs"
import { SignatureListCard } from "../theme/SignatureListCard"
import { signatureListStyles } from "../theme/TabbedModuleLayout"
import { StudentSearchToolbar } from "../student/student-search-toolbar"
import { CommEmptyState, CommSectionFooter } from "../faculty/faculty-communication-ui"
import { ModuleSectionHeader } from "../modules/ModuleScreen"
import { StudentThemedLocked } from "../student/student-themed-hero"
import { shouldShowPurchaseCta, tierLockedAlertButtons } from "../../lib/purchase-navigation"
import { canAccessPracticeHub, PRACTICE_HUB_MIN_TIER, resolvePracticeAccess } from "../../lib/practice-hub-access"
import { PracticeLeaderboardListCard } from "./PracticeLeaderboardListCard"
import { PracticeLeaderboardPodium } from "./PracticeLeaderboardPodium"
import {
  leaderboardPoints,
  leaderboardPrivacyCaption,
  leaderboardScorePct,
  leaderboardStreak,
  type PracticeLeaderboardViewOptions,
} from "./practice-leaderboard-utils"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { FacultyListPagerFooter } from "../faculty/FacultyListPagerFooter"

type Tab = "practice" | "leaderboard"

const PRACTICE_TABS = [
  { id: "practice", label: "Practice", icon: "flash-outline" as const },
  { id: "leaderboard", label: "Leaderboard", icon: "trophy-outline" as const },
]

const TOPICS_PER_PAGE = 3

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function topicProgressPct(topic: TopicProgress, tier?: MembershipTier): number {
  const total = practiceTopicUnlockedCount(topic, tier)
  if (total <= 0) return 0
  return Math.min(100, Math.round((topic.completed / total) * 100))
}

function topicStatusLabel(topic: TopicProgress, practiceLocked: boolean, tier?: MembershipTier): string {
  if (practiceLocked) return "Upgrade to unlock"
  const pct = topicProgressPct(topic, tier)
  if (pct >= 100) return "Complete"
  if (topic.completed > 0) return `${pct}% progress`
  return "Not started"
}

function formatSessionDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function practiceTopicHref(topicName: string): `/practice/topic?topic=${string}` {
  return `/practice/topic?topic=${encodeURIComponent(topicName)}`
}

export function PracticeHubScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const scrollPad = useModuleScrollContentPadding(20)
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const insets = useSafeAreaInsets()
  const { membershipTier, membershipTierLoaded } = useStudentShell()

  const hubQuery = useStudentPracticeHub(
    session,
    membershipTierLoaded && canAccessPracticeHub(membershipTier),
  )
  const loading = hubQuery.isInitialLoading
  const refreshing = hubQuery.isRefreshing && !hubQuery.isInitialLoading
  const error = hubQuery.error
    ? formatStudentModuleError(hubQuery.error, "Failed to load practice hub.")
    : ""
  const topics = hubQuery.topics
  const practiceAccess = hubQuery.practiceAccess
  const recentSessions = hubQuery.recentSessions
  const leaderboard = hubQuery.leaderboard
  const leaderboardSelf = hubQuery.leaderboardSelf
  const leaderboardPrivacy = hubQuery.leaderboardPrivacy
  const leaderboardDisplay = hubQuery.leaderboardDisplay
  const leaderboardLocked = hubQuery.leaderboardLocked
  const practiceHubDecks = hubQuery.practiceHubDecks
  const deckMastery = hubQuery.deckMastery
  const courseTierAccess = hubQuery.courseTierAccess
  const [tab, setTab] = useState<Tab>("practice")
  const [topicSearch, setTopicSearch] = useState("")
  const [topicPage, setTopicPage] = useState(0)
  const showPurchaseActions = shouldShowPurchaseCta()

  const resolvedPracticeAccess = resolvePracticeAccess(
    membershipTier,
    membershipTierLoaded,
    practiceAccess,
  )
  const resolvedTierAccess = resolveFlashcardTierAccess(
    membershipTier,
    membershipTierLoaded,
    courseTierAccess,
  )
  const canStartPractice = resolvedPracticeAccess.canStartPractice

  function openTopic(topic: TopicProgress) {
    const locked = isPracticeTopicLocked(topic, canStartPractice, membershipTier)
    if (locked) {
      AppAlert.alert(
        "Practice locked",
        resolvedPracticeAccess.level === "none"
          ? "Upgrade to Explorer to start practicing topics."
          : "This topic has no unlocked questions on your plan.",
        tierLockedAlertButtons(() => router.push("/membership" as never)),
      )
      return
    }
    router.push(practiceTopicHref(topic.name) as never)
  }

  useEffect(() => {
    if (!session || tab !== "leaderboard") return
    void hubQuery.refetch()
  }, [session, tab, hubQuery.refetch])

  const leaderboardViewOptions = useMemo<PracticeLeaderboardViewOptions>(
    () => ({
      blurPeerNames: leaderboardPrivacy.blurPeerNames,
      showAccuracy: leaderboardDisplay.showAccuracy,
      showResponseTime: leaderboardDisplay.showResponseTime,
    }),
    [leaderboardDisplay.showAccuracy, leaderboardDisplay.showResponseTime, leaderboardPrivacy.blurPeerNames],
  )

  const leaderboardPrivacyNote = useMemo(
    () => leaderboardPrivacyCaption(leaderboardPrivacy.blurPeerNames, leaderboardSelf?.rank),
    [leaderboardPrivacy.blurPeerNames, leaderboardSelf?.rank],
  )

  const onRefresh = useCallback(async () => {
    await hubQuery.refetch()
  }, [hubQuery.refetch])

  useNotificationModuleRefresh("practice", onRefresh)

  const filteredTopics = useMemo(() => {
    const q = topicSearch.trim().toLowerCase()
    if (!q) return topics
    return topics.filter((t) => t.name.toLowerCase().includes(q))
  }, [topics, topicSearch])

  const filteredPracticeHubDecks = useMemo(() => {
    const q = topicSearch.trim().toLowerCase()
    if (!q) return practiceHubDecks
    return practiceHubDecks.filter(
      (deck) =>
        deck.title.toLowerCase().includes(q) ||
        deck.description.toLowerCase().includes(q) ||
        (deck.topic?.toLowerCase().includes(q) ?? false),
    )
  }, [practiceHubDecks, topicSearch])

  const decksPager = useFacultyListPager(filteredPracticeHubDecks, `${topicSearch}|decks`, "decks")
  const recentSessionsPager = useFacultyListPager(recentSessions, `${topicSearch}|sessions`, "sessions")
  const leaderboardTail = useMemo(() => leaderboard.slice(3), [leaderboard])
  const leaderboardTailPager = useFacultyListPager(leaderboardTail, "leaderboard-tail", "students", {
    preset: "compact",
  })

  function deckStudyLocked(deck: FlashcardDeck): boolean {
    if (!membershipTierLoaded || deck.cardCount <= 0) return false
    return isFlashcardDeckStudyLockedForAccess(deck.cardCount, resolvedTierAccess)
  }

  function deckAccessMeta(deck: FlashcardDeck): string | null {
    if (!membershipTierLoaded || deck.cardCount <= 0) return null
    return flashcardDeckAccessMetaForAccess(deck.cardCount, resolvedTierAccess)
  }

  function openFlashcardDeck(deck: FlashcardDeck) {
    if (deck.cardCount <= 0) {
      AppAlert.alert("Empty deck", "This deck has no cards yet.")
      return
    }
    if (deckStudyLocked(deck)) {
      AppAlert.alert(
        "Flashcards locked",
        flashcardUpgradeMessageForAccess(resolvedTierAccess),
        tierLockedAlertButtons(() => router.push("/membership" as never)),
      )
      return
    }
    router.push(`/flashcards/${deck.id}` as never)
  }

  const totalTopicPages = Math.max(1, Math.ceil(filteredTopics.length / TOPICS_PER_PAGE))

  const pageTopics = useMemo(() => {
    const start = topicPage * TOPICS_PER_PAGE
    return filteredTopics.slice(start, start + TOPICS_PER_PAGE)
  }, [filteredTopics, topicPage])

  useEffect(() => {
    setTopicPage(0)
  }, [topicSearch])

  useEffect(() => {
    if (topicPage >= totalTopicPages) {
      setTopicPage(Math.max(0, totalTopicPages - 1))
    }
  }, [topicPage, totalTopicPages])

  const pageScrollStyle = useMemo(
    () => ({
      paddingBottom: scrollPad.paddingBottom,
      gap: 12 as const,
      flexGrow: 1,
    }),
    [scrollPad.paddingBottom],
  )

  function renderPracticePage() {
    if (loading && !refreshing) {
      return (
        <View style={styles.pageCenter}>
          <QuerySkeleton />
        </View>
      )
    }

    return (
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={pageScrollStyle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        directionalLockEnabled
        nestedScrollEnabled
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={tokens.accent} />
        }
      >
        <ModuleSectionHeader title="Choose topic" />

        {filteredTopics.length === 0 ? (
          <CommEmptyState
            icon="search-outline"
            title={topicSearch.trim() ? "No matching topics" : "No topics yet"}
            body={
              topicSearch.trim()
                ? `Nothing matched “${topicSearch.trim()}”. Try another search.`
                : "Practice topics will appear here once your instructor publishes them."
            }
          />
        ) : (
          <View style={signatureListStyles.list}>
            {pageTopics.map((topic, index) => {
              const pct = topicProgressPct(topic, membershipTier)
              const topicLocked = isPracticeTopicLocked(topic, canStartPractice, membershipTier)
              const unlocked = practiceTopicUnlockedCount(topic, membershipTier)
              return (
                <SignatureListCard
                  key={topic.name}
                  index={index}
                  title={topic.name}
                  meta={
                    topicLocked
                      ? `${topic.questionCount} questions · locked`
                      : unlocked < topic.questionCount
                        ? `${topic.completed}/${unlocked} practiced · ${topic.lockedCount ?? topic.questionCount - unlocked} locked`
                        : `${topic.completed}/${topic.questionCount} practiced`
                  }
                  metaIcon={topicLocked ? "lock-closed-outline" : "book-outline"}
                  statusLabel={topicStatusLabel(topic, topicLocked, membershipTier)}
                  statusColor={topicLocked ? tokens.warning : pct >= 100 ? tokens.success : SN.accent}
                  statusIcon={topicLocked ? "lock-closed" : pct >= 100 ? "checkmark-circle" : "ellipse"}
                  trailingValue={topicLocked ? "Locked" : `${topic.accuracy}%`}
                  trailingValueColor={topicLocked ? tokens.warning : SN.accent}
                  icon={topicLocked ? "lock-closed-outline" : "flash-outline"}
                  accent={topicLocked ? tokens.warning : SN.accent}
                  onPress={() => openTopic(topic)}
                />
              )
            })}
          </View>
        )}

        {filteredTopics.length > TOPICS_PER_PAGE ? (
          <View style={styles.pager}>
            <Pressable
              style={[
                styles.pagerBtn,
                { backgroundColor: native.fill },
                topicPage === 0 && styles.pagerBtnDisabled,
              ]}
              onPress={() => setTopicPage((p) => Math.max(0, p - 1))}
              disabled={topicPage === 0}
            >
              <Ionicons name="chevron-back" size={20} color={topicPage === 0 ? native.tertiaryLabel : tokens.accent} />
            </Pressable>
            <Text style={[type.caption, { fontWeight: "600" }]}>
              {topicPage + 1} / {totalTopicPages}
              {topicSearch.trim() ? ` · ${filteredTopics.length} found` : ` · ${filteredTopics.length} topics`}
            </Text>
            <Pressable
              style={[
                styles.pagerBtn,
                { backgroundColor: native.fill },
                topicPage >= totalTopicPages - 1 && styles.pagerBtnDisabled,
              ]}
              onPress={() => setTopicPage((p) => Math.min(totalTopicPages - 1, p + 1))}
              disabled={topicPage >= totalTopicPages - 1}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={topicPage >= totalTopicPages - 1 ? native.tertiaryLabel : tokens.accent}
              />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.flashcardsSection}>
          <View style={styles.flashcardsHead}>
            <ModuleSectionHeader title="Flashcard decks" />
            <Pressable onPress={() => router.push("/module/flashcards" as never)} hitSlop={8}>
              <Text style={[type.caption, { color: SN.accent, fontWeight: "700" }]}>All flashcards</Text>
            </Pressable>
          </View>
          <Text style={[type.caption, { color: SN.secondaryLabel, marginBottom: 4 }]}>
            Course decks your instructor published for Practice Hub
          </Text>
          {filteredPracticeHubDecks.length === 0 ? (
            <CommEmptyState
              icon="layers-outline"
              title={topicSearch.trim() ? "No matching decks" : "No Practice Hub decks"}
              body={
                topicSearch.trim()
                  ? "Try another search term."
                  : "Instructors can flag published decks to appear here."
              }
            />
          ) : (
            <>
              <View style={signatureListStyles.list}>
                {decksPager.items.map((deck) => {
                  const mastery = deckMastery[String(deck.id)]
                  return (
                    <FlashcardDeckListCard
                      key={`ph-deck-${deck.id}`}
                      deck={deck}
                      masteryPct={mastery?.pct}
                      studyLocked={deckStudyLocked(deck)}
                      accessMeta={deckAccessMeta(deck)}
                      onPress={() => openFlashcardDeck(deck)}
                    />
                  )
                })}
              </View>
              <FacultyListPagerFooter pager={decksPager} />
            </>
          )}
        </View>

        {recentSessions.length > 0 ? (
          <>
            <ModuleSectionHeader title="Recent sessions" />
            <View style={signatureListStyles.list}>
              {recentSessionsPager.items.map((sessionItem, index) => (
                <SignatureListCard
                  key={String(sessionItem.id ?? `${sessionItem.topic}-${index}`)}
                  index={recentSessionsPager.page * recentSessionsPager.pageSize + index}
                  title={sessionItem.topic}
                  meta={formatSessionDate(sessionItem.created_at)}
                  metaIcon="calendar-outline"
                  statusLabel="Recent session"
                  statusColor={SN.accent}
                  trailingValue={`${Math.round(Number(sessionItem.score))}%`}
                  trailingValueColor={SN.accent}
                  icon="time-outline"
                  accent={SN.accent}
                  showChevron={false}
                />
              ))}
            </View>
            <FacultyListPagerFooter pager={recentSessionsPager} />
          </>
        ) : null}
      </ScrollView>
    )
  }

  function renderLeaderboardPage() {
    if (loading && !refreshing) {
      return (
        <View style={styles.pageCenter}>
          <QuerySkeleton />
        </View>
      )
    }

    return (
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={pageScrollStyle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        directionalLockEnabled
        nestedScrollEnabled
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={tokens.accent} />
        }
      >
        <View style={styles.leaderboardSection}>
          {leaderboardLocked ? (
            <View style={styles.lockedBox}>
              <Ionicons name="lock-closed-outline" size={24} color={tokens.accent} />
              <Text style={[type.caption, { color: tokens.accentDark, fontWeight: "600" }]}>Leaderboard locked</Text>
              <Text style={type.caption}>Upgrade to Explorer or Trailblazer to view rankings.</Text>
              {showPurchaseActions ? (
                <Pressable
                  style={[styles.upgradeBtn, { backgroundColor: SN.accent }]}
                  onPress={() => router.push("/membership" as never)}
                >
                  <Text style={styles.upgradeBtnText}>View plans</Text>
                </Pressable>
              ) : null}
            </View>
          ) : leaderboard.length === 0 ? (
            <Text style={type.caption}>No leaderboard data yet. Complete a session to appear here.</Text>
          ) : (
            <>
              {leaderboardPrivacyNote ? (
                <Text style={[type.caption, { color: native.secondaryLabel }]}>{leaderboardPrivacyNote}</Text>
              ) : null}
              {leaderboardSelf ? (
                <View style={[styles.standingCard, { backgroundColor: native.secondaryGrouped, borderColor: tokens.border }]}>
                  <View style={[styles.standingIcon, { backgroundColor: tokens.accentSoft }]}>
                    <Ionicons name="flash-outline" size={18} color={tokens.accent} />
                  </View>
                  <View style={styles.standingCopy}>
                    <Text style={[type.bodyEmphasis, { color: native.label }]}>Your standing</Text>
                    <Text style={[type.caption, { color: native.secondaryLabel }]}>
                      Rank #{leaderboardSelf.rank} · {leaderboardPoints(leaderboardSelf)} pts ·{" "}
                      {leaderboardScorePct(leaderboardSelf)}% avg · {leaderboardStreak(leaderboardSelf)} day streak
                    </Text>
                  </View>
                </View>
              ) : null}
              <PracticeLeaderboardPodium entries={leaderboard} viewOptions={leaderboardViewOptions} />
              {leaderboard.length > 3 ? (
                <>
                  <ModuleSectionHeader title={`All students · ${leaderboard.length} ranked`} />
                  <View style={signatureListStyles.list}>
                    {leaderboardTailPager.items.map((entry, index) => (
                      <PracticeLeaderboardListCard
                        key={String(entry.student_id ?? entry.rank)}
                        entry={entry}
                        index={leaderboardTailPager.page * leaderboardTailPager.pageSize + index + 3}
                        viewOptions={leaderboardViewOptions}
                      />
                    ))}
                  </View>
                  <FacultyListPagerFooter pager={leaderboardTailPager} />
                </>
              ) : null}
            </>
          )}
          <CommSectionFooter>Rankings update after each practice session.</CommSectionFooter>
        </View>
      </ScrollView>
    )
  }

  if (!session) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground, paddingBottom: insets.bottom }]}>
        <Text style={type.caption}>Student session required.</Text>
      </View>
    )
  }

  if (!membershipTierLoaded) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground, paddingBottom: insets.bottom }]}>
        <ActivityIndicator size="large" color={tokens.accent} />
        <Text style={[type.caption, { color: SN.secondaryLabel, marginTop: 12 }]}>Loading membership…</Text>
      </View>
    )
  }

  if (!canAccessPracticeHub(membershipTier)) {
    return (
      <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
        <StudentThemedLocked
          icon="fitness-outline"
          subtitle={`Practice Hub topics, sessions, and leaderboard unlock with ${PRACTICE_HUB_MIN_TIER} membership or higher.`}
          paddingTop={scrollPad.paddingTop ?? insets.top + 16}
          onUpgrade={() => router.push("/membership" as never)}
        />
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <View
        style={[
          styles.chrome,
          {
            paddingTop: scrollPad.paddingTop ?? NATIVE.pagePadding,
            paddingHorizontal: NATIVE.pagePadding,
          },
        ]}
      >
        <QueryRefreshBanner visible={hubQuery.refreshFailed} onRetry={() => void onRefresh()} />
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: `${tokens.danger}18` }]}>
            <Text style={[type.destructive, styles.errorText]}>{error}</Text>
          </View>
        ) : null}

        {tab === "practice" ? (
          <StudentSearchToolbar
            value={topicSearch}
            onChange={setTopicSearch}
            placeholder="Search topics…"
            showFilter={false}
          />
        ) : null}
      </View>

      <PillSwipeTabs
        options={[...PRACTICE_TABS]}
        value={tab}
        onChange={(value) => setTab(value as Tab)}
        pagePaddingHorizontal={NATIVE.pagePadding}
        pages={[renderPracticePage(), renderLeaderboardPage()]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  chrome: { gap: 12, paddingBottom: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorBox: { padding: 12, borderRadius: NATIVE.sectionRadius },
  errorText: { fontSize: 14, lineHeight: 20 },
  pageScroll: { flex: 1 },
  pageCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 48,
  },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 8,
  },
  pagerBtn: {
    width: 40,
    height: 40,
    borderRadius: NATIVE.iconTileRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  pagerBtnDisabled: { opacity: 0.45 },
  flashcardsSection: { gap: 8, marginTop: 8 },
  flashcardsHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  leaderboardSection: { gap: 12 },
  standingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  standingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  standingCopy: { flex: 1, gap: 2 },
  lockedBox: { alignItems: "center", gap: 8, paddingVertical: 20 },
  upgradeBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: NATIVE.sectionRadius,
  },
  upgradeBtnText: { color: "#ffffff", fontWeight: "600" },
})
