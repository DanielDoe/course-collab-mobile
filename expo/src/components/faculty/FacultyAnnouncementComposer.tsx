import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { announcementContentForEditor, announcementContentForSave } from "../../lib/announcement-content"
import type { InstructorAnnouncement } from "../../lib/instructor-api"
import { summarizeAnnouncement } from "../../lib/announcement-summary"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FACULTY_ANNOUNCEMENT_COLOR } from "../../lib/faculty-announcement-theme"
import { useSheetPlaceholderColor } from "./faculty-collab-sheet-ui"

export type ComposerDraft = {
  title: string
  content: string
  pinned: boolean
}

type Props = {
  visible: boolean
  editing: InstructorAnnouncement | null
  initialDraft?: ComposerDraft | null
  courseCode?: string
  submitting: boolean
  onClose: () => void
  onSubmit: (draft: ComposerDraft) => void
}

const EMPTY_DRAFT: ComposerDraft = {
  title: "",
  content: "",
  pinned: false}

export function FacultyAnnouncementComposer({visible,
  editing,
  initialDraft,
  courseCode,
  submitting,
  onClose,
  onSubmit}: Props) {
  const { native, tokens, type, styles: moduleStyles } = useModuleTheme()
  const placeholderColor = useSheetPlaceholderColor()
  const insets = useSafeAreaInsets()
  const [draft, setDraft] = useState<ComposerDraft>(EMPTY_DRAFT)

  const [originalContent, setOriginalContent] = useState("")

  useEffect(() => {
    if (!visible) return
    if (editing) {
      setOriginalContent(editing.content ?? "")
      setDraft({
        title: editing.title,
        content: announcementContentForEditor(editing.content ?? ""),
        pinned: editing.pinned ?? false})
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
      <KeyboardAvoidingView
        style={moduleStyles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
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
          <Pressable style={styles.headerBtn} onPress={handleClose} hitSlop={8}>
            <Text style={[type.body, { color: native.secondaryLabel, fontWeight: "600" }]}>Cancel</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[type.bodyEmphasis, { fontSize: 16, color: native.label }]}>
              {editing ? "Edit" : "New announcement"}
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
          >
            {submitting ? (
              <ActivityIndicator size="small" color={FACULTY_ANNOUNCEMENT_COLOR.actionInk} />
            ) : (
              <Text style={[type.bodyEmphasis, { color: FACULTY_ANNOUNCEMENT_COLOR.actionInk, fontSize: 14 }]}>{editing ? "Save" : "Publish"}</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={type.caption}>Title</Text>
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
          />

          <Text style={type.caption}>Message</Text>
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

          <Pressable
            style={[
              styles.pinRow,
              { backgroundColor: native.secondaryGrouped, borderColor: tokens.border },
            ]}
            onPress={() => setDraft((prev) => ({ ...prev, pinned: !prev.pinned }))}
          >
            <Ionicons
              name={draft.pinned ? "pin" : "pin-outline"}
              size={18}
              color={draft.pinned ? FACULTY_ANNOUNCEMENT_COLOR.pinned : native.secondaryLabel}
            />
            <Text style={[type.bodyEmphasis, { color: native.label }]}>Pin to top of student feed</Text>
          </Pressable>

          <Text style={[type.caption, { color: native.secondaryLabel, marginTop: 8 }]}>
            Students see plain text in the app. Rich formatting support is coming soon.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
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
    borderRadius: 999,
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
