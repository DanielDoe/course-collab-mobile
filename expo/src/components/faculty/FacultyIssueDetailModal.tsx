import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import {
  formatIssueDate,
  issueSourceLabel,
  parseIssueDescription} from "../../lib/faculty-issue-utils"
import {
  formatFacultyRelativeTime,
  instructorApi,
  type InstructorIssue,
  type InstructorIssueComment} from "../../lib/instructor-api"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetContainer,
  FacultySheetFormLayout,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetHero,
  FacultySheetNotice,
  FacultySheetSection,
  FacultySheetStatChip,
  FacultySheetStatRow,
  FacultySheetTextInput
} from "./faculty-collab-sheet-ui"
import { SHEET_METRIC, SHEET_SECTION } from "./faculty-sheet-semantics"

type Scope = { instructorId: number; courseId: number }

type Props = {
  issue: InstructorIssue | null
  scope: Scope | null
  instructorName: string
  instructorId: number
  onClose: () => void
  onUpdated: () => void
}

function studentInitials(name?: string): string {
  const parts = (name ?? "S").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "S"
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase()
}

function useIssueDetailStyles() {
  const { native, tokens, type } = useModuleTheme()
  const styles = useMemo(
    () =>
      StyleSheet.create({
        headline: { fontSize: 16, fontWeight: "600", color: native.label, lineHeight: 22 },
        codeRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          alignSelf: "flex-start",
          backgroundColor: native.fill,
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 6,
        },
        codeText: {
          fontSize: 12,
          fontWeight: "600",
          color: native.secondaryLabel,
          fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
        },
        detailBlock: { gap: 4 },
        detailLabel: { fontSize: 11, fontWeight: "600", color: native.tertiaryLabel },
        detailBody: { fontSize: 14, lineHeight: 21, color: native.label, fontWeight: "600" },
        paragraphStack: { gap: 10 },
        paragraph: { fontSize: 14, lineHeight: 21, color: native.label, fontWeight: "600" },
        commentCount: { fontSize: 12, fontWeight: "700", color: native.secondaryLabel },
        loader: { paddingVertical: 16 },
        emptyThread: { alignItems: "center", gap: 6, paddingVertical: 20 },
        emptyThreadTitle: { fontSize: 15, fontWeight: "600", color: native.label },
        emptyThreadBody: {
          fontSize: 13,
          lineHeight: 18,
          color: native.secondaryLabel,
          textAlign: "center",
          fontWeight: "600",
        },
        thread: { gap: 10 },
        comment: {
          backgroundColor: native.fill,
          borderRadius: 14,
          padding: 12,
          gap: 8,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
        },
        commentInstructor: { borderColor: tokens.accent, backgroundColor: tokens.accentSoft },
        commentHead: { flexDirection: "row", alignItems: "center", gap: 10 },
        commentAvatar: {
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: native.fill,
          alignItems: "center",
          justifyContent: "center",
        },
        commentAvatarInstructor: { backgroundColor: tokens.accent },
        commentAvatarText: { fontSize: 11, fontWeight: "600", color: native.secondaryLabel },
        commentAvatarTextInstructor: { color: "#ffffff" },
        commentMeta: { flex: 1, gap: 2 },
        commentAuthor: { fontSize: 13, fontWeight: "600", color: native.label },
        commentRole: { fontSize: 11, fontWeight: "600", color: native.tertiaryLabel },
        commentBody: { fontSize: 14, lineHeight: 20, color: native.label, fontWeight: "600" },
        footer: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: native.secondaryGrouped,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: native.separator,
          paddingHorizontal: 16,
          paddingTop: 12,
          gap: 10,
        },
        input: {
          minHeight: 44,
          maxHeight: 96,
        },
        footerActions: { flexDirection: "row", gap: 10 },
        footerBtn: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          borderRadius: 999,
          paddingVertical: 13,
        },
        footerBtnPrimary: { backgroundColor: tokens.accent },
        footerBtnPrimaryText: { fontSize: 15, fontWeight: "600", color: "#ffffff" },
        footerBtnSecondary: { backgroundColor: native.fill, borderWidth: 1, borderColor: tokens.danger },
        footerBtnSecondaryText: { fontSize: 15, fontWeight: "600", color: tokens.danger },
        btnDisabled: { opacity: 0.55 },
      }),
    [native, tokens, type],
  )
  return { styles, tokens, native }
}

export function FacultyIssueDetailModal({
  issue,
  scope,
  instructorName,
  instructorId,
  onClose,
  onUpdated}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const { styles, tokens, native } = useIssueDetailStyles()
  const insets = useSafeAreaInsets()
  const [comments, setComments] = useState<InstructorIssueComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const loadComments = useCallback(async () => {
    if (!scope || !issue) return
    setLoadingComments(true)
    try {
      setComments(await instructorApi.getIssueComments(scope, issue.id))
    } catch {
      setComments([])
    } finally {
      setLoadingComments(false)
    }
  }, [scope, issue])

  useEffect(() => {
    setCommentText("")
    if (issue && scope) void loadComments()
    else setComments([])
  }, [issue, scope, loadComments])

  const parsed = useMemo(
    () => (issue ? parseIssueDescription(issue.description) : null),
    [issue],
  )

  if (!issue || !parsed) return null

  const isOpen = issue.status === "open"

  async function handleSendComment() {
    if (!scope || !issue || !commentText.trim()) return
    setSending(true)
    try {
      await instructorApi.postIssueComment(scope, issue.id, {
        commenterName: instructorName,
        commenterId: String(instructorId),
        commentText: commentText.trim()})
      setCommentText("")
      await loadComments()
      onUpdated()
    } catch (err) {
      AppAlert.alert("Could not send reply", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setSending(false)
    }
  }

  function handleCloseIssue() {
    if (!scope || !issue) return
    AppAlert.alert("Close this issue?", "The student will be notified.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Close issue",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setUpdatingStatus(true)
            try {
              const note = commentText.trim()
              await instructorApi.updateIssueStatus(scope, issue.id, "closed", note || undefined)
              AppAlert.alert("Issue closed", "The student has been notified.")
              onUpdated()
              onClose()
            } catch (err) {
              AppAlert.alert("Could not close issue", err instanceof ApiError ? err.message : "Try again.")
            } finally {
              setUpdatingStatus(false)
            }
          })()
        }},
    ])
  }

  function handleReopenIssue() {
    if (!scope || !issue) return
    AppAlert.alert("Reopen this issue?", "The student will be notified that you are investigating again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reopen",
        onPress: () => {
          void (async () => {
            setUpdatingStatus(true)
            try {
              await instructorApi.updateIssueStatus(scope, issue.id, "open")
              AppAlert.alert("Issue reopened", "You can continue the conversation with the student.")
              onUpdated()
              onClose()
            } catch (err) {
              AppAlert.alert("Could not reopen issue", err instanceof ApiError ? err.message : "Try again.")
            } finally {
              setUpdatingStatus(false)
            }
          })()
        }},
    ])
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
      <FacultySheetFormLayout
        header={<FacultySheetChrome topInset={insets.top} title="Issue details" onClose={onClose} />}
        contentContainerStyle={collabSheetStyles.scroll}
        footer={
          <View>
          {isOpen ? (
            <>
              <FacultySheetTextInput
                style={styles.input}
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Write a reply to the student…"
                multiline
                textAlignVertical="top"
              />
              <View style={styles.footerActions}>
                <Pressable
                  style={[styles.footerBtn, styles.footerBtnPrimary, (sending || !commentText.trim()) && styles.btnDisabled]}
                  onPress={() => void handleSendComment()}
                  disabled={sending || !commentText.trim()}
                >
                  {sending ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="send-outline" size={16} color="#ffffff" />
                      <Text style={styles.footerBtnPrimaryText}>Send reply</Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  style={[styles.footerBtn, styles.footerBtnSecondary, updatingStatus && styles.btnDisabled]}
                  onPress={handleCloseIssue}
                  disabled={updatingStatus}
                >
                  {updatingStatus ? (
                    <ActivityIndicator color={tokens.danger} size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={16} color={tokens.danger} />
                      <Text style={styles.footerBtnSecondaryText}>Close issue</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <Pressable
              style={[styles.footerBtn, styles.footerBtnPrimary, updatingStatus && styles.btnDisabled]}
              onPress={handleReopenIssue}
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={16} color="#ffffff" />
                  <Text style={styles.footerBtnPrimaryText}>Reopen issue</Text>
                </>
              )}
            </Pressable>
          )}
          </View>
        }
      >
          <FacultySheetHero
            title={issue.student_name ?? "Student"}
            subtitle={issue.quiz_title ?? "Assessment issue"}
            initials={studentInitials(issue.student_name)}
            pills={<FacultyStatusPill label={isOpen ? "Open" : "Closed"} tone={isOpen ? "warning" : "neutral"} />}
          />

          <FacultySheetStatRow>
            <FacultySheetStatChip icon="calendar-outline" label="Reported" value={formatIssueDate(issue.created_at)} tone={SHEET_METRIC.neutral} />
            <FacultySheetStatChip icon="time-outline" label="When" value={formatFacultyRelativeTime(issue.created_at)} tone={SHEET_METRIC.info} />
            {issue.question_number != null ? (
              <FacultySheetStatChip icon="help-circle-outline" label="Question" value={`Q${issue.question_number}`} tone={SHEET_METRIC.secondary} />
            ) : null}
            <FacultySheetStatChip icon="finger-print-outline" label="Issue ID" value={`#${issue.id}`} tone={SHEET_METRIC.neutral} />
            {parsed.attemptId ? (
              <FacultySheetStatChip icon="document-text-outline" label="Attempt" value={`#${parsed.attemptId}`} tone={SHEET_METRIC.neutral} />
            ) : null}
          </FacultySheetStatRow>

          <FacultySheetSection
            label="What happened"
            tone={SHEET_SECTION.review}
            action={<FacultyStatusPill label={issueSourceLabel(parsed.source)} tone="neutral" />}
          >
            {parsed.headline ? <Text style={styles.headline}>{parsed.headline}</Text> : null}

            {parsed.errorCode ? (
              <View style={styles.codeRow}>
                <Ionicons name="code-slash-outline" size={14} color={native.secondaryLabel} />
                <Text style={styles.codeText}>{parsed.errorCode}</Text>
              </View>
            ) : null}

            {parsed.technicalDetail ? (
              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Technical detail</Text>
                <Text style={styles.detailBody}>{parsed.technicalDetail}</Text>
              </View>
            ) : null}

            {parsed.studentNote ? (
              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Student status</Text>
                <Text style={styles.detailBody}>{parsed.studentNote}</Text>
              </View>
            ) : null}

            {parsed.paragraphs.length > 0 && !parsed.technicalDetail ? (
              <View style={styles.paragraphStack}>
                {parsed.paragraphs.map((paragraph, index) => (
                  <Text key={`${index}-${paragraph.slice(0, 12)}`} style={styles.paragraph}>
                    {paragraph}
                  </Text>
                ))}
              </View>
            ) : null}

            {parsed.actionHint ? <FacultySheetNotice tone="warning" message={parsed.actionHint} /> : null}
          </FacultySheetSection>

          <FacultySheetSection
            label="Conversation"
            tone={SHEET_SECTION.highlight}
            action={
              <Text style={styles.commentCount}>{comments.length} repl{comments.length === 1 ? "y" : "ies"}</Text>
            }
          >
            {loadingComments ? (
              <ActivityIndicator color={tokens.accent} style={styles.loader} />
            ) : comments.length === 0 ? (
              <View style={styles.emptyThread}>
                <Ionicons name="chatbubbles-outline" size={28} color={native.tertiaryLabel} />
                <Text style={styles.emptyThreadTitle}>No replies yet</Text>
                <Text style={styles.emptyThreadBody}>
                  {isOpen
                    ? "Send a note to the student or close the issue once resolved."
                    : "Reopen the issue if you need to follow up."}
                </Text>
              </View>
            ) : (
              <View style={styles.thread}>
                {comments.map((comment) => {
                  const isInstructor =
                    comment.commenter_role === "instructor" || comment.commenter_role === "admin"
                  return (
                    <View
                      key={comment.id}
                      style={[styles.comment, isInstructor && styles.commentInstructor]}
                    >
                      <View style={styles.commentHead}>
                        <View style={[styles.commentAvatar, isInstructor && styles.commentAvatarInstructor]}>
                          <Text style={[styles.commentAvatarText, isInstructor && styles.commentAvatarTextInstructor]}>
                            {studentInitials(comment.commenter_name)}
                          </Text>
                        </View>
                        <View style={styles.commentMeta}>
                          <Text style={styles.commentAuthor}>{comment.commenter_name}</Text>
                          <Text style={styles.commentRole}>
                            {isInstructor ? "Instructor" : "Student"} · {formatFacultyRelativeTime(comment.created_at)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.commentBody}>{comment.comment_text}</Text>
                    </View>
                  )
                })}
              </View>
            )}
          </FacultySheetSection>
      </FacultySheetFormLayout>
      </FacultySheetContainer>
    </Modal>
  )
}
