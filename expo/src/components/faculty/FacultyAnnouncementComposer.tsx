import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { AppAlertHost } from "../../context/AppAlertProvider"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { announcementContentForEditor, announcementContentForSave } from "../../lib/announcement-content"
import type { InstructorAnnouncement, InstructorAnnouncementAttachment } from "../../lib/instructor-api"
import { summarizeAnnouncement } from "../../lib/announcement-summary"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FACULTY_ANNOUNCEMENT_COLOR } from "../../lib/faculty-announcement-theme"
import { useSheetPlaceholderColor } from "./faculty-collab-sheet-ui"
import { KeyboardAwareForm } from "../ui/KeyboardAwareForm"
import { useSuppressModuleSearchDock } from "../../context/ModuleSearchDockContext"
import { NativeSelect } from "../NativeSelect"
import { FacultySummerCampDatePicker } from "./FacultySummerCampDatePicker"
import {
  ANNOUNCEMENT_PRIORITY_OPTIONS,
  ANNOUNCEMENT_TYPE_OPTIONS,
  announcementTypeHasEventFields,
} from "../../lib/faculty-announcement-utils"
import * as DocumentPicker from "expo-document-picker"

export type ComposerDraft = {
  title: string
  content: string
  pinned: boolean
  type: string
  priority: string
  target_session: string
  expires_at: string
  attachments: InstructorAnnouncementAttachment[]
  event_date: string
  event_time: string
  event_end: string
  event_location: string
}

type Props = {
  visible: boolean
  editing: InstructorAnnouncement | null
  initialDraft?: ComposerDraft | null
  courseCode?: string
  submitting: boolean
  sessionOptions?: Array<{ value: string; label: string }>
  onUploadAttachment?: (file: { uri: string; name: string; type: string }) => Promise<InstructorAnnouncementAttachment>
  onClose: () => void
  onSubmit: (draft: ComposerDraft) => void
}

const EMPTY_DRAFT: ComposerDraft = {
  title: "",
  content: "",
  pinned: false,
  type: "info",
  priority: "medium",
  target_session: "all",
  expires_at: "",
  attachments: [],
  event_date: "",
  event_time: "",
  event_end: "",
  event_location: "",
}

export function FacultyAnnouncementComposer({visible,
  editing,
  initialDraft,
  courseCode,
  submitting,
  sessionOptions = [],
  onUploadAttachment,
  onClose,
  onSubmit}: Props) {
  useSuppressModuleSearchDock(visible)
  const { native, tokens, type, styles: moduleStyles } = useModuleTheme()
  const placeholderColor = useSheetPlaceholderColor()
  const insets = useSafeAreaInsets()
  const [draft, setDraft] = useState<ComposerDraft>(EMPTY_DRAFT)
  const [uploading, setUploading] = useState(false)

  const [originalContent, setOriginalContent] = useState("")

  useEffect(() => {
    if (!visible) return
    if (editing) {
      setOriginalContent(editing.content ?? "")
      setDraft({
        title: editing.title,
        content: announcementContentForEditor(editing.content ?? ""),
        pinned: editing.pinned ?? false,
        type: editing.type ?? "info",
        priority: editing.priority ?? (editing.pinned ? "high" : "medium"),
        target_session: editing.target_session ?? "all",
        expires_at: editing.expires_at?.slice(0, 10) ?? "",
        attachments: editing.attachments ?? [],
        event_date: editing.event_date?.slice(0, 10) ?? "",
        event_time: editing.event_time ?? "",
        event_end: editing.event_end ?? "",
        event_location: editing.event_location ?? "",
      })
      return
    }
    setOriginalContent("")
    setDraft(initialDraft ?? EMPTY_DRAFT)
  }, [visible, editing, initialDraft])

  const aiPreview = useMemo(
    () =>
      summarizeAnnouncement(
        announcementContentForSave(draft.content, originalContent || undefined),
        {
          title: draft.title,
          aiSummary: editing?.ai_summary,
          maxLength: 220},
      ),
    [draft.content, draft.title, editing?.ai_summary, originalContent],
  )

  const canSubmit = draft.title.trim().length > 0 && draft.content.trim().length > 0 && !submitting

  function handleClose() {
    if (submitting) return
    if (draft.title.trim() || draft.content.trim()) {
      AppAlert.alert("Discard changes?", "Your draft will be lost.", [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: onClose },
      ])
      return
    }
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <View style={moduleStyles.root}>
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 4,
              backgroundColor: native.secondaryGrouped,
              borderBottomColor: native.separator,
            },
          ]}
        >
          <Pressable
            style={styles.headerBtn}
            onPress={handleClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={[type.body, { color: native.secondaryLabel, fontWeight: "600" }]}>Cancel</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text
              style={[type.bodyEmphasis, { fontSize: 16, color: native.label }]}
              accessibilityRole="header"
            >
              {editing ? "Edit announcement" : "New announcement"}
            </Text>
            {courseCode ? (
              <Text style={[type.caption, { color: tokens.warning, fontWeight: "600" }]}>{courseCode}</Text>
            ) : null}
          </View>
          <Pressable
            style={[
              styles.publishBtn,
              { backgroundColor: FACULTY_ANNOUNCEMENT_COLOR.action },
              !canSubmit && styles.publishBtnDisabled,
            ]}
            onPress={() => onSubmit(draft)}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel={editing ? "Save" : "Publish"}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={FACULTY_ANNOUNCEMENT_COLOR.actionInk} />
            ) : (
              <Text style={[type.bodyEmphasis, { color: FACULTY_ANNOUNCEMENT_COLOR.actionInk, fontSize: 14 }]}>{editing ? "Save" : "Publish"}</Text>
            )}
          </Pressable>
        </View>

        <KeyboardAwareForm contentContainerStyle={styles.body}>
          <Text style={type.caption} accessible={false}>
            Title
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: native.secondaryGrouped,
                borderColor: tokens.border,
                color: native.label,
              },
            ]}
            placeholder="e.g. Mid-semester exam schedule"
            placeholderTextColor={placeholderColor}
            value={draft.title}
            onChangeText={(title) => setDraft((prev) => ({ ...prev, title }))}
            accessibilityLabel="Title"
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            keyboardType="ascii-capable"
            testID="announcement-title"
          />

          <Text style={type.caption} accessible={false}>
            Message
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: native.secondaryGrouped,
                borderColor: tokens.border,
                color: native.label,
              },
            ]}
            placeholder="Write what students need to know…"
            placeholderTextColor={placeholderColor}
            value={draft.content}
            onChangeText={(content) => setDraft((prev) => ({ ...prev, content }))}
            multiline
            textAlignVertical="top"
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            keyboardType="ascii-capable"
            testID="announcement-message"
            accessibilityLabel="Message"
          />

          <View
            style={[
              styles.summaryPreview,
              tokens.cardShadow,
              { backgroundColor: native.fill, borderColor: tokens.border },
            ]}
          >
            <View style={styles.summaryPreviewInner}>
              <View style={styles.summaryHead}>
                <Ionicons name="sparkles-outline" size={15} color={FACULTY_ANNOUNCEMENT_COLOR.ai} />
                <Text style={[type.caption, { color: FACULTY_ANNOUNCEMENT_COLOR.ai, fontWeight: "600" }]}>
                  AI Summary preview
                </Text>
              </View>
              <Text style={[type.body, { color: native.label, lineHeight: 21 }]}>
                {draft.content.trim() || draft.title.trim()
                  ? aiPreview
                  : "Students will see an AI summary like this on their announcement feed."}
              </Text>
              <Text style={[type.caption, { color: native.secondaryLabel, marginTop: 2 }]}>
                {editing
                  ? "Saving regenerates the AI summary on the server."
                  : "Publishing generates and saves an AI summary automatically."}
              </Text>
            </View>
          </View>

          <Text style={type.caption} accessible={false}>Type</Text>
          <NativeSelect
            placeholder="Type"
            value={draft.type}
            options={ANNOUNCEMENT_TYPE_OPTIONS.map((option) => ({ value: option.id, label: option.label }))}
            onChange={(type) => setDraft((prev) => ({ ...prev, type }))}
          />
          <Text style={type.caption} accessible={false}>Priority</Text>
          <NativeSelect
            placeholder="Priority"
            value={draft.priority}
            options={ANNOUNCEMENT_PRIORITY_OPTIONS.map((option) => ({ value: option.id, label: option.label }))}
            onChange={(priority) => setDraft((prev) => ({ ...prev, priority }))}
          />
          <Text style={type.caption} accessible={false}>Audience</Text>
          <NativeSelect
            placeholder="Audience"
            value={draft.target_session}
            options={[
              { value: "all", label: "Course-wide" },
              ...sessionOptions.filter((option) => option.value && option.value !== "all"),
            ]}
            onChange={(target_session) => setDraft((prev) => ({ ...prev, target_session }))}
          />
          <Text style={type.caption} accessible={false}>Expires</Text>
          <FacultySummerCampDatePicker
            value={draft.expires_at}
            onChange={(expires_at) => setDraft((prev) => ({ ...prev, expires_at }))}
            accessibilityLabel="Expiration date"
          />

          {announcementTypeHasEventFields(draft.type) ? (
            <>
              <Text style={type.caption} accessible={false}>Event date</Text>
              <FacultySummerCampDatePicker
                value={draft.event_date}
                onChange={(event_date) => setDraft((prev) => ({ ...prev, event_date }))}
                accessibilityLabel="Event date"
                yearPolicy="upcoming"
              />
              <Text style={type.caption} accessible={false}>Event time</Text>
              <TextInput
                style={[styles.input, { color: native.label, borderColor: tokens.border, backgroundColor: native.fill }]}
                value={draft.event_time}
                onChangeText={(event_time) => setDraft((prev) => ({ ...prev, event_time }))}
                placeholder="14:00"
                placeholderTextColor={placeholderColor}
                accessibilityLabel="Event time"
              />
              <Text style={type.caption} accessible={false}>End time (optional)</Text>
              <TextInput
                style={[styles.input, { color: native.label, borderColor: tokens.border, backgroundColor: native.fill }]}
                value={draft.event_end}
                onChangeText={(event_end) => setDraft((prev) => ({ ...prev, event_end }))}
                placeholder="15:30"
                placeholderTextColor={placeholderColor}
                accessibilityLabel="Event end time"
              />
              <Text style={type.caption} accessible={false}>Location (optional)</Text>
              <TextInput
                style={[styles.input, { color: native.label, borderColor: tokens.border, backgroundColor: native.fill }]}
                value={draft.event_location}
                onChangeText={(event_location) => setDraft((prev) => ({ ...prev, event_location }))}
                placeholder="Room or building"
                placeholderTextColor={placeholderColor}
                accessibilityLabel="Event location"
              />
            </>
          ) : null}

          <Pressable
            style={[
              styles.pinRow,
              { backgroundColor: native.secondaryGrouped, borderColor: tokens.border },
            ]}
            onPress={() => setDraft((prev) => ({ ...prev, pinned: !prev.pinned }))}
            accessibilityRole="button"
            accessibilityState={{ selected: draft.pinned }}
            accessibilityLabel="Pin to top of student feed"
          >
            <Ionicons
              name={draft.pinned ? "pin" : "pin-outline"}
              size={18}
              color={draft.pinned ? FACULTY_ANNOUNCEMENT_COLOR.pinned : native.secondaryLabel}
            />
            <Text style={[type.bodyEmphasis, { color: native.label }]}>Pin to top of student feed</Text>
          </Pressable>

          <Text style={type.caption} accessible={false}>Attachments</Text>
          {draft.attachments.map((file) => (
            <View
              key={file.url}
              style={[styles.pinRow, { backgroundColor: native.secondaryGrouped, borderColor: tokens.border }]}
            >
              <Ionicons name="attach-outline" size={18} color={native.secondaryLabel} />
              <Text style={[type.body, { color: native.label, flex: 1 }]} numberOfLines={1}>
                {file.name}
              </Text>
              <Pressable
                onPress={() =>
                  setDraft((prev) => ({
                    ...prev,
                    attachments: prev.attachments.filter((item) => item.url !== file.url),
                  }))
                }
                accessibilityRole="button"
                accessibilityLabel={`Remove ${file.name}`}
              >
                <Ionicons name="close-circle-outline" size={20} color={tokens.danger} />
              </Pressable>
            </View>
          ))}
          <Pressable
            style={[styles.pinRow, { backgroundColor: native.secondaryGrouped, borderColor: tokens.border }]}
            disabled={uploading || !onUploadAttachment}
            onPress={() => {
              void (async () => {
                if (!onUploadAttachment) return
                const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
                if (picked.canceled || !picked.assets?.[0]) return
                const asset = picked.assets[0]
                setUploading(true)
                try {
                  const uploaded = await onUploadAttachment({
                    uri: asset.uri,
                    name: asset.name ?? "attachment",
                    type: asset.mimeType ?? "application/octet-stream",
                  })
                  setDraft((prev) => ({ ...prev, attachments: [...prev.attachments, uploaded] }))
                } catch (err) {
                  AppAlert.alert("Upload failed", err instanceof Error ? err.message : "Try again.")
                } finally {
                  setUploading(false)
                }
              })()
            }}
            accessibilityRole="button"
            accessibilityLabel="Add attachment"
          >
            <Ionicons name="cloud-upload-outline" size={18} color={FACULTY_ANNOUNCEMENT_COLOR.action} />
            <Text style={[type.bodyEmphasis, { color: native.label }]}>
              {uploading ? "Uploading…" : "Add attachment"}
            </Text>
          </Pressable>

          <Text style={[type.caption, { color: native.secondaryLabel, marginTop: 8 }]}>
            Students see plain text in the app. Rich formatting support is coming soon.
          </Text>
        </KeyboardAwareForm>
      </View>
      <AppAlertHost />
    </Modal>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  headerBtn: { minWidth: 64, paddingVertical: 8 },
  headerCenter: { flex: 1, alignItems: "center", gap: 2 },
  publishBtn: {
    minWidth: 72,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  publishBtnDisabled: { opacity: 0.45 },
  body: { padding: 16, gap: 10 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: { minHeight: 160, lineHeight: 24 },
  summaryPreview: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  summaryPreviewInner: { padding: 14, gap: 8 },
  summaryHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  pinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
})
