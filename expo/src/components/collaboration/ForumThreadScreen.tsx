import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams } from "expo-router"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useSession } from "../../context/SessionProvider"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import {
  collaborationApi,
  formatRelativeTime,
  stripHtml,
  type ForumReply,
  type ForumThread,
} from "../../lib/collaboration-api"
import { ComposerSendButton } from "../theme/ComposerSendButton"
import { CommGroupedList, CommSectionFooter } from "../faculty/faculty-communication-ui"
import { FacultyStatusPill } from "../faculty/faculty-shared"
import { ModuleSectionHeader } from "../modules/ModuleScreen"
import { CollabScreenTitle } from "./collab-nav"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function ReplyRow({
  reply,
  onVote,
  isLast,
}: {
  reply: ForumReply
  onVote: (replyId: number, voteType: "upvote" | "downvote") => void
  isLast?: boolean
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const SN = useThemedStudentNative()

  const text = reply.reply_text ?? reply.content ?? ""
  const votes = (reply.upvotes ?? 0) - (reply.downvotes ?? 0)

  return (
    <View
      style={[
        styles.replyRow,
        { backgroundColor: native.secondaryGrouped },
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: native.separator },
      ]}
    >
      <View style={styles.replyHead}>
        <Text style={type.bodyEmphasis}>{reply.author_name ?? "Student"}</Text>
        <Text style={type.footnote}>{formatRelativeTime(reply.created_at)}</Text>
      </View>
      <Text style={[type.callout, styles.replyBody]}>{stripHtml(text)}</Text>
      <View style={styles.voteRow}>
        <Pressable style={[styles.voteBtn, { backgroundColor: native.fill }]} onPress={() => onVote(reply.id, "upvote")}>
          <Ionicons name="arrow-up" size={14} color={SN.accent} />
          <Text style={[styles.voteBtnText, { color: SN.accent }]}>{votes}</Text>
        </Pressable>
        <Pressable style={[styles.voteBtn, { backgroundColor: native.fill }]} onPress={() => onVote(reply.id, "downvote")}>
          <Ionicons name="arrow-down" size={14} color={native.tertiaryLabel} />
        </Pressable>
        {reply.is_solution ? <FacultyStatusPill label="Solution" tone="success" /> : null}
      </View>
    </View>
  )
}

export function ForumThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const threadId = Number(id)
  const session = useStudentSession()
  const insets = useSafeAreaInsets()
  const scrollPad = useModuleScrollContentPadding(100)
  const native = useThemedNative()
  const type = useNativeType()
  const SN = useThemedStudentNative()
  const [thread, setThread] = useState<ForumThread | null>(null)
  const [replies, setReplies] = useState<ForumReply[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [replyText, setReplyText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!session || !Number.isFinite(threadId)) return
    setError("")
    try {
      const [threadRes, repliesRes] = await Promise.all([
        collaborationApi.getForumThread(session, threadId),
        collaborationApi.getForumReplies(session, threadId),
      ])
      setThread(threadRes.thread ?? null)
      setReplies(repliesRes.replies ?? [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load thread.")
    }
  }, [session, threadId])

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load, session])

  useNotificationModuleRefresh("forum", load)

  const voteThread = async (voteType: "upvote" | "downvote") => {
    if (!session) return
    try {
      await collaborationApi.voteForum(session, { threadId, voteType })
      await load()
    } catch {
      AppAlert.alert("Vote failed", "Could not register your vote.")
    }
  }

  const voteReply = async (replyId: number, voteType: "upvote" | "downvote") => {
    if (!session) return
    try {
      await collaborationApi.voteForum(session, { replyId, voteType })
      await load()
    } catch {
      AppAlert.alert("Vote failed", "Could not register your vote.")
    }
  }

  const submitReply = async () => {
    if (!session || !replyText.trim()) return
    setSubmitting(true)
    try {
      await collaborationApi.postForumReply(session, threadId, replyText.trim())
      setReplyText("")
      await load()
    } catch (err) {
      AppAlert.alert("Reply failed", err instanceof ApiError ? err.message : "Could not post reply.")
    } finally {
      setSubmitting(false)
    }
  }

  const shareCode = async (code: string) => {
    await Share.share({ message: code })
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <ActivityIndicator size="large" color={native.tint} />
      </View>
    )
  }

  if (!thread) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <Text style={[type.destructive, styles.errorText]}>{error || "Thread not found."}</Text>
      </View>
    )
  }

  const threadVotes = (thread.upvotes ?? 0) - (thread.downvotes ?? 0)
  const author = thread.is_anonymous ? "Anonymous" : thread.author_name ?? "Student"

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, scrollPad]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <CollabScreenTitle subtitle={thread.title} />
        {error ? <Text style={[type.destructive, styles.errorBanner]}>{error}</Text> : null}

        <CommGroupedList>
          <View style={[styles.threadBody, { backgroundColor: native.secondaryGrouped }]}>
            <Text style={type.footnote}>
              {author} · {formatRelativeTime(thread.created_at)}
              {thread.author_reputation ? ` · ${thread.author_reputation} rep` : ""}
            </Text>
            <Text style={[type.callout, styles.threadText]}>{stripHtml(thread.description ?? "")}</Text>

            {thread.code_snippet ? (
              <View style={styles.codeBlock}>
                <View style={styles.codeHead}>
                  <Text style={styles.codeLabel}>Code</Text>
                  <Pressable onPress={() => shareCode(thread.code_snippet!)}>
                    <Ionicons name="share-outline" size={16} color={SN.accent} />
                  </Pressable>
                </View>
                <Text style={styles.codeText}>{thread.code_snippet}</Text>
              </View>
            ) : null}

            {thread.tags && thread.tags.length > 0 ? (
              <View style={styles.tagRow}>
                {thread.tags.map((tag) => (
                  <FacultyStatusPill key={tag} label={tag} tone="neutral" />
                ))}
              </View>
            ) : null}

            <View style={styles.voteRow}>
              <Pressable style={[styles.voteBtn, { backgroundColor: native.fill }]} onPress={() => voteThread("upvote")}>
                <Ionicons name="arrow-up" size={16} color={SN.accent} />
                <Text style={[styles.voteBtnText, { color: SN.accent }]}>{threadVotes}</Text>
              </Pressable>
              <Pressable style={[styles.voteBtn, { backgroundColor: native.fill }]} onPress={() => voteThread("downvote")}>
                <Ionicons name="arrow-down" size={16} color={native.tertiaryLabel} />
              </Pressable>
              <Text style={[type.footnote, styles.replyCount]}>{replies.length} replies</Text>
            </View>
          </View>
        </CommGroupedList>

        <ModuleSectionHeader title="Replies" />
        {replies.length === 0 ? (
          <Text style={[type.caption, styles.emptyReplies]}>No replies yet. Be the first to help.</Text>
        ) : (
          <CommGroupedList>
            {replies.map((reply, index) => (
              <ReplyRow
                key={reply.id}
                reply={reply}
                onVote={voteReply}
                isLast={index === replies.length - 1}
              />
            ))}
          </CommGroupedList>
        )}
        <CommSectionFooter>Vote on helpful replies — instructors may mark solutions.</CommSectionFooter>
      </ScrollView>

      <View
        style={[
          styles.composer,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: native.secondaryGrouped,
            borderTopColor: native.separator,
          },
        ]}
      >
        <TextInput
          style={[
            styles.composerInput,
            { color: native.label, backgroundColor: native.fill },
          ]}
          value={replyText}
          onChangeText={setReplyText}
          placeholder="Write a reply…"
          placeholderTextColor={native.tertiaryLabel}
          multiline
        />
        <ComposerSendButton
          active={!!replyText.trim() && !submitting}
          sending={submitting}
          onPress={submitReply}
          iconName="send"
          iconSize={18}
          size={42}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  content: { padding: NATIVE.pagePadding, gap: 12 },
  errorText: { fontSize: 14 },
  errorBanner: { fontSize: 13, textAlign: "center" },
  threadBody: { paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  threadText: { lineHeight: 22 },
  codeBlock: { backgroundColor: "#0f172a", borderRadius: NATIVE.sectionRadius, padding: 12, gap: 8 },
  codeHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  codeLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "700" },
  codeText: { color: "#e2e8f0", fontFamily: "Menlo", fontSize: 12, lineHeight: 18 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  voteRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  voteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  voteBtnText: { fontSize: 12, fontWeight: "600" },
  replyCount: { marginLeft: 4 },
  emptyReplies: { textAlign: "center", paddingVertical: 16 },
  replyRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  replyHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  replyBody: { lineHeight: 20 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: NATIVE.pagePadding,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
})
