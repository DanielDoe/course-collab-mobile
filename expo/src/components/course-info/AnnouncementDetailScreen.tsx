import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams } from "expo-router"
import { ModuleScreen, ModuleSectionHeader } from "../modules/ModuleScreen"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { useSession } from "../../context/SessionProvider"
import { ApiError, type Announcement, type AnnouncementComment } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { courseInfoApi, formatListDate } from "../../lib/course-info-api"
import { summarizeAnnouncement } from "../../lib/announcement-summary"
import { ANNOUNCEMENT_LOCKED_MESSAGE } from "../../lib/announcement-content"
import { AnnouncementBodyWebView } from "./AnnouncementBodyWebView"
import { useCourseInfoTheme, InfoSectionCard, StatusBadge } from "./course-info-shared"
import {
  COURSE_INFO_ACTION,
  COURSE_INFO_COLOR,
  courseInfoAiSummaryStyle,
} from "../../lib/course-info-color-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { API_BASE_URL } from "../../constants"

const REACTIONS = [
  { id: "like", emoji: "👍", label: "Like" },
  { id: "love", emoji: "❤️", label: "Love" },
  { id: "fire", emoji: "🔥", label: "Fire" },
  { id: "wow", emoji: "😮", label: "Wow" },
]

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function resolveAttachmentUrl(url: string): string {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`
}

function CommentRow({ comment }: { comment: AnnouncementComment }) {
  const theme = useCourseInfoTheme()
  const native = useThemedNative()
  const type = useNativeType()
  return (
    <View style={[styles.commentRow, { borderBottomColor: native.separator }]}>
      <View style={[styles.commentAvatar, { backgroundColor: theme.soft }]}>
        <Text style={[styles.commentInitial, { color: theme.primary }]}>
          {(comment.student_name?.trim()[0] ?? "?").toUpperCase()}
        </Text>
      </View>
      <View style={styles.commentBody}>
        <View style={styles.commentHead}>
          <Text style={[type.bodyEmphasis, styles.commentName]}>{comment.student_name}</Text>
          <Text style={[type.caption, styles.commentDate]}>{formatListDate(comment.created_at)}</Text>
        </View>
        <Text style={[type.secondary, styles.commentText]}>{comment.content}</Text>
      </View>
    </View>
  )
}

function AnnouncementDetailShell({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const native = useThemedNative()
  return (
    <View style={[shellStyles.root, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title={title} fallbackHref="/announcements" />
      <View style={shellStyles.body}>{children}</View>
    </View>
  )
}

export function AnnouncementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const announcementId = Number(id)
  const session = useStudentSession()
  const theme = useCourseInfoTheme()
  const native = useThemedNative()
  const type = useNativeType()
  const tokens = useAppThemeTokens()
  const aiSummaryStyle = courseInfoAiSummaryStyle(tokens.isDark)
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [comments, setComments] = useState<AnnouncementComment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [commentDraft, setCommentDraft] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  const [reacting, setReacting] = useState(false)

  const load = useCallback(async () => {
    if (!session || !Number.isFinite(announcementId)) return
    setError("")
    try {
      const [detail, commentsData] = await Promise.all([
        courseInfoApi.getAnnouncementById(session, announcementId),
        courseInfoApi.getAnnouncementComments(session, announcementId).catch(() => ({ comments: [] })),
      ])
      setAnnouncement(detail.announcement)
      setComments(commentsData.comments ?? [])

      void courseInfoApi.markAnnouncementViewed(session, announcementId).catch(() => undefined)
    } catch (err) {
      // Stale notification deep links (deleted announcements) should not look like a crash.
      if (err instanceof ApiError && (err.status === 404 || /not found/i.test(err.message))) {
        setAnnouncement(null)
        setComments([])
        setError("")
        return
      }
      setError(err instanceof ApiError ? err.message : "Could not load announcement.")
    }
  }, [session, announcementId])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useNotificationModuleRefresh("announcements", onRefresh)

  const locked = announcement?.student_content_locked === true
  const summary = useMemo(
    () =>
      announcement
        ? summarizeAnnouncement(announcement.content ?? "", {
            title: announcement.title,
            locked,
            maxLength: 220,
            aiSummary: announcement.ai_summary})
        : "",
    [announcement, locked],
  )

  async function handleReaction(reactionType: string) {
    if (!session || !announcement || locked || announcement.allow_reactions === false) return
    setReacting(true)
    try {
      const result = await courseInfoApi.reactToAnnouncement(session, announcement.id, reactionType)
      setAnnouncement((prev) =>
        prev
          ? {
              ...prev,
              my_reaction: result.reactionType}
          : prev,
      )
    } catch (err) {
      AppAlert.alert("Reaction failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setReacting(false)
    }
  }

  async function submitComment() {
    if (!session || !announcement || !commentDraft.trim()) return
    if (locked || announcement.allow_comments === false) return
    setSubmittingComment(true)
    try {
      const result = await courseInfoApi.postAnnouncementComment(
        session,
        announcement.id,
        commentDraft.trim(),
      )
      setComments((prev) => [...prev, result.comment])
      setCommentDraft("")
    } catch (err) {
      AppAlert.alert("Comment failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setSubmittingComment(false)
    }
  }

  async function openAttachment(url: string, name: string) {
    const resolved = resolveAttachmentUrl(url)
    try {
      const can = await Linking.canOpenURL(resolved)
      if (!can) throw new Error("Cannot open file")
      await Linking.openURL(resolved)
    } catch {
      AppAlert.alert("Unable to open", `Could not open ${name}. Try again on web.`)
    }
  }

  if (!session) return null

  const headerTitle = announcement?.title?.trim() || "Announcement"

  return (
    <AnnouncementDetailShell title={headerTitle}>
      <ModuleScreen
        loading={loading}
        error={error}
        empty={!loading && !announcement}
        emptyTitle="Announcement unavailable"
        emptyBody="This post may have been removed or is no longer shared with your course. Pull to refresh, or go back to Announcements for the latest posts."
        emptyIcon="megaphone-outline"
        refreshing={refreshing}
        onRefresh={onRefresh}
        disableTopInsetAdjustment
      >
      {announcement ? (
        <>
          <View style={styles.hero}>
            <View style={styles.heroBadges}>
              {announcement.pinned ? <StatusBadge label="Pinned" tone="purple" /> : null}
              {announcement.category ? (
                <StatusBadge label={announcement.category} tone="neutral" />
              ) : null}
              {locked ? <StatusBadge label="Locked" tone="warning" /> : null}
            </View>
            <Text style={[styles.heroTitle, { color: native.label }]}>{announcement.title}</Text>
            <Text style={[type.caption, styles.heroMeta, { color: native.secondaryLabel }]}>
              {[announcement.author_name, formatListDate(announcement.created_at)]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>

          <View
            style={[
              styles.summaryCard,
              { backgroundColor: aiSummaryStyle.background, borderColor: aiSummaryStyle.border },
            ]}
          >
            <View style={styles.summaryHead}>
              <Ionicons name="sparkles" size={16} color={aiSummaryStyle.accent} />
              <Text style={[type.caption, styles.summaryLabel, { color: aiSummaryStyle.accent }]}>AI Summary</Text>
            </View>
            <Text style={[type.body, styles.summaryText, { color: native.label }]}>{summary}</Text>
          </View>

          {locked ? (
            <View style={[styles.lockedBox, { backgroundColor: `${tokens.warning}14`, borderColor: `${tokens.warning}40` }]}>
              <Ionicons name="lock-closed-outline" size={22} color={tokens.warning} />
              <Text style={[type.secondary, styles.lockedText, { color: tokens.warning }]}>
                {ANNOUNCEMENT_LOCKED_MESSAGE}
              </Text>
            </View>
          ) : (
            <View style={styles.fullAnnouncementSection}>
              <ModuleSectionHeader title="Full announcement" />
              <AnnouncementBodyWebView
                content={announcement.content ?? ""}
                accentColor={COURSE_INFO_COLOR.infoWash}
                paddingHorizontal={4}
              />
            </View>
          )}

          {!locked && (announcement.attachments?.length ?? 0) > 0 ? (
            <InfoSectionCard title="Attachments" icon="attach-outline">
              {announcement.attachments!.map((file, index) => (
                <Pressable
                  key={`${file.url}-${index}`}
                  style={[styles.attachmentRow, { borderBottomColor: native.separator }]}
                  onPress={() => void openAttachment(file.url, file.name)}
                >
                  <Ionicons name="document-outline" size={18} color={theme.primary} />
                  <Text style={[type.bodyEmphasis, styles.attachmentName]} numberOfLines={1}>
                    {file.name}
                  </Text>
                  <Ionicons name="open-outline" size={16} color={native.tertiaryLabel} />
                </Pressable>
              ))}
            </InfoSectionCard>
          ) : null}

          {!locked && announcement.allow_reactions !== false ? (
            <InfoSectionCard title="Reactions" icon="heart-outline">
              <View style={styles.reactionRow}>
                {REACTIONS.map((reaction) => {
                  const active = announcement.my_reaction === reaction.id
                  return (
                    <Pressable
                      key={reaction.id}
                      style={[
                        styles.reactionBtn,
                        { borderColor: native.separator, backgroundColor: native.fill },
                        active && {
                          borderColor: theme.primary,
                          backgroundColor: theme.soft,
                        },
                      ]}
                      onPress={() => void handleReaction(reaction.id)}
                      disabled={reacting}
                    >
                      <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                      <Text
                        style={[
                          type.caption,
                          styles.reactionLabel,
                          active ? { color: theme.primary, fontWeight: "700" } : null,
                        ]}
                      >
                        {reaction.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
              {(announcement.reactions_count ?? 0) > 0 ? (
                <Text style={[type.caption, styles.reactionMeta]}>
                  {announcement.reactions_count} total reactions
                </Text>
              ) : null}
            </InfoSectionCard>
          ) : null}

          {!locked && announcement.allow_comments !== false ? (
            <InfoSectionCard title="Comments" icon="chatbubbles-outline">
              {comments.length === 0 ? (
                <Text style={[type.secondary, styles.noComments]}>
                  No comments yet — be the first to reply.
                </Text>
              ) : (
                comments.map((comment) => <CommentRow key={comment.id} comment={comment} />)
              )}
              <View style={styles.commentComposer}>
                <TextInput
                  style={[
                    styles.commentInput,
                    {
                      borderColor: native.separator,
                      color: native.label,
                      backgroundColor: native.fill,
                    },
                  ]}
                  placeholder="Add a comment…"
                  placeholderTextColor={native.tertiaryLabel}
                  value={commentDraft}
                  onChangeText={setCommentDraft}
                  multiline
                />
                <Pressable
                  style={[
                    styles.commentSend,
                    { backgroundColor: COURSE_INFO_ACTION.fill },
                    (!commentDraft.trim() || submittingComment) && styles.commentSendDisabled,
                  ]}
                  onPress={() => void submitComment()}
                  disabled={!commentDraft.trim() || submittingComment}
                >
                  {submittingComment ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="send" size={16} color="#ffffff" />
                  )}
                </Pressable>
              </View>
            </InfoSectionCard>
          ) : null}
        </>
      ) : null}
      </ModuleScreen>
    </AnnouncementDetailShell>
  )
}

const shellStyles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
})

const styles = StyleSheet.create({
  hero: { gap: 8 },
  heroBadges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  heroTitle: { fontSize: 24, fontWeight: "600", lineHeight: 30, letterSpacing: -0.3 },
  heroMeta: {},
  summaryCard: {
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1},
  summaryHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    },
  summaryText: { fontSize: 15, lineHeight: 22 },
  fullAnnouncementSection: { gap: 10 },
  lockedBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  lockedText: { flex: 1, lineHeight: 21 },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  attachmentName: { flex: 1 },
  reactionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reactionBtn: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 72,
  },
  reactionEmoji: { fontSize: 20 },
  reactionLabel: { fontWeight: "600" },
  reactionMeta: { marginTop: 4 },
  noComments: { lineHeight: 20 },
  commentRow: { flexDirection: "row", gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  commentInitial: { fontSize: 13, fontWeight: "600" },
  commentBody: { flex: 1, gap: 4 },
  commentHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  commentName: {},
  commentDate: {},
  commentText: { lineHeight: 20 },
  commentComposer: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 10 },
  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  commentSend: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  commentSendDisabled: { opacity: 0.45 },
})
