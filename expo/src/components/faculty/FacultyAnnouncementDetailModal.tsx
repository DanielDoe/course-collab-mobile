import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { AppAlertHost } from "../../context/AppAlertProvider"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { InstructorAnnouncement } from "../../lib/instructor-api"
import { instructorApi } from "../../lib/instructor-api"
import { summarizeAnnouncement } from "../../lib/announcement-summary"
import {
  facultyAnnouncementAudienceLabel,
  formatAnnouncementRelativeDate,
} from "../../lib/faculty-announcement-utils"
import {
  FACULTY_ANNOUNCEMENT_COLOR,
  facultyAnnouncementListThumb,
  facultyAnnouncementPinnedMeta,
  facultyAnnouncementPriorityMeta,
} from "../../lib/faculty-announcement-theme"
import { AnnouncementBodyWebView } from "../course-info/AnnouncementBodyWebView"
import { FacultySectionCard } from "./faculty-shared"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { ApiError } from "../../lib/api"
import { useModuleTheme } from "../../lib/themed-module-shell"

type Scope = { instructorId: number; courseId: number }

type Props = {
  item: InstructorAnnouncement | null
  scope: Scope | null
  onClose: () => void
  onEdit: (item: InstructorAnnouncement) => void
  onDelete: (item: InstructorAnnouncement) => void
}

function StatChip({
  icon,
  label}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
}) {
  const { native, tokens, type } = useModuleTheme()
  return (
    <View
      style={[
        styles.statChip,
        { backgroundColor: native.fill, borderColor: tokens.border },
      ]}
    >
      <Ionicons name={icon} size={14} color={native.secondaryLabel} />
      <Text style={[type.caption, { fontWeight: "600", color: native.secondaryLabel }]}>{label}</Text>
    </View>
  )
}

function DetailStatusChip({
  label,
  color,
  icon,
}: {
  label: string
  color: string
  icon: keyof typeof Ionicons.glyphMap
}) {
  const { type } = useModuleTheme()
  return (
    <View style={styles.detailStatusChip}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[type.footnote, { color, fontWeight: "600" }]}>{label}</Text>
    </View>
  )
}

function AttachmentTile({
  name,
  type,
  onPress}: {
  name: string
  type: string
  onPress: () => void
}) {
  const { native, tokens, type: themeType } = useModuleTheme()
  const isPdf = type.includes("pdf")
  return (
    <Pressable
      style={({ pressed }) => [
        styles.attachmentTile,
        { backgroundColor: native.fill, borderColor: tokens.border },
        pressed && { backgroundColor: native.secondaryGrouped },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open attachment ${name}`}
    >
      <View
        style={[
          styles.attachmentIcon,
          { backgroundColor: native.secondaryGrouped, borderColor: tokens.border },
          isPdf && { backgroundColor: `${FACULTY_ANNOUNCEMENT_COLOR.link}18` },
        ]}
      >
        <Ionicons name={isPdf ? "document-text" : "document-outline"} size={22} color={FACULTY_ANNOUNCEMENT_COLOR.link} />
      </View>
      <View style={styles.attachmentCopy}>
        <Text style={[themeType.bodyEmphasis, { color: native.label }]} numberOfLines={2}>
          {name}
        </Text>
        <Text style={[themeType.caption, { color: native.secondaryLabel }]}>Tap to open</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={native.tertiaryLabel} />
    </Pressable>
  )
}

export function FacultyAnnouncementDetailModal({ item, scope, onClose, onEdit, onDelete }: Props) {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const [detail, setDetail] = useState<InstructorAnnouncement | null>(null)
  const [heldItem, setHeldItem] = useState<InstructorAnnouncement | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    if (item) setHeldItem(item)
  }, [item])

  useEffect(() => {
    if (!item || !scope) {
      setLoadError("")
      return
    }

    let mounted = true
    setLoading(true)
    setLoadError("")

    void instructorApi
      .getAnnouncementById(scope, item.id)
      .then((full) => {
        if (mounted) setDetail(full)
      })
      .catch((err) => {
        if (!mounted) return
        setDetail(item)
        setLoadError(err instanceof ApiError ? err.message : "Could not load full announcement.")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [item, scope])

  const announcement = detail ?? item ?? heldItem

  const summary = useMemo(
    () =>
      announcement
        ? summarizeAnnouncement(announcement.content ?? "", {
            title: announcement.title,
            aiSummary: announcement.ai_summary,
            maxLength: 280})
        : "",
    [announcement],
  )

  const authorInitial = (announcement?.author_name?.trim()[0] ?? "Y").toUpperCase()

  function confirmDelete() {
    if (!announcement) return
    AppAlert.alert("Delete announcement?", "Students will no longer see this post.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(announcement)},
    ])
  }

  return (
    <Modal
      visible={Boolean(item)}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      onDismiss={() => {
        setHeldItem(null)
        setDetail(null)
      }}
    >
      <View style={moduleStyles.root}>
        <View
          style={[
            styles.navBar,
            {
              paddingTop: insets.top + 4,
              backgroundColor: native.secondaryGrouped,
              borderBottomColor: native.separator,
            },
          ]}
        >
          <Pressable
            style={styles.navBtn}
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={24} color={FACULTY_ANNOUNCEMENT_COLOR.link} />
            <Text style={[type.body, { color: FACULTY_ANNOUNCEMENT_COLOR.link, fontWeight: "500" }]}>Back</Text>
          </Pressable>
          <Pressable
            style={styles.navBtnRight}
            onPress={() => announcement && onEdit(announcement)}
            disabled={!announcement || loading}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Edit"
          >
            <Text
              style={[
                type.bodyEmphasis,
                { color: FACULTY_ANNOUNCEMENT_COLOR.link },
                (!announcement || loading) && styles.navActionDisabled,
              ]}
            >
              Edit
            </Text>
          </Pressable>
        </View>

        {announcement ? (
          <>
            <ScrollView
              style={moduleStyles.scroll}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[
                  styles.hero,
                  tokens.cardShadow,
                  {
                    backgroundColor: native.secondaryGrouped,
                    borderColor: tokens.border,
                  },
                ]}
              >
                <View style={styles.heroTop}>
                  <SolidListThumbTile
                    thumb={facultyAnnouncementListThumb(announcement.id)}
                    icon="megaphone-outline"
                  />
                  <View style={styles.heroCopy}>
                    <View style={styles.badgeRow}>
                      {announcement.pinned ? (
                        <DetailStatusChip {...facultyAnnouncementPinnedMeta()} />
                      ) : null}
                      {(() => {
                        const priority = facultyAnnouncementPriorityMeta(announcement.priority)
                        return priority ? <DetailStatusChip {...priority} /> : null
                      })()}
                      {announcement.is_active === false ? (
                        <DetailStatusChip
                          label="Inactive"
                          color={native.tertiaryLabel}
                          icon="pause-circle-outline"
                        />
                      ) : null}
                    </View>
                    <Text
                      style={[
                        type.bodyEmphasis,
                        { fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: native.label },
                      ]}
                    >
                      {announcement.title}
                    </Text>
                  </View>
                </View>

                <View style={styles.authorRow}>
                  <View style={[styles.avatar, { backgroundColor: native.fill }]}>
                    <Text style={[type.bodyEmphasis, { color: FACULTY_ANNOUNCEMENT_COLOR.link }]}>
                      {authorInitial}
                    </Text>
                  </View>
                  <View style={styles.authorCopy}>
                    <Text style={[type.bodyEmphasis, { color: native.label }]}>
                      {announcement.author_name ?? "You"}
                    </Text>
                    <Text style={[type.caption, { color: native.secondaryLabel }]}>
                      Posted {formatAnnouncementRelativeDate(announcement.created_at)}
                    </Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  {announcement.read_count != null ? (
                    <StatChip icon="eye-outline" label={`${announcement.read_count} reads`} />
                  ) : null}
                  {(announcement.comments_count ?? 0) > 0 ? (
                    <StatChip icon="chatbubble-outline" label={`${announcement.comments_count} comments`} />
                  ) : null}
                  <StatChip
                    icon="people-outline"
                    label={facultyAnnouncementAudienceLabel(announcement.target_session)}
                  />
                </View>
              </View>

              {loading ? (
                <View style={styles.loadingBanner}>
                  <ActivityIndicator size="small" color={FACULTY_ANNOUNCEMENT_COLOR.action} />
                  <Text style={[type.caption, { color: native.secondaryLabel }]}>Loading full content…</Text>
                </View>
              ) : null}

              {loadError ? (
                <View
                  style={[
                    styles.warnBox,
                    {
                      backgroundColor: `${tokens.warning}14`,
                      borderColor: `${tokens.warning}33`,
                    },
                  ]}
                >
                  <Ionicons name="alert-circle-outline" size={18} color={tokens.warning} />
                  <Text style={[type.caption, { color: tokens.warning, flex: 1, lineHeight: 18 }]}>{loadError}</Text>
                </View>
              ) : null}

              <View
                style={[
                  styles.aiCard,
                  tokens.cardShadow,
                  { backgroundColor: native.fill, borderColor: tokens.border },
                ]}
              >
                <View style={styles.aiInner}>
                  <View style={styles.aiHead}>
                    <View style={[styles.aiIconWrap, { backgroundColor: native.secondaryGrouped }]}>
                      <Ionicons name="sparkles-outline" size={16} color={FACULTY_ANNOUNCEMENT_COLOR.ai} />
                    </View>
                    <Text style={[type.caption, { color: FACULTY_ANNOUNCEMENT_COLOR.ai, fontWeight: "600" }]}>
                      AI Summary
                    </Text>
                  </View>
                  <Text style={[type.body, { color: native.label, lineHeight: 24, fontSize: 16 }]}>{summary}</Text>
                  <Text style={[type.caption, { color: native.secondaryLabel, marginTop: 2 }]}>
                    What students see in their feed preview
                  </Text>
                </View>
              </View>

              <FacultySectionCard title="Full announcement" icon="document-text-outline">
                <AnnouncementBodyWebView
                  content={announcement.content ?? ""}
                  accentColor={FACULTY_ANNOUNCEMENT_COLOR.link}
                />
              </FacultySectionCard>

              {/* Attachments */}
              {(announcement.attachments?.length ?? 0) > 0 ? (
                <FacultySectionCard title="Attachments" icon="attach-outline">
                  <View style={styles.attachmentList}>
                    {announcement.attachments!.map((file, index) => (
                      <AttachmentTile
                        key={`${file.url}-${index}`}
                        name={file.name}
                        type={file.type}
                        onPress={() => void Linking.openURL(file.url)}
                      />
                    ))}
                  </View>
                </FacultySectionCard>
              ) : null}
            </ScrollView>

            <View
              style={[
                styles.footer,
                {
                  paddingBottom: insets.bottom + 12,
                  backgroundColor: native.secondaryGrouped,
                  borderTopColor: native.separator,
                },
              ]}
            >
              <Pressable
                style={[
                  styles.editBtn,
                  { backgroundColor: FACULTY_ANNOUNCEMENT_COLOR.action },
                  loading && styles.editBtnDisabled,
                ]}
                onPress={() => onEdit(announcement)}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Edit announcement"
              >
                <Ionicons name="create-outline" size={20} color={FACULTY_ANNOUNCEMENT_COLOR.actionInk} />
                <Text style={[type.bodyEmphasis, { color: FACULTY_ANNOUNCEMENT_COLOR.actionInk, fontSize: 16 }]}>
                  Edit announcement
                </Text>
              </Pressable>
              <Pressable
                style={styles.deleteBtn}
                onPress={confirmDelete}
                accessibilityRole="button"
                accessibilityLabel="Delete announcement"
              >
                <Text style={[type.destructive, { fontWeight: "600", fontSize: 15 }]}>Delete announcement</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </View>
      <AppAlertHost />
    </Modal>
  )
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minWidth: 80,
  },
  navBtnRight: { paddingHorizontal: 12, paddingVertical: 8, minWidth: 80, alignItems: "flex-end" },
  navActionDisabled: { opacity: 0.4 },
  scrollContent: { padding: 16, gap: 16 },
  hero: {
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  detailStatusChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  authorCopy: { flex: 1, gap: 2 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  loadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
  },
  warnBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  aiCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  aiInner: { padding: 16, gap: 8 },
  aiHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentList: { gap: 10 },
  attachmentTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  attachmentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  attachmentCopy: { flex: 1, gap: 2 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 15,
  },
  editBtnDisabled: { opacity: 0.55 },
  deleteBtn: { alignItems: "center", paddingVertical: 10 },
})
