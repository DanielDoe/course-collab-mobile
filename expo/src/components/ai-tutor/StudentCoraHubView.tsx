import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AccessibilityInfo,
  ActivityIndicator,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { CommEmptyState, CommGroupedList, CommListRow, CommSectionFooter } from "../faculty/faculty-communication-ui"
import { DashboardWelcomeCard } from "../dashboard/DashboardWelcomeCard"
import { CoraBrand } from "../cora/CoraBrand"
import { CoraHubEnter } from "../cora/CoraHubEnter"
import { CoraLoadingMark } from "../cora/CoraLoadingMark"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { NATIVE } from "../../constants/faculty-native-theme"
import { navigateCoraRecommendationLink } from "../../lib/cora/resolve-open-route"
import { useAuthFlowContentStyle, useModuleContentStyle, useResponsiveGridColumns } from "../../lib/responsive-layout"
import {
  STUDENT_CORA_COLOR,
  studentCoraActionColors,
  studentCoraCanvas,
  studentCoraCardSurface,
  studentCoraMaterialCardStyle,
} from "../../lib/student-cora-theme"
import {
  STUDENT_CORA_EXPLORE,
  STUDENT_CORA_GREETING,
  STUDENT_CORA_TAGLINE,
  type StudentCoraCapability,
  type StudentCoraCapabilityId,
} from "../../lib/student-cora-config"
import type { StudentCoraSetupStepId } from "../../lib/student-cora-context"
import {
  CORA_HOME_CREDITS_THUMB,
  coraHomeQuickActionThumb,
} from "../../lib/cora-home-theme"
import { CORA_SUBTITLE } from "../../lib/cora-constants"
import type { AiTutorRecommendation } from "../../lib/ai-tutor-api"
import type { StudentSession } from "../../lib/session"
import type { CoraSectionId } from "../../lib/cora-nav-config"
import { StudentCoraCapabilitySheet } from "./StudentCoraCapabilitySheet"
import { StudentCoraSetupOverlay } from "./StudentCoraSetupOverlay"
import { StudentCoraExitDock } from "./StudentCoraExitDock"

const EXIT_DOCK_HEIGHT = 72
const TODAY_PAGE_SIZE = 3
const CAPABILITY_GRID_GAP = 12
const CAPABILITY_CARD_PADDING = 14
const CAPABILITY_CARD_GAP = 8
const CAPABILITY_ICON_SIZE = 30
const CAPABILITY_ICON_MARGIN = 2
const CAPABILITY_TITLE_LINE_HEIGHT = 22
const CAPABILITY_TITLE_LINES = 2
const CAPABILITY_TITLE_BLOCK_HEIGHT = CAPABILITY_TITLE_LINE_HEIGHT * CAPABILITY_TITLE_LINES
const CAPABILITY_TAGLINE_LINE_HEIGHT = 18
const CAPABILITY_TAGLINE_LINES = 2
const CAPABILITY_TAGLINE_BLOCK_HEIGHT = CAPABILITY_TAGLINE_LINE_HEIGHT * CAPABILITY_TAGLINE_LINES
const CAPABILITY_CARD_HEIGHT =
  CAPABILITY_CARD_PADDING * 2 +
  CAPABILITY_ICON_SIZE +
  CAPABILITY_ICON_MARGIN +
  CAPABILITY_CARD_GAP +
  CAPABILITY_TITLE_BLOCK_HEIGHT +
  CAPABILITY_CARD_GAP +
  CAPABILITY_TAGLINE_BLOCK_HEIGHT

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function CapabilityCard({
  capability,
  index,
  onPress,
  cardBg,
  materialStyle,
}: {
  capability: StudentCoraCapability
  index: number
  onPress: () => void
  cardBg: string
  materialStyle: ViewStyle
}) {
  const { native, type } = useModuleTheme()
  const thumb = coraHomeQuickActionThumb(capability.id, index)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.capCard,
        materialStyle,
        {
          backgroundColor: cardBg,
          opacity: pressed ? NATIVE.pressedOpacity : 1,
          height: CAPABILITY_CARD_HEIGHT,
        },
      ]}
      accessibilityLabel={`${capability.label}: ${capability.tagline}`}
    >
      <SolidListThumbTile thumb={thumb} icon={capability.icon} size="compact" style={styles.capIconTile} />
      <View style={styles.capTitleSlot}>
        <Text
          style={[type.bodyEmphasis, styles.capTitleText, { color: native.label }]}
          numberOfLines={2}
        >
          {capability.label}
        </Text>
      </View>
      <View style={styles.capTaglineSlot}>
        <Text
          style={[type.caption, styles.capTaglineText, { color: native.secondaryLabel }]}
          numberOfLines={CAPABILITY_TAGLINE_LINES}
        >
          {capability.tagline}
        </Text>
      </View>
    </Pressable>
  )
}

function chunkTodayPages<T>(items: T[], pageSize: number): T[][] {
  if (items.length === 0) return []
  const pages: T[][] = []
  for (let index = 0; index < items.length; index += pageSize) {
    pages.push(items.slice(index, index + pageSize))
  }
  return pages
}

function TodayRecommendationsPager({
  recommendations,
  pageWidth,
  cardBg,
  materialStyle,
  onOpenChat,
  onNavigateRecommendation,
  onRecommendationPress,
}: {
  recommendations: AiTutorRecommendation[]
  pageWidth: number
  cardBg: string
  materialStyle: ViewStyle
  onOpenChat: () => void
  onNavigateRecommendation: (link: string) => boolean
  onRecommendationPress?: (rec: AiTutorRecommendation) => boolean
}) {
  const native = useModuleTheme().native
  const pages = useMemo(() => chunkTodayPages(recommendations, TODAY_PAGE_SIZE), [recommendations])
  const [pageIndex, setPageIndex] = useState(0)

  useEffect(() => {
    setPageIndex(0)
  }, [recommendations])

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth)
      setPageIndex(Math.min(Math.max(nextIndex, 0), pages.length - 1))
    },
    [pageWidth, pages.length],
  )

  if (pages.length === 0) return null

  return (
    <View style={styles.todayPagerWrap}>
      <FlatList
        data={pages}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => `today-page-${index}`}
        getItemLayout={(_, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
        onMomentumScrollEnd={handleScrollEnd}
        renderItem={({ item: page }) => (
          <View style={[styles.todayPagerPage, { width: pageWidth }]}>
            <View style={[styles.groupCard, materialStyle, { backgroundColor: cardBg }]}>
              <CommGroupedList>
                {page.map((rec, index) => (
                  <CommListRow
                    key={rec.id}
                    title={rec.title}
                    subtitle={rec.description}
                    icon="sparkles-outline"
                    iconColor={STUDENT_CORA_COLOR.link}
                    iconSoft={`${STUDENT_CORA_COLOR.link}18`}
                    onPress={() => {
                      if (onRecommendationPress?.(rec)) return
                      if (onNavigateRecommendation(rec.link)) return
                      onOpenChat()
                    }}
                    isLast={index === page.length - 1}
                  />
                ))}
              </CommGroupedList>
            </View>
          </View>
        )}
      />
      {pages.length > 1 ? (
        <View style={styles.todayPagerDots} accessibilityRole="tablist">
          {pages.map((_, index) => (
            <View
              key={`today-dot-${index}`}
              style={[
                styles.todayPagerDot,
                {
                  backgroundColor:
                    index === pageIndex ? STUDENT_CORA_COLOR.link : native.tertiaryLabel,
                  opacity: index === pageIndex ? 1 : 0.35,
                },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: index === pageIndex }}
            />
          ))}
        </View>
      ) : null}
    </View>
  )
}

type Props = {
  session: StudentSession
  creditsLabel: string
  creditsSubtitle?: string
  onCreditsPress?: () => void
  recommendations: AiTutorRecommendation[]
  loading: boolean
  refreshing: boolean
  onRefresh: () => void
  onExit: () => void
  onOpenChat: () => void
  onExploreSection: (section: CoraSectionId) => void
  onCapabilityAction: (capability: StudentCoraCapability, prompt?: string) => void
  onTodayRecommendationPress?: (rec: AiTutorRecommendation) => boolean
  contextReady: boolean
  showSetupOverlay: boolean
  setupStep: StudentCoraSetupStepId
  courseLabel?: string
  focusLabel?: string
  capabilities: StudentCoraCapability[]
  contextError?: string | null
  onRetrySetup?: () => void
}

export function StudentCoraHubView({
  session,
  creditsLabel,
  creditsSubtitle = "Monthly Cora Credits",
  onCreditsPress,
  recommendations,
  loading,
  refreshing,
  onRefresh,
  onExit,
  onOpenChat,
  onExploreSection,
  onCapabilityAction,
  onTodayRecommendationPress,
  contextReady,
  showSetupOverlay,
  setupStep,
  courseLabel,
  focusLabel,
  capabilities,
  contextError,
  onRetrySetup,
}: Props) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const moduleContentStyle = useModuleContentStyle()
  const { columnWidth: capabilityCardWidth, canvasWidth } = useResponsiveGridColumns({
    minColumnWidth: 168,
    maxColumns: 4,
    gap: CAPABILITY_GRID_GAP,
    horizontalPad: NATIVE.pagePadding * 2,
  })
  const todayPageWidth = canvasWidth - NATIVE.pagePadding * 2
  const { tokens, native, type } = useModuleTheme()
  const appTokens = useAppThemeTokens()
  const coraAction = useMemo(() => studentCoraActionColors(appTokens), [appTokens])
  const canvas = studentCoraCanvas(appTokens.isDark, native.groupedBackground)
  const cardBg = studentCoraCardSurface(native.secondaryGrouped)
  const materialStyle = studentCoraMaterialCardStyle(appTokens.isDark, native.separator)
  const firstName = session.name.split(" ")[0] ?? "there"

  const [sheetCapability, setSheetCapability] = useState<StudentCoraCapabilityId | null>(null)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion)
    return () => sub.remove()
  }, [])

  const animateCards = contextReady

  const bottomInset = insets.bottom + EXIT_DOCK_HEIGHT + 12

  let cardEnterIndex = 0
  const nextCardEnterIndex = () => cardEnterIndex++

  const heroMetaLine = [session.courseCode, STUDENT_CORA_GREETING].filter(Boolean).join(" · ")

  if (contextError) {
    return (
      <View style={[styles.root, { backgroundColor: canvas }]}>
        <View style={[styles.center, styles.flex, { paddingTop: insets.top, gap: 12 }]}>
          <CommEmptyState
            icon="alert-circle-outline"
            title="Cora setup failed"
            body={contextError}
          />
          {onRetrySetup ? (
            <Pressable
              onPress={onRetrySetup}
              style={[styles.retryBtn, { backgroundColor: coraAction.background }]}
            >
              <Text style={[type.bodyEmphasis, { color: coraAction.ink }]}>Try again</Text>
            </Pressable>
          ) : null}
        </View>
        <StudentCoraExitDock onExit={onExit} />
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: canvas }]}>
      <StudentCoraSetupOverlay
        visible={showSetupOverlay}
        activeStep={setupStep}
        courseLabel={courseLabel}
        focusLabel={focusLabel}
      />

      {!contextReady && !showSetupOverlay ? (
        <View style={[styles.center, styles.flex, { paddingTop: insets.top }]}>
          <CoraLoadingMark color={STUDENT_CORA_COLOR.link} />
        </View>
      ) : null}

      {contextReady ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scroll,
            moduleContentStyle,
            { paddingTop: insets.top + 12, paddingBottom: bottomInset + 56 },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={STUDENT_CORA_COLOR.link} />
          }
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        >
          <CoraHubEnter enabled={animateCards} index={nextCardEnterIndex()} reduceMotion={reduceMotion}>
            <DashboardWelcomeCard
              portal="student"
              animateEntry={false}
              name={`${greeting()}, ${firstName}`}
              roleLabel={STUDENT_CORA_TAGLINE}
              roleIcon="sparkles-outline"
              metaLine={heroMetaLine}
              leading={<CoraBrand size="sm" variant="solid" color="#ffffff" />}
            />
          </CoraHubEnter>

          <CoraHubEnter enabled={animateCards} index={nextCardEnterIndex()} reduceMotion={reduceMotion}>
            <Pressable
              onPress={onCreditsPress}
              style={[styles.noticeBox, materialStyle, { backgroundColor: cardBg }]}
            >
              <SolidListThumbTile thumb={CORA_HOME_CREDITS_THUMB} icon="sparkles-outline" size="compact" />
              <View style={styles.creditsCopy}>
                <Text style={[type.bodyEmphasis, { color: native.label }]}>{creditsLabel}</Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>{creditsSubtitle}</Text>
              </View>
              {onCreditsPress ? (
                <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
              ) : null}
            </Pressable>
          </CoraHubEnter>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={STUDENT_CORA_COLOR.link} />
            </View>
          ) : recommendations.length > 0 ? (
            <CoraHubEnter enabled={animateCards} index={nextCardEnterIndex()} reduceMotion={reduceMotion}>
              <>
                <Text style={[type.sectionHeader, styles.sectionTitle, { color: native.secondaryLabel }]}>
                  Today
                </Text>
                <TodayRecommendationsPager
                  recommendations={recommendations}
                  pageWidth={todayPageWidth}
                  cardBg={cardBg}
                  materialStyle={materialStyle}
                  onOpenChat={onOpenChat}
                  onNavigateRecommendation={(link) => navigateCoraRecommendationLink(router, link)}
                  onRecommendationPress={onTodayRecommendationPress}
                />
              </>
            </CoraHubEnter>
          ) : null}

          <CoraHubEnter enabled={animateCards} index={nextCardEnterIndex()} reduceMotion={reduceMotion}>
            <Text style={[type.sectionHeader, styles.sectionTitle, { color: native.secondaryLabel }]}>
              Capabilities
            </Text>
          </CoraHubEnter>
          <View style={styles.grid}>
            {capabilities.map((capability, index) => (
              <CoraHubEnter
                key={capability.id}
                enabled={animateCards}
                index={nextCardEnterIndex()}
                reduceMotion={reduceMotion}
                style={[styles.gridItem, { width: capabilityCardWidth }]}
              >
                <CapabilityCard
                  capability={capability}
                  index={index}
                  cardBg={cardBg}
                  materialStyle={materialStyle}
                  onPress={() => setSheetCapability(capability.id)}
                />
              </CoraHubEnter>
            ))}
          </View>

          <CoraHubEnter enabled={animateCards} index={nextCardEnterIndex()} reduceMotion={reduceMotion}>
            <>
              <Text style={[type.sectionHeader, styles.sectionTitle, { color: native.secondaryLabel }]}>
                Explore
              </Text>
              <View style={[styles.groupCard, materialStyle, { backgroundColor: cardBg }]}>
                <CommGroupedList>
                  {STUDENT_CORA_EXPLORE.map((item, index) => (
                    <CommListRow
                      key={item.id}
                      title={item.label}
                      subtitle={item.tagline}
                      icon={item.icon}
                      iconColor={STUDENT_CORA_COLOR.link}
                      iconSoft={`${STUDENT_CORA_COLOR.link}18`}
                      onPress={() => onExploreSection(item.section)}
                      isLast={index === STUDENT_CORA_EXPLORE.length - 1}
                    />
                  ))}
                </CommGroupedList>
              </View>
            </>
          </CoraHubEnter>

          {!loading && recommendations.length === 0 ? (
            <CoraHubEnter enabled={animateCards} index={nextCardEnterIndex()} reduceMotion={reduceMotion}>
              <CommEmptyState
                icon="sparkles-outline"
                title="Ready when you are"
                body="Start with a capability above or tap the chat button to ask Cora anything about your course."
              />
            </CoraHubEnter>
          ) : null}

          <CoraHubEnter enabled={animateCards} index={nextCardEnterIndex()} reduceMotion={reduceMotion}>
            <CommSectionFooter>{CORA_SUBTITLE}</CommSectionFooter>
          </CoraHubEnter>
        </ScrollView>
      ) : null}

      {contextReady ? (
        <Pressable
          onPress={onOpenChat}
          style={[
            styles.fab,
            NATIVE.raisedShadow,
            {
              backgroundColor: coraAction.background,
              bottom: insets.bottom + EXIT_DOCK_HEIGHT + 4,
            },
          ]}
          accessibilityLabel="Open Cora chat"
        >
          <Ionicons name="chatbubbles-outline" size={24} color={coraAction.ink} />
        </Pressable>
      ) : null}

      <StudentCoraExitDock onExit={onExit} />

      <StudentCoraCapabilitySheet
        visible={sheetCapability != null}
        capabilityId={sheetCapability}
        onClose={() => setSheetCapability(null)}
        onStart={(id, prompt) => {
          const capability = capabilities.find((item) => item.id === id)
          if (capability) onCapabilityAction(capability, prompt)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", paddingHorizontal: NATIVE.pagePadding },
  scroll: { paddingHorizontal: NATIVE.pagePadding, gap: 14 },
  noticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 14,
  },
  creditsCopy: { flex: 1, gap: 2 },
  loadingBox: { paddingVertical: 24, alignItems: "center" },
  sectionTitle: { paddingHorizontal: 4, marginTop: 2 },
  groupCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  todayPagerWrap: {
    gap: 10,
  },
  todayPagerPage: {
    flexShrink: 0,
  },
  todayPagerDots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 2,
  },
  todayPagerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CAPABILITY_GRID_GAP,
  },
  gridItem: {
    flexGrow: 0,
  },
  capCard: {
    width: "100%",
    borderRadius: 16,
    padding: CAPABILITY_CARD_PADDING,
    gap: CAPABILITY_CARD_GAP,
  },
  capIconTile: {
    marginBottom: CAPABILITY_ICON_MARGIN,
  },
  capTitleSlot: {
    minHeight: CAPABILITY_TITLE_BLOCK_HEIGHT,
    justifyContent: "flex-start",
  },
  capTitleText: {
    lineHeight: CAPABILITY_TITLE_LINE_HEIGHT,
  },
  capTaglineSlot: {
    minHeight: CAPABILITY_TAGLINE_BLOCK_HEIGHT,
    justifyContent: "flex-start",
  },
  capTaglineText: {
    lineHeight: CAPABILITY_TAGLINE_LINE_HEIGHT,
  },
  fab: {
    position: "absolute",
    right: NATIVE.pagePadding,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  retryBtn: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
})
