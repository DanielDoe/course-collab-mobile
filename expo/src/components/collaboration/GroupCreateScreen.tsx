import { useEffect, useState } from "react"
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { AppAlert } from "../../lib/app-alert"
import { useRouter } from "expo-router"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { collaborationApi, type RosterStudent } from "../../lib/collaboration-api"
import {
  CommGroupedList,
  CommListRow,
  CommSectionFooter,
  CommSectionHeader,
} from "../faculty/faculty-communication-ui"
import { AppButton } from "../theme/AppButton"
import { CollabFlowHeader } from "./collab-nav"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

export function GroupCreateScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const native = useThemedNative()
  const type = useNativeType()
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
        AppAlert.alert("Limit Reached", "Groups can have up to 4 members including you.")
        return prev
      }
      return [...prev, id]
    })
  }

  const submit = async () => {
    if (!session || !name.trim()) {
      AppAlert.alert("Name Required", "Enter a group name.")
      return
    }
    setSubmitting(true)
    try {
      const res = await collaborationApi.createGroup(session, {
        name: name.trim(),
        initialMembers: selected,
      })
      const groupId = res.group?.id
      if (groupId) router.replace(`/collaboration/groups/${groupId}` as never)
      else router.back()
    } catch (err) {
      AppAlert.alert("Failed", err instanceof ApiError ? err.message : "Could not create group.")
    } finally {
      setSubmitting(false)
    }
  }

  const others = roster.filter((s) => String(s.id) !== session?.databaseId)

  return (
    <View style={[styles.screen, { backgroundColor: native.groupedBackground }]}>
      <CollabFlowHeader title="New Group" subtitle="Up to 4 members total" fallbackHref="/module/groups" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <CommSectionHeader title="Group Name" />
        <CommGroupedList>
          <TextInput
            style={[styles.input, { color: native.label }]}
            value={name}
            onChangeText={setName}
            placeholder="Team name"
            placeholderTextColor={native.tertiaryLabel}
            autoFocus
          />
        </CommGroupedList>

        <CommSectionHeader title={`Invite Classmates (${selected.length}/3)`} />
        {error ? <Text style={[type.destructive, styles.error]}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator color={native.tint} />
        ) : (
          <CommGroupedList>
            {others.map((student, index) => {
              const active = selected.includes(student.id)
              return (
                <CommListRow
                  key={student.id}
                  icon={active ? "checkmark-circle" : "ellipse-outline"}
                  iconColor={active ? SN.accent : native.tertiaryLabel}
                  iconSoft={SN.accentSoft}
                  title={student.full_name}
                  subtitle={student.student_id}
                  showChevron={false}
                  isLast={index === others.length - 1}
                  onPress={() => toggleMember(student.id)}
                />
              )
            })}
          </CommGroupedList>
        )}

        <AppButton
          label="Create Group"
          icon="people"
          iconPosition="left"
          onPress={() => void submit()}
          loading={submitting}
          disabled={submitting}
        />
        <CommSectionFooter>You are the group leader. Extra members need instructor approval if the group is already approved.</CommSectionFooter>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: NATIVE.pagePadding, gap: 12, paddingBottom: 40 },
  input: {
    fontSize: 17,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: NATIVE.rowMinHeight,
  },
  error: { paddingHorizontal: 4 },
})
