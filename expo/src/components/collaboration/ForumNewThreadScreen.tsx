import { useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedStudentNative } from "../../lib/themed-module-theme"
import { NativeSwitch } from "../NativeSwitch"
import { collaborationApi } from "../../lib/collaboration-api"
import { CollabScreenTitle } from "./collab-nav"
import { useCollabTheme } from "./collab-module-ui"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

export function ForumNewThreadScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const scrollPad = useModuleScrollContentPadding(24)
  const theme = useCollabTheme()
  const SN = useThemedStudentNative()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [codeSnippet, setCodeSnippet] = useState("")
  const [tagsText, setTagsText] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!session) return
    if (!title.trim() || !description.trim()) {
      AppAlert.alert("Missing fields", "Title and description are required.")
      return
    }
    setSubmitting(true)
    try {
      const tags = tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
      const res = await collaborationApi.createForumThread(session, {
        title: title.trim(),
        description: description.trim(),
        codeSnippet: codeSnippet.trim() || undefined,
        tags,
        isAnonymous})
      const threadId = res.thread?.id
      if (threadId) {
        router.replace(`/collaboration/forum/thread/${threadId}` as never)
      } else {
        router.back()
      }
    } catch (err) {
      AppAlert.alert("Failed", err instanceof ApiError ? err.message : "Could not create thread.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: SN.groupedBackground }]}>
      <ScrollView
        contentContainerStyle={[styles.content, scrollPad]}
        keyboardShouldPersistTaps="handled"
      >
        <CollabScreenTitle title="New thread" subtitle="Ask the class a question" />
        <Text style={[styles.label, { color: theme.primaryDark }]}>Title</Text>
        <TextInput
          style={[styles.input, { backgroundColor: SN.secondaryGrouped, borderColor: SN.separator }]}
          value={title}
          onChangeText={setTitle}
          placeholder="What's your question?"
          placeholderTextColor="#94a3b8"
        />

        <Text style={[styles.label, { color: theme.primaryDark }]}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: SN.secondaryGrouped, borderColor: SN.separator }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Explain the problem, what you've tried…"
          placeholderTextColor="#94a3b8"
          multiline
          textAlignVertical="top"
        />

        <Text style={[styles.label, { color: theme.primaryDark }]}>Code snippet (optional)</Text>
        <TextInput
          style={[styles.input, styles.codeArea]}
          value={codeSnippet}
          onChangeText={setCodeSnippet}
          placeholder="Paste code here"
          placeholderTextColor="#64748b"
          multiline
          textAlignVertical="top"
        />

        <Text style={[styles.label, { color: theme.primaryDark }]}>Tags (comma-separated)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: SN.secondaryGrouped, borderColor: SN.separator }]}
          value={tagsText}
          onChangeText={setTagsText}
          placeholder="homework, arrays, debugging"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
        />

        <View
          style={[
            styles.switchRow,
            { backgroundColor: SN.secondaryGrouped, borderColor: SN.separator },
          ]}
        >
          <Text style={styles.switchLabel}>Post anonymously</Text>
          <NativeSwitch value={isAnonymous} onValueChange={setIsAnonymous} />
        </View>

        <Pressable
          style={[styles.submitBtn, { backgroundColor: theme.primary }, submitting && styles.submitBtnDisabled]}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#ffffff" />
              <Text style={styles.submitText}>Post thread</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 8 },
  label: { fontSize: 13, fontWeight: "700", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: NATIVE.label},
  textArea: { minHeight: 120 },
  codeArea: { minHeight: 100, fontFamily: "Menlo", fontSize: 13, backgroundColor: "#0f172a", color: "#e2e8f0" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginTop: 8},
  switchLabel: { fontSize: 14, fontWeight: "600", color: NATIVE.label },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 16},
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#ffffff", fontSize: 15, fontWeight: "700" }})
