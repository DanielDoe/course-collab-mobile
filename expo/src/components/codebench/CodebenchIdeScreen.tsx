import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useModuleContentTopPadding } from "../../context/ChromeInsetContext"
import { useSession } from "../../context/SessionProvider"
import { useStudentShell } from "../../context/StudentShellContext"
import { hasNavAccess } from "../../constants/student-nav"
import { prepareCoraRequest } from "../../lib/cora-rbac"
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
import { codebenchApi,
  type ClassroomAssignmentOption,
  type CodebenchEvaluateQuestion,
} from "../../lib/codebench-api"
import { CODEBENCH_CPP_WALKTHROUGH_SAMPLE } from "../../lib/codebench-samples"
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
  useCompactPhoneLayout,
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

type ToolId =
  | "explain"
  | "walkthrough"
  | "debug"
  | "improve"
  | "pseudocode"
  | "tutor"
  | "practice"
  | "evaluate"

type PanelMode = "ready" | "result" | "walkthrough" | "tutor" | "practice" | "evaluate" | "xp"

type TutorMessage = { role: "user" | "assistant"; content: string }
type SheetKind = "language" | "mode" | "cora-tool" | "assignment" | null

const CORA_ACCENT = "#7C3AED"

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
  const compactPhone = useCompactPhoneLayout()
  const params = useLocalSearchParams<{ tool?: string }>()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()

  const [ready, setReady] = useState(false)
  const [languageId, setLanguageId] = useState<CodebenchLanguageId>("javascript")
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
  const [evalQuestions, setEvalQuestions] = useState<CodebenchEvaluateQuestion[]>([])
  const [evalIndex, setEvalIndex] = useState(0)
  const [evalAnswers, setEvalAnswers] = useState<string[]>([])
  const [assignments, setAssignments] = useState<ClassroomAssignmentOption[]>([])
  const [assignmentId, setAssignmentId] = useState("practice")
  const bootTool = useRef(typeof params.tool === "string" ? params.tool : "")

  const language = getCodebenchLanguage(languageId)
  const code = codeByLang[languageId] ?? language.defaultCode
  const level = codebenchLevel(xp)
  const xpInLevel = xp % 100
  const modeLabel = LEARNING_MODE_OPTIONS.find((m) => m.value === learningMode)?.label ?? "Intermediate"
  const assignmentLabel =
    assignmentId === "practice"
      ? "Practice"
      : assignments.find((a) => String(a.id) === assignmentId)?.title ?? "Assignment"
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
      setAssignments(classroom)
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
        if (res.accessDenied) throw new ApiError("Trailblazer membership required.", 403)

        const steps = enrichReplaySteps(codeToWalk, res.steps ?? [])
        if (steps.length === 0) {
          throw new ApiError("No walkthrough steps returned. Try again with more complete code.", 500)
        }

        setWalkthroughSteps(steps)
        setXp(await awardCodebenchXp("explain"))
      } catch (err) {
        AppAlert.alert("Walkthrough", err instanceof ApiError ? err.message : "Walkthrough failed.")
        setPanel("ready")
      } finally {
        setBusy(false)
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
          if (res.accessDenied || res.rbacBlocked) {
            throw new ApiError(res.blockReason ?? "Trailblazer membership required.", 403)
          }
          setPracticeProblem(res.response?.trim() || "Could not generate a practice problem.")
          setPanel("practice")
          setXp(await awardCodebenchXp("practice"))
          return
        }

        if (tool === "evaluate") {
          const res = await codebenchApi.evaluate(session, toolPayload)
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

        if (data.accessDenied) throw new ApiError("Trailblazer membership required.", 403)
        setResultTitle(CORA_TOOLS.find((t) => t.id === tool)?.label ?? "Result")
        setResultBody(formatToolResult(tool, data))
        setPanel("result")
        setXp(await awardCodebenchXp(tool === "pseudocode" ? "pseudocode" : tool))
      } catch (err) {
        AppAlert.alert("CodeBench", err instanceof ApiError ? err.message : "Request failed.")
      } finally {
        setBusy(false)
      }
    },
    [session, code, language.apiLanguage, learningMode, toolPayload, tutorMessages.length, runWalkthrough, membershipTier, membershipTierLoaded],
  )

  useEffect(() => {
    if (!ready || isLocked || !bootTool.current) return
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
      AppAlert.alert("Tutor", err instanceof ApiError ? err.message : "Could not reach AI Tutor.")
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
      await codebenchApi.submitPractice(session, {
        code,
        problem: practiceProblem.slice(0, 2000),
        feedback: "Submitted from native CodeBench IDE",
      })
      await saveCodebenchLatestCode(code)
      await codebenchApi.recordStreak(session).catch(() => null)
      setXp(await awardCodebenchXp("submit"))
      AppAlert.alert("Submitted", "Practice attempt recorded.")
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
      const submissionId =
        assignmentId !== "practice" && /^\d+$/.test(assignmentId) ? Number(assignmentId) : null
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
      setResultTitle("Evaluation complete")
      setResultBody(
        [
          res.pointsAwarded != null ? `Points awarded: ${res.pointsAwarded}` : "",
          res.evaluation?.feedback || res.message || "Submitted for review.",
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
        subtitle="Write, run, and improve code in many languages with AI — available on Trailblazer."
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
  const sheetTitle =
    sheet === "language"
      ? "Language"
      : sheet === "mode"
        ? "Learning Level"
        : sheet === "cora-tool"
          ? "Cora tools"
          : "Assignment"

  const aiPanelFullscreen = aiExpanded && FULLSCREEN_AI_PANELS.has(panel)
  const hideAiPanel =
    (panel === "tutor" && aiExpanded) ||
    (panel === "walkthrough" && aiExpanded) ||
    aiPanelFullscreen

  const closeAiPanel = () => {
    setAiExpanded(false)
    setPanel("ready")
  }

  const collapseAiPanel = () => setAiExpanded(false)

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
      <KeyboardAvoidingView
        style={[styles.flex, { paddingTop: insets.top }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Top bar */}
        <View style={[styles.topBar, { borderBottomColor: ide.border }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={[styles.roundBtn, { backgroundColor: "rgba(255,255,255,0.1)" }]}
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

        {/* Action row → opens sheets (flexGrow:0 so horizontal ScrollView does not expand vertically) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.actionScroll}
          contentContainerStyle={styles.actionRow}
        >
          <Pressable
            onPress={() => setSheet("language")}
            style={[styles.sheetTrigger, { backgroundColor: ide.panel, borderColor: ide.border, minWidth: compactPhone ? 108 : undefined }]}
          >
            <Ionicons name="code-slash" size={15} color={ide.gold} />
            <Text style={[styles.sheetTriggerText, { color: ide.title }]} numberOfLines={1}>
              {language.label}
            </Text>
            <Ionicons name="chevron-down" size={14} color={ide.muted} />
          </Pressable>

          <Pressable
            onPress={() => setSheet("mode")}
            style={[styles.sheetTrigger, { backgroundColor: ide.panel, borderColor: ide.border, maxWidth: compactPhone ? 108 : 120 }]}
          >
            <Ionicons name="school" size={15} color={ide.gold} />
            <Text style={[styles.sheetTriggerText, { color: ide.title }]} numberOfLines={1}>
              {modeLabel}
            </Text>
            <Ionicons name="chevron-down" size={14} color={ide.muted} />
          </Pressable>

          <Pressable
            onPress={() => setSheet("cora-tool")}
            style={[styles.sheetTrigger, { backgroundColor: ide.panel, borderColor: ide.border, maxWidth: compactPhone ? 96 : 118 }]}
          >
            <CoraBrand size="xs" />
            <Ionicons name="chevron-down" size={14} color={ide.muted} />
          </Pressable>

          {assignments.length > 0 ? (
            <Pressable
              onPress={() => setSheet("assignment")}
              style={[styles.sheetTrigger, { backgroundColor: ide.panel, borderColor: ide.border, flex: 0, maxWidth: compactPhone ? 108 : 120 }]}
            >
              <Text style={[styles.sheetTriggerText, { color: ide.title }]} numberOfLines={1}>
                {assignmentLabel}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => void runTool("evaluate")}
            disabled={busy}
            style={[styles.runBtn, { backgroundColor: ide.gold }, busy && { opacity: 0.65 }]}
          >
            {busy && panel === "ready" ? (
              <ActivityIndicator color="#1a1025" size="small" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={15} color="#1a1025" />
                <Text style={styles.runText}>Evaluate</Text>
              </>
            )}
          </Pressable>
        </ScrollView>

        {/* Editor — full-width code buffer for AI tools (no line-number gutter) */}
        <View
          style={[
            styles.editorShell,
            { backgroundColor: ide.panel, borderColor: ide.border, minHeight: editorMinHeight },
          ]}
        >
          <View style={[styles.editorChrome, { borderBottomColor: ide.border, backgroundColor: ide.gutter }]}>
            <View style={[styles.fileTab, { backgroundColor: ide.panel, borderColor: ide.border }]}>
              <Ionicons name="document-text" size={13} color={ide.gold} />
              <Text style={[styles.fileTabText, { color: ide.title }]}>{language.fileName}</Text>
            </View>
            <Text style={[styles.lineMeta, { color: ide.muted }]}>{language.label}</Text>
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
            placeholder="// Write or paste code, then use Cora tools above"
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
                      ? "Choose a Cora tool from the toolbar, or walk through your code below."
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
            {panel !== "ready" ? (
              <View style={styles.aiHeadActions}>
                <Pressable
                  onPress={() => setAiExpanded((v) => !v)}
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
                    setAiExpanded(false)
                    setPanel("ready")
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

          {panel === "ready" ? (
            <View style={styles.coraReady}>
              <Pressable
                onPress={() => void walkThroughWithCora()}
                disabled={busy}
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

          {panel === "walkthrough" && !aiExpanded ? (
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
                <MarkdownContentWebView markdown={practiceProblem} embedded />
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
          onClose={() => {
            setAiExpanded(false)
            setPanel("ready")
          }}
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

      {panel === "walkthrough" && aiExpanded ? (
        <CodebenchWalkthroughPanel
          steps={walkthroughSteps}
          sourceCode={walkthroughCode || code}
          index={walkthroughIndex}
          onIndexChange={setWalkthroughIndex}
          fullscreen
          loading={busy && walkthroughSteps.length === 0}
          onCollapse={collapseAiPanel}
          onClose={closeAiPanel}
        />
      ) : null}

      {aiPanelFullscreen && panel === "result" ? (
        <CodebenchAiFullscreenShell
          title={resultTitle}
          onCollapse={collapseAiPanel}
          onClose={closeAiPanel}
        >
          <MarkdownContentWebView markdown={resultBody} embedded />
        </CodebenchAiFullscreenShell>
      ) : null}

      {aiPanelFullscreen && panel === "practice" ? (
        <CodebenchAiFullscreenShell
          title="Practice problem"
          onCollapse={collapseAiPanel}
          onClose={closeAiPanel}
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
          <MarkdownContentWebView markdown={practiceProblem} embedded />
        </CodebenchAiFullscreenShell>
      ) : null}

      {aiPanelFullscreen && panel === "evaluate" && currentEval ? (
        <CodebenchAiFullscreenShell
          title={`Evaluate ${evalIndex + 1}/${evalQuestions.length}`}
          onCollapse={collapseAiPanel}
          onClose={closeAiPanel}
          footer={evaluateFooter}
        >
          {evaluateBody}
        </CodebenchAiFullscreenShell>
      ) : null}

      {aiPanelFullscreen && panel === "xp" ? (
        <CodebenchAiFullscreenShell
          title="Your progress"
          onCollapse={collapseAiPanel}
          onClose={closeAiPanel}
        >
          {xpBody}
        </CodebenchAiFullscreenShell>
      ) : null}

      {/* Native bottom sheet — scrollable list + fixed cancel above home indicator */}
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
          <Text style={[type.sheetTitle, { color: native.label, marginBottom: 4 }]}>{sheetTitle}</Text>
          <Text style={[type.caption, { color: native.secondaryLabel, marginBottom: 12, lineHeight: 18 }]}>
            {sheet === "language"
              ? "Choose the language for the editor and Cora"
              : sheet === "mode"
                ? "Adjust how deep Cora explanations go"
                : sheet === "cora-tool"
                  ? "Pick a Cora tool to analyze your code"
                  : "Submit toward a classroom assignment or practice"}
          </Text>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
              ? CODEBENCH_LANGUAGES.map((lang, index) => {
                  const active = lang.id === languageId
                  return (
                    <Pressable
                      key={lang.id}
                      onPress={() => void onChangeLanguage(lang.id)}
                      style={[
                        styles.sheetOption,
                        { borderBottomColor: native.separator },
                        index === CODEBENCH_LANGUAGES.length - 1 && styles.sheetOptionLast,
                        active && { backgroundColor: hexToRgba(tokens.accent, 0.12) },
                      ]}
                    >
                      <Text
                        style={[
                          type.body,
                          {
                            color: active ? tokens.accent : native.label,
                            fontWeight: active ? "700" : "500",
                            flex: 1,
                          },
                        ]}
                      >
                        {lang.label}
                      </Text>
                      {active ? <Ionicons name="checkmark-circle" size={22} color={tokens.accent} /> : null}
                    </Pressable>
                  )
                })
              : null}

            {sheet === "mode"
              ? LEARNING_MODE_OPTIONS.map((mode, index) => {
                  const active = mode.value === learningMode
                  return (
                    <Pressable
                      key={mode.value}
                      onPress={() => void onChangeMode(mode.value)}
                      style={[
                        styles.sheetOption,
                        { borderBottomColor: native.separator },
                        index === LEARNING_MODE_OPTIONS.length - 1 && styles.sheetOptionLast,
                        active && { backgroundColor: hexToRgba(tokens.accent, 0.12) },
                      ]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={[
                            type.body,
                            {
                              color: active ? tokens.accent : native.label,
                              fontWeight: active ? "700" : "500",
                            },
                          ]}
                        >
                          {mode.label}
                        </Text>
                        <Text style={[type.caption, { color: native.secondaryLabel }]}>
                          {mode.value === "beginner"
                            ? "Simpler explanations"
                            : mode.value === "expert"
                              ? "Deeper analysis"
                              : "Balanced guidance"}
                        </Text>
                      </View>
                      {active ? <Ionicons name="checkmark-circle" size={22} color={tokens.accent} /> : null}
                    </Pressable>
                  )
                })
              : null}

            {sheet === "assignment" ? (
              <>
                <Pressable
                  onPress={() => {
                    setAssignmentId("practice")
                    setSheet(null)
                  }}
                  style={[
                    styles.sheetOption,
                    { borderBottomColor: native.separator },
                    assignments.length === 0 && styles.sheetOptionLast,
                    assignmentId === "practice" && { backgroundColor: hexToRgba(tokens.accent, 0.12) },
                  ]}
                >
                  <Text
                    style={[
                      type.body,
                      {
                        color: assignmentId === "practice" ? tokens.accent : native.label,
                        fontWeight: assignmentId === "practice" ? "700" : "500",
                        flex: 1,
                      },
                    ]}
                  >
                    Practice
                  </Text>
                  {assignmentId === "practice" ? (
                    <Ionicons name="checkmark-circle" size={22} color={tokens.accent} />
                  ) : null}
                </Pressable>
                {assignments.map((a, index) => {
                  const active = assignmentId === String(a.id)
                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => {
                        setAssignmentId(String(a.id))
                        setSheet(null)
                      }}
                      style={[
                        styles.sheetOption,
                        { borderBottomColor: native.separator },
                        index === assignments.length - 1 && styles.sheetOptionLast,
                        active && { backgroundColor: hexToRgba(tokens.accent, 0.12) },
                      ]}
                    >
                      <Text
                        style={[
                          type.body,
                          {
                            color: active ? tokens.accent : native.label,
                            fontWeight: active ? "700" : "500",
                            flex: 1,
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {a.title}
                      </Text>
                      {active ? <Ionicons name="checkmark-circle" size={22} color={tokens.accent} /> : null}
                    </Pressable>
                  )
                })}
              </>
            ) : null}
          </View>
          </ScrollView>

          <Pressable
            onPress={() => setSheet(null)}
            style={[styles.cancelBtn, { backgroundColor: native.fill }]}
          >
            <Text style={[type.bodyEmphasis, { color: native.label, textAlign: "center" }]}>Cancel</Text>
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
  actionScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexGrow: 0,
  },
  sheetTrigger: {
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  sheetTriggerText: { flex: 1, fontSize: 14, fontWeight: "700" },
  runBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  runText: { color: "#1a1025", fontSize: 14, fontWeight: "800" },
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
  coraReady: {
    paddingHorizontal: 14,
    paddingBottom: 6,
    gap: 10,
  },
  walkthroughHost: {
    flex: 1,
    minHeight: 0,
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
    borderRadius: 14,
    overflow: "hidden",
  },
  sheetOption: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetOptionLast: { borderBottomWidth: 0 },
  cancelBtn: {
    marginTop: 12,
    borderRadius: 999,
    paddingVertical: 14,
  },
})
