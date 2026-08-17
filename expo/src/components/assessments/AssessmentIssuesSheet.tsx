import { useCallback, useEffect, useState } from "react"
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
  View} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { hexToRgba } from "../../constants/app-themes"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useThemedStudentNative } from "../../lib/themed-module-theme"
import {
  assessmentIssuesApi,
  type AssessmentIssue,
  type IssueComment} from "../../lib/assessment-issues-api"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import type { QuizItem } from "../../lib/student-api"
import { ComposerSendButton } from "../theme/ComposerSendButton"
import { NativeSelect } from "../NativeSelect"

type SheetTab = "report" | "open" | "closed"

type Props = {
  visible: boolean
  onClose: () => void
  session: StudentSession
  assessmentType: string
  assessmentLabel: string
  quizzes: QuizItem[]
  initialTab?: SheetTab
  preselectedQuizId?: number
  onIssuesChanged?: () => void
}

export function AssessmentIssuesSheet({
  visible,
  onClose,
  session,
  assessmentType,
  assessmentLabel,
  quizzes,
  initialTab = "report",
  preselectedQuizId,
  onIssuesChanged}: Props) {
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const SN = useThemedStudentNative()
  const [tab, setTab] = useState<SheetTab>(initialTab)
  const [openIssues, setOpenIssues] = useState<AssessmentIssue[]>([])
  const [closedIssues, setClosedIssues] = useState<AssessmentIssue[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<AssessmentIssue | null>(null)

  const [quizId, setQuizId] = useState<number | null>(null)
  const [questionNumber, setQuestionNumber] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [reportError, setReportError] = useState("")

  const loadIssues = useCallback(async () => {
    setLoading(true)
    try {
      const [openRes, closedRes] = await Promise.all([
        assessmentIssuesApi.list(session, assessmentType, "open"),
        assessmentIssuesApi.list(session, assessmentType, "closed"),
      ])
      setOpenIssues(openRes.issues ?? [])
      setClosedIssues(closedRes.issues ?? [])
    } catch {
      setOpenIssues([])
      setClosedIssues([])
    } finally {
      setLoading(false)
    }
  }, [session, assessmentType])

  useEffect(() => {
    if (!visible) return
    setTab(initialTab)
    setSelectedIssue(null)
    setReportError("")
    setQuizId(preselectedQuizId ?? null)
    void loadIssues()
  }, [visible, initialTab, loadIssues, preselectedQuizId])

  const handleSubmitReport = async () => {
    if (!quizId || !description.trim()) {
      setReportError("Pick an assessment and describe the issue.")
      return
    }
    const quiz = quizzes.find((q) => q.id === quizId)
    setSubmitting(true)
    setReportError("")
    try {
      await assessmentIssuesApi.create(session, {
        quizId,
        quizTitle: quiz?.title ?? "Assessment",
        questionNumber: questionNumber.trim() ? Number.parseInt(questionNumber, 10) : null,
        description: description.trim(),
        assessmentType})
      setDescription("")
      setQuestionNumber("")
      setQuizId(null)
      onIssuesChanged?.()
      await loadIssues()
      setTab("open")
    } catch (err) {
      setReportError(err instanceof ApiError ? err.message : "Could not submit issue.")
    } finally {
      setSubmitting(false)
    }
  }

  const issues = tab === "open" ? openIssues : closedIssues

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 12, backgroundColor: tokens.background },
          ]}
        >
          <View style={styles.handle} />

          <View
            style={[
              styles.header,
              { backgroundColor: tokens.surface, borderBottomColor: tokens.border },
            ]}
          >
            <View style={styles.headerIcon}>
              <Ionicons name="chatbubbles" size={20} color={SN.secondaryLabel} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={[styles.headerTitle, { color: tokens.text }]}>Issues & Comments</Text>
              <Text style={[styles.headerSub, { color: SN.secondaryLabel }]} numberOfLines={1}>
                {assessmentLabel} · report & discuss
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={SN.secondaryLabel} />
            </Pressable>
          </View>

          <View
            style={[
              styles.tabs,
              { backgroundColor: tokens.surface, borderBottomColor: tokens.border },
            ]}
          >
            {(
              [
                { id: "report" as const, label: "Report", icon: "flag-outline" as const },
                { id: "open" as const, label: "Open", icon: "alert-circle-outline" as const, count: openIssues.length },
                { id: "closed" as const, label: "Resolved", icon: "checkmark-circle-outline" as const, count: closedIssues.length },
              ] as const
            ).map((item) => {
              const active = tab === item.id
              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.tab,
                    { backgroundColor: tokens.background },
                    active && { backgroundColor: hexToRgba(tokens.accent, 0.1) },
                  ]}
                  onPress={() => {
                    setTab(item.id)
                    setSelectedIssue(null)
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={14}
                    color={active ? tokens.accent : SN.secondaryLabel}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      { color: SN.secondaryLabel },
                      active && { color: tokens.accent, fontWeight: "700" },
                    ]}
                  >
                    {item.label}
                  </Text>
                  {"count" in item && item.count != null && item.count > 0 ? (
                    <View
                      style={[
                        styles.tabBadge,
                        active && { backgroundColor: hexToRgba(tokens.accent, 0.18) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabBadgeText,
                          { color: SN.secondaryLabel },
                          active && { color: tokens.accent },
                        ]}
                      >
                        {item.count}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              )
            })}
          </View>

          {selectedIssue ? (
            <IssueThread
              session={session}
              issue={selectedIssue}
              onBack={() => setSelectedIssue(null)}
              onCommentAdded={() => {
                onIssuesChanged?.()
                void loadIssues()
              }}
            />
          ) : tab === "report" ? (
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.sectionLabel, { color: tokens.accentDark }]}>Which assessment?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quizPicker}>
                {quizzes.map((q) => {
                  const selected = quizId === q.id
                  return (
                    <Pressable
                      key={q.id}
                      style={[
                        styles.quizChip,
                        {
                          backgroundColor: tokens.surface,
                          borderColor: tokens.border,
                        },
                        selected && {
                          borderColor: tokens.accent,
                          backgroundColor: hexToRgba(tokens.accent, 0.08),
                        },
                      ]}
                      onPress={() => setQuizId(q.id)}
                    >
                      <Text
                        style={[
                          styles.quizChipText,
                          { color: SN.secondaryLabel },
                          selected && { color: tokens.accent },
                        ]}
                        numberOfLines={2}
                      >
                        {q.title}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>

              <Text style={[styles.sectionLabel, { color: tokens.accentDark }]}>Question # (optional)</Text>
              <NativeSelect
                placeholder="None"
                value={questionNumber}
                options={[
                  { value: "", label: "None" },
                  ...Array.from(
                    { length: Math.max(quizzes.find((q) => q.id === quizId)?.question_count ?? 20, 1) },
                    (_, index) => ({
                      value: String(index + 1),
                      label: `Question ${index + 1}`,
                    }),
                  ),
                ]}
                onChange={setQuestionNumber}
              />

              <Text style={[styles.sectionLabel, { color: tokens.accentDark }]}>What&apos;s wrong?</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: tokens.surface,
                    borderColor: tokens.border,
                    color: tokens.text,
                  },
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder="Typo, wrong answer key, unclear wording, timer bug…"
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
              />

              {reportError ? <Text style={styles.errorText}>{reportError}</Text> : null}

              <Pressable
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={() => void handleSubmitReport()}
                disabled={submitting}
              >
                <LinearGradient
                  colors={[tokens.accent, tokens.accentHover]}
                  style={styles.submitGradient}
                >
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane" size={18} color="#ffffff" />
                      <Text style={styles.submitText}>Submit report</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </ScrollView>
          ) : (
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
            >
              {loading ? (
                <View style={styles.center}>
                  <ActivityIndicator color={tokens.accent} />
                </View>
              ) : issues.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons
                    name={tab === "open" ? "checkmark-done-circle-outline" : "archive-outline"}
                    size={40}
                    color={SN.secondaryLabel}
                  />
                  <Text style={[styles.emptyTitle, { color: tokens.text }]}>
                    {tab === "open" ? "No open issues" : "No resolved issues yet"}
                  </Text>
                  <Text style={[styles.emptyBody, { color: SN.secondaryLabel }]}>
                    {tab === "open"
                      ? "Everything looks good — tap Report to flag a concern."
                      : "Resolved threads will appear here once instructors close them."}
                  </Text>
                </View>
              ) : (
                issues.map((issue) => (
                  <Pressable
                    key={issue.id}
                    style={[
                      styles.issueCard,
                      {
                        backgroundColor: tokens.surface,
                        borderColor: tokens.border,
                        borderLeftColor: tokens.warning,
                      },
                    ]}
                    onPress={() => setSelectedIssue(issue)}
                  >
                    <View style={styles.issueTop}>
                      <Text style={[styles.issueTitle, { color: tokens.text }]} numberOfLines={1}>
                        {issue.quiz_title}
                      </Text>
                      <View
                        style={[
                          styles.statusPill,
                          issue.status === "open" ? styles.statusOpen : styles.statusClosed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            issue.status === "open" ? styles.statusTextOpen : styles.statusTextClosed,
                          ]}
                        >
                          {issue.status === "open" ? "Open" : "Closed"}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.issueDesc, { color: tokens.textSecondary }]} numberOfLines={2}>
                      {issue.question_number ? `Q${issue.question_number}: ` : ""}
                      {issue.description}
                    </Text>
                    <View style={styles.issueMeta}>
                      <Text style={[styles.issueMetaText, { color: SN.secondaryLabel }]}>
                        by {issue.reporter_name}
                      </Text>
                      <View style={styles.commentCount}>
                        <Ionicons name="chatbubble-outline" size={12} color={tokens.accent} />
                        <Text style={[styles.commentCountText, { color: tokens.accent }]}>
                          {issue.comment_count ?? 0}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

function IssueThread({
  session,
  issue,
  onBack,
  onCommentAdded}: {
  session: StudentSession
  issue: AssessmentIssue
  onBack: () => void
  onCommentAdded: () => void
}) {
  const tokens = useAppThemeTokens()
  const SN = useThemedStudentNative()
  const [comments, setComments] = useState<IssueComment[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await assessmentIssuesApi.getComments(issue.id)
      setComments(res.comments ?? [])
    } catch {
      setComments([])
    } finally {
      setLoading(false)
    }
  }, [issue.id])

  useEffect(() => {
    void load()
  }, [load])

  const send = async () => {
    if (!draft.trim()) return
    setSending(true)
    try {
      await assessmentIssuesApi.addComment(session, issue.id, draft.trim())
      setDraft("")
      await load()
      onCommentAdded()
    } finally {
      setSending(false)
    }
  }

  return (
    <View style={styles.thread}>
      <Pressable style={styles.backRow} onPress={onBack}>
        <Ionicons name="chevron-back" size={18} color={tokens.accent} />
        <Text style={[styles.backText, { color: tokens.accent }]}>All issues</Text>
      </Pressable>

      <View
        style={[
          styles.threadHero,
          { backgroundColor: tokens.surface, borderColor: tokens.border },
        ]}
      >
        <Text style={[styles.threadTitle, { color: tokens.text }]}>{issue.quiz_title}</Text>
        {issue.question_number ? (
          <Text style={[styles.threadQ, { color: tokens.accent }]}>Question {issue.question_number}</Text>
        ) : null}
        <Text style={[styles.threadDesc, { color: tokens.textSecondary }]}>{issue.description}</Text>
      </View>

      <ScrollView style={styles.comments} contentContainerStyle={styles.commentsContent}>
        {loading ? (
          <ActivityIndicator color={tokens.accent} style={{ marginTop: 20 }} />
        ) : comments.length === 0 ? (
          <Text style={[styles.noComments, { color: SN.secondaryLabel }]}>
            No comments yet — start the conversation.
          </Text>
        ) : (
          comments.map((c) => {
            const isStaff = c.commenter_role !== "student"
            return (
              <View
                key={c.id}
                style={[
                  styles.commentBubble,
                  isStaff
                    ? [
                        styles.commentStaff,
                        { backgroundColor: tokens.surface, borderColor: tokens.border },
                      ]
                    : [
                        styles.commentStudent,
                        { backgroundColor: hexToRgba(tokens.accent, 0.1) },
                      ],
                ]}
              >
                <Text style={[styles.commentAuthor, { color: tokens.accent }]}>
                  {c.commenter_name}
                  {isStaff ? " · Staff" : ""}
                </Text>
                <Text style={[styles.commentBody, { color: tokens.text }]}>{c.comment_text}</Text>
                <Text style={[styles.commentTime, { color: SN.secondaryLabel }]}>
                  {new Date(c.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            )
          })
        )}
      </ScrollView>

      {issue.status === "open" ? (
        <View
          style={[
            styles.composeRow,
            { borderTopColor: tokens.border, backgroundColor: tokens.surface },
          ]}
        >
          <TextInput
            style={[
              styles.composeInput,
              {
                borderColor: tokens.border,
                color: tokens.text,
                backgroundColor: tokens.background,
              },
            ]}
            value={draft}
            onChangeText={setDraft}
            placeholder="Add a comment…"
            placeholderTextColor="#94a3b8"
            multiline
          />
          <ComposerSendButton
            active={!!draft.trim() && !sending}
            sending={sending}
            onPress={() => void send()}
            iconName="send"
            iconSize={18}
            size={42}
          />
        </View>
      ) : (
        <View
          style={[
            styles.closedBanner,
            { borderTopColor: tokens.border, backgroundColor: tokens.surface },
          ]}
        >
          <Ionicons name="lock-closed-outline" size={14} color={SN.secondaryLabel} />
          <Text style={[styles.closedBannerText, { color: SN.secondaryLabel }]}>
            This issue is resolved — read only
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.45)" },
  backdropTap: { ...StyleSheet.absoluteFillObject },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(100,116,139,0.35)",
    marginTop: 10,
    marginBottom: 4},
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(100,116,139,0.1)",
    alignItems: "center",
    justifyContent: "center"},
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  headerSub: { fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(100,116,139,0.1)",
    alignItems: "center",
    justifyContent: "center"},
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 12,
  },
  tabText: { fontSize: 12, fontWeight: "600" },
  tabBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(100,116,139,0.15)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: { fontSize: 9, fontWeight: "600" },
  body: { maxHeight: 420 },
  bodyContent: { padding: 16, gap: 10, paddingBottom: 24 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  quizPicker: { marginBottom: 4 },
  quizChip: {
    maxWidth: 200,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
  },
  quizChipText: { fontSize: 13, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: { minHeight: 100, paddingTop: 12 },
  errorText: { color: "#b91c1c", fontSize: 13 },
  submitBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  submitBtnDisabled: { opacity: 0.7 },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14},
  submitText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  center: { alignItems: "center", paddingVertical: 32 },
  empty: { alignItems: "center", paddingVertical: 28, gap: 8, paddingHorizontal: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyBody: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  issueCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  issueTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  issueTitle: { flex: 1, fontSize: 14, fontWeight: "700" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusOpen: { backgroundColor: "rgba(234,170,0,0.16)" },
  statusClosed: { backgroundColor: "rgba(34,197,94,0.12)" },
  statusText: { fontSize: 10, fontWeight: "700" },
  statusTextOpen: { color: "#92400e" },
  statusTextClosed: { color: "#166534" },
  issueDesc: { fontSize: 13, lineHeight: 18 },
  issueMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, alignItems: "center" },
  issueMetaText: { fontSize: 11 },
  commentCount: { flexDirection: "row", alignItems: "center", gap: 4 },
  commentCountText: { fontSize: 11, fontWeight: "700" },
  thread: { flex: 1, maxHeight: 420 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 16, paddingVertical: 8 },
  backText: { fontSize: 14, fontWeight: "600" },
  threadHero: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  threadTitle: { fontSize: 15, fontWeight: "600" },
  threadQ: { fontSize: 12, fontWeight: "600" },
  threadDesc: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  comments: { flex: 1, marginTop: 10 },
  commentsContent: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  noComments: { textAlign: "center", fontSize: 13, marginTop: 16 },
  commentBubble: { borderRadius: 14, padding: 12, maxWidth: "92%" },
  commentStudent: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  commentStaff: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  commentAuthor: { fontSize: 11, fontWeight: "700", marginBottom: 4 },
  commentBody: { fontSize: 14, lineHeight: 20 },
  commentTime: { fontSize: 10, marginTop: 6 },
  composeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  composeInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 90,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  closedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  closedBannerText: { fontSize: 12, fontWeight: "500" },
})
