import { useEffect, useState } from "react"
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedStudentNative } from "../../lib/themed-module-theme"
import { collaborationApi, type RosterStudent } from "../../lib/collaboration-api"
import { CollabFlowHeader } from "./collab-nav"
import { useCollabTheme } from "./collab-module-ui"
import { keyboardDismissScrollProps } from "../../lib/keyboard-dismiss-scroll-props"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

export function GroupCreateScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const scrollPad = useModuleScrollContentPadding(24)
  const theme = useCollabTheme()
  const SN = useThemedStudentNative()
  const [name, setName] = useState("")
  const [roster, setRoster] = useState<RosterStudent[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    setError("")
    collaborationApi
      .getRoster(session)
      .then((res) => setRoster(res.students ?? []))
      .catch((err) => {
        setRoster([])
        setError(err instanceof ApiError ? err.message : "Could not load roster.")
      })
      .finally(() => setLoading(false))
  }, [session])

  const toggleMember = (id: number) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 3) {
        AppAlert.alert("Limit reached", "Groups can have up to 4 members including you.")
        return prev
      }
      return [...prev, id]
    })
  }

  const submit = async () => {
    if (!session || !name.trim()) {
      AppAlert.alert("Name required", "Enter a group name.")
      return
    }
    setSubmitting(true)
    try {
      const res = await collaborationApi.createGroup(session, {
        name: name.trim(),
        initialMembers: selected})
      const groupId = res.group?.id
      if (groupId) {
        router.replace(`/collaboration/groups/${groupId}` as never)
      } else {
        router.back()
      }
    } catch (err) {
      AppAlert.alert("Failed", err instanceof ApiError ? err.message : "Could not create group.")
    } finally {
      setSubmitting(false)
    }
  }

  const others = roster.filter((s) => String(s.id) !== session?.databaseId)

  return (
    <View style={[styles.screen, { backgroundColor: SN.groupedBackground }]}>
      <CollabFlowHeader
        title="Create group"
        subtitle="Up to 4 members total"
        fallbackHref="/module/groups"
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: scrollPad.paddingBottom }]}
          keyboardShouldPersistTaps="handled"
          {...keyboardDismissScrollProps}
        >
        <Text style={[styles.label, { color: theme.primaryDark }]}>Group name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: SN.secondaryGrouped, borderColor: SN.separator }]}
          value={name}
          onChangeText={setName}
          placeholder="Team name"
          placeholderTextColor="#94a3b8"
        />

        <Text style={[styles.label, { color: theme.primaryDark }]}>
          Invite classmates ({selected.length}/3)
        </Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          others.map((student) => {
            const active = selected.includes(student.id)
            return (
              <Pressable
                key={student.id}
                style={[
                  styles.rosterRow,
                  { backgroundColor: SN.secondaryGrouped, borderColor: SN.separator },
                  active && { borderColor: theme.primary, backgroundColor: theme.soft },
                ]}
                onPress={() => toggleMember(student.id)}
              >
                <View style={styles.rosterCopy}>
                  <Text style={styles.rosterName}>{student.full_name}</Text>
                  <Text style={[styles.rosterId, { color: SN.secondaryLabel }]}>{student.student_id}</Text>
                </View>
                <Ionicons
                  name={active ? "checkbox" : "square-outline"}
                  size={22}
                  color={active ? theme.primary : SN.secondaryLabel}
                />
              </Pressable>
            )
          })
        )}

        <Pressable
          style={[styles.submitBtn, { backgroundColor: theme.primary }, submitting && styles.submitDisabled]}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="people" size={18} color="#ffffff" />
              <Text style={styles.submitText}>Create group</Text>
            </>
          )}
        </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 16, gap: 10 },
  label: { fontSize: 13, fontWeight: "700", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: NATIVE.label},
  rosterRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1},
  rosterCopy: { flex: 1 },
  rosterName: { fontSize: 14, fontWeight: "700", color: NATIVE.label },
  rosterId: { fontSize: 11 },
  errorText: { fontSize: 13, color: "#b91c1c" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 16},
  submitDisabled: { opacity: 0.6 },
  submitText: { color: "#ffffff", fontSize: 15, fontWeight: "700" }})
