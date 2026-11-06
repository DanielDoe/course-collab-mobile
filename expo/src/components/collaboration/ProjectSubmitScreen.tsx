import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { AppAlert } from "../../lib/app-alert"
import { useLocalSearchParams, useRouter } from "expo-router"
import { NativeSelect } from "../NativeSelect"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { collaborationApi, type GroupRecord } from "../../lib/collaboration-api"
import { CommGroupedList, CommSectionFooter, CommSectionHeader } from "../faculty/faculty-communication-ui"
import { AppButton } from "../theme/AppButton"
import { CollabFlowHeader } from "./collab-nav"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function Field({
  value,
  onChange,
  placeholder,
  multiline,
  autoCapitalize,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  multiline?: boolean
  autoCapitalize?: "none" | "sentences"
}) {
  const native = useThemedNative()
  return (
    <TextInput
      style={[
        styles.input,
        multiline && styles.area,
        { color: native.label },
      ]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={native.tertiaryLabel}
      multiline={multiline}
      autoCapitalize={autoCapitalize}
    />
  )
}

export function ProjectSubmitScreen() {
  const { groupId: groupIdParam, projectId: projectIdParam } = useLocalSearchParams<{
    groupId?: string
    projectId?: string
  }>()
  const editProjectId = projectIdParam ? Number(projectIdParam) : undefined
  const presetGroupId = groupIdParam ? Number(groupIdParam) : undefined
  const session = useStudentSession()
  const router = useRouter()
  const native = useThemedNative()
  const type = useNativeType()
  const [groups, setGroups] = useState<GroupRecord[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState("")
  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [deliverables, setDeliverables] = useState("")
  const [targetPlatform, setTargetPlatform] = useState("")
  const [projectLink, setProjectLink] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const groupRes = await collaborationApi.getGroups(session)
      const leaderGroups = (groupRes.groups ?? []).filter(
        (g) => g.created_by === Number(session.databaseId) && g.status === "approved",
      )
      setGroups(leaderGroups)
      if (editProjectId) {
        const projectRes = await collaborationApi.getProject(session, editProjectId)
        const p = projectRes.project
        if (p) {
          setTitle(p.title)
          setSummary(p.summary ?? "")
          setDeliverables(p.deliverables ?? "")
          setTargetPlatform(p.target_platform ?? "")
          setProjectLink(p.project_link ?? "")
          setSelectedGroupId(String(p.group_id ?? p.group?.id ?? ""))
        }
      } else if (presetGroupId) {
        setSelectedGroupId(String(presetGroupId))
      } else if (leaderGroups.length === 1) {
        setSelectedGroupId(String(leaderGroups[0].id))
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load groups.")
      setGroups([])
    }
  }, [session, editProjectId, presetGroupId])

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load, session])

  const submit = async () => {
    if (!session || !title.trim() || !selectedGroupId) {
      AppAlert.alert("Missing Fields", "Select a group and enter a title.")
      return
    }
    setSubmitting(true)
    try {
      if (editProjectId) {
        await collaborationApi.updateProject(session, editProjectId, {
          title: title.trim(),
          summary: summary.trim() || undefined,
          deliverables: deliverables.trim() || undefined,
          targetPlatform: targetPlatform.trim() || undefined,
          projectLink: projectLink.trim() || undefined,
        })
        router.replace(`/collaboration/projects/${editProjectId}` as never)
      } else {
        const res = await collaborationApi.createProject(session, {
          groupId: Number(selectedGroupId),
          title: title.trim(),
          summary: summary.trim() || undefined,
          deliverables: deliverables.trim() || undefined,
          targetPlatform: targetPlatform.trim() || undefined,
          projectLink: projectLink.trim() || undefined,
        })
        const id = res.project?.id
        if (id) router.replace(`/collaboration/projects/${id}` as never)
        else router.back()
      }
    } catch (err) {
      AppAlert.alert("Failed", err instanceof ApiError ? err.message : "Could not save project.")
    } finally {
      setSubmitting(false)
    }
  }

  const groupOptions = groups.map((g) => ({ value: String(g.id), label: g.name }))

  return (
    <View style={[styles.screen, { backgroundColor: native.groupedBackground }]}>
      <CollabFlowHeader
        title={editProjectId ? "Edit Project" : "Submit Project"}
        subtitle="Group deliverable proposal"
        fallbackHref="/module/projects"
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Text style={type.destructive}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator color={native.tint} />
        ) : (
          <>
            {!editProjectId ? (
              <>
                <CommSectionHeader title="Group" />
                {groupOptions.length === 0 ? (
                  <Text style={[type.caption, { color: native.secondaryLabel }]}>
                    You need an approved group you lead to submit a project.
                  </Text>
                ) : (
                  <NativeSelect
                    label=""
                    placeholder="Select group"
                    value={selectedGroupId}
                    options={groupOptions}
                    onChange={setSelectedGroupId}
                  />
                )}
              </>
            ) : null}

            <CommSectionHeader title="Title" />
            <CommGroupedList>
              <Field value={title} onChange={setTitle} placeholder="Project title" />
            </CommGroupedList>

            <CommSectionHeader title="Summary" />
            <CommGroupedList>
              <Field value={summary} onChange={setSummary} placeholder="Brief overview" multiline />
            </CommGroupedList>

            <CommSectionHeader title="Deliverables" />
            <CommGroupedList>
              <Field value={deliverables} onChange={setDeliverables} placeholder="What will you deliver?" multiline />
            </CommGroupedList>

            <CommSectionHeader title="Target Platform" />
            <CommGroupedList>
              <Field value={targetPlatform} onChange={setTargetPlatform} placeholder="Web, mobile, embedded…" />
            </CommGroupedList>

            <CommSectionHeader title="Project Link" />
            <CommGroupedList>
              <Field
                value={projectLink}
                onChange={setProjectLink}
                placeholder="https://github.com/…"
                autoCapitalize="none"
              />
            </CommGroupedList>

            <AppButton
              label={editProjectId ? "Save Changes" : "Submit Project"}
              icon="cloud-upload-outline"
              iconPosition="left"
              onPress={() => void submit()}
              loading={submitting}
              disabled={submitting}
            />
            <CommSectionFooter>Your instructor reviews submitted projects before they appear on the class board.</CommSectionFooter>
          </>
        )}
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
  area: { minHeight: 90, textAlignVertical: "top" },
})
