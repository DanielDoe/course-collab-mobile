import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi, type InstructorStudent } from "../../lib/instructor-api"
import { FACULTY_COLLAB_COLOR } from "../../lib/faculty-collab-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
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

function leaderSessionCode(student: InstructorStudent): string {
  return (student.session_code ?? student.section ?? "").trim()
}

export function FacultyGroupCreateModal({ visible, scope, onClose, onCreated }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const insets = useSafeAreaInsets()

  const [students, setStudents] = useState<InstructorStudent[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [studentSearch, setStudentSearch] = useState("")
  const [leaderId, setLeaderId] = useState<number | null>(null)
  const [name, setName] = useState("")
  const [memberSearch, setMemberSearch] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const leader = students.find((student) => student.id === leaderId)
  const leaderSession = leader ? leaderSessionCode(leader) : ""

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
      setMemberSearch("")
      setLeaderId(null)
      setName("")
      setSelectedMembers([])
      setError("")
    }
  }, [visible])

  useEffect(() => {
    setSelectedMembers([])
    setMemberSearch("")
  }, [leaderId])

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

  const memberCandidates = useMemo(() => {
    if (!leader || !leaderSession) return []
    const q = memberSearch.trim().toLowerCase()
    return students
      .filter((student) => student.id !== leader.id)
      .filter((student) => {
        const session = leaderSessionCode(student)
        return session === leaderSession || student.section === leader.section
      })
      .filter((student) =>
        q
          ? [student.full_name, student.student_id, student.email]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(q)
          : true,
      )
      .slice(0, 30)
  }, [students, leader, leaderSession, memberSearch])

  function toggleMember(studentId: number) {
    setSelectedMembers((prev) => {
      if (prev.includes(studentId)) return prev.filter((id) => id !== studentId)
      if (prev.length >= 3) {
        AppAlert.alert("Limit reached", "Groups can have up to 4 members including the leader.")
        return prev
      }
      return [...prev, studentId]
    })
  }

  async function submit() {
    if (!scope || !leaderId || !leader) {
      setError("Select a group leader.")
      return
    }
    if (!name.trim()) {
      setError("Enter a group name.")
      return
    }
    if (!leaderSession) {
      setError("Could not determine the leader's section.")
      return
    }

    setSubmitting(true)
    setError("")
    try {
      await instructorApi.createGroupOnBehalf(scope, {
        studentId: leaderId,
        session: leaderSession,
        name: name.trim(),
        initialMembers: selectedMembers,
      })
      AppAlert.alert("Group created", `Group "${name.trim()}" was created for ${leader.full_name}.`)
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create group.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Create group" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <FacultySheetNotice
            tone="warning"
            message="Creates a group on behalf of a student leader. Multi-member groups stay pending until you approve them."
          />

          <FacultySheetSection label="Group leader" tone={SHEET_SECTION.roster}>
            <FacultySheetField label="Search roster">
              <FacultySheetTextInput
                value={studentSearch}
                onChangeText={setStudentSearch}
                placeholder="Search by name or ID…"
              />
            </FacultySheetField>
            {loadingStudents ? (
              <ActivityIndicator color={FACULTY_COLLAB_COLOR.link} style={{ marginVertical: 12 }} />
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
                          borderColor: FACULTY_COLLAB_COLOR.link,
                          backgroundColor: semanticSoft(FACULTY_COLLAB_COLOR.link, tokens.isDark),
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

          <FacultySheetSection label="Group details" tone={SHEET_SECTION.edit}>
            <FacultySheetField label="Group name">
              <FacultySheetTextInput value={name} onChangeText={setName} placeholder="Team name" />
            </FacultySheetField>
            {leader ? (
              <Text style={[collabSheetStyles.emptyText, { fontStyle: "normal", color: native.secondaryLabel }]}>
                Section: {leaderSession || "Unknown"}
              </Text>
            ) : null}
          </FacultySheetSection>

          {leader ? (
            <FacultySheetSection label={`Invite members (${selectedMembers.length}/3)`} tone={SHEET_SECTION.roster}>
              <FacultySheetField label="Search classmates">
                <FacultySheetTextInput
                  value={memberSearch}
                  onChangeText={setMemberSearch}
                  placeholder="Optional — same section only"
                />
              </FacultySheetField>
              {memberCandidates.length === 0 ? (
                <Text style={collabSheetStyles.emptyText}>No classmates available in this section.</Text>
              ) : (
                <View style={collabSheetStyles.memberList}>
                  {memberCandidates.map((student) => {
                    const active = selectedMembers.includes(student.id)
                    return (
                      <Pressable
                        key={student.id}
                        style={[
                          collabSheetStyles.memberRow,
                          active && {
                            borderColor: FACULTY_COLLAB_COLOR.link,
                            backgroundColor: semanticSoft(FACULTY_COLLAB_COLOR.link, tokens.isDark),
                          },
                        ]}
                        onPress={() => toggleMember(student.id)}
                      >
                        <View style={collabSheetStyles.memberAvatar}>
                          <Text style={collabSheetStyles.memberAvatarText}>{studentInitials(student.full_name)}</Text>
                        </View>
                        <View style={collabSheetStyles.memberCopy}>
                          <View style={collabSheetStyles.memberNameRow}>
                            <Text style={collabSheetStyles.memberName}>{student.full_name}</Text>
                            {active ? <FacultyStatusPill label="Added" tone="live" /> : null}
                          </View>
                          <Text style={collabSheetStyles.memberId}>{student.student_id}</Text>
                        </View>
                        <Ionicons
                          name={active ? "checkmark-circle" : "ellipse-outline"}
                          size={20}
                          color={active ? FACULTY_COLLAB_COLOR.link : native.tertiaryLabel}
                        />
                      </Pressable>
                    )
                  })}
                </View>
              )}
            </FacultySheetSection>
          ) : null}

          {error ? <Text style={collabSheetStyles.errorText}>{error}</Text> : null}

          <FacultySheetSubmitButton
            label="Create group"
            onPress={() => void submit()}
            disabled={submitting || !leaderId || !name.trim()}
            loading={submitting}
          />
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}
