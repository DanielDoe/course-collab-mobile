import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { formatRelativeTime, stripHtml, type ForumReply, type ForumThread } from "../../lib/collaboration-api"
import { instructorApi } from "../../lib/instructor-api"
import { FACULTY_COMMUNICATION_COLOR } from "../../lib/faculty-communication-theme"
import { REPORT_SOLID } from "../../lib/assessment-report-theme"
import { CommGroupedList, CommSectionFooter, CommSectionHeader, useFacultyCommunicationTheme } from "./faculty-communication-ui"
import {
  FacultySheetContainer,
  useCollabSheetStyles, FacultySheetChrome 
} from "./faculty-collab-sheet-ui"

type FacultyScope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  scope: FacultyScope | null
  threadId: number | null
  onClose: () => void
}

function ReplyRow({
  reply,
  isLast,
  styles,
  successColor,
}: {
  reply: ForumReply
  isLast?: boolean
  styles: ReturnType<typeof createThreadStyles>
  successColor: string
}) {
  const text = stripHtml(reply.reply_text ?? reply.content ?? "")
  const votes = (reply.upvotes ?? 0) - (reply.downvotes ?? 0)

  return (
    <View style={[styles.replyRow, !isLast && styles.replyBorder]}>
      <View style={styles.replyHead}>
        <Text style={styles.replyAuthor}>{reply.author_name ?? "Student"}</Text>
        <Text style={styles.replyTime}>{formatRelativeTime(reply.created_at)}</Text>
      </View>
      {text ? <Text style={styles.replyBody}>{text}</Text> : null}
      <View style={styles.replyMeta}>
        {votes !== 0 ? <Text style={styles.replyVotes}>{votes > 0 ? `+${votes}` : votes} votes</Text> : null}
        {reply.is_solution ? (
          <View style={styles.solutionChip}>
            <Ionicons name="checkmark-circle" size={12} color={successColor} />
            <Text style={styles.solutionText}>Solution</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

export function FacultyDiscussionThreadModal({ visible, scope, threadId, onClose }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const comm = useFacultyCommunicationTheme()
  const styles = useMemo(() => createThreadStyles(comm), [comm])
  const insets = useSafeAreaInsets()
  const [thread, setThread] = useState<ForumThread | null>(null)
  const [replies, setReplies] = useState<ForumReply[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!scope || !threadId) return
    setError("")
    const [nextThread, nextReplies] = await Promise.all([
      instructorApi.getForumThread(scope, threadId),
      instructorApi.getForumReplies(scope, threadId),
    ])
    setThread(nextThread)
    setReplies(nextReplies)
  }, [scope, threadId])

  useEffect(() => {
    if (!visible || !scope || !threadId) {
      setThread(null)
      setReplies([])
      setError("")
      return
    }
    setLoading(true)
    load()
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Could not load thread.")
        setThread(null)
        setReplies([])
      })
      .finally(() => setLoading(false))
  }, [visible, scope, threadId, load])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  const author = thread?.is_anonymous ? "Anonymous" : thread?.author_name ?? "Student"
  const body = stripHtml(thread?.description ?? "")
  const votes = thread ? (thread.upvotes ?? 0) - (thread.downvotes ?? 0) : 0

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Thread" onClose={onClose} accentColor={FACULTY_COMMUNICATION_COLOR.link} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.body, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_COMMUNICATION_COLOR.link} />
          }
          showsVerticalScrollIndicator={false}
        >
          {loading && !thread ? (
            <ActivityIndicator color={FACULTY_COMMUNICATION_COLOR.link} style={{ marginTop: 32 }} />
          ) : null}

          {error ? <Text style={[comm.type.caption, styles.errorText]}>{error}</Text> : null}

          {thread ? (
            <>
              <View style={styles.threadHero}>
                <Text style={styles.threadTitle}>{thread.title}</Text>
                <Text style={styles.threadMeta}>
                  {author} · {formatRelativeTime(thread.created_at)}
                  {votes !== 0 ? ` · ${votes > 0 ? `+${votes}` : votes} votes` : ""}
                </Text>
                {body ? <Text style={styles.threadBody}>{body}</Text> : null}
                {thread.code_snippet ? (
                  <View style={styles.codeBlock}>
                    <Text style={styles.codeLabel}>Code snippet</Text>
                    <Text style={styles.codeText}>{thread.code_snippet}</Text>
                  </View>
                ) : null}
                {thread.tags && thread.tags.length > 0 ? (
                  <View style={styles.tagRow}>
                    {thread.tags.map((tag) => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>

              <CommSectionHeader title={`Replies (${replies.length})`} />
              {replies.length === 0 ? (
                <View style={styles.emptyReplies}>
                  <Text style={styles.emptyRepliesText}>No replies yet.</Text>
                </View>
              ) : (
                <CommGroupedList>
                  {replies.map((reply, index) => (
                    <ReplyRow
                      key={reply.id}
                      reply={reply}
                      isLast={index === replies.length - 1}
                      styles={styles}
                      successColor={REPORT_SOLID.correct}
                    />
                  ))}
                </CommGroupedList>
              )}

              <CommSectionFooter>
                Instructor moderation actions (pin, hide, flag) will appear here in a future update.
              </CommSectionFooter>
            </>
          ) : null}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

function createThreadStyles(comm: ReturnType<typeof useFacultyCommunicationTheme>) {
  const { native, tokens, type, layout } = comm
  return StyleSheet.create({
    errorText: { color: tokens.danger, textAlign: "center", paddingVertical: 16 },
    threadHero: {
      backgroundColor: native.secondaryGrouped,
      borderRadius: layout.sectionRadius,
      padding: 16,
      gap: 10,
      marginBottom: 8,
    },
    threadTitle: { ...type.sheetTitle, letterSpacing: -0.4, lineHeight: 26 },
    threadMeta: { ...type.caption },
    threadBody: { ...type.body, lineHeight: 23 },
    codeBlock: {
      backgroundColor: tokens.isDark ? "#0f172a" : "#111827",
      borderRadius: 12,
      padding: 12,
      gap: 6,
    },
    codeLabel: { fontSize: 11, fontWeight: "700", color: "#94a3b8" },
    codeText: { fontSize: 12, lineHeight: 18, color: "#e2e8f0", fontFamily: "Menlo" },
    tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    tag: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: `${FACULTY_COMMUNICATION_COLOR.link}18`,
    },
    tagText: { ...type.caption, color: FACULTY_COMMUNICATION_COLOR.link, fontWeight: "600" },
    emptyReplies: {
      backgroundColor: native.secondaryGrouped,
      borderRadius: layout.sectionRadius,
      paddingVertical: 28,
      alignItems: "center",
    },
    emptyRepliesText: { ...type.caption },
    replyRow: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 6,
      backgroundColor: native.secondaryGrouped,
    },
    replyBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: native.separator,
    },
    replyHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
    replyAuthor: { ...type.bodyEmphasis },
    replyTime: { ...type.footnote },
    replyBody: { ...type.body, lineHeight: 21 },
    replyMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
    replyVotes: { ...type.footnote },
    solutionChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: `${REPORT_SOLID.correct}18`,
    },
    solutionText: { fontSize: 12, fontWeight: "600", color: REPORT_SOLID.correct },
  })
}
