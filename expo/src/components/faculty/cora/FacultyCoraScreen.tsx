import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useBlockStackBackWhile } from "../../navigation/ModuleNestedBackHandler"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppThemeTokens } from "../../../context/AppearanceProvider"
import { useFacultyDisplayName } from "../../../hooks/useFacultyDisplayName"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { useFacultyShell } from "../../../context/FacultyShellContext"
import { useFacultyCoraInstructorContext } from "../../../hooks/useFacultyCoraInstructorContext"
import { FacultyCoraContextProvider } from "../../../context/FacultyCoraContextProvider"
import { ApiError } from "../../../lib/api"
import { useModuleTheme } from "../../../lib/themed-module-shell"
import { CommEmptyState, CommGroupedList, CommListRow, CommSectionFooter } from "../faculty-communication-ui"
import { DashboardWelcomeCard } from "../../dashboard/DashboardWelcomeCard"
import { CoraBrand } from "../../cora/CoraBrand"
import { CoraHubEnter } from "../../cora/CoraHubEnter"
import { CoraLoadingMark } from "../../cora/CoraLoadingMark"
import {
  FACULTY_CORA_GREETING,
  FACULTY_CORA_TAGLINE,
  type FacultyCoraCapability,
  type FacultyCoraCapabilityId,
} from "../../../lib/faculty-cora-config"
import { facultyCoraApi, type FacultyCoraInsight } from "../../../lib/faculty-cora-api"
import { FacultyCoraCapabilitySheet } from "./FacultyCoraCapabilitySheet"
import { FacultyCoraImmersiveChat } from "./FacultyCoraImmersiveChat"
import { resolveImproveImportHint, type FacultyCoraImportHint } from "../../../lib/faculty-cora-question-import"
import { FacultyCoraSetupOverlay } from "./FacultyCoraSetupOverlay"
import { FacultyCoraExitDock } from "./FacultyCoraExitDock"
import { SolidListThumbTile } from "../../theme/SolidListThumbTile"
import { inferFacultyCoraDiscipline } from "../../../lib/faculty-cora-discipline"
import { NATIVE } from "../../../constants/faculty-native-theme"
import {
  FACULTY_CORA_COLOR,
  facultyCoraActionColors,
  facultyCoraCanvas,
  facultyCoraCapabilityAccent,
  facultyCoraCardSurface,
  facultyCoraInsightAccent,
  facultyCoraMaterialCardStyle,
} from "../../../lib/faculty-cora-theme"

const EXIT_DOCK_HEIGHT = 72
const CAPABILITY_GRID_GAP = 12
const CAPABILITY_CARD_PADDING = 14
const CAPABILITY_CARD_GAP = 8
const CAPABILITY_ICON_SIZE = 30
const CAPABILITY_ICON_MARGIN = 2
const CAPABILITY_TITLE_LINE_HEIGHT = 22
const CAPABILITY_TAGLINE_LINE_HEIGHT = 18
const CAPABILITY_TAGLINE_LINES = 3
const CAPABILITY_TAGLINE_BLOCK_HEIGHT = CAPABILITY_TAGLINE_LINE_HEIGHT * CAPABILITY_TAGLINE_LINES
const CAPABILITY_CARD_HEIGHT =
  CAPABILITY_CARD_PADDING * 2 +
  CAPABILITY_ICON_SIZE +
  CAPABILITY_ICON_MARGIN +
  CAPABILITY_CARD_GAP +
  CAPABILITY_TITLE_LINE_HEIGHT +
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
  onPress,
  cardBg,
  materialStyle,
}: {
  capability: FacultyCoraCapability
  onPress: () => void
  cardBg: string
  materialStyle: ViewStyle
}) {
  const { native, type } = useModuleTheme()
  const accent = facultyCoraCapabilityAccent(capability.id)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        localStyles.capCard,
        materialStyle,
        {
          backgroundColor: cardBg,
          opacity: pressed ? NATIVE.pressedOpacity : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${capability.label}: ${capability.tagline}`}
    >
      <SolidListThumbTile thumb={accent.thumb} icon={capability.icon} size="compact" style={localStyles.capIconTile} />
      <View style={localStyles.capTitleSlot}>
        <Text
          style={[type.bodyEmphasis, localStyles.capTitleText, { color: native.label }]}
          numberOfLines={1}
        >
          {capability.label}
        </Text>
      </View>
      <View style={localStyles.capTaglineSlot}>
        <Text
          style={[type.caption, localStyles.capTaglineText, { color: native.secondaryLabel }]}
          numberOfLines={CAPABILITY_TAGLINE_LINES}
        >
          {capability.tagline}
        </Text>
      </View>
    </Pressable>
  )
}

export function FacultyCoraScreen() {
  const router = useRouter()
  const { scope, ready, course, session } = useFacultyScope()
  const { courses } = useFacultyShell()
  const insets = useSafeAreaInsets()
  const { width: windowWidth } = useWindowDimensions()
  const { tokens, native, type } = useModuleTheme()
  const appTokens = useAppThemeTokens()
  const coraAction = useMemo(() => facultyCoraActionColors(appTokens), [appTokens])
  const capabilityCardWidth = Math.floor(
    (windowWidth - NATIVE.pagePadding * 2 - CAPABILITY_GRID_GAP) / 2,
  )
  const canvas = facultyCoraCanvas(appTokens.isDark, native.groupedBackground)
  const cardBg = facultyCoraCardSurface(native.secondaryGrouped)
  const materialStyle = facultyCoraMaterialCardStyle(appTokens.isDark, native.separator)
  const { displayName } = useFacultyDisplayName(session)

  const {
    status: contextStatus,
    setupStep,
    context: instructorContext,
    capabilities,
    error: contextError,
    retrySetup,
  } = useFacultyCoraInstructorContext({
    scope,
    course,
    courses,
    instructorName: displayName,
    enabled: Boolean(scope && course),
  })

  const contextReady = contextStatus === "ready"
  const showSetupOverlay = contextStatus === "loading" || contextStatus === "running"

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [offlineMode, setOfflineMode] = useState(false)
  const [insights, setInsights] = useState<FacultyCoraInsight[]>([])
  const [sheetCapability, setSheetCapability] = useState<FacultyCoraCapabilityId | null>(null)
  const [sheetPrompt, setSheetPrompt] = useState<string | undefined>()
  const [chatOpen, setChatOpen] = useState(false)
  const [chatCapability, setChatCapability] = useState<FacultyCoraCapabilityId | undefined>()
  const [chatPrompt, setChatPrompt] = useState<string | undefined>()
  const [chatImportHint, setChatImportHint] = useState<FacultyCoraImportHint | undefined>()
  const [chatStartFresh, setChatStartFresh] = useState(true)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion)
    return () => sub.remove()
  }, [])

  const bottomInset = insets.bottom + EXIT_DOCK_HEIGHT + 12

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace("/dashboard" as never)
  }, [router])

  const closeFacultyChat = useCallback(() => {
    setChatOpen(false)
    setChatPrompt(undefined)
    setChatImportHint(undefined)
    setChatStartFresh(false)
  }, [])

  useBlockStackBackWhile(chatOpen, closeFacultyChat)

  const loadInsights = useCallback(async () => {
    if (!scope) return
    setError("")
    try {
      const res = await facultyCoraApi.listInsights(scope)
      setInsights(res.insights ?? [])
      setOfflineMode(Boolean(res.offline))
    } catch (err) {
      setInsights([])
      setOfflineMode(false)
      setError(err instanceof ApiError ? err.message : "Could not load insights.")
    }
  }, [scope])

  useEffect(() => {
    if (!ready || !scope || !contextReady) return
    setLoading(true)
    void loadInsights().finally(() => setLoading(false))
  }, [ready, scope, contextReady, loadInsights])

  useEffect(() => {
    if (!course?.id) return
    setChatOpen(false)
    setSheetCapability(null)
    setSheetPrompt(undefined)
    setInsights([])
  }, [course?.id])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await loadInsights()
    } finally {
      setRefreshing(false)
    }
  }, [loadInsights])

  const openChat = useCallback(
    (
      capabilityId?: FacultyCoraCapabilityId,
      prompt?: string,
      options?: { resume?: boolean; importHint?: FacultyCoraImportHint },
    ) => {
      setChatCapability(capabilityId)
      setChatPrompt(prompt)
      setChatImportHint(
        options?.importHint ??
          (capabilityId === "improve" && prompt ? resolveImproveImportHint(prompt) : undefined),
      )
      setChatStartFresh(!options?.resume)
      setChatOpen(true)
    },
    [],
  )

  const courseLabel = useMemo(() => {
    if (!course) return ""
    return [course.course_code, course.course_title].filter(Boolean).join(" · ")
  }, [course])

  const setupDisciplineLabel = useMemo(() => {
    if (instructorContext?.activeCourseId === course?.id && instructorContext) {
      return instructorContext.discipline.label
    }
    if (!course) return undefined
    return inferFacultyCoraDiscipline([course.course_code, course.course_title]).label
  }, [course, instructorContext])

  const animateCards = contextReady
  let cardEnterIndex = 0
  const nextCardEnterIndex = () => cardEnterIndex++

  if (!session || !ready) {
    return (
      <View style={[localStyles.center, { backgroundColor: canvas }]}>
        <CoraLoadingMark color={FACULTY_CORA_COLOR.link} />
      </View>
    )
  }

  if (!scope || !course) {
    return (
      <View style={[localStyles.root, { backgroundColor: canvas }]}>
        <View style={[localStyles.center, localStyles.flex, { paddingTop: insets.top }]}>
          <CommEmptyState
            icon="school-outline"
            title="Select a course"
            body="Choose a course from the header to use Cora as your teaching copilot."
          />
        </View>
        <FacultyCoraExitDock onExit={goBack} />
      </View>
    )
  }

  if (contextStatus === "error") {
    return (
      <View style={[localStyles.root, { backgroundColor: canvas }]}>
        <View style={[localStyles.center, localStyles.flex, { paddingTop: insets.top, gap: 12 }]}>
          <CommEmptyState
            icon="alert-circle-outline"
            title="Cora setup failed"
            body={contextError ?? "Could not read course context."}
          />
          <Pressable onPress={() => void retrySetup()} style={[localStyles.retryBtn, { backgroundColor: FACULTY_CORA_COLOR.action }]}>
            <Text style={[type.bodyEmphasis, { color: "#fff" }]}>Try again</Text>
          </Pressable>
        </View>
        <FacultyCoraExitDock onExit={goBack} />
      </View>
    )
  }

  return (
    <FacultyCoraContextProvider key={course.id} context={instructorContext} capabilities={capabilities}>
      <View style={[localStyles.root, { backgroundColor: canvas }]}>
        <FacultyCoraSetupOverlay
          visible={showSetupOverlay}
          activeStep={setupStep}
          courseLabel={courseLabel}
          disciplineLabel={setupDisciplineLabel}
        />

        {!contextReady && !showSetupOverlay ? (
          <View style={[localStyles.center, localStyles.flex, { paddingTop: insets.top }]}>
            <CoraLoadingMark color={FACULTY_CORA_COLOR.link} />
          </View>
        ) : null}

        {contextReady ? (
      <View
        style={localStyles.flex}
        pointerEvents={chatOpen ? "none" : "auto"}
        accessibilityElementsHidden={chatOpen}
        importantForAccessibility={chatOpen ? "no-hide-descendants" : "auto"}
      >
      <ScrollView
        style={localStyles.flex}
        contentContainerStyle={[
          localStyles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: bottomInset + 56 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={FACULTY_CORA_COLOR.link} />
        }
        keyboardShouldPersistTaps="handled"
      >
        <CoraHubEnter enabled={animateCards} index={nextCardEnterIndex()} reduceMotion={reduceMotion}>
          <DashboardWelcomeCard
            portal="faculty"
            animateEntry={false}
            name={`${greeting()}, ${displayName}`}
            roleLabel={FACULTY_CORA_TAGLINE}
            roleIcon="sparkles-outline"
            metaLine={[course.course_code, FACULTY_CORA_GREETING].filter(Boolean).join(" · ")}
            leading={<CoraBrand size="sm" variant="solid" color="#ffffff" />}
          />
        </CoraHubEnter>

        {offlineMode ? (
          <CoraHubEnter enabled={animateCards} index={nextCardEnterIndex()} reduceMotion={reduceMotion}>
            <View style={[localStyles.noticeBox, materialStyle, { backgroundColor: cardBg }]}>
              <Text style={[type.caption, { color: native.secondaryLabel }]}>
                Using course dashboard data until Cora server routes are live. Chat and AI tools may be limited.
              </Text>
            </View>
          </CoraHubEnter>
        ) : null}

        {error ? (
          <CoraHubEnter enabled={animateCards} index={nextCardEnterIndex()} reduceMotion={reduceMotion}>
            <View style={[localStyles.noticeBox, materialStyle, { backgroundColor: `${tokens.danger}10` }]}>
              <Text style={[type.caption, { color: tokens.danger }]}>{error}</Text>
            </View>
          </CoraHubEnter>
        ) : null}

        {loading ? (
          <View style={localStyles.loadingBox}>
            <ActivityIndicator color={FACULTY_CORA_COLOR.link} />
          </View>
        ) : insights.length > 0 ? (
          <CoraHubEnter enabled={animateCards} index={nextCardEnterIndex()} reduceMotion={reduceMotion}>
            <>
              <Text style={[type.sectionHeader, localStyles.sectionTitle, { color: native.secondaryLabel }]}>
                This week
              </Text>
              <View style={[localStyles.groupCard, materialStyle, { backgroundColor: cardBg }]}>
                <CommGroupedList>
                  {insights.map((insight, index) => {
                    const insightAccent = facultyCoraInsightAccent(insight.severity, appTokens.isDark)
                    return (
                      <CommListRow
                        key={insight.id}
                        title={insight.title}
                        subtitle={insight.body}
                        subtitleLines={3}
                        icon={
                          insight.severity === "warning"
                            ? "alert-circle-outline"
                            : insight.severity === "success"
                              ? "checkmark-circle-outline"
                              : "sparkles-outline"
                        }
                        iconColor={insightAccent.color}
                        iconSoft={insightAccent.soft}
                        onPress={() => {
                          setRefreshing(false)
                          if (insight.capabilityId) {
                            setSheetPrompt(insight.body)
                            setSheetCapability(insight.capabilityId)
                          } else {
                            setSheetPrompt(insight.body)
                            setSheetCapability("insights")
                          }
                        }}
                        isLast={index === insights.length - 1}
                      />
                    )
                  })}
                </CommGroupedList>
              </View>
            </>
          </CoraHubEnter>
        ) : null}

        <CoraHubEnter enabled={animateCards} index={nextCardEnterIndex()} reduceMotion={reduceMotion}>
          <Text style={[type.sectionHeader, localStyles.sectionTitle, { color: native.secondaryLabel }]}>
            Capabilities
          </Text>
        </CoraHubEnter>
        <View style={localStyles.grid}>
          {capabilities.map((capability) => (
            <CoraHubEnter
              key={capability.id}
              enabled={animateCards}
              index={nextCardEnterIndex()}
              reduceMotion={reduceMotion}
              style={[localStyles.gridItem, { width: capabilityCardWidth, height: CAPABILITY_CARD_HEIGHT }]}
            >
              <CapabilityCard
                capability={capability}
                cardBg={cardBg}
                materialStyle={materialStyle}
                onPress={() => {
                  setRefreshing(false)
                  setSheetPrompt(undefined)
                  setSheetCapability(capability.id)
                }}
              />
            </CoraHubEnter>
          ))}
        </View>

        <CoraHubEnter enabled={animateCards} index={nextCardEnterIndex()} reduceMotion={reduceMotion}>
          <CommSectionFooter>
            Cora can draft and recommend changes for teaching content. Apply edits in the relevant module. Billing,
            membership, and platform admin settings stay in Administration.
          </CommSectionFooter>
        </CoraHubEnter>
      </ScrollView>

      <Pressable
        onPress={() => openChat("assistant", undefined, { resume: true })}
        style={[
          localStyles.fab,
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

      <FacultyCoraExitDock onExit={goBack} />
      </View>
        ) : null}

      {contextReady ? (
      <FacultyCoraCapabilitySheet
        visible={sheetCapability != null}
        capabilityId={sheetCapability}
        suggestedPrompt={sheetPrompt}
        onClose={() => {
          setSheetCapability(null)
          setSheetPrompt(undefined)
        }}
        onStartChat={(id, prompt) => {
          setSheetCapability(null)
          setSheetPrompt(undefined)
          openChat(id, prompt, { resume: true })
        }}
      />
      ) : null}

      {chatOpen && scope && session ? (
        <FacultyCoraImmersiveChat
          scope={scope}
          session={session}
          capabilityId={chatCapability}
          initialPrompt={chatPrompt}
          initialImportHint={chatImportHint}
          startFresh={chatStartFresh}
          onClose={() => {
            setChatOpen(false)
            setChatPrompt(undefined)
            setChatImportHint(undefined)
            setChatStartFresh(false)
          }}
        />
      ) : null}
      </View>
    </FacultyCoraContextProvider>
  )
}

const localStyles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  scroll: { paddingHorizontal: NATIVE.pagePadding, gap: 14 },
  noticeBox: {
    borderRadius: 14,
    padding: 14,
  },
  loadingBox: { paddingVertical: 24, alignItems: "center" },
  sectionTitle: { paddingHorizontal: 4, marginTop: 2 },
  groupCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CAPABILITY_GRID_GAP,
  },
  gridItem: {
    flexGrow: 0,
    flexShrink: 0,
  },
  capCard: {
    width: "100%",
    height: CAPABILITY_CARD_HEIGHT,
    borderRadius: 16,
    padding: CAPABILITY_CARD_PADDING,
    gap: CAPABILITY_CARD_GAP,
  },
  capTitleSlot: {
    height: CAPABILITY_TITLE_LINE_HEIGHT,
    justifyContent: "center",
  },
  capTitleText: {
    lineHeight: CAPABILITY_TITLE_LINE_HEIGHT,
  },
  capTaglineSlot: {
    height: CAPABILITY_TAGLINE_BLOCK_HEIGHT,
    overflow: "hidden",
  },
  capTaglineText: {
    lineHeight: CAPABILITY_TAGLINE_LINE_HEIGHT,
  },
  capIconTile: {
    width: CAPABILITY_ICON_SIZE,
    height: CAPABILITY_ICON_SIZE,
    marginBottom: CAPABILITY_ICON_MARGIN,
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
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
})
