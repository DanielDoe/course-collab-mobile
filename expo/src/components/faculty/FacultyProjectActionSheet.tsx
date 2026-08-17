import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi, type InstructorProject } from "../../lib/instructor-api"
import { studentInitials } from "../../lib/faculty-students-utils"
import { FACULTY_SHEET_COLOR } from "../../lib/faculty-sheet-theme"
import { FACULTY_PROJECTS_COLOR, facultyProjectPanelThumbFor } from "../../lib/faculty-projects-theme"
import { BRAND } from "../../constants"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetContainer,
  FacultySheetChrome,
  FacultySheetConfirm,
  FacultySheetField,
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetSection,
  FacultySheetStatChip,
  FacultySheetStatRow,
  FacultySheetTextInput,
  FacultySheetWorkflow,
  useCollabSheetStyles
} from "./faculty-collab-sheet-ui"
import { SHEET_METRIC, SHEET_PROJECT, SHEET_SECTION } from "./faculty-sheet-semantics"

type Scope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  scope: Scope | null
  project: InstructorProject | null
  acting: boolean
  onClose: () => void
  onUpdated: () => void
  onApprove: (project: InstructorProject) => void
  onDelete: (project: InstructorProject) => void
}

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "approved") return "success"
  if (status === "pending" || status === "pending_update") return "warning"
  if (status === "rejected") return "danger"
  return "neutral"
}

function statusLabel(status: string): string {
  if (status === "pending_update") return "Update pending"
  return status
}

function isPendingProject(project: InstructorProject): boolean {
  return project.status === "pending" || project.status === "pending_update"
}

export function FacultyProjectActionSheet({
  visible,
  scope,
  project,
  acting,
  onClose,
  onUpdated,
  onApprove,
  onDelete}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const [detail, setDetail] = useState<InstructorProject | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [deliverables, setDeliverables] = useState("")
  const [projectLink, setProjectLink] = useState("")
  const [targetPlatform, setTargetPlatform] = useState("")
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [error, setError] = useState("")

  const loadDetail = useCallback(async () => {
    if (!scope || !project) return
    try {
      const { project: fresh } = await instructorApi.getProjectDetail(scope, project.id)
      setDetail(fresh)
      setTitle(fresh.title)
      setSummary(fresh.summary ?? "")
      setDeliverables(fresh.deliverables ?? "")
      setProjectLink(fresh.project_link ?? "")
      setTargetPlatform(fresh.target_platform ?? "")
      setDirty(false)
    } catch {
      setDetail(project)
      setTitle(project.title)
      setSummary(project.summary ?? "")
      setDeliverables(project.deliverables ?? "")
      setProjectLink(project.project_link ?? "")
      setTargetPlatform(project.target_platform ?? "")
    }
  }, [scope, project])

  useEffect(() => {
    if (!visible || !project) {
      setDetail(null)
      setRejectOpen(false)
      setConfirmDelete(false)
      setError("")
      return
    }
    setLoading(true)
    void loadDetail().finally(() => setLoading(false))
  }, [visible, project, loadDetail])

  const view = detail ?? project
  if (!project || !view) return null

  const members = view.members ?? []
  const isPending = isPendingProject(view)

  async function saveEdits() {
    if (!scope || !view) return
    if (!title.trim()) {
      setError("Title is required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await instructorApi.updateProject(scope, view.id, {
        title: title.trim(),
        summary: summary.trim() || undefined,
        deliverables: deliverables.trim() || undefined,
        projectLink: projectLink.trim() || undefined,
        targetPlatform: targetPlatform.trim() || undefined})
      setDirty(false)
      await loadDetail()
      onUpdated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save project.")
    } finally {
      setSaving(false)
    }
  }

  async function submitReject() {
    if (!scope || !view || !rejectReason.trim()) {
      setError("Rejection reason is required.")
      return
    }
    setSaving(true)
    try {
      await instructorApi.rejectProject(scope, view.id, rejectReason.trim())
      setRejectOpen(false)
      onClose()
      onUpdated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reject project.")
    } finally {
      setSaving(false)
    }
  }

  const saveAction = dirty ? (
    <Pressable style={collabSheetStyles.saveChip} disabled={saving} onPress={() => void saveEdits()}>
      {saving ? (
        <ActivityIndicator size="small" color={BRAND.white} />
      ) : (
        <>
          <Ionicons name="checkmark" size={14} color={BRAND.white} />
          <Text style={collabSheetStyles.saveChipText}>Save</Text>
        </>
      )}
    </Pressable>
  ) : null

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Manage project" onClose={onClose} rightSlot={saveAction} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                void loadDetail().finally(() => setRefreshing(false))
              }}
              tintColor={FACULTY_SHEET_COLOR.link}
            />
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={view.title}
            subtitle={`${view.group?.name ?? "Group"} · ${view.leader?.full_name ?? "Leader"}`}
            icon="folder-open"
            thumbColor={FACULTY_PROJECTS_COLOR.instructorScore}
            pills={
              <>
                <FacultyStatusPill label={statusLabel(view.status)} tone={statusTone(view.status)} />
                {view.group?.session ? (
                  <FacultyStatusPill label={view.group.session} tone="neutral" />
                ) : null}
              </>
            }
          />

          <View style={collabSheetStyles.body}>
            {loading && !detail ? <ActivityIndicator color={FACULTY_SHEET_COLOR.link} style={{ marginVertical: 16 }} /> : null}

            <FacultySheetStatRow>
              <FacultySheetStatChip icon="people-outline" label="Group" value={view.group?.name ?? "—"} tone={SHEET_METRIC.people} />
              <FacultySheetStatChip icon="ribbon-outline" label="Leader" value={view.leader?.full_name ?? "—"} tone={SHEET_METRIC.primary} />
              <FacultySheetStatChip icon="hardware-chip-outline" label="Platform" value={targetPlatform.trim() || "—"} tone={SHEET_METRIC.secondary} />
            </FacultySheetStatRow>

            {isPending ? (
              <FacultySheetWorkflow
                title="Review required"
                body="Approve the submission or reject with feedback for the team."
                acting={acting}
                onApprove={() => onApprove(view)}
                onReject={() => {
                  setError("")
                  setRejectOpen(true)
                }}
              />
            ) : null}

            {view.rejection_reason ? (
              <View style={collabSheetStyles.dangerBox}>
                <Text style={collabSheetStyles.dangerText}>Rejection reason</Text>
                <Text style={collabSheetStyles.dangerText}>{view.rejection_reason}</Text>
              </View>
            ) : null}

            <FacultySheetSection label="Overview" tone={SHEET_PROJECT.score}>
              <FacultySheetGroupedList>
                <FacultySheetMetricRow icon="people-outline" label="Group" value={view.group?.name ?? "—"} tone={SHEET_METRIC.people} />
                <FacultySheetMetricRow icon="ribbon-outline" label="Leader" value={view.leader?.full_name ?? "—"} tone={SHEET_METRIC.primary} />
                <FacultySheetMetricRow
                  icon="hardware-chip-outline"
                  label="Platform"
                  value={targetPlatform.trim() || "—"}
                  tone={SHEET_METRIC.secondary}
                />
                <FacultySheetMetricRow
                  icon="link-outline"
                  label="Project link"
                  value={projectLink.trim() ? "Added" : "None"}
                  tone={SHEET_METRIC.neutral}
                  isLast
                />
              </FacultySheetGroupedList>
            </FacultySheetSection>

            <FacultySheetSection label="Edit project" hint="Changes save when you tap Save" tone={SHEET_PROJECT.config}>
              <FacultySheetField label="Title">
                <FacultySheetTextInput
                  value={title}
                  onChangeText={(v) => {
                    setTitle(v)
                    setDirty(true)
                  }}
                  accessibilityLabel="Title"
                />
              </FacultySheetField>
              <FacultySheetField label="Summary">
                <FacultySheetTextInput
                  style={collabSheetStyles.textArea}
                  value={summary}
                  onChangeText={(v) => {
                    setSummary(v)
                    setDirty(true)
                  }}
                  multiline
                />
              </FacultySheetField>
              <FacultySheetField label="Deliverables">
                <FacultySheetTextInput
                  style={collabSheetStyles.textArea}
                  value={deliverables}
                  onChangeText={(v) => {
                    setDeliverables(v)
                    setDirty(true)
                  }}
                  multiline
                  placeholder="Expected outputs and milestones"
                />
              </FacultySheetField>
              <FacultySheetField label="Project link">
                <FacultySheetTextInput
                  value={projectLink}
                  onChangeText={(v) => {
                    setProjectLink(v)
                    setDirty(true)
                  }}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </FacultySheetField>
              {projectLink.trim() ? (
                <Pressable style={collabSheetStyles.linkBtn} onPress={() => void Linking.openURL(projectLink.trim())}>
                  <Ionicons name="open-outline" size={16} color={FACULTY_PROJECTS_COLOR.link} />
                  <Text style={collabSheetStyles.linkBtnText}>Open project link</Text>
                </Pressable>
              ) : null}
              <FacultySheetField label="Target platform">
                <FacultySheetTextInput
                  value={targetPlatform}
                  onChangeText={(v) => {
                    setTargetPlatform(v)
                    setDirty(true)
                  }}
                />
              </FacultySheetField>
            </FacultySheetSection>

            {members.length > 0 ? (
              <FacultySheetSection label="Team members" hint={`${members.length} student${members.length === 1 ? "" : "s"}`} tone={SHEET_PROJECT.grade}>
                <View style={collabSheetStyles.memberList}>
                  {members.map((member) => {
                    const isLeader = member.full_name === view.leader?.full_name
                    const memberThumb = facultyProjectPanelThumbFor("grade", String(member.id))
                    return (
                      <View key={member.id} style={collabSheetStyles.memberRow}>
                        <SolidListThumbTile thumb={memberThumb} icon="person-outline" size="compact">
                          <Text style={[collabSheetStyles.memberAvatarText, { color: memberThumb.icon, fontSize: 11 }]}>
                            {studentInitials(member.full_name)}
                          </Text>
                        </SolidListThumbTile>
                        <View style={collabSheetStyles.memberCopy}>
                          <View style={collabSheetStyles.memberNameRow}>
                            <Text style={collabSheetStyles.memberName}>{member.full_name}</Text>
                            {isLeader ? <FacultyStatusPill label="Leader" tone="neutral" /> : null}
                          </View>
                          {member.student_id ? <Text style={collabSheetStyles.memberId}>{member.student_id}</Text> : null}
                        </View>
                      </View>
                    )
                  })}
                </View>
              </FacultySheetSection>
            ) : null}

            {view.timeline ? (
              <FacultySheetSection label="Timeline" tone={SHEET_PROJECT.presentation}>
                <Text style={collabSheetStyles.bodyText}>{view.timeline}</Text>
              </FacultySheetSection>
            ) : null}

            {error ? <Text style={collabSheetStyles.errorText}>{error}</Text> : null}

            <FacultySheetSection label="Management" tone={SHEET_SECTION.danger}>
              <Pressable
                style={collabSheetStyles.actionRow}
                disabled={acting}
                onPress={() => setConfirmDelete(true)}
                accessibilityRole="button"
                accessibilityLabel="Delete project"
              >
                <View style={collabSheetStyles.actionIcon}>
                  <Ionicons name="trash-outline" size={18} color="#dc2626" />
                </View>
                <View style={collabSheetStyles.actionCopy}>
                  <Text style={collabSheetStyles.actionLabel}>Delete project</Text>
                  <Text style={collabSheetStyles.actionSubtitle}>Permanently removes this submission</Text>
                </View>
              </Pressable>
            </FacultySheetSection>
          </View>
        </ScrollView>

        {confirmDelete ? (
          <FacultySheetConfirm
            title="Delete project?"
            body={`“${view.title}” will be permanently removed.`}
            confirmLabel="Delete"
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => {
              setConfirmDelete(false)
              onDelete(view)
            }}
          />
        ) : null}

        {rejectOpen ? (
          <View style={[rejectOverlayStyles.wrap, { backgroundColor: tokens.isDark ? "rgba(0,0,0,0.55)" : "rgba(15,23,42,0.45)" }]}>
            <View style={[rejectOverlayStyles.card, { backgroundColor: native.secondaryGrouped, borderColor: tokens.border, borderWidth: StyleSheet.hairlineWidth }]}>
              <Text style={[rejectOverlayStyles.title, { color: native.label }]}>Reject project</Text>
              <Text style={[rejectOverlayStyles.body, { color: native.secondaryLabel }]}>Tell the team what to revise before resubmitting.</Text>
              <FacultySheetTextInput
                style={collabSheetStyles.textArea}
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
                placeholder="Reason for rejection"
              />
              {error ? <Text style={collabSheetStyles.errorText}>{error}</Text> : null}
              <View style={rejectOverlayStyles.actions}>
                <Pressable
                  style={[rejectOverlayStyles.cancel, { backgroundColor: native.tertiaryGrouped, borderColor: tokens.border }]}
                  onPress={() => {
                  setRejectOpen(false)
                  setRejectReason("")
                  setError("")
                }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={[rejectOverlayStyles.cancelText, { color: native.label }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={rejectOverlayStyles.confirm}
                  disabled={saving}
                  onPress={() => void submitReject()}
                  accessibilityRole="button"
                  accessibilityLabel="Reject"
                >
                  {saving ? <ActivityIndicator color={BRAND.white} /> : <Text style={rejectOverlayStyles.confirmText}>Reject</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </FacultySheetContainer>
    </Modal>
  )
}

const rejectOverlayStyles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 24},
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    padding: 18,
    gap: 12},
  title: { fontSize: 18, fontWeight: "600" },
  body: { fontSize: 14, lineHeight: 21, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 10 },
  cancel: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  confirm: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: FACULTY_SHEET_COLOR.danger,
  },
  cancelText: { fontWeight: "700" },
  confirmText: { fontWeight: "600", color: BRAND.white }})