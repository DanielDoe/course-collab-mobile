import { useCallback, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { ScrollView } from "react-native-gesture-handler"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useSession } from "../../context/SessionProvider"
import { ApiError, formatStudentModuleError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import {
  FLASHCARD_DAILY_GOAL,
  type FlashcardDeck,
  type FlashcardGamificationProfile,
} from "../../lib/flashcards-api"
import {
  prepareTempDeckId,
  useCreateStudentFlashcardDeck,
  useStudentFlashcardDecks,
} from "../../hooks/query/useStudentFlashcards"
import { QueryRefreshBanner } from "../query/QueryRefreshBanner"
import { QuerySkeleton } from "../query/QuerySkeleton"
import { COMM_SYSTEM } from "../../constants/faculty-communication-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { PillSwipeTabs } from "../theme/PillSwipeTabs"
import { StudentSearchToolbar } from "../student/student-search-toolbar"
import { ModuleSection } from "../modules/ModuleScreen"
import { FlashcardDeckListCard } from "./FlashcardDeckListCard"
import {
  CommEmptyState,
  CommGroupedList,
  CommListRow,
  CommSectionFooter,
} from "../faculty/faculty-communication-ui"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { useModuleContentStyle } from "../../lib/responsive-layout"
import { useStudentShell } from "../../context/StudentShellContext"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import {
  flashcardDeckAccessMetaForAccess,
  flashcardUpgradeMessageForAccess,
  isFlashcardDeckStudyLockedForAccess,
  resolveFlashcardTierAccess,
} from "../../lib/flashcard-access"

type Tab = "all" | "course" | "mine" | "stats"
type DeckSource = "all" | "course" | "mine"

const FLASHCARD_TABS = [
  { id: "all", label: "All", icon: "layers-outline" as const },
  { id: "course", label: "Course", icon: "book-outline" as const },
  { id: "mine", label: "Mine", icon: "person-outline" as const },
  { id: "stats", label: "Stats", icon: "trophy-outline" as const },
]

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function GamificationPanel({ profile }: { profile: FlashcardGamificationProfile }) {
  const tokens = useAppThemeTokens()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const dailyGoal = profile.dailyGoal > 0 ? profile.dailyGoal : FLASHCARD_DAILY_GOAL

  return (
    <View style={styles.planPanel}>
      <View style={styles.planTop}>
        <View style={styles.planLevel}>
          <Ionicons name="trophy-outline" size={18} color={tokens.warning} />
          <Text style={[type.bodyEmphasis, { color: SN.label }]}>
            Level {profile.level.level} · {profile.level.title}
          </Text>
        </View>
        <Text style={[type.caption, { color: SN.secondaryLabel }]}>
          {profile.dailyStreakDays} day streak
        </Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: SN.fill }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(100, (profile.dailyProgress / dailyGoal) * 100)}%`,
              backgroundColor: tokens.accent,
            },
          ]}
        />
      </View>
      <Text style={[type.caption, { color: SN.secondaryLabel }]}>
        Daily goal · {profile.dailyProgress}/{dailyGoal} cards
        {profile.dailyGoalMet ? " · goal met!" : ""}
      </Text>
    </View>
  )
}

export function FlashcardsHomeScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const scrollPad = useModuleScrollContentPadding()
  const moduleContentStyle = useModuleContentStyle()
  const insets = useSafeAreaInsets()
  const { membershipTier, membershipTierLoaded } = useStudentShell()

  const [tab, setTab] = useState<Tab>("all")
  const [search, setSearch] = useState("")
  const decksQuery = useStudentFlashcardDecks(session)
  const createDeckMutation = useCreateStudentFlashcardDeck(session)
  const courseDecks = decksQuery.courseDecks
  const myDecks = decksQuery.myDecks
  const courseTierAccess = decksQuery.studySettings?.tierAccess ?? null
  const profile = decksQuery.profile
  const deckMastery = decksQuery.deckMastery
  const leaderboard = decksQuery.leaderboard
  const loading = decksQuery.isInitialLoading
  const refreshing = decksQuery.isRefreshing && !decksQuery.isInitialLoading
  const creating = createDeckMutation.isPending
  const error = decksQuery.error ? formatStudentModuleError(decksQuery.error, "Could not load flashcards.") : ""

  useNotificationModuleRefresh("flashcards", () => {
    void decksQuery.refetch()
  })

  const onRefresh = useCallback(async () => {
    await decksQuery.refetch()
  }, [decksQuery])

  const allDecks = useMemo(() => [...courseDecks, ...myDecks], [courseDecks, myDecks])

  function filterDecks(source: DeckSource): FlashcardDeck[] {
    const decks = source === "course" ? courseDecks : source === "mine" ? myDecks : allDecks
    const q = search.trim().toLowerCase()
    if (!q) return decks
    return decks.filter(
      (deck) =>
        deck.title.toLowerCase().includes(q) ||
        deck.description.toLowerCase().includes(q) ||
        (deck.topic?.toLowerCase().includes(q) ?? false),
    )
  }

  function deckSourceCount(source: DeckSource): number {
    return source === "course" ? courseDecks.length : source === "mine" ? myDecks.length : allDecks.length
  }

  async function createDeck() {
    if (!session || creating) return
    const tempId = prepareTempDeckId()
    router.push(`/flashcards/${tempId}/edit`)
    try {
      const res = await createDeckMutation.mutateAsync({ tempId, title: "Untitled deck" })
      if (res.deck?.id && res.deck.id !== tempId) {
        router.replace(`/flashcards/${res.deck.id}/edit`)
      }
    } catch (err) {
      AppAlert.alert("Create failed", err instanceof ApiError ? err.message : "Try again.")
    }
  }

  const resolvedTierAccess = resolveFlashcardTierAccess(
    membershipTier,
    membershipTierLoaded,
    courseTierAccess,
  )

  function deckStudyLocked(deck: FlashcardDeck): boolean {
    if (!membershipTierLoaded || deck.cardCount <= 0) return false
    if (deck.deckKind === "student") return false
    return isFlashcardDeckStudyLockedForAccess(deck.cardCount, resolvedTierAccess)
  }

  function deckAccessMeta(deck: FlashcardDeck): string | null {
    if (!membershipTierLoaded || deck.cardCount <= 0) return null
    if (deck.deckKind === "student") return null
    return flashcardDeckAccessMetaForAccess(deck.cardCount, resolvedTierAccess)
  }

  function openDeck(deck: FlashcardDeck) {
    if (deck.cardCount <= 0) {
      if (deck.canEdit) {
        router.push(`/flashcards/${deck.id}/edit`)
      } else {
        AppAlert.alert("Empty deck", "This deck has no cards yet.")
      }
      return
    }

    if (deckStudyLocked(deck)) {
      AppAlert.alert(
        "Flashcards locked",
        flashcardUpgradeMessageForAccess(resolvedTierAccess),
        [
          { text: "Not now", style: "cancel" },
          { text: "View plans", onPress: () => router.push("/membership" as never) },
        ],
      )
      return
    }

    router.push(`/flashcards/${deck.id}`)
  }

  const searchPlaceholder =
    tab === "course"
      ? "Search course decks…"
      : tab === "mine"
        ? "Search my decks…"
        : "Search decks…"

  const pageScrollStyle = useMemo(
    () => ({
      ...moduleContentStyle,
      paddingBottom: scrollPad.paddingBottom,
      gap: 12 as const,
      flexGrow: 1,
    }),
    [moduleContentStyle, scrollPad.paddingBottom],
  )

  function renderResultsBar(source: DeckSource) {
    if (!search.trim()) return null
    const visible = filterDecks(source)
    const total = deckSourceCount(source)
    return (
      <View style={styles.resultsBar}>
        <Text style={[type.caption, styles.resultsText, { color: SN.secondaryLabel }]}>
          {visible.length} of {total} deck{total === 1 ? "" : "s"}
          {` matching “${search.trim()}”`}
        </Text>
        <Pressable onPress={() => setSearch("")} hitSlop={8}>
          <Text style={[styles.clearBtn, { color: tokens.accent }]}>Clear</Text>
        </Pressable>
      </View>
    )
  }

  function renderDeckList(source: DeckSource) {
    const visibleDecks = filterDecks(source)
    const total = deckSourceCount(source)

    if (visibleDecks.length === 0) {
      return (
        <CommEmptyState
          icon="layers-outline"
          title={total === 0 ? "No decks" : "No matches"}
          body={
            total === 0
              ? "Tap + in the search bar to create a deck, or wait for instructor course decks."
              : "Try a different search term."
          }
        />
      )
    }

    return (
      <>
        <View style={styles.deckList}>
          {visibleDecks.map((deck) => {
            const mastery = deckMastery[String(deck.id)]
            const studyLocked = deckStudyLocked(deck)
            const accessMeta = deckAccessMeta(deck)
            return (
              <FlashcardDeckListCard
                key={`deck-${deck.id}`}
                deck={deck}
                masteryPct={mastery?.pct}
                studyLocked={studyLocked}
                accessMeta={accessMeta}
                onPress={() => openDeck(deck)}
                onEdit={
                  deck.canEdit ? () => router.push(`/flashcards/${deck.id}/edit`) : undefined
                }
              />
            )
          })}
        </View>
        <CommSectionFooter>Tap a deck to study. Use + to create your own deck.</CommSectionFooter>
      </>
    )
  }

  function renderDeckPage(source: DeckSource) {
    if (loading) {
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
        {profile ? (
          <ModuleSection title="Daily Progress">
            <GamificationPanel profile={profile} />
          </ModuleSection>
        ) : null}
        {renderResultsBar(source)}
        {renderDeckList(source)}
      </ScrollView>
    )
  }

  function renderStatsPage() {
    if (loading && !refreshing) {
      return (
        <View style={styles.pageCenter}>
          <ActivityIndicator size="large" color={tokens.accent} />
          <Text style={[type.caption, { color: SN.secondaryLabel }]}>Loading stats…</Text>
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
        {profile ? (
          <ModuleSection title="Your Stats">
            <View style={styles.statsSummary}>
              <Text style={[type.bodyEmphasis, { color: SN.label }]}>
                {profile.totalMastered} cards mastered · {profile.weeklyMastered} this week
              </Text>
              <Text style={[type.caption, { color: SN.secondaryLabel, marginTop: 4 }]}>
                Next level at {profile.level.nextLevelAt ?? "max"} cards
              </Text>
            </View>
          </ModuleSection>
        ) : null}

        {leaderboard.length === 0 ? (
          <CommEmptyState
            icon="trophy-outline"
            title="No leaderboard data"
            body="Study flashcards to appear on the weekly board."
          />
        ) : (
          <>
            <CommGroupedList>
              {leaderboard.map((row, index) => (
                <CommListRow
                  key={row.rank}
                  title={row.isCurrentUser ? "You" : row.displayName}
                  subtitle={`${row.cardsMastered} cards mastered`}
                  meta={`#${row.rank}`}
                  icon="ribbon-outline"
                  iconColor={row.isCurrentUser ? SN.accent : COMM_SYSTEM.gray.color}
                  iconSoft={row.isCurrentUser ? SN.accentSoft : COMM_SYSTEM.gray.soft}
                  showChevron={false}
                  isLast={index === leaderboard.length - 1}
                />
              ))}
            </CommGroupedList>
            <CommSectionFooter>Rankings refresh weekly based on cards mastered.</CommSectionFooter>
          </>
        )}
      </ScrollView>
    )
  }

  if (!session) {
    return (
      <View style={[styles.root, { backgroundColor: native.groupedBackground, paddingBottom: insets.bottom }]}>
        <CommEmptyState
          icon="layers-outline"
          title="Sign in required"
          body="Flashcards are available after you sign in as a student."
        />
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <View style={[styles.moduleCanvas, moduleContentStyle]}>
        <View
          style={[
            styles.chrome,
            {
              paddingTop: scrollPad.paddingTop ?? NATIVE.pagePadding,
              paddingHorizontal: NATIVE.pagePadding,
            },
          ]}
        >
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: native.secondaryGrouped }]}>
            <Text style={[type.destructive, styles.errorText]}>{error}</Text>
          </View>
        ) : null}

        {tab !== "stats" ? (
          <StudentSearchToolbar
            value={search}
            onChange={setSearch}
            placeholder={searchPlaceholder}
            showFilter={false}
            trailingAction={{
              onPress: () => void createDeck(),
              accessibilityLabel: "Create deck",
              icon: "add",
            }}
          />
        ) : null}
      </View>

      <PillSwipeTabs
        options={[...FLASHCARD_TABS]}
        value={tab}
        onChange={(value) => setTab(value as Tab)}
        pagePaddingHorizontal={NATIVE.pagePadding}
        pages={[
          renderDeckPage("all"),
          renderDeckPage("course"),
          renderDeckPage("mine"),
          renderStatsPage(),
        ]}
      />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  moduleCanvas: {
    flex: 1,
    width: "100%",
  },
  chrome: {
    gap: 12,
    paddingBottom: 4,
  },
  errorBox: {
    padding: 12,
    borderRadius: NATIVE.sectionRadius,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  pageScroll: {
    flex: 1,
  },
  pageCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 48,
  },
  deckList: {
    gap: 10,
  },
  resultsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 2,
  },
  resultsText: { flex: 1, lineHeight: 18 },
  clearBtn: { fontSize: 13, fontWeight: "600" },
  planPanel: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
  },
  planTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  planLevel: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 999 },
  statsSummary: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
})
