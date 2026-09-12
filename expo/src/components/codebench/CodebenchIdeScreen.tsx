import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { safeRouterBack } from "../../lib/safe-router-back"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useModuleContentTopPadding } from "../../context/ChromeInsetContext"
import { useSession } from "../../context/SessionProvider"
import { useStudentShell } from "../../context/StudentShellContext"
import { hasNavAccess } from "../../constants/student-nav"
import { prepareCoraRequest } from "../../lib/cora-rbac"
import { filterCoraOutput } from "../../lib/cora-security/output-filter"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { hexToRgba } from "../../constants/app-themes"
import { NATIVE } from "../../constants/faculty-native-theme"
import {
  CODEBENCH_LANGUAGES,
  LEARNING_MODE_OPTIONS,
  getCodebenchLanguage,
  type CodebenchLanguageId,
  type CodebenchLearningMode,
} from "../../constants/codebench-languages"
import { codebenchAiFailureMessage, codebenchApi,
  type ClassroomAssignmentOption,
  type CodebenchEvaluateQuestion,
  type DailyChallenge,
} from "../../lib/codebench-api"
import { CODEBENCH_CPP_WALKTHROUGH_SAMPLE } from "../../lib/codebench-samples"
import { consumePendingDailyChallenge } from "../../lib/codebench-daily-challenge-pending"
import { filterOpenCodeClassroomAssignments } from "../../lib/codebench-classroom-assignments"
import { shortenTaskTitle } from "../../lib/classroom-submission"
import { rewardsApi } from "../../lib/rewards-api"
import { formatDailyChallengeProblem } from "../../lib/codebench-daily-challenge-problem"
import { enrichReplaySteps, type CodeReplayStep } from "../../lib/codebench-replay"
import {
  awardCodebenchXp,
  codebenchLevel,
  loadCodebenchLanguageId,
  loadCodebenchLearningMode,
  loadCodebenchXp,
  saveCodebenchLanguageId,
  saveCodebenchLatestCode,
  saveCodebenchLearningMode,
} from "../../lib/codebench-prefs"
import { ApiError } from "../../lib/student-api"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  useCodebenchAiPanelMinHeight,
  useCodebenchEditorMinHeight,
} from "../../lib/responsive-layout"
import { buildProblemContextForApi, type CoraComposerAttachment } from "../../lib/cora-composer-attachments"
import type { CoraImportedProblem } from "../../lib/cora-api"
import { CoraThinkingIndicator } from "../ai-tutor/CoraThinkingIndicator"
import { CoraToolPickerCard, CoraToolPickerList } from "../ai-tutor/CoraToolPickerCard"
import { CoraBrand } from "../cora/CoraBrand"
import { CodebenchAiFullscreenShell } from "./CodebenchAiFullscreenShell"
import { CodebenchAskCoraPanel } from "./CodebenchAskCoraPanel"
import { CodebenchWalkthroughPanel } from "./CodebenchWalkthroughPanel"
import { MarkdownContentWebView } from "../course-info/MarkdownContentWebView"
import { StudentThemedLocked } from "../student/student-themed-hero"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import { GlassSheetHandle } from "../theme/GlassActionSheetMenu"
import { useAuthNestedBack } from "../navigation/useAuthNestedBack"

type ToolId =
  | "explain"
  | "walkthrough"
  | "debug"
  | "improve"
  | "pseudocode"
  | "tutor"
  | "practice"
  | "evaluate"

type PanelMode = "idle" | "ready" | "result" | "walkthrough" | "tutor" | "practice" | "evaluate" | "xp"

type TutorMessage = { role: "user" | "assistant"; content: string }
type SheetKind = "language" | "mode" | "cora-tool" | "assignment" | null

const CORA_ACCENT = "#7C3AED"
const ACTION_BAR_PAD = 12
const CHIP_GAP = 8
const CHIP_HEIGHT = 44

const FULLSCREEN_AI_PANELS = new Set<PanelMode>(["result", "practice", "evaluate", "xp"])

const CORA_TOOLS: Array<{
  id: ToolId
  label: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
}> = [
  { id: "walkthrough", label: "Walkthrough", subtitle: "Step-by-step execution trace", icon: "play-circle-outline" },
  { id: "explain", label: "Explain", subtitle: "Overview and key concepts", icon: "bulb-outline" },
  { id: "debug", label: "Debug", subtitle: "Find and fix issues", icon: "bug-outline" },
  { id: "improve", label: "Improve", subtitle: "Refactor suggestions", icon: "sparkles-outline" },
  { id: "pseudocode", label: "Pseudocode", subtitle: "Algorithm outline", icon: "document-text-outline" },
  { id: "tutor", label: "Ask Cora", subtitle: "Chat about your code", icon: "chatbubbles-outline" },
  { id: "practice", label: "Practice", subtitle: "Generate a problem", icon: "fitness-outline" },
  { id: "evaluate", label: "Evaluate", subtitle: "Comprehension quiz", icon: "checkmark-done-outline" },
]

type IdeChipColors = {
  panel: string
  border: string
  title: string
  muted: string
  gold: string
  accent: string
}

function classroomPointDueLabel(expiresAt?: string | null): string {
  if (!expiresAt) return "Open now"
  const exp = new Date(expiresAt)
  if (!Number.isFinite(exp.getTime())) return "Open now"
  return `Due ${exp.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
}

function IdeSheetHeader({
  icon,
  title,
  subtitle,
  iconColor,
  iconBg,
  titleColor,
  subtitleColor,
  closeColor,
  closeBg,
  onClose,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  subtitle: string
  iconColor: string
  iconBg: string
  titleColor: string
  subtitleColor: string
  closeColor: string
  closeBg: string
  onClose: () => void
}) {
  return (
    <View style={styles.sheetHeader}>
      <View style={[styles.sheetHeaderIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.sheetHeaderCopy}>
        <Text style={[styles.sheetHeaderTitle, { color: titleColor }]}>{title}</Text>
        <Text style={[styles.sheetHeaderSubtitle, { color: subtitleColor }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
        hitSlop={8}
        style={[styles.sheetClose, { backgroundColor: closeBg }]}
      >
        <Ionicons name="close" size={16} color={closeColor} />
      </Pressable>
    </View>
  )
}

function IdeSheetChoice({
  icon,
  title,
  subtitle,
  active,
  colors,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  subtitle?: string
  active: boolean
  colors: IdeChipColors
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={[
        styles.sheetCard,
        {
          backgroundColor: active ? hexToRgba(colors.accent, 0.14) : hexToRgba(colors.title, 0.04),
          borderColor: active ? hexToRgba(colors.accent, 0.55) : colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.sheetCardIcon,
          { backgroundColor: active ? hexToRgba(colors.accent, 0.2) : hexToRgba(colors.gold, 0.16) },
        ]}
      >
        <Ionicons name={icon} size={18} color={active ? colors.accent : colors.gold} />
      </View>
      <View style={styles.sheetCardCopy}>
        <Text style={[styles.sheetCardTitle, { color: colors.title }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.sheetCardSubtitle, { color: colors.muted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {active ? (
        <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      )}
    </Pressable>
  )
}

function IdeToolbarChip({
  label,
  icon,
  onPress,
  colors,
  accessibilityLabel,
  iconColor,
  emphasized = false,
  showChevron = true,
  disabled = false,
  loading = false,
  width,
}: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  colors: IdeChipColors
  accessibilityLabel?: string
  iconColor?: string
  emphasized?: boolean
  showChevron?: boolean
  disabled?: boolean
  loading?: boolean
  width: number
}) {
  const fg = emphasized ? colors.accent : colors.title
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.gridChip,
        {
          width,
          backgroundColor: colors.panel,
          borderColor: emphasized ? colors.accent : colors.border,
          opacity: disabled ? 0.65 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Ionicons name={icon} size={16} color={iconColor ?? (emphasized ? colors.accent : colors.gold)} />
      )}
      <Text style={[styles.gridChipText, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
      {showChevron ? (
        <Ionicons name="chevron-down" size={14} color={colors.muted} />
      ) : (
        <View style={styles.gridChipSlot} />
      )}
    </Pressable>
  )
}

function formatToolResult(tool: ToolId, data: Record<string, unknown>): string {
  if (tool === "explain") return String(data.explanation ?? "No explanation returned.")
  if (tool === "debug") {
    const errors = Array.isArray(data.errors) ? data.errors.map(String) : []
    const fixes = Array.isArray(data.fixes) ? data.fixes.map(String) : []
    return [
      data.explanation ? String(data.explanation) : "",
      errors.length ? `### Issues\n\n${errors.map((e) => `- ${e}`).join("\n")}` : "",
      fixes.length ? `### Suggestions\n\n${fixes.map((f) => `- ${f}`).join("\n")}` : "",
      data.correctedCode ? `### Corrected code\n\n\`\`\`\n${String(data.correctedCode)}\n\`\`\`` : "",
    ]
      .filter(Boolean)
      .join("\n\n") || "No debug details returned."
  }
  if (tool === "improve") {
    const principles = Array.isArray(data.principles) ? data.principles.map(String) : []
    return [
      data.diffSummary ? String(data.diffSummary) : "",
      principles.length ? `### Principles\n\n${principles.map((p) => `- ${p}`).join("\n")}` : "",
      data.improvedCode ? `### Improved code\n\n\`\`\`\n${String(data.improvedCode)}\n\`\`\`` : "",
    ]
      .filter(Boolean)
      .join("\n\n") || "No improvements returned."
  }
  if (tool === "pseudocode") {
    return [
      data.algorithm ? `### Algorithm\n\n${String(data.algorithm)}` : "",
      data.pseudocode ? `### Pseudocode\n\n\`\`\`\n${String(data.pseudocode)}\n\`\`\`` : "",
      data.flowchart ? `### Flow\n\n${String(data.flowchart)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n") || "No pseudocode returned."
  }
  return "Done."
}

export function CodebenchIdeScreen() {
  const { session } = useSession()
  const { membershipTier, membershipTierLoaded } = useStudentShell()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const lockedTopPad = useModuleContentTopPadding(24)
  const isLocked = membershipTierLoaded && !hasNavAccess(membershipTier, "Trailblazer")
  const editorMinHeight = useCodebenchEditorMinHeight()
  const aiPanelMinHeight = useCodebenchAiPanelMinHeight()
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const pickerListMaxHeight = Math.round(Math.min(windowHeight * 0.5, 440))
  const chipWidth = (windowWidth - ACTION_BAR_PAD * 2 - CHIP_GAP) / 2
  const params = useLocalSearchParams<{ tool?: string }>()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()

  const [ready, setReady] = useState(false)
  const [languageId, setLanguageId] = useState<CodebenchLanguageId>("cpp")
  const [learningMode, setLearningMode] = useState<CodebenchLearningMode>("intermediate")
  const [codeByLang, setCodeByLang] = useState<Partial<Record<CodebenchLanguageId, string>>>({})
  const [xp, setXp] = useState(0)
  const [busy, setBusy] = useState(false)
  const [panel, setPanel] = useState<PanelMode>("ready")
  const [aiExpanded, setAiExpanded] = useState(false)
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [resultTitle, setResultTitle] = useState("")
  const [resultBody, setResultBody] = useState("")
  const [walkthroughSteps, setWalkthroughSteps] = useState<CodeReplayStep[]>([])
  const [walkthroughCode, setWalkthroughCode] = useState("")
  const [walkthroughIndex, setWalkthroughIndex] = useState(0)
  const [tutorInput, setTutorInput] = useState("")
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([])
  const [practiceProblem, setPracticeProblem] = useState("")
  const [activeDailyChallenge, setActiveDailyChallenge] = useState<DailyChallenge | null>(null)
  const [evalQuestions, setEvalQuestions] = useState<CodebenchEvaluateQuestion[]>([])
  const [evalIndex, setEvalIndex] = useState(0)
  const [evalAnswers, setEvalAnswers] = useState<string[]>([])
  const [assignments, setAssignments] = useState<ClassroomAssignmentOption[]>([])
  const [assignmentId, setAssignmentId] = useState("")
  const submittedAssignmentIdsRef = useRef(new Set<string>())
  const bootTool = useRef(typeof params.tool === "string" ? params.tool : "")
  const toolRunEpoch = useRef(0)

  const language = getCodebenchLanguage(languageId)
  const code = codeByLang[languageId] ?? language.defaultCode
  const level = codebenchLevel(xp)
  const xpInLevel = xp % 100
  const modeLabel = LEARNING_MODE_OPTIONS.find((m) => m.value === learningMode)?.label ?? "Intermediate"
  const selectedAssignment = assignments.find((a) => String(a.id) === assignmentId) ?? null
  const assignmentLabel = selectedAssignment
    ? shortenTaskTitle(selectedAssignment.title)
    : assignments.length > 0
      ? "Classroom points"
      : "No assignments"
  const canSubmitClassroom = /^\d+$/.test(assignmentId) && selectedAssignment != null
  const coraChipLabel =
    panel === "walkthrough"
      ? "Walkthrough"
      : panel === "tutor"
        ? "Ask Cora"
        : panel === "practice"
          ? "Practice"
          : panel === "evaluate"
            ? "Evaluate"
            : "Ask Cora"
  const studentFirstName = session?.name?.split(" ")[0] ?? "there"
  const tutorDisplayMessages = useMemo(
    () =>
      tutorMessages.filter(
        (m) =>
          !(
            m.role === "assistant" &&
            m.content.startsWith("Cora is ready. Ask about your code")
          ),
      ),
    [tutorMessages],
  )

  const inlineExpandedActive = useMemo(() => {
    if (!aiExpanded) return false
    if (panel === "idle" || panel === "tutor" || panel === "walkthrough") return false
    if (FULLSCREEN_AI_PANELS.has(panel)) return false
    return true
  }, [aiExpanded, panel])

  const collapseAiPanel = useCallback(() => setAiExpanded(false), [])

  const closeAiPanel = useCallback(() => {
    // Invalidate any tool request still in flight so its result cannot reopen the panel.
    toolRunEpoch.current += 1
    setBusy(false)
    setAiExpanded(false)
    setPracticeProblem("")
    setActiveDailyChallenge(null)
    setPanel("idle")
  }, [])

  /** Dismiss back to the editor with Cora options, cancelling any in-flight tool. */
  const dismissAiPanel = useCallback(() => {
    toolRunEpoch.current += 1
    setBusy(false)
    setAiExpanded(false)
    setPanel("ready")
  }, [])

  const handleInlineExpandedBack = useCallback(() => {
    collapseAiPanel()
  }, [collapseAiPanel])

  const inlineExpandedBackSwipe = useAuthNestedBack(
    inlineExpandedActive,
    handleInlineExpandedBack,
    insets.top,
  )

  // IDE surface — high-contrast dark canvas for code, themed chrome around it
  const ide = {
    canvas: tokens.isDark ? "#0B0F17" : "#111827",
    panel: tokens.isDark ? "#121826" : "#1F2937",
    gutter: tokens.isDark ? "#0E1420" : "#151C2C",
    border: tokens.isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.14)",
    title: "#F8FAFC",
    body: "#E2E8F0",
    muted: "#94A3B8",
    faint: "#64748B",
    accent: tokens.accent,
    gold: "#EAAA00",
  }

  const setCode = useCallback(
    (next: string) => {
      setCodeByLang((prev) => ({ ...prev, [languageId]: next }))
    },
    [languageId],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!session || session.portal !== "student") return
      if (membershipTierLoaded && !hasNavAccess(membershipTier, "Trailblazer")) {
        setReady(true)
        return
      }
      const [lang, mode, currentXp, classroom] = await Promise.all([
        loadCodebenchLanguageId(),
        loadCodebenchLearningMode(),
        loadCodebenchXp(),
        codebenchApi.getClassroomAssignments(session).catch(() => [] as ClassroomAssignmentOption[]),
      ])
      if (cancelled) return
      setLanguageId(lang)
      setLearningMode(mode)
      setXp(currentXp)
      setAssignments(
        filterOpenCodeClassroomAssignments(classroom, {
          excludeIds: submittedAssignmentIdsRef.current,
        }),
      )
      setCodeByLang((prev) => ({
        ...prev,
        [lang]: prev[lang] ?? getCodebenchLanguage(lang).defaultCode,
      }))
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [session, membershipTier, membershipTierLoaded])

  const toolPayload = useMemo(
    () => ({ code, language: language.apiLanguage, learningMode }),
    [code, language.apiLanguage, learningMode],
  )

  const requireCode = () => {
    if (!code.trim()) {
      AppAlert.alert("Add some code", "Write or paste code in the editor first.")
      return false
    }
    return true
  }

  function dropSubmittedAssignment(id: string) {
    submittedAssignmentIdsRef.current.add(id)
    setAssignments((prev) => prev.filter((row) => String(row.id) !== id))
    setAssignmentId((current) => (current === id ? "" : current))
  }

  async function reloadClassroomAssignments() {
    if (!session || session.portal !== "student") return
    const next = await codebenchApi.getClassroomAssignments(session).catch(() => [] as ClassroomAssignmentOption[])
    setAssignments(
      filterOpenCodeClassroomAssignments(next, { excludeIds: submittedAssignmentIdsRef.current }),
    )
  }

  const runWalkthrough = useCallback(
    async (codeOverride?: string) => {
      if (!session || session.portal !== "student") return
      if (membershipTierLoaded && !hasNavAccess(membershipTier, "Trailblazer")) return

      const codeToWalk =
        codeOverride ?? (code.trim().length >= 10 ? code : CODEBENCH_CPP_WALKTHROUGH_SAMPLE)

      if (codeToWalk === CODEBENCH_CPP_WALKTHROUGH_SAMPLE && code !== codeToWalk) {
        setLanguageId("cpp")
        setCodeByLang((prev) => ({ ...prev, cpp: codeToWalk }))
      }

      const replayLanguage =
        codeToWalk === CODEBENCH_CPP_WALKTHROUGH_SAMPLE ? "cpp" : language.apiLanguage

      const epoch = toolRunEpoch.current
      const dismissed = () => toolRunEpoch.current !== epoch

      setSheet(null)
      setPanel("walkthrough")
      setWalkthroughSteps([])
      setWalkthroughIndex(0)
      setWalkthroughCode(codeToWalk)
      setAiExpanded(true)
      setBusy(true)

      try {
        const res = await codebenchApi.replay(session, {
          code: codeToWalk,
          language: replayLanguage,
          learningMode,
        })
        if (dismissed()) return
        if (res.accessDenied) throw new ApiError("Trailblazer membership required.", 403)

        const steps = enrichReplaySteps(codeToWalk, res.steps ?? [])
        if (steps.length === 0) {
          throw new ApiError("No walkthrough steps returned. Try again with more complete code.", 500)
        }

        setWalkthroughSteps(steps)
        setXp(await awardCodebenchXp("explain"))
      } catch (err) {
        if (dismissed()) return
        AppAlert.alert("Walkthrough", codebenchAiFailureMessage(err, "Walkthrough failed."))
        setAiExpanded(false)
        setPanel("ready")
      } finally {
        if (!dismissed()) setBusy(false)
      }
    },
    [session, code, language.apiLanguage, learningMode, membershipTier, membershipTierLoaded],
  )

  const runTool = useCallback(
    async (tool: ToolId) => {
      if (!session || session.portal !== "student") return
      if (membershipTierLoaded && !hasNavAccess(membershipTier, "Trailblazer")) return
      if (tool === "tutor") {
        setPanel("tutor")
        setAiExpanded(true)
        return
      }
      if (tool === "walkthrough") {
        await runWalkthrough()
        return
      }
      if (!requireCode()) return
      const epoch = toolRunEpoch.current
      const dismissed = () => toolRunEpoch.current !== epoch
      setAiExpanded(true)
      setBusy(true)
      try {
        if (tool === "practice") {
          const prepared = prepareCoraRequest({
            session,
            tool: "code_assistant",
            prompt: code,
            membershipTier,
          })
          const res = await codebenchApi.aiTutor(session, {
            message: `Generate one ${learningMode} practice problem inspired by this ${language.apiLanguage} code. Reply with a clear problem statement, constraints, and sample input/output. Do not solve it.\n\n\`\`\`${language.apiLanguage}\n${code}\n\`\`\``,
            topic: "tutor",
            code,
            learningMode,
            isProblemGeneration: true,
            prepared,
          })
          if (dismissed()) return
          if (res.accessDenied || res.rbacBlocked) {
            throw new ApiError(res.blockReason ?? "Trailblazer membership required.", 403)
          }
          if (res.error?.trim()) {
            throw new ApiError(res.error.trim(), 500)
          }
          // Under an active attempt Cora refuses to generate practice. Say so instead
          // of rendering the refusal text as if it were the problem statement.
          if (res.examBlocked || res.assessmentIntegrity) {
            throw new ApiError(
              res.response?.trim() ||
                "Practice problems are paused while you have an assessment attempt in progress.",
              403,
            )
          }
          const generated = filterCoraOutput(res.response ?? "").text.trim()
          if (!generated) {
            throw new ApiError("No practice problem was generated. Try again with more complete code.", 500)
          }
          setActiveDailyChallenge(null)
          setPracticeProblem(generated)
          setPanel("practice")
          setXp(await awardCodebenchXp("practice"))
          return
        }

        if (tool === "evaluate") {
          const res = await codebenchApi.evaluate(session, toolPayload)
          if (dismissed()) return
          const questions = res.questions ?? []
          if (questions.length === 0) throw new ApiError("No evaluation questions returned.", 500)
          setEvalQuestions(questions)
          setEvalIndex(0)
          setEvalAnswers(Array(questions.length).fill(""))
          setPanel("evaluate")
          return
        }

        let data: Record<string, unknown> = {}
        if (tool === "explain") data = await codebenchApi.explain(session, toolPayload)
        else if (tool === "debug") data = await codebenchApi.debug(session, toolPayload)
        else if (tool === "improve") data = await codebenchApi.improve(session, toolPayload)
        else data = await codebenchApi.pseudocode(session, toolPayload)

        if (dismissed()) return
        if (data.accessDenied) throw new ApiError("Trailblazer membership required.", 403)
        setResultTitle(CORA_TOOLS.find((t) => t.id === tool)?.label ?? "Result")
        setResultBody(formatToolResult(tool, data))
        setPanel("result")
        setXp(await awardCodebenchXp(tool === "pseudocode" ? "pseudocode" : tool))
      } catch (err) {
        if (dismissed()) return
        AppAlert.alert("CodeBench", codebenchAiFailureMessage(err, "Request failed."))
        setAiExpanded(false)
      } finally {
        setBusy(false)
      }
    },
    [session, code, language.apiLanguage, learningMode, toolPayload, tutorMessages.length, runWalkthrough, membershipTier, membershipTierLoaded],
  )

  useEffect(() => {
    if (!ready || isLocked) return

    const pendingDailyChallenge = consumePendingDailyChallenge()
    if (pendingDailyChallenge) {
      bootTool.current = ""
      setActiveDailyChallenge(pendingDailyChallenge)
      setPracticeProblem(formatDailyChallengeProblem(pendingDailyChallenge))
      setPanel("practice")
      setAiExpanded(true)
      setBusy(false)
      return
    }

    if (!bootTool.current) return
    const tool = bootTool.current as ToolId
    bootTool.current = ""
    if (CORA_TOOLS.some((t) => t.id === tool)) void runTool(tool)
  }, [ready, runTool, isLocked])

  async function walkThroughWithCora() {
    await runWalkthrough()
  }

  async function sendTutor(payload?: {
    message?: string
    attachments?: CoraComposerAttachment[]
    importedProblem?: CoraImportedProblem | null
    importedLabel?: string | null
  }) {
    if (!session || session.portal !== "student") return
    if (membershipTierLoaded && !hasNavAccess(membershipTier, "Trailblazer")) return
    const message = (payload?.message ?? tutorInput).trim()
    if (!message && !payload?.importedProblem) return
    setTutorInput("")
    const displayMessage =
      message ||
      (payload?.importedLabel ? `Imported: ${payload.importedLabel}` : "Imported course question")
    const nextHistory = [...tutorMessages, { role: "user" as const, content: displayMessage }]
    setTutorMessages(nextHistory)
    setBusy(true)
    try {
      let apiMessage = message
      if (payload?.importedProblem) {
        const problem = buildProblemContextForApi(payload.importedProblem)
        apiMessage = `${message}\n\n[Imported question: ${problem.title ?? payload.importedLabel ?? "Course question"}]\n${problem.questionText ?? ""}`.trim()
      }
      const prepared = prepareCoraRequest({
        session,
        tool: "code_assistant",
        prompt: apiMessage,
        membershipTier,
      })
      const res = await codebenchApi.aiTutor(session, {
        message: apiMessage,
        topic: "tutor",
        code,
        learningMode,
        conversationHistory: nextHistory.map((m) => ({ role: m.role, content: m.content })),
        prepared,
      })
      if (res.accessDenied || res.rbacBlocked) {
        throw new ApiError(res.blockReason ?? "Trailblazer membership required.", 403)
      }
      setTutorMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.response?.trim() || "No response." },
      ])
      setXp(await awardCodebenchXp("tutor"))
    } catch (err) {
      AppAlert.alert("Tutor", codebenchAiFailureMessage(err, "Could not reach AI Tutor."))
    } finally {
      setBusy(false)
    }
  }

  async function submitPractice() {
    if (!session || session.portal !== "student") return
    if (membershipTierLoaded && !hasNavAccess(membershipTier, "Trailblazer")) return
    if (!requireCode()) return
    setBusy(true)
    try {
      if (activeDailyChallenge) {
        await codebenchApi.submitDailyChallenge(session, {
          code,
          challengeId: activeDailyChallenge.id,
          challengeTitle: activeDailyChallenge.title,
          challengeDescription: activeDailyChallenge.description,
          score: 0,
          feedback: "Submitted from native CodeBench IDE",
        })
      } else {
        await codebenchApi.submitPractice(session, {
          code,
          problem: practiceProblem.slice(0, 2000),
          feedback: "Submitted from native CodeBench IDE",
        })
      }
      await saveCodebenchLatestCode(code)
      await codebenchApi.recordStreak(session).catch(() => null)
      setXp(await awardCodebenchXp("submit"))
      AppAlert.alert(
        "Submitted",
        activeDailyChallenge
          ? "Daily challenge submitted. Points are pending instructor approval."
          : "Practice attempt recorded.",
      )
      setActiveDailyChallenge(null)
      setAiExpanded(false)
      setPanel("ready")
    } catch (err) {
      AppAlert.alert("Submit failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setBusy(false)
    }
  }

  async function finishEvaluate() {
    if (!session || session.portal !== "student") return
    if (membershipTierLoaded && !hasNavAccess(membershipTier, "Trailblazer")) return
    const responses = evalQuestions.map((q, i) => ({
      question: q.question,
      answer: evalAnswers[i] ?? "",
    }))
    setBusy(true)
    try {
      const submissionId = canSubmitClassroom ? Number(assignmentId) : null
      const res = await codebenchApi.submit(session, {
        code,
        score: 0,
        feedback: "Submitted from native CodeBench evaluate.",
        evaluationResponses: responses,
        submissionId,
      })
      await saveCodebenchLatestCode(code)
      await codebenchApi.recordStreak(session).catch(() => null)
      setXp(await awardCodebenchXp("evaluate"))
      if (submissionId != null) {
        dropSubmittedAssignment(String(submissionId))
        void reloadClassroomAssignments()
      }
      setResultTitle("Evaluation complete")
      setResultBody(
        [
          res.pointsAwarded != null ? `Points awarded: ${res.pointsAwarded}` : "",
          submissionId != null
            ? `${selectedAssignment?.title ?? "This classroom point"} is waiting for your instructor to review and approve.`
            : res.evaluation?.feedback || res.message || "Submitted for review.",
        ]
          .filter(Boolean)
          .join("\n\n"),
      )
      setPanel("result")
    } catch (err) {
      AppAlert.alert("Submit failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setBusy(false)
    }
  }

  async function submitCode() {
    if (!session || session.portal !== "student") return
    if (membershipTierLoaded && !hasNavAccess(membershipTier, "Trailblazer")) return
    if (activeDailyChallenge || panel === "practice") {
      await submitPractice()
      return
    }
    if (!requireCode()) return
    if (!canSubmitClassroom) {
      AppAlert.alert(
        "Select a classroom point",
        assignments.length > 0
          ? "Pick an open classroom point problem, then submit your code."
          : "There are no open classroom point problems right now.",
      )
      if (assignments.length > 0) setSheet("assignment")
      return
    }
    setBusy(true)
    const submittedId = assignmentId
    const submittedTitle = selectedAssignment?.title ?? assignmentLabel
    try {
      const res = await rewardsApi.submitClassroomCode(session, {
        submissionId: Number(submittedId),
        code,
        description: `Submitted from CodeBench: ${submittedTitle}`,
      })
      dropSubmittedAssignment(submittedId)
      void reloadClassroomAssignments()
      const points =
        res.pointsAwarded != null && Number.isFinite(Number(res.pointsAwarded))
          ? Number(res.pointsAwarded).toFixed(2)
          : null
      AppAlert.alert(
        res.autoApproved ? "Submitted and scored" : "Submitted for classroom points",
        res.autoApproved
          ? `${submittedTitle} — ${points ?? "points"} recorded.`
          : `${submittedTitle} is waiting for your instructor to review and approve.`,
      )
      await saveCodebenchLatestCode(code)
      await codebenchApi.recordStreak(session).catch(() => null)
      setXp(await awardCodebenchXp("submit"))
    } catch (err) {
      AppAlert.alert("Submit failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setBusy(false)
    }
  }

  async function onChangeLanguage(next: CodebenchLanguageId) {
    setLanguageId(next)
    setSheet(null)
    await saveCodebenchLanguageId(next)
    setCodeByLang((prev) => ({
      ...prev,
      [next]: prev[next] ?? getCodebenchLanguage(next).defaultCode,
    }))
  }

  async function onChangeMode(next: CodebenchLearningMode) {
    setLearningMode(next)
    setSheet(null)
    await saveCodebenchLearningMode(next)
  }

  if (!session || session.portal !== "student") {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <Text style={[type.caption, { color: native.secondaryLabel }]}>Student session required.</Text>
      </View>
    )
  }

  if (isLocked) {
    return (
      <StudentThemedLocked
        icon="code-slash"
        subtitle="Write C++, C, or Python and review it with Cora — available on Trailblazer."
        paddingTop={lockedTopPad}
        onUpgrade={() => router.push("/membership" as never)}
      />
    )
  }

  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: ide.canvas }]}>
        <ActivityIndicator color={ide.gold} />
        <Text style={{ color: ide.body, marginTop: 12, fontWeight: "600" }}>Opening CodeBench…</Text>
      </View>
    )
  }

  const currentEval = evalQuestions[evalIndex]
  const sheetMeta =
    sheet === "language"
      ? {
          title: "Language",
          subtitle: "Cora uses this to explain your code. The phone IDE does not compile or run it.",
          icon: "code-slash-outline" as const,
        }
      : sheet === "mode"
        ? {
            title: "Learning level",
            subtitle: "How deep Cora’s explanations go.",
            icon: "school-outline" as const,
          }
        : sheet === "cora-tool"
          ? {
              title: "Cora tools",
              subtitle: "Pick a tool to analyze the code in the editor.",
              icon: "sparkles-outline" as const,
            }
          : {
              title: "Classroom points",
              subtitle:
                assignments.length > 0
                  ? `${assignments.length} open problem${assignments.length === 1 ? "" : "s"} · instructor reviews after you submit.`
                  : "Submitted work is waiting for instructor review.",
              icon: "trophy-outline" as const,
            }

  const aiPanelFullscreen = aiExpanded && FULLSCREEN_AI_PANELS.has(panel)
  const hideAiPanel =
    panel === "idle" ||
    (panel === "tutor" && aiExpanded) ||
    aiPanelFullscreen

  const evaluateFooter = (
    <View style={[styles.evalActions, aiPanelFullscreen && styles.evalActionsFullscreen]}>
      <Pressable
        disabled={evalIndex === 0}
        onPress={() => setEvalIndex((i) => Math.max(0, i - 1))}
        style={[styles.secondaryBtn, { borderColor: native.separator }]}
      >
        <Text style={[type.caption, { color: native.label, fontWeight: "700" }]}>Back</Text>
      </Pressable>
      {evalIndex < evalQuestions.length - 1 ? (
        <Pressable
          onPress={() => setEvalIndex((i) => i + 1)}
          style={[styles.primaryBtn, { backgroundColor: tokens.accent, flex: 1, marginHorizontal: 0 }]}
        >
          <Text style={styles.primaryBtnText}>Next</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => void finishEvaluate()}
          disabled={busy}
          style={[styles.primaryBtn, { backgroundColor: tokens.accent, flex: 1, marginHorizontal: 0 }]}
        >
          <Text style={styles.primaryBtnText}>{busy ? "Submitting…" : "Submit"}</Text>
        </Pressable>
      )}
    </View>
  )

  const evaluateBody = currentEval ? (
    <>
      <View style={{ marginBottom: 10 }}>
        <MarkdownContentWebView markdown={currentEval.question} embedded />
      </View>
      {currentEval.type === "multiple_choice" && currentEval.options?.length ? (
        currentEval.options.map((opt) => {
          const selected = evalAnswers[evalIndex] === opt
          return (
            <Pressable
              key={opt}
              onPress={() =>
                setEvalAnswers((prev) => {
                  const next = [...prev]
                  next[evalIndex] = opt
                  return next
                })
              }
              style={[
                styles.choice,
                {
                  borderColor: selected ? tokens.accent : native.separator,
                  backgroundColor: selected ? hexToRgba(tokens.accent, 0.14) : native.fill,
                },
              ]}
            >
              <Text style={[type.body, { color: selected ? tokens.accent : native.label }]}>{opt}</Text>
            </Pressable>
          )
        })
      ) : (
        <TextInput
          value={evalAnswers[evalIndex] ?? ""}
          onChangeText={(text) =>
            setEvalAnswers((prev) => {
              const next = [...prev]
              next[evalIndex] = text
              return next
            })
          }
          placeholder="Your answer"
          placeholderTextColor={native.tertiaryLabel}
          style={[
            styles.composeInput,
            {
              color: native.label,
              borderColor: native.separator,
              backgroundColor: native.fill,
              minHeight: 72,
              textAlignVertical: "top",
            },
          ]}
          multiline
        />
      )}
    </>
  ) : null

  const xpBody = (
    <>
      <View style={styles.xpHero}>
        <View style={[styles.xpIcon, { backgroundColor: hexToRgba(ide.gold, 0.2) }]}>
          <Ionicons name="flash" size={22} color={ide.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[type.caption, { color: ide.gold, fontWeight: "800" }]}>LEVEL {level}</Text>
          <Text style={[type.sheetTitle, { color: native.label }]}>{xp} XP</Text>
        </View>
        <Text style={[type.caption, { color: ide.gold, fontWeight: "800" }]}>{xpInLevel}/100</Text>
      </View>
      <View style={[styles.xpTrack, { backgroundColor: native.fill }]}>
        <View style={[styles.xpFill, { width: `${xpInLevel}%`, backgroundColor: ide.gold }]} />
      </View>
      <Text style={[type.caption, { color: native.secondaryLabel, marginTop: 8 }]}>
        Progress to Lv {level + 1}
      </Text>
      <Pressable
        onPress={() => {
          setAiExpanded(false)
          setPanel("ready")
          router.push("/module/codebench-more" as never)
        }}
        style={[styles.primaryBtn, { backgroundColor: tokens.accent }]}
      >
        <Ionicons name="bar-chart-outline" size={16} color="#FFFFFF" />
        <Text style={styles.primaryBtnText}>Analytics & progress</Text>
      </Pressable>
    </>
  )

  return (
    <View style={[styles.root, { backgroundColor: ide.canvas }]}>
      {inlineExpandedBackSwipe}
      <KeyboardAvoidingView
        style={[styles.flex, { paddingTop: insets.top }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Top bar */}
        <View style={[styles.topBar, { borderBottomColor: ide.border }]}>
          <Pressable
            onPress={() => safeRouterBack(router, "/module/codebench")}
            hitSlop={10}
            style={[styles.roundBtn, { backgroundColor: "rgba(255,255,255,0.1)" }]}
            accessibilityRole="button"
            accessibilityLabel="Back to CodeBench"
          >
            <Ionicons name="chevron-back" size={20} color={ide.title} />
          </Pressable>
          <View style={styles.topCopy}>
            <Text style={[styles.topTitle, { color: ide.title }]}>CodeBench IDE</Text>
            <Text style={[styles.topMeta, { color: ide.muted }]}>
              {language.label} · {modeLabel}
            </Text>
          </View>
          <Pressable
            onPress={() => setPanel("xp")}
            style={[styles.xpChip, { borderColor: hexToRgba(ide.gold, 0.55), backgroundColor: hexToRgba(ide.gold, 0.18) }]}
          >
            <Ionicons name="flash" size={15} color={ide.gold} />
            <Text style={[styles.xpText, { color: ide.gold }]}>{xp}</Text>
          </Pressable>
        </View>

        <View style={styles.actionBar}>
          <View style={styles.actionRow}>
            <IdeToolbarChip
              label={coraChipLabel}
              icon="sparkles"
              iconColor={CORA_ACCENT}
              onPress={() => {
                if (panel === "idle") setPanel("ready")
                setSheet("cora-tool")
              }}
              colors={ide}
              width={chipWidth}
              accessibilityLabel="Cora tools"
            />
            <IdeToolbarChip
              label={modeLabel}
              icon="school"
              onPress={() => setSheet("mode")}
              colors={ide}
              width={chipWidth}
            />
          </View>
          <View style={styles.actionRow}>
            <IdeToolbarChip
              label={assignmentLabel}
              icon="clipboard-outline"
              onPress={() => setSheet("assignment")}
              colors={ide}
              width={chipWidth}
              accessibilityLabel={`Classroom point problem, ${assignmentLabel}`}
            />
            <IdeToolbarChip
              label="Submit"
              icon="paper-plane"
              onPress={() => void submitCode()}
              colors={ide}
              width={chipWidth}
              emphasized
              showChevron={false}
              disabled={busy}
              loading={busy && (panel === "ready" || panel === "idle")}
              accessibilityLabel={
                canSubmitClassroom ? `Submit to ${assignmentLabel}` : "Submit classroom point"
              }
            />
          </View>
        </View>

        {/* Editor — full-width code buffer for AI tools (no line-number gutter) */}
        <View
          style={[
            styles.editorShell,
            { backgroundColor: ide.panel, borderColor: ide.border, minHeight: editorMinHeight },
          ]}
        >
          <View style={[styles.editorChrome, { borderBottomColor: ide.border, backgroundColor: ide.gutter }]}>
            <Pressable
              onPress={() => setSheet("language")}
              accessibilityRole="button"
              accessibilityLabel={`Language ${language.label}`}
              style={[styles.fileTab, { backgroundColor: ide.panel, borderColor: ide.border }]}
            >
              <Ionicons name="document-text" size={13} color={ide.gold} />
              <Text style={[styles.fileTabText, { color: ide.title }]}>{language.fileName}</Text>
              <Ionicons name="chevron-down" size={12} color={ide.muted} />
            </Pressable>
            <Text style={[styles.lineMeta, { color: ide.muted }]}>
              {language.label} · Cora review
            </Text>
          </View>
          <TextInput
            value={code}
            onChangeText={setCode}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            textAlignVertical="top"
            keyboardAppearance="dark"
            style={[styles.editorInput, { color: ide.body }]}
            placeholder="// Write or paste C++, C, or Python. Cora reviews it — nothing compiles on the phone."
            placeholderTextColor={ide.faint}
          />
        </View>

        {/* AI Assistant panel — hidden when a full-screen overlay handles it */}
        {!hideAiPanel ? (
        <View
          style={[
            styles.aiPanel,
            {
              backgroundColor: panel === "tutor" ? "transparent" : native.secondaryGrouped,
              borderTopColor: panel === "tutor" ? "transparent" : native.separator,
              paddingBottom:
                panel === "tutor"
                  ? 0
                  : aiExpanded
                    ? 0
                    : Math.max(insets.bottom, 10),
              paddingTop: aiExpanded && panel !== "tutor" ? insets.top : 0,
              minHeight: panel === "tutor" || aiExpanded ? undefined : aiPanelMinHeight,
            },
            aiExpanded && styles.aiPanelExpanded,
            aiExpanded && panel === "walkthrough" && styles.aiPanelWalkthrough,
            aiExpanded && panel === "tutor" && styles.aiPanelTutor,
          ]}
        >
          <View style={[styles.aiHead, panel === "tutor" && styles.aiHeadTutor]}>
            {panel === "tutor" ? (
              <View style={styles.aiHeadIcon}>
                <Ionicons name="sparkles" size={20} color={CORA_ACCENT} />
              </View>
            ) : (
              <View style={styles.aiHeadBrand}>
                <CoraBrand size="sm" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              {panel === "tutor" && !busy ? (
                <CoraBrand size="sm" />
              ) : (
                <Text style={[type.bodyEmphasis, { color: native.label }]}>
                  {panel === "ready"
                    ? busy
                      ? "cora is thinking"
                      : "Cora is ready"
                    : panel === "walkthrough"
                      ? busy
                        ? "Building walkthrough"
                        : "Execution walkthrough"
                      : panel === "tutor"
                        ? "cora is thinking"
                        : panel === "practice"
                          ? "Practice problem"
                          : panel === "evaluate"
                            ? `Evaluate ${evalIndex + 1}/${evalQuestions.length}`
                            : panel === "xp"
                              ? "Your progress"
                              : resultTitle}
                </Text>
              )}
              {panel !== "tutor" ? (
                <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={2}>
                  {busy
                    ? "Tracing your code step by step"
                    : panel === "ready"
                      ? aiExpanded
                        ? "Full screen · swipe from the left edge or tap collapse to return to the editor"
                        : "Choose a Cora tool from the toolbar, or walk through your code below."
                      : aiExpanded
                        ? "Full screen · tap collapse to return to the editor"
                        : "Results stay here while you edit"}
                </Text>
              ) : busy ? (
                <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
                  Thinking through your question…
                </Text>
              ) : null}
            </View>
            {(aiExpanded && panel === "ready") || panel !== "ready" ? (
              <View style={styles.aiHeadActions}>
                <Pressable
                  onPress={() => (aiExpanded ? collapseAiPanel() : setAiExpanded(true))}
                  hitSlop={8}
                  style={[styles.aiClose, { backgroundColor: native.fill }]}
                  accessibilityLabel={aiExpanded ? "Collapse AI assistant" : "Expand AI assistant"}
                >
                  <Ionicons
                    name={aiExpanded ? "contract-outline" : "expand-outline"}
                    size={18}
                    color={native.label}
                  />
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (panel === "ready") {
                      closeAiPanel()
                      return
                    }
                    dismissAiPanel()
                  }}
                  hitSlop={8}
                  style={styles.aiClose}
                  accessibilityLabel="Close AI assistant"
                >
                  <Ionicons name="close" size={18} color={native.secondaryLabel} />
                </Pressable>
              </View>
            ) : null}
          </View>

          {panel === "walkthrough" ? (
            <View style={styles.walkthroughHost}>
              {busy && walkthroughSteps.length === 0 ? (
                <View style={styles.thinkingHost}>
                  <CoraThinkingIndicator context="codebench" hideBrand />
                </View>
              ) : (
                <CodebenchWalkthroughPanel
                  steps={walkthroughSteps}
                  sourceCode={walkthroughCode || code}
                  index={walkthroughIndex}
                  onIndexChange={setWalkthroughIndex}
                  bottomInset={insets.bottom}
                />
              )}
            </View>
          ) : null}

          {panel === "ready" ? (
            <View style={styles.coraReady}>
              <Pressable
                onPress={() => void walkThroughWithCora()}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Walk through with Cora"
                style={({ pressed }) => [
                  styles.walkthroughBtn,
                  { backgroundColor: CORA_ACCENT },
                  (busy || pressed) && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.walkthroughBtnText}>Walk through with </Text>
                <CoraBrand size="sm" variant="solid" color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={() => setSheet("cora-tool")}
                disabled={busy}
                style={({ pressed }) => [
                  styles.coraToolsBtn,
                  {
                    borderColor: native.separator,
                    backgroundColor: native.fill,
                  },
                  pressed && { opacity: NATIVE.pressedOpacity },
                ]}
              >
                <Text style={[type.body, { color: native.label, fontWeight: "600" }]}>All Cora tools</Text>
                <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
              </Pressable>
            </View>
          ) : null}

          {panel === "result" && !aiPanelFullscreen ? (
            <ScrollView
              style={[styles.aiScroll, aiExpanded ? styles.aiScrollExpanded : styles.aiScrollCollapsed]}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator
            >
              <MarkdownContentWebView markdown={resultBody} embedded />
            </ScrollView>
          ) : null}

          {panel === "tutor" && session && !aiExpanded ? (
            <CodebenchAskCoraPanel
              session={session}
              studentFirstName={studentFirstName}
              messages={tutorDisplayMessages}
              input={tutorInput}
              onChangeInput={setTutorInput}
              busy={busy}
              expanded={false}
              onSend={async (payload) => {
                await sendTutor({
                  message: payload.message,
                  attachments: payload.attachments,
                  importedProblem: payload.importedProblem,
                  importedLabel: payload.importedLabel,
                })
              }}
            />
          ) : null}

          {panel === "practice" && !aiPanelFullscreen ? (
            <>
              <ScrollView
                style={[styles.aiScroll, aiExpanded ? styles.aiScrollExpanded : styles.aiScrollCollapsed]}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                {practiceProblem.trim() ? (
                  <MarkdownContentWebView markdown={practiceProblem} embedded />
                ) : (
                  <Text style={[type.body, { color: native.secondaryLabel, paddingHorizontal: 4, paddingTop: 8 }]}>
                    No practice problem was generated. Close this panel and try again with more complete code.
                  </Text>
                )}
              </ScrollView>
              <Pressable
                onPress={() => void submitPractice()}
                disabled={busy}
                style={[styles.primaryBtn, { backgroundColor: tokens.accent }]}
              >
                <Text style={styles.primaryBtnText}>{busy ? "Submitting…" : "Submit practice"}</Text>
              </Pressable>
            </>
          ) : null}

          {panel === "evaluate" && currentEval && !aiPanelFullscreen ? (
            <>
              <ScrollView
                style={[styles.aiScroll, aiExpanded ? styles.aiScrollExpanded : styles.aiScrollCollapsed]}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                {evaluateBody}
              </ScrollView>
              {evaluateFooter}
            </>
          ) : null}

          {panel === "xp" && !aiPanelFullscreen ? (
            <View style={[styles.aiScroll, aiExpanded ? styles.aiScrollExpanded : styles.aiScrollCollapsed]}>
              {xpBody}
            </View>
          ) : null}

          {busy && panel !== "tutor" && panel !== "walkthrough" && !aiPanelFullscreen ? (
            <View style={styles.thinkingHost}>
              <CoraThinkingIndicator context="codebench" hideBrand />
            </View>
          ) : null}
        </View>
        ) : null}
      </KeyboardAvoidingView>

      {panel === "walkthrough" ? (
        <CodebenchWalkthroughPanel
          steps={walkthroughSteps}
          sourceCode={walkthroughCode || code}
          index={walkthroughIndex}
          onIndexChange={setWalkthroughIndex}
          fullscreen
          visible={aiExpanded}
          loading={busy && walkthroughSteps.length === 0}
          onCollapse={collapseAiPanel}
          onClose={dismissAiPanel}
        />
      ) : null}

      {panel === "tutor" && aiExpanded && session ? (
        <CodebenchAskCoraPanel
          session={session}
          studentFirstName={studentFirstName}
          messages={tutorDisplayMessages}
          input={tutorInput}
          onChangeInput={setTutorInput}
          busy={busy}
          expanded
          fullscreen
          onCollapse={() => setAiExpanded(false)}
          onClose={dismissAiPanel}
          onSend={async (payload) => {
            await sendTutor({
              message: payload.message,
              attachments: payload.attachments,
              importedProblem: payload.importedProblem,
              importedLabel: payload.importedLabel,
            })
          }}
        />
      ) : null}

      {aiPanelFullscreen && panel === "result" ? (
        <CodebenchAiFullscreenShell
          title={resultTitle}
          onCollapse={collapseAiPanel}
          onClose={dismissAiPanel}
        >
          <MarkdownContentWebView markdown={resultBody} embedded />
        </CodebenchAiFullscreenShell>
      ) : null}

      {aiPanelFullscreen && panel === "practice" ? (
        <CodebenchAiFullscreenShell
          title="Practice problem"
          onCollapse={collapseAiPanel}
          onClose={dismissAiPanel}
          footer={
            <Pressable
              onPress={() => void submitPractice()}
              disabled={busy}
              style={[styles.primaryBtn, { backgroundColor: tokens.accent, marginHorizontal: 0 }]}
            >
              <Text style={styles.primaryBtnText}>{busy ? "Submitting…" : "Submit practice"}</Text>
            </Pressable>
          }
        >
          {practiceProblem.trim() ? (
            <MarkdownContentWebView markdown={practiceProblem} embedded />
          ) : (
            <Text style={[type.body, { color: native.secondaryLabel, paddingHorizontal: 16, paddingTop: 12 }]}>
              No practice problem was generated. Close this panel and try again with more complete code.
            </Text>
          )}
        </CodebenchAiFullscreenShell>
      ) : null}

      {aiPanelFullscreen && panel === "evaluate" && currentEval ? (
        <CodebenchAiFullscreenShell
          title={`Evaluate ${evalIndex + 1}/${evalQuestions.length}`}
          onCollapse={collapseAiPanel}
          onClose={dismissAiPanel}
          footer={evaluateFooter}
        >
          {evaluateBody}
        </CodebenchAiFullscreenShell>
      ) : null}

      {aiPanelFullscreen && panel === "xp" ? (
        <CodebenchAiFullscreenShell
          title="Your progress"
          onCollapse={collapseAiPanel}
          onClose={dismissAiPanel}
        >
          {xpBody}
        </CodebenchAiFullscreenShell>
      ) : null}

      {/* Native bottom sheet — header + scrollable picker */}
      <GlassBottomSheetModal
        visible={sheet != null}
        onClose={() => setSheet(null)}
        maxHeight="92%"
        scrollable={false}
      >
        <View
          style={[
            styles.sheetSurface,
            {
              backgroundColor: native.secondaryGrouped,
              borderColor: native.separator,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <GlassSheetHandle />
          <IdeSheetHeader
            icon={sheetMeta.icon}
            title={sheetMeta.title}
            subtitle={sheetMeta.subtitle}
            iconColor={ide.gold}
            iconBg={hexToRgba(ide.gold, 0.16)}
            titleColor={ide.title}
            subtitleColor={ide.muted}
            closeColor={ide.muted}
            closeBg={hexToRgba(ide.title, 0.08)}
            onClose={() => setSheet(null)}
          />

          <ScrollView
            style={[styles.sheetScroll, { maxHeight: pickerListMaxHeight }]}
            contentContainerStyle={styles.sheetScrollContent}
            showsVerticalScrollIndicator
            persistentScrollbar
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={styles.sheetList}>
            {sheet === "cora-tool" ? (
              <CoraToolPickerList>
                {CORA_TOOLS.map((tool, index) => (
                  <CoraToolPickerCard
                    key={tool.id}
                    index={index}
                    icon={tool.icon}
                    title={tool.label}
                    subtitle={tool.subtitle}
                    onPress={() => {
                      setSheet(null)
                      void runTool(tool.id)
                    }}
                  />
                ))}
              </CoraToolPickerList>
            ) : null}

            {sheet === "language"
              ? CODEBENCH_LANGUAGES.map((lang) => (
                  <IdeSheetChoice
                    key={lang.id}
                    icon="document-text-outline"
                    title={lang.label}
                    subtitle={lang.fileName}
                    active={lang.id === languageId}
                    colors={ide}
                    onPress={() => void onChangeLanguage(lang.id)}
                  />
                ))
              : null}

            {sheet === "mode"
              ? LEARNING_MODE_OPTIONS.map((mode) => (
                  <IdeSheetChoice
                    key={mode.value}
                    icon={
                      mode.value === "beginner"
                        ? "leaf-outline"
                        : mode.value === "expert"
                          ? "rocket-outline"
                          : "school-outline"
                    }
                    title={mode.label}
                    subtitle={
                      mode.value === "beginner"
                        ? "Simpler explanations"
                        : mode.value === "expert"
                          ? "Deeper analysis"
                          : "Balanced guidance"
                    }
                    active={mode.value === learningMode}
                    colors={ide}
                    onPress={() => void onChangeMode(mode.value)}
                  />
                ))
              : null}

            {sheet === "assignment" ? (
              assignments.length === 0 ? (
                <View style={[styles.sheetEmpty, { borderColor: ide.border, backgroundColor: hexToRgba(ide.title, 0.04) }]}>
                  <View style={[styles.sheetCardIcon, { backgroundColor: hexToRgba(ide.gold, 0.16) }]}>
                    <Ionicons name="checkmark-done-outline" size={18} color={ide.gold} />
                  </View>
                  <Text style={[styles.sheetCardTitle, { color: ide.title }]}>You're all caught up</Text>
                  <Text style={[styles.sheetEmptyCopy, { color: ide.muted }]}>
                    Submitted classroom points wait here for instructor review.
                  </Text>
                </View>
              ) : (
                assignments.map((a) => (
                  <IdeSheetChoice
                    key={a.id}
                    icon="code-slash-outline"
                    title={a.title}
                    subtitle={`${classroomPointDueLabel(a.expires_at)} · instructor reviews after submit`}
                    active={assignmentId === String(a.id)}
                    colors={ide}
                    onPress={() => {
                      setAssignmentId(String(a.id))
                      setSheet(null)
                    }}
                  />
                ))
              )
            ) : null}
          </View>
          </ScrollView>

          <Pressable
            onPress={() => setSheet(null)}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={[styles.cancelBtn, { backgroundColor: hexToRgba(ide.title, 0.08) }]}
          >
            <Text style={[styles.cancelBtnText, { color: ide.title }]}>Cancel</Text>
          </Pressable>
        </View>
      </GlassBottomSheetModal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  roundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  topCopy: { flex: 1, minWidth: 0 },
  topTitle: { fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },
  topMeta: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  xpChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 54,
    height: 34,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
  },
  xpText: { fontSize: 13, fontWeight: "800" },
  actionBar: {
    flexGrow: 0,
    flexShrink: 0,
    gap: CHIP_GAP,
    paddingHorizontal: ACTION_BAR_PAD,
    paddingTop: 10,
    paddingBottom: 10,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: CHIP_GAP,
  },
  gridChip: {
    height: CHIP_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  gridChipText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  gridChipSlot: {
    width: 14,
    height: 14,
  },
  editorShell: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  editorChrome: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fileTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  fileTabText: { fontSize: 12, fontWeight: "700" },
  lineMeta: { marginLeft: "auto", fontSize: 12, fontWeight: "600" },
  editorInput: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  },
  aiPanel: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: "46%",
    overflow: "hidden",
    ...NATIVE.raisedShadow,
  },
  aiPanelExpanded: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    maxHeight: "100%",
    minHeight: "100%",
    flex: 1,
    flexDirection: "column",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0,
    elevation: 16,
  },
  aiPanelWalkthrough: {
    flex: 1,
    minHeight: 0,
  },
  aiPanelTutor: {
    flex: 1,
  },
  aiHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    flexShrink: 0,
  },
  aiHeadActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  aiHeadTutor: {
    backgroundColor: "transparent",
  },
  aiHeadIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: hexToRgba(CORA_ACCENT, 0.12),
  },
  aiHeadBrand: {
    flexShrink: 0,
    alignSelf: "flex-start",
    paddingTop: 2,
  },
  aiClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  walkthroughHost: {
    flex: 1,
    minHeight: 0,
  },
  coraReady: {
    paddingHorizontal: 14,
    paddingBottom: 6,
    gap: 10,
  },
  walkthroughBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  walkthroughBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  coraToolsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  aiScroll: { paddingHorizontal: 14 },
  aiScrollCollapsed: { maxHeight: 220 },
  aiScrollExpanded: { flex: 1 },
  composeRow: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingTop: 6 },
  composeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    marginTop: 8,
    marginHorizontal: 14,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  choice: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  evalActions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 4,
    alignItems: "center",
  },
  evalActionsFullscreen: {
    paddingHorizontal: 0,
  },
  xpHero: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  xpIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  xpTrack: { height: 8, borderRadius: 999, overflow: "hidden" },
  xpFill: { height: "100%", borderRadius: 999 },
  busyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  thinkingHost: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
  },
  sheetSurface: {
    width: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 8,
    flexShrink: 1,
  },
  sheetScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  sheetScrollContent: {
    flexGrow: 0,
  },
  sheetList: {
    gap: 10,
    paddingBottom: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  sheetHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  sheetHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sheetHeaderSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 17,
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCard: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  sheetCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCardCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  sheetCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  sheetCardSubtitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  sheetEmpty: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 22,
    borderRadius: 16,
    borderWidth: 1,
  },
  sheetEmptyCopy: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
  },
  cancelBtn: {
    marginTop: 12,
    borderRadius: 999,
    paddingVertical: 14,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
})
