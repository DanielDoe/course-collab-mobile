import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { AppAlert } from "../../lib/app-alert"
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
import { isInstructorAuthLeakMessage } from "../../lib/session-expiry"
import { useStudentGroups } from "../../hooks/query/useStudentGroups"
import { CollabFlowHeader } from "./collab-nav"
import { useCollabTheme } from "./collab-module-ui"
import { KeyboardAwareForm } from "../ui/KeyboardAwareForm"
import { AppButton } from "../theme/AppButton"
import {
  PROJECT_TARGET_PLATFORM_OPTIONS,
  PROJECT_TARGET_PLATFORM_OTHER,
  composeProjectTargetPlatform,
  splitProjectTargetPlatform,
} from "../../lib/project-target-platforms"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function isGroupLeader(group: GroupRecord, student: StudentSession): boolean {
  if (Number(group.created_by) === Number(student.databaseId)) return true
  return String(group.leader_student_id) === String(student.id)
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
  const groupsQuery = useStudentGroups(session)
  const [selectedGroupId, setSelectedGroupId] = useState("")
  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [deliverables, setDeliverables] = useState("")
  const [targetPlatform, setTargetPlatform] = useState("")
  const [customPlatform, setCustomPlatform] = useState("")
  const [projectLink, setProjectLink] = useState("")
  const [loadingProject, setLoadingProject] = useState(Boolean(editProjectId))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const leaderGroups = useMemo(() => {
    if (!session) return []
    return (groupsQuery.groups ?? []).filter(
      (group) => isGroupLeader(group, session) && group.status === "approved",
    )
  }, [groupsQuery.groups, session])

  const pendingLeaderGroups = useMemo(() => {
    if (!session) return []
    return (groupsQuery.groups ?? []).filter(
      (group) => isGroupLeader(group, session) && group.status === "pending",
    )
  }, [groupsQuery.groups, session])

  const loadProject = useCallback(async () => {
    if (!session || !editProjectId) return
    setError("")
    try {
      const projectRes = await collaborationApi.getProject(session, editProjectId)
      const p = projectRes.project
      if (p) {
        setTitle(p.title)
        setSummary(p.summary ?? "")
        setDeliverables(p.deliverables ?? "")
        const platform = splitProjectTargetPlatform(p.target_platform)
        setTargetPlatform(platform.preset)
        setCustomPlatform(platform.custom)
        setProjectLink(p.project_link ?? "")
        setSelectedGroupId(String(p.group_id ?? p.group?.id ?? ""))
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load project."
      setError(isInstructorAuthLeakMessage(message) ? "" : message)
    }
  }, [session, editProjectId])

  useEffect(() => {
    if (!session || !editProjectId) {
      setLoadingProject(false)
      return
    }
    setLoadingProject(true)
    loadProject().finally(() => setLoadingProject(false))
  }, [loadProject, session, editProjectId])

  useEffect(() => {
    if (editProjectId) return
    if (presetGroupId) {
      setSelectedGroupId(String(presetGroupId))
      return
    }
    if (leaderGroups.length === 1) {
      setSelectedGroupId(String(leaderGroups[0].id))
    }
  }, [editProjectId, presetGroupId, leaderGroups])

  const submit = async () => {
    if (!session || !title.trim() || !selectedGroupId) {
      AppAlert.alert("Missing fields", "Select an approved group you lead and enter a title.")
      return
    }
    setSubmitting(true)
    try {
      if (editProjectId) {
        await collaborationApi.updateProject(session, editProjectId, {
          title: title.trim(),
          summary: summary.trim() || undefined,
          deliverables: deliverables.trim() || undefined,
          targetPlatform: composeProjectTargetPlatform(targetPlatform, customPlatform) || undefined,
          projectLink: projectLink.trim() || undefined,
        })
        router.replace(`/collaboration/projects/${editProjectId}` as never)
      } else {
        const res = await collaborationApi.createProject(session, {
          groupId: Number(selectedGroupId),
          title: title.trim(),
          summary: summary.trim() || undefined,
          deliverables: deliverables.trim() || undefined,
          targetPlatform: composeProjectTargetPlatform(targetPlatform, customPlatform) || undefined,
          projectLink: projectLink.trim() || undefined,
        })
        const id = res.project?.id
        if (id) router.replace(`/collaboration/projects/${id}` as never)
        else router.back()
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not save project."
      AppAlert.alert(
        "Failed",
        isInstructorAuthLeakMessage(message)
          ? "Only the approved group leader can submit a project. Propose a group first, then wait for instructor approval."
          : message,
      )
    } finally {
      setSubmitting(false)
    }
  }

  const groupOptions = leaderGroups.map((g) => ({ value: String(g.id), label: g.name }))
  const loading = groupsQuery.isInitialLoading || loadingProject
  const headerTitle = editProjectId ? "Edit project" : "Submit project"

  const canSubmit =
    Boolean(title.trim()) &&
    (Boolean(editProjectId) || Boolean(selectedGroupId)) &&
    !loading &&
    !submitting

  const gateHint = !editProjectId && !loading && groupOptions.length === 0
    ? pendingLeaderGroups.length > 0
      ? "Your group is waiting for instructor approval. Once it's approved, you can submit a project as group leader."
      : "Propose a group first. After the instructor approves it, you become group leader and can submit a project."
    : null

  return (
    <View style={[styles.screen, { backgroundColor: SN.groupedBackground }]}>
      <CollabFlowHeader title={headerTitle} fallbackHref="/module/projects" />
      <KeyboardAwareForm
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(scrollPad.paddingBottom ?? 24, 32) }]}
        extraBottomPadding={Math.max(scrollPad.paddingBottom ?? 24, 32)}
        footer={
          loading || gateHint ? null : (
            <Pressable
              style={[styles.submitBtn, { backgroundColor: theme.primary }, !canSubmit && styles.submitDisabled]}
              onPress={() => void submit()}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel={headerTitle}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />
                  <Text style={styles.submitText}>{headerTitle}</Text>
                </>
              )}
            </Pressable>
          )
        }
      >
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          <>
            {!editProjectId ? (
              <>
                <Text style={[styles.label, { color: theme.primaryDark }]}>Group</Text>
                {gateHint ? (
                  <View style={styles.gate}>
                    <Text style={[styles.hint, { color: SN.secondaryLabel }]}>{gateHint}</Text>
                    <AppButton
                      label={pendingLeaderGroups.length > 0 ? "View my group" : "Propose a group"}
                      icon="people-outline"
                      iconPosition="left"
                      onPress={() =>
                        router.push(
                          (pendingLeaderGroups[0]
                            ? `/collaboration/groups/${pendingLeaderGroups[0].id}`
                            : "/collaboration/groups/create") as never,
                        )
                      }
                    />
                  </View>
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

            {gateHint ? null : (
              <>
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
                <NativeSelect
                  placeholder="Select a platform"
                  sheetTitle="Target platform"
                  value={targetPlatform}
                  options={PROJECT_TARGET_PLATFORM_OPTIONS}
                  onChange={(next) => {
                    setTargetPlatform(next)
                    if (next !== PROJECT_TARGET_PLATFORM_OTHER) setCustomPlatform("")
                  }}
                />
                {targetPlatform === PROJECT_TARGET_PLATFORM_OTHER ? (
                  <TextInput
                    style={[styles.input, { backgroundColor: SN.secondaryGrouped, borderColor: SN.separator }]}
                    value={customPlatform}
                    onChangeText={setCustomPlatform}
                    placeholder="Describe the platform"
                    placeholderTextColor="#94a3b8"
                  />
                ) : null}

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
          </>
        )}
      </KeyboardAwareForm>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 16, gap: 8, flexGrow: 1 },
  label: { fontSize: 13, fontWeight: "700", marginTop: 8 },
  hint: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  gate: { gap: 8, marginBottom: 8 },
  errorText: { fontSize: 13, color: "#b91c1c" },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: NATIVE.label,
  },
  area: { minHeight: 90, textAlignVertical: "top" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
})
