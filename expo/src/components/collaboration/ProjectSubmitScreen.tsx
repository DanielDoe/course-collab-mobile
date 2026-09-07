import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { NativeSelect } from "../NativeSelect"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedStudentNative } from "../../lib/themed-module-theme"
import { collaborationApi, type GroupRecord } from "../../lib/collaboration-api"
import { CollabScreenTitle } from "./collab-nav"
import { useCollabTheme } from "./collab-module-ui"
import { KeyboardAwareForm } from "../ui/KeyboardAwareForm"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
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
  const scrollPad = useModuleScrollContentPadding(24)
  const theme = useCollabTheme()
  const SN = useThemedStudentNative()
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
      AppAlert.alert("Missing fields", "Select a group and enter a title.")
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
          projectLink: projectLink.trim() || undefined})
        router.replace(`/collaboration/projects/${editProjectId}` as never)
      } else {
        const res = await collaborationApi.createProject(session, {
          groupId: Number(selectedGroupId),
          title: title.trim(),
          summary: summary.trim() || undefined,
          deliverables: deliverables.trim() || undefined,
          targetPlatform: targetPlatform.trim() || undefined,
          projectLink: projectLink.trim() || undefined})
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

  const canSubmit =
    Boolean(title.trim()) &&
    (Boolean(editProjectId) || Boolean(selectedGroupId)) &&
    !loading &&
    !submitting

  return (
    <KeyboardAwareForm
      style={styles.screen}
      contentContainerStyle={[styles.content, scrollPad]}
      extraBottomPadding={Math.max(scrollPad.paddingBottom ?? 24, 32)}
      footer={
        loading ? null : (
          <Pressable
            style={[styles.submitBtn, { backgroundColor: theme.primary }, !canSubmit && styles.submitDisabled]}
            onPress={() => void submit()}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel={editProjectId ? "Save changes" : "Submit project"}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />
                <Text style={styles.submitText}>
                  {editProjectId ? "Save changes" : "Submit project"}
                </Text>
              </>
            )}
          </Pressable>
        )
      }
    >
      <CollabScreenTitle
        title={editProjectId ? "Edit project" : "Submit project"}
        subtitle="Group deliverable proposal"
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator color={theme.primary} />
      ) : (
        <>
          {!editProjectId ? (
            <>
              <Text style={[styles.label, { color: theme.primaryDark }]}>Group</Text>
              {groupOptions.length === 0 ? (
                <Text style={[styles.hint, { color: SN.secondaryLabel }]}>
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

          <Text style={[styles.label, { color: theme.primaryDark }]}>Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: SN.secondaryGrouped, borderColor: SN.separator }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Project title"
            placeholderTextColor="#94a3b8"
          />

          <Text style={[styles.label, { color: theme.primaryDark }]}>Summary</Text>
          <TextInput
            style={[styles.input, styles.area, { backgroundColor: SN.secondaryGrouped, borderColor: SN.separator }]}
            value={summary}
            onChangeText={setSummary}
            placeholder="Brief overview"
            placeholderTextColor="#94a3b8"
            multiline
          />

          <Text style={[styles.label, { color: theme.primaryDark }]}>Deliverables</Text>
          <TextInput
            style={[styles.input, styles.area, { backgroundColor: SN.secondaryGrouped, borderColor: SN.separator }]}
            value={deliverables}
            onChangeText={setDeliverables}
            placeholder="What will you deliver?"
            placeholderTextColor="#94a3b8"
            multiline
          />

          <Text style={[styles.label, { color: theme.primaryDark }]}>Target platform</Text>
          <TextInput
            style={[styles.input, { backgroundColor: SN.secondaryGrouped, borderColor: SN.separator }]}
            value={targetPlatform}
            onChangeText={setTargetPlatform}
            placeholder="Web, mobile, embedded…"
            placeholderTextColor="#94a3b8"
          />

          <Text style={[styles.label, { color: theme.primaryDark }]}>Project link (optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: SN.secondaryGrouped, borderColor: SN.separator }]}
            value={projectLink}
            onChangeText={setProjectLink}
            placeholder="https://github.com/…"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
          />
        </>
      )}
    </KeyboardAwareForm>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 8, flexGrow: 1 },
  label: { fontSize: 13, fontWeight: "700", marginTop: 8 },
  hint: { fontSize: 13, marginBottom: 8 },
  errorText: { fontSize: 13, color: "#b91c1c" },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: NATIVE.label},
  area: { minHeight: 90, textAlignVertical: "top" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16},
  submitDisabled: { opacity: 0.6 },
  submitText: { color: "#ffffff", fontSize: 15, fontWeight: "700" }})
