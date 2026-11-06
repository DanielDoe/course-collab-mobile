import { useState } from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { aiTutorApi } from "../../lib/ai-tutor-api"
import type { CoraImportedProblem } from "../../lib/cora-api"
import { reportMobileClientError } from "../../lib/system-log-client"
import type { StudentSession } from "../../lib/session"
import type { AssessmentQuestion } from "../../lib/assessment-quiz/assessment-quiz-types"

const OBJECTIVE = new Set([
  "mcq",
  "multiple_choice",
  "true_false",
  "truefalse",
  "tf",
  "select_all",
  "multi_select",
  "multiple_select",
  "multi_output",
  "fill_blank",
  "fill_in_blank",
  "numeric",
  "number",
  "matching",
  "ordering",
  "code_output",
  "trace_output",
  "fill_code",
  "trace_logic",
  "code_reorder",
  "scenario_match",
])

const WRITTEN = new Set([
  "code_write",
  "code_write_plot",
  "circuit_submission",
  "circuit_multi_part",
  "code_problem",
  "debug_code",
  "code_debug",
  "code_explain",
  "file_upload",
  "solution_upload",
])

function normalizeType(value: string | null | undefined): string {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/-/g, "_")
}

function subquestionTypes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== "object" || !("type" in item)) return ""
      return normalizeType(String((item as { type?: unknown }).type ?? ""))
    })
    .filter(Boolean)
}

/** Same written-work rule as the web quiz taker. */
export function canAskCoraOnQuestion(
  questionType: string | null | undefined,
  subquestions?: unknown,
): boolean {
  const qt = normalizeType(questionType)
  if (!qt || OBJECTIVE.has(qt)) return false
  if (qt === "multi_part") {
    const subs = subquestionTypes(subquestions)
    return subs.some((type) => canAskCoraOnQuestion(type))
  }
  return WRITTEN.has(qt)
}

type Message = { role: "user" | "assistant"; content: string }

type Props = {
  visible: boolean
  onClose: () => void
  session: StudentSession
  question: AssessmentQuestion
  questionNumber: number
  quizId: number
  attemptId: number
}

export function AssessmentAskCoraSheet({
  visible,
  onClose,
  session,
  question,
  questionNumber,
  quizId,
  attemptId,
}: Props) {
  const tokens = useAppThemeTokens()
  const insets = useSafeAreaInsets()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)

  const problem: CoraImportedProblem = {
    source: "quiz",
    title: `Question ${questionNumber}`,
    questionText: question.question_text,
    questionType: question.question_type,
    hint: question.hint ?? null,
    questionId: question.id,
    quizId,
    attemptId,
    studentDatabaseId: session.databaseId,
  }

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    const history = messages.map((msg) => ({
      role: msg.role === "user" ? "student" : "assistant",
      content: msg.content,
    }))
    setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }])
    setInput("")
    setBusy(true)
    let reply = ""
    const writeReply = (content: string) => {
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === "assistant") next[next.length - 1] = { role: "assistant", content }
        else next.push({ role: "assistant", content })
        return next
      })
    }
    try {
      await aiTutorApi.streamMessage(
        session,
        text,
        history,
        {
          onChunk: (chunk) => {
            reply += chunk
            writeReply(reply)
          },
          onDone: () => {
            if (!reply.trim()) writeReply("No response received.")
          },
          onError: (message) => {
            reportMobileClientError({
              severity: "error",
              category: "api",
              title: "Ask Cora failed in quiz taker",
              errorMessage: message,
              moduleName: "Quiz Module",
              featureName: "Ask Cora",
              apiEndpoint: "/api/ai-tutor",
              httpMethod: "POST",
              metadata: { quizId, questionId: question.id },
            })
            writeReply(`Error: ${message}`)
          },
        },
        {
          problemContext: problem,
          chatConfig: { learningGoal: "understand" },
          useAgent: true,
        },
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not reach Cora."
      reportMobileClientError({
        severity: "error",
        category: "api",
        title: "Ask Cora failed in quiz taker",
        errorMessage: message,
        moduleName: "Quiz Module",
        featureName: "Ask Cora",
        apiEndpoint: "/api/ai-tutor",
        httpMethod: "POST",
      })
      writeReply(`Error: ${message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: tokens.background, paddingTop: insets.top }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.header, { borderColor: tokens.border }]}>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: tokens.text }]}>Ask Cora</Text>
            <Text style={[styles.subtitle, { color: tokens.textMuted }]}>
              Reference only — syntax and concepts, not this question's solution.
            </Text>
          </View>
          <Pressable onPress={onClose} accessibilityLabel="Close Ask Cora" hitSlop={8}>
            <Ionicons name="close" size={22} color={tokens.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.thread}>
          {messages.length === 0 ? (
            <Text style={[styles.empty, { color: tokens.textMuted }]}>
              Ask how to declare a variable, the syntax of a loop, or which concept applies. Cora will not write the solution.
            </Text>
          ) : (
            messages.map((msg, index) => (
              <View
                key={`${index}-${msg.role}`}
                style={[
                  styles.bubble,
                  msg.role === "user"
                    ? { backgroundColor: tokens.accent }
                    : { backgroundColor: tokens.surface, borderColor: tokens.border, borderWidth: 1 },
                ]}
              >
                <Text style={{ color: msg.role === "user" ? "#fff" : tokens.text }}>{msg.content}</Text>
              </View>
            ))
          )}
          {busy ? <ActivityIndicator color={tokens.accent} /> : null}
        </ScrollView>

        <View style={[styles.composer, { borderColor: tokens.border, paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about syntax or a concept…"
            placeholderTextColor={tokens.textMuted}
            style={[styles.input, { color: tokens.text, borderColor: tokens.border }]}
            editable={!busy}
            multiline
          />
          <Pressable
            onPress={() => void send()}
            disabled={busy || !input.trim()}
            style={[styles.send, { backgroundColor: tokens.accent, opacity: busy || !input.trim() ? 0.4 : 1 }]}
            accessibilityLabel="Send"
          >
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCopy: { flex: 1 },
  title: { fontSize: 17, fontWeight: "600" },
  subtitle: { marginTop: 2, fontSize: 12, lineHeight: 16 },
  thread: { padding: 16, gap: 10 },
  empty: { fontSize: 14, lineHeight: 20 },
  bubble: { maxWidth: "92%", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  send: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
})
