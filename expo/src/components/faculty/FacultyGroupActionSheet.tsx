import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { instructorApi, type InstructorGroup } from "../../lib/instructor-api"
import { facultyGroupStatusMeta } from "../../lib/faculty-collab-theme"
import { studentInitials } from "../../lib/faculty-students-utils"
import { FACULTY_SHEET_COLOR } from "../../lib/faculty-sheet-theme"
import { FACULTY_SHEET_SOLID } from "../../lib/faculty-sheet-accents"
import { FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetContainer,
  FacultySheetChrome,
  FacultySheetConfirm,
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetSection,
  FacultySheetWorkflow,
  useCollabSheetStyles,
  FacultySheetStatChip,
  FacultySheetStatRow
} from "./faculty-collab-sheet-ui"
import { useSuppressModuleSearchDock } from "../../context/ModuleSearchDockContext"
import { SHEET_METRIC, SHEET_SECTION } from "./faculty-sheet-semantics"

type Scope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  scope: Scope | null
  group: InstructorGroup | null
  acting: boolean
  onClose: () => void
  onApprove: (group: InstructorGroup) => void
  onReject: (group: InstructorGroup) => void
  onDelete: (group: InstructorGroup) => void
  onRestore: (group: InstructorGroup) => void
  onRemoveMember: (group: InstructorGroup, memberId: number, memberName: string) => void
}

function groupStatusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "approved") return "success"
  if (status === "pending" || status === "pending_update") return "warning"
  if (status === "rejected") return "danger"
  return "neutral"
}

function statusLabel(group: InstructorGroup): string {
  return facultyGroupStatusMeta(group).label
}

function isPendingGroup(group: InstructorGroup): boolean {
  return !group.deleted_at && (group.status === "pending" || group.status === "pending_update")
}

export function FacultyGroupActionSheet({
  visible,
  scope,
  group,
  acting,
  onClose,
  onApprove,
  onReject,
  onDelete,
  onRestore,
  onRemoveMember}: Props) {
  useSuppressModuleSearchDock(visible)
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const [detail, setDetail] = useState<InstructorGroup | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pendingMember, setPendingMember] = useState<{ id: number; name: string } | null>(null)
  const [detailError, setDetailError] = useState("")

  const loadDetail = useCallback(async () => {
    if (!scope || !group) return
    try {
      setDetailError("")
      setDetail(await instructorApi.getGroupDetail(scope, group.id))
    } catch {
      setDetail(group)
      setDetailError("Could not refresh group details. Showing the list snapshot.")
    }
  }, [scope, group])

  useEffect(() => {
    if (!visible || !group) {
      setDetail(null)
      setDetailError("")
      return
    }
    setLoading(true)
    void loadDetail().finally(() => setLoading(false))
  }, [visible, group, loadDetail])

  const view = useMemo(() => {
    if (!group) return group
    if (!detail) return group
    return {
      ...group,
      ...detail,
      deleted_at: detail.deleted_at ?? group.deleted_at,
    }
  }, [detail, group])
  const members = useMemo(() => view?.members ?? [], [view?.members])
  const memberCount = view?.member_count ?? members.length
  const isDeleted = Boolean(view?.deleted_at)
  const isPending = view ? isPendingGroup(view) : false

  if (!group || !view) return null

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Manage group" onClose={onClose} />

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
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={view.name}
            subtitle={`${view.leader_name} · ${memberCount} member${memberCount === 1 ? "" : "s"}`}
            icon="people"
            thumbColor={FACULTY_SHEET_COLOR.link}
            pills={
              <>
                <FacultyStatusPill label={statusLabel(view)} tone={groupStatusTone(isDeleted ? "rejected" : view.status)} />
                <FacultyStatusPill label={view.session} tone="neutral" />
              </>
            }
          />

          <View style={collabSheetStyles.body}>
            {loading && !detail ? <ActivityIndicator color={FACULTY_SHEET_COLOR.link} style={{ marginVertical: 16 }} /> : null}

            {detailError ? (
              <View style={collabSheetStyles.alertBox}>
                <Ionicons name="alert-circle-outline" size={18} color={FACULTY_SHEET_COLOR.nudge} />
                <Text style={[collabSheetStyles.alertText, { flex: 1 }]}>{detailError}</Text>
              </View>
            ) : null}

            <FacultySheetStatRow>
              <FacultySheetStatChip icon="ribbon-outline" label="Leader" value={view.leader_name} tone={SHEET_METRIC.primary} />
              <FacultySheetStatChip icon="people-outline" label="Members" value={String(memberCount)} tone={SHEET_METRIC.people} />
              <FacultySheetStatChip icon="school-outline" label="Section" value={view.session} tone={SHEET_METRIC.neutral} />
            </FacultySheetStatRow>

            {isPending ? (
              <FacultySheetWorkflow
                title="Review required"
                body="Approve to activate this group for projects, or reject to send students back."
                acting={acting}
                approveLabel="Approve group"
                onApprove={() => onApprove(view)}
                onReject={() => onReject(view)}
              />
            ) : null}

            <FacultySheetSection label="Overview">
              <FacultySheetGroupedList>
                <FacultySheetMetricRow icon="ribbon-outline" label="Leader" value={view.leader_name} tone={SHEET_METRIC.primary} />
                <FacultySheetMetricRow icon="people-outline" label="Members" value={String(memberCount)} tone={SHEET_METRIC.people} />
                <FacultySheetMetricRow icon="school-outline" label="Section" value={view.session} tone={SHEET_METRIC.neutral} isLast />
              </FacultySheetGroupedList>
            </FacultySheetSection>

            {view.pending_changes ? (
              <View style={collabSheetStyles.alertBox}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: FACULTY_SHEET_SOLID.orange.fill,
                    flexShrink: 0,
                  }}
                >
                  <Ionicons name="time-outline" size={16} color={FACULTY_SHEET_SOLID.orange.icon} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: FACULTY_SHEET_COLOR.nudge }}>
                    Pending changes
                  </Text>
                {view.pending_changes.name ? (
                  <Text style={collabSheetStyles.alertText}>New name: {view.pending_changes.name}</Text>
                ) : null}
                {(view.pending_changes.addMembers?.length ?? 0) > 0 ? (
                  <Text style={collabSheetStyles.alertText}>
                    Adding {view.pending_changes.addMembers?.length} member(s)
                  </Text>
                ) : null}
                {(view.pending_changes.removeMembers?.length ?? 0) > 0 ? (
                  <Text style={collabSheetStyles.alertText}>
                    Removing {view.pending_changes.removeMembers?.length} member(s)
                  </Text>
                ) : null}
                </View>
              </View>
            ) : null}

            <FacultySheetSection label="Roster" hint={`${members.length} on this team`} tone={SHEET_SECTION.roster}>
              {members.length === 0 ? (
                <Text style={collabSheetStyles.emptyText}>No members on file.</Text>
              ) : (
                <View style={collabSheetStyles.memberList}>
                  {members.map((member) => {
                    const isLeader = member.full_name === view.leader_name
                    return (
                      <View key={member.id} style={collabSheetStyles.memberRow}>
                        <View style={collabSheetStyles.memberAvatar}>
                          <Text style={collabSheetStyles.memberAvatarText}>{studentInitials(member.full_name)}</Text>
                        </View>
                        <View style={collabSheetStyles.memberCopy}>
                          <View style={collabSheetStyles.memberNameRow}>
                            <Text style={collabSheetStyles.memberName}>{member.full_name}</Text>
                            {isLeader ? <FacultyStatusPill label="Leader" tone="neutral" /> : null}
                          </View>
                          <Text style={collabSheetStyles.memberId}>{member.student_id}</Text>
                        </View>
                        {view.status === "approved" && !isDeleted && !isLeader ? (
                          <Pressable
                            hitSlop={8}
                            onPress={() => setPendingMember({ id: member.id, name: member.full_name })}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${member.full_name}`}
                          >
                            <Ionicons name="person-remove-outline" size={20} color="#94a3b8" />
                          </Pressable>
                        ) : null}
                      </View>
                    )
                  })}
                </View>
              )}
            </FacultySheetSection>

            <FacultySheetSection label="Management" tone={SHEET_SECTION.danger}>
              <Pressable
                style={collabSheetStyles.actionRow}
                disabled={acting}
                onPress={() => (isDeleted ? onRestore(view) : setConfirmDelete(true))}
                accessibilityRole="button"
                accessibilityLabel={isDeleted ? "Restore group" : "Delete group"}
              >
                <View style={collabSheetStyles.actionIcon}>
                  <Ionicons
                    name={isDeleted ? "refresh-outline" : "trash-outline"}
                    size={18}
                    color={isDeleted ? FACULTY_SHEET_COLOR.link : FACULTY_SHEET_COLOR.danger}
                  />
                </View>
                <View style={collabSheetStyles.actionCopy}>
                  <Text style={collabSheetStyles.actionLabel}>{isDeleted ? "Restore group" : "Delete group"}</Text>
                  <Text style={collabSheetStyles.actionSubtitle}>
                    {isDeleted ? "Return to active roster for review" : "Soft-delete — restore from Deleted tab"}
                  </Text>
                </View>
              </Pressable>
            </FacultySheetSection>
          </View>
        </ScrollView>

        {confirmDelete ? (
          <FacultySheetConfirm
            title="Delete group?"
            body={`“${view.name}” will move to the Deleted tab.`}
            confirmLabel="Delete"
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => {
              setConfirmDelete(false)
              onDelete(view)
            }}
          />
        ) : null}

        {pendingMember ? (
          <FacultySheetConfirm
            title="Remove member?"
            body={`Remove ${pendingMember.name} from this group?`}
            confirmLabel="Remove"
            onCancel={() => setPendingMember(null)}
            onConfirm={() => {
              onRemoveMember(view, pendingMember.id, pendingMember.name)
              setPendingMember(null)
            }}
          />
        ) : null}
      </FacultySheetContainer>
    </Modal>
  )
}