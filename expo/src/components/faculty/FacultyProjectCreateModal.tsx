import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi, type InstructorGroup, type InstructorStudent } from "../../lib/instructor-api"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { FACULTY_PROJECTS_COLOR } from "../../lib/faculty-projects-theme"
import { semanticSoft } from "../../lib/themed-module-theme"
import { FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetContainer,
  FacultySheetChrome,
  FacultySheetField,
  FacultySheetNotice,
  FacultySheetSection,
  FacultySheetSubmitButton,
  FacultySheetTextInput,
  useCollabSheetStyles,

} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"

type Scope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  scope: Scope | null
  onClose: () => void
  onCreated: () => void
}

function studentInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function FacultyProjectCreateModal({ visible, scope, onClose, onCreated }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const insets = useSafeAreaInsets()

  const [students, setStudents] = useState<InstructorStudent[]>([])
  const [groups, setGroups] = useState<InstructorGroup[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [studentSearch, setStudentSearch] = useState("")
  const [leaderId, setLeaderId] = useState<number | null>(null)
  const [groupId, setGroupId] = useState<number | null>(null)
  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [deliverables, setDeliverables] = useState("")
  const [targetPlatform, setTargetPlatform] = useState("")
  const [projectLink, setProjectLink] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const leader = students.find((student) => student.id === leaderId)
  const selectedGroup = groups.find((group) => group.id === groupId)

  useEffect(() => {
    if (!visible || !scope) return
    setLoadingStudents(true)
    void instructorApi
      .getStudents(scope)
      .then(setStudents)
      .finally(() => setLoadingStudents(false))
  }, [visible, scope])

  useEffect(() => {
    if (!visible) {
      setStudentSearch("")
      setLeaderId(null)
      setGroupId(null)
      setTitle("")
      setSummary("")
      setDeliverables("")
      setTargetPlatform("")
      setProjectLink("")
      setError("")
      setGroups([])
    }
  }, [visible])

  useEffect(() => {
    if (!visible || !scope || !leaderId) {
      setGroups([])
      setGroupId(null)
      return
    }
    setLoadingGroups(true)
    void instructorApi
      .getGroups(scope, { status: "approved" })
      .then((rows) => {
        const leaderGroups = rows.filter((group) => group.created_by === leaderId && !group.deleted_at)
        setGroups(leaderGroups)
        setGroupId(leaderGroups.length === 1 ? leaderGroups[0].id : null)
      })
      .catch(() => setGroups([]))
      .finally(() => setLoadingGroups(false))
  }, [visible, scope, leaderId])

  const filteredLeaders = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    const list = q
      ? students.filter((student) =>
          [student.full_name, student.student_id, student.email, student.section, student.session_code]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : students
    return list.slice(0, 30)
  }, [students, studentSearch])

  async function submit() {
    if (!scope || !leaderId || !leader) {
      setError("Select a project leader.")
      return
    }
    if (!groupId) {
      setError("Select an approved group led by this student.")
      return
    }
    if (!title.trim()) {
      setError("Enter a project title.")
      return
    }

    setSubmitting(true)
    setError("")
    try {
      await instructorApi.createProjectOnBehalf(scope, {
        studentId: leaderId,
        groupId,
        title: title.trim(),
        summary: summary.trim() || undefined,
        deliverables: deliverables.trim() || undefined,
        targetPlatform: targetPlatform.trim() || undefined,
        projectLink: projectLink.trim() || undefined,
      })
      AppAlert.alert("Project created", `Project "${title.trim()}" was created for ${leader.full_name}.`)
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create project.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Create project" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <FacultySheetNotice message="Creates a project under an approved group where the selected student is the group leader." />

          <FacultySheetSection label="Project leader" tone={SHEET_SECTION.roster}>
            <FacultySheetField label="Search roster">
              <FacultySheetTextInput
                value={studentSearch}
                onChangeText={setStudentSearch}
                placeholder="Search by name or ID…"
              />
            </FacultySheetField>
            {loadingStudents ? (
              <ActivityIndicator color={FACULTY_PROJECTS_COLOR.link} style={{ marginVertical: 12 }} />
            ) : filteredLeaders.length === 0 ? (
              <Text style={collabSheetStyles.emptyText}>No students match your search.</Text>
            ) : (
              <View style={collabSheetStyles.memberList}>
                {filteredLeaders.map((student) => {
                  const active = student.id === leaderId
                  return (
                    <Pressable
                      key={student.id}
                      style={[
                        collabSheetStyles.memberRow,
                        active && {
                          borderColor: FACULTY_PROJECTS_COLOR.link,
                          backgroundColor: semanticSoft(FACULTY_PROJECTS_COLOR.link, tokens.isDark),
                        },
                      ]}
                      onPress={() => setLeaderId(student.id)}
                    >
                      <View style={collabSheetStyles.memberAvatar}>
                        <Text style={collabSheetStyles.memberAvatarText}>{studentInitials(student.full_name)}</Text>
                      </View>
                      <View style={collabSheetStyles.memberCopy}>
                        <View style={collabSheetStyles.memberNameRow}>
                          <Text style={collabSheetStyles.memberName}>{student.full_name}</Text>
                          {active ? <FacultyStatusPill label="Leader" tone="success" /> : null}
                        </View>
                        <Text style={collabSheetStyles.memberId}>
                          {student.student_id}
                          {student.section ? ` · ${student.section}` : ""}
                        </Text>
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            )}
          </FacultySheetSection>

          {leader ? (
            <FacultySheetSection label="Group" tone={SHEET_SECTION.edit}>
              {loadingGroups ? (
                <ActivityIndicator color={FACULTY_PROJECTS_COLOR.link} style={{ marginVertical: 12 }} />
              ) : groups.length === 0 ? (
                <Text style={collabSheetStyles.emptyText}>
                  No approved groups led by {leader.full_name}. Create a group first or approve their pending group.
                </Text>
              ) : (
                <View style={collabSheetStyles.memberList}>
                  {groups.map((group) => {
                    const active = group.id === groupId
                    return (
                      <Pressable
                        key={group.id}
                        style={[
                          collabSheetStyles.memberRow,
                          active && {
                            borderColor: FACULTY_PROJECTS_COLOR.link,
                            backgroundColor: semanticSoft(FACULTY_PROJECTS_COLOR.link, tokens.isDark),
                          },
                        ]}
                        onPress={() => setGroupId(group.id)}
                      >
                        <View style={[collabSheetStyles.memberAvatar, { backgroundColor: `${FACULTY_PROJECTS_COLOR.link}18` }]}>
                          <Ionicons name="people" size={18} color={FACULTY_PROJECTS_COLOR.link} />
                        </View>
                        <View style={collabSheetStyles.memberCopy}>
                          <View style={collabSheetStyles.memberNameRow}>
                            <Text style={collabSheetStyles.memberName}>{group.name}</Text>
                            {active ? <FacultyStatusPill label="Selected" tone="live" /> : null}
                          </View>
                          <Text style={collabSheetStyles.memberId}>
                            {group.session}
                            {group.member_count ? ` · ${group.member_count} members` : ""}
                          </Text>
                        </View>
                      </Pressable>
                    )
                  })}
                </View>
              )}
              {selectedGroup ? (
                <Text style={[collabSheetStyles.emptyText, { fontStyle: "normal", color: native.secondaryLabel }]}>
                  Projects attach to approved groups only.
                </Text>
              ) : null}
            </FacultySheetSection>
          ) : null}

          <FacultySheetSection label="Project details" tone={SHEET_SECTION.edit}>
            <FacultySheetField label="Title">
              <FacultySheetTextInput value={title} onChangeText={setTitle} placeholder="Project title" />
            </FacultySheetField>
            <FacultySheetField label="Summary">
              <FacultySheetTextInput
                value={summary}
                onChangeText={setSummary}
                placeholder="Brief overview"
                multiline
              />
            </FacultySheetField>
            <FacultySheetField label="Deliverables">
              <FacultySheetTextInput
                value={deliverables}
                onChangeText={setDeliverables}
                placeholder="What the team will produce"
                multiline
              />
            </FacultySheetField>
            <FacultySheetField label="Target platform">
              <FacultySheetTextInput
                value={targetPlatform}
                onChangeText={setTargetPlatform}
                placeholder="Web, iOS, Android…"
              />
            </FacultySheetField>
            <FacultySheetField label="Project link">
              <FacultySheetTextInput
                value={projectLink}
                onChangeText={setProjectLink}
                placeholder="https://"
                autoCapitalize="none"
                keyboardType="url"
              />
            </FacultySheetField>
          </FacultySheetSection>

          {error ? <Text style={collabSheetStyles.errorText}>{error}</Text> : null}

          <FacultySheetSubmitButton
            label="Create project"
            onPress={() => void submit()}
            disabled={submitting || !leaderId || !groupId || !title.trim()}
            loading={submitting}
          />
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}
