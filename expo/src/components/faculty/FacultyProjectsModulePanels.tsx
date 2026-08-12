import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import {
  instructorApi,
  type InstructorGroup,
  type InstructorProject,
  type PresentationConfig,
  type ProjectLeaderboardEntry,
  type ProjectPresentation,
} from "../../lib/instructor-api"
import {
  formatPresentationDate,
  formatPresentationTime,
  letterGradeFromScore,
  presentationStatusLabel,
  PROJECT_LECTURE_DAYS,
  projectModuleSessionCodes,
  buildProjectScores,
  type ProjectScoreRow,
  type ProjectStudentGradeRow,
} from "../../lib/faculty-projects-module-utils"
import { FACULTY_PROJECTS_COLOR, facultyPresentationStatusColor, facultyPresentationStatusIcon, facultyProjectPanelThumbFor, facultyProjectStatusMeta } from "../../lib/faculty-projects-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import type { useFacultyScope } from "../../hooks/useFacultyScope"
import { NativeSwitch } from "../NativeSwitch"
import { FacultyEmptyState, FacultyStatusPill } from "./faculty-shared"
import { FacultySignatureListCard } from "./FacultyCollabListCards"
import { FacultyProjectLeaderboardDetailSheet } from "./FacultyProjectLeaderboardDetailSheet"
import {
  FacultySheetChrome,
  FacultySheetContainer,
  FacultySheetField,
  FacultySheetSection,
  FacultySheetSubmitButton,
  FacultySheetTextInput,
  useCollabSheetStyles,
} from "./faculty-collab-sheet-ui"
import { SHEET_PROJECT, SHEET_SECTION } from "./faculty-sheet-semantics"
import { useModuleTheme } from "../../lib/themed-module-shell"

type Scope = NonNullable<ReturnType<typeof useFacultyScope>["scope"]>

function matchesProjectSearch(values: Array<string | null | undefined>, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return values.some((v) => String(v ?? "").toLowerCase().includes(q))
}

function scoreRowToLeaderboardEntry(row: ProjectScoreRow, rank: number): ProjectLeaderboardEntry {
  return {
    rank,
    id: row.projectId,
    title: row.title,
    session: row.session,
    groupName: row.groupName,
    leaderName: row.leaderName,
    totalScore: row.totalScore,
    studentPoints: row.studentPoints,
    instructorPoints: row.instructorPoints,
    voteCount: row.studentVotes + row.instructorVotes,
  }
}

export function FacultyProjectPresentationsPanel({
  scope,
  search,
  statusFilter,
}: {
  scope: Scope
  search: string
  statusFilter: string
}) {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const [rows, setRows] = useState<ProjectPresentation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState<ProjectPresentation | null>(null)
  const [instructorNotes, setInstructorNotes] = useState("")
  const [attendanceTaken, setAttendanceTaken] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setError("")
    setRows(await instructorApi.getProjectPresentations(scope, statusFilter))
  }, [scope, statusFilter])

  useEffect(() => {
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load presentations."))
      .finally(() => setLoading(false))
  }, [load])

  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        matchesProjectSearch(
          [row.project_title, row.group_name, row.session, row.location, row.status],
          search,
        ),
      ),
    [rows, search],
  )

  function openDetail(row: ProjectPresentation) {
    setSelected(row)
    setInstructorNotes(row.instructor_notes ?? "")
    setAttendanceTaken(Boolean(row.attendance_taken))
  }

  async function saveDetail(status?: string) {
    if (!selected) return
    setSaving(true)
    try {
      await instructorApi.updateProjectPresentation(scope, {
        presentationId: selected.id,
        instructorNotes: instructorNotes.trim(),
        attendanceTaken,
        status: status ?? selected.status,
      })
      setSelected(null)
      await load()
    } catch (err) {
      AppAlert.alert("Update failed", err instanceof ApiError ? err.message : "Could not update presentation.")
    } finally {
      setSaving(false)
    }
  }

  async function deletePresentation() {
    if (!selected) return
    AppAlert.alert("Delete presentation?", "This permanently removes the scheduled slot.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setSaving(true)
            try {
              await instructorApi.deleteProjectPresentation(scope, selected.id)
              setSelected(null)
              await load()
            } catch (err) {
              AppAlert.alert("Delete failed", err instanceof ApiError ? err.message : "Could not delete.")
            } finally {
              setSaving(false)
            }
          })()
        },
      },
    ])
  }

  if (loading) return <ActivityIndicator color={FACULTY_PROJECTS_COLOR.link} style={localStyles.loader} />

  return (
    <>
      {error ? (
        <View style={moduleStyles.errorBox}>
          <Text style={moduleStyles.errorText}>{error}</Text>
        </View>
      ) : null}

      {filtered.length === 0 ? (
        <FacultyEmptyState
          icon="calendar-outline"
          title="No presentations"
          body="Student presentation bookings will appear here once groups schedule slots."
        />
      ) : (
        <View style={localStyles.list}>
          {filtered.map((row) => (
            <FacultySignatureListCard
              key={row.id}
              thumb={facultyProjectPanelThumbFor("presentation", String(row.id))}
              icon="calendar-outline"
              title={row.project_title}
              description={`${formatPresentationDate(row.scheduled_date)} · ${formatPresentationTime(row.start_time)}–${formatPresentationTime(row.end_time)}`}
              metaLine={[row.group_name, row.session, row.location].filter(Boolean).join(" · ")}
              status={{
                label: presentationStatusLabel(row.status),
                color: facultyPresentationStatusColor(row.status),
                icon: facultyPresentationStatusIcon(row.status),
              }}
              onPress={() => openDetail(row)}
            />
          ))}
        </View>
      )}

      <Modal visible={selected != null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        <FacultySheetContainer>
          <FacultySheetChrome
            topInset={insets.top}
            title="Presentation"
            onClose={() => !saving && setSelected(null)}
          />
          {selected ? (
            <ScrollView contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}>
              <FacultySheetSection label="Schedule" tone={SHEET_SECTION.roster}>
                <Text style={[type.bodyEmphasis, { color: native.label }]}>{selected.project_title}</Text>
                <Text style={[type.caption, { color: native.secondaryLabel, marginTop: 4 }]}>
                  {formatPresentationDate(selected.scheduled_date)} · {formatPresentationTime(selected.start_time)}–
                  {formatPresentationTime(selected.end_time)}
                </Text>
                <Text style={[type.caption, { color: native.secondaryLabel, marginTop: 2 }]}>
                  {selected.group_name} · {selected.session}
                </Text>
                {selected.location ? (
                  <Text style={[type.caption, { color: native.tertiaryLabel, marginTop: 2 }]}>{selected.location}</Text>
                ) : null}
              </FacultySheetSection>

              <FacultySheetSection label="Instructor notes" tone={SHEET_PROJECT.presentation}>
                <FacultySheetField label="Notes">
                  <FacultySheetTextInput
                    value={instructorNotes}
                    onChangeText={setInstructorNotes}
                    multiline
                    placeholder="Attendance notes, feedback…"
                    style={localStyles.notesInput}
                  />
                </FacultySheetField>
                <View style={localStyles.toggleRow}>
                  <Text style={[type.body, { color: native.label }]}>Attendance taken</Text>
                  <NativeSwitch
                    value={attendanceTaken}
                    onValueChange={setAttendanceTaken}
                    activeTrackColor={FACULTY_PROJECTS_COLOR.link}
                  />
                </View>
              </FacultySheetSection>

              <View style={localStyles.actionRow}>
                <Pressable
                  style={[localStyles.actionBtn, { borderColor: tokens.border }]}
                  disabled={saving}
                  onPress={() => void saveDetail()}
                >
                  {saving ? (
                    <ActivityIndicator color={FACULTY_PROJECTS_COLOR.link} />
                  ) : (
                    <Text style={[type.caption, { color: FACULTY_PROJECTS_COLOR.link, fontWeight: "700" }]}>
                      Save notes
                    </Text>
                  )}
                </Pressable>
                {selected.status !== "completed" ? (
                  <Pressable
                    style={[localStyles.actionBtn, { backgroundColor: FACULTY_PROJECTS_COLOR.action }]}
                    disabled={saving}
                    onPress={() => void saveDetail("completed")}
                  >
                    <Text style={[type.caption, { color: FACULTY_PROJECTS_COLOR.actionInk, fontWeight: "700" }]}>
                      Mark completed
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <Pressable style={localStyles.deleteLink} disabled={saving} onPress={() => void deletePresentation()}>
                <Text style={[type.caption, { color: tokens.danger, fontWeight: "700" }]}>Delete presentation</Text>
              </Pressable>
            </ScrollView>
          ) : null}
        </FacultySheetContainer>
      </Modal>
    </>
  )
}

export function FacultyProjectPresentationConfigPanel({ scope }: { scope: Scope }) {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const [configs, setConfigs] = useState<PresentationConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editing, setEditing] = useState<PresentationConfig | "new" | null>(null)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({
    session: projectModuleSessionCodes()[0] ?? "",
    presentationStartDate: "",
    presentationEndDate: "",
    lectureDays: [] as string[],
    startTime: "12:00",
    endTime: "13:00",
    slotDuration: "20",
    location: "New Electrical Engineering Bldg 119",
  })

  const load = useCallback(async () => {
    setError("")
    setConfigs(await instructorApi.getPresentationConfigs(scope))
  }, [scope])

  useEffect(() => {
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load configuration."))
      .finally(() => setLoading(false))
  }, [load])

  function startEdit(config: PresentationConfig) {
    setEditing(config)
    setDraft({
      session: config.session,
      presentationStartDate: String(config.presentation_start_date).slice(0, 10),
      presentationEndDate: String(config.presentation_end_date).slice(0, 10),
      lectureDays: [...(config.lecture_days ?? [])],
      startTime: String(config.start_time).slice(0, 5),
      endTime: String(config.end_time).slice(0, 5),
      slotDuration: String(config.slot_duration ?? 20),
      location: config.location ?? "",
    })
  }

  function startNew() {
    const unused = projectModuleSessionCodes().find((code) => !configs.some((c) => c.session === code))
    if (!unused) {
      AppAlert.alert("All sessions configured", "Every available section already has a presentation window.")
      return
    }
    setEditing("new")
    setDraft({
      session: unused,
      presentationStartDate: "",
      presentationEndDate: "",
      lectureDays: [],
      startTime: "12:00",
      endTime: "13:00",
      slotDuration: "20",
      location: "New Electrical Engineering Bldg 119",
    })
  }

  async function saveConfig() {
    if (!draft.presentationStartDate || !draft.presentationEndDate || draft.lectureDays.length === 0) {
      AppAlert.alert("Missing fields", "Set dates and at least one lecture day.")
      return
    }
    setSaving(true)
    try {
      await instructorApi.savePresentationConfig(scope, {
        session: draft.session,
        presentationStartDate: draft.presentationStartDate,
        presentationEndDate: draft.presentationEndDate,
        lectureDays: draft.lectureDays,
        startTime: draft.startTime,
        endTime: draft.endTime,
        slotDuration: parseInt(draft.slotDuration, 10) || 20,
        location: draft.location.trim(),
      })
      setEditing(null)
      await load()
      AppAlert.alert("Saved", "Presentation configuration updated.")
    } catch (err) {
      AppAlert.alert("Save failed", err instanceof ApiError ? err.message : "Could not save configuration.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <ActivityIndicator color={FACULTY_PROJECTS_COLOR.link} style={localStyles.loader} />

  return (
    <>
      {error ? (
        <View style={moduleStyles.errorBox}>
          <Text style={moduleStyles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18, marginBottom: 4 }]}>
        Set presentation windows, slot length, and location per section.
      </Text>

      <Pressable
        style={({ pressed }) => [
          localStyles.addBtn,
          { backgroundColor: FACULTY_PROJECTS_COLOR.action, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={startNew}
      >
        <Ionicons name="add-outline" size={18} color="#fff" />
        <Text style={localStyles.addBtnText}>Add section config</Text>
      </Pressable>

      {configs.length === 0 ? (
        <FacultyEmptyState
          icon="settings-outline"
          title="No configuration yet"
          body="Add a section to define when students can book presentation slots."
        />
      ) : (
        <View style={localStyles.list}>
          {configs.map((config) => (
            <FacultySignatureListCard
              key={config.id}
              thumb={facultyProjectPanelThumbFor("config", config.session)}
              icon="settings-outline"
              title={config.session}
              description={`${String(config.presentation_start_date).slice(0, 10)} → ${String(config.presentation_end_date).slice(0, 10)}`}
              metaLine={`${(config.lecture_days ?? []).join(", ") || "No days set"} · ${formatPresentationTime(config.start_time)}–${formatPresentationTime(config.end_time)} · ${config.slot_duration} min slots`}
              onPress={() => startEdit(config)}
            />
          ))}
        </View>
      )}

      <Modal visible={editing != null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(null)}>
        <FacultySheetContainer>
          <FacultySheetChrome
            topInset={insets.top}
            title={editing === "new" ? "New configuration" : `Edit ${draft.session}`}
            onClose={() => !saving && setEditing(null)}
          />
          <ScrollView contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}>
            <FacultySheetSection label="Section" tone={SHEET_PROJECT.config}>
              <Text style={[type.bodyEmphasis, { color: native.label }]}>{draft.session}</Text>
            </FacultySheetSection>
            <FacultySheetField label="Start date">
              <FacultySheetTextInput
                value={draft.presentationStartDate}
                onChangeText={(v) => setDraft((d) => ({ ...d, presentationStartDate: v }))}
                placeholder="YYYY-MM-DD"
              />
            </FacultySheetField>
            <FacultySheetField label="End date">
              <FacultySheetTextInput
                value={draft.presentationEndDate}
                onChangeText={(v) => setDraft((d) => ({ ...d, presentationEndDate: v }))}
                placeholder="YYYY-MM-DD"
              />
            </FacultySheetField>
            <FacultySheetSection label="Lecture days" tone={SHEET_PROJECT.config}>
              {PROJECT_LECTURE_DAYS.map((day) => {
                const active = draft.lectureDays.includes(day)
                return (
                  <Pressable
                    key={day}
                    style={[localStyles.dayRow, { borderColor: native.separator }]}
                    onPress={() =>
                      setDraft((d) => ({
                        ...d,
                        lectureDays: active ? d.lectureDays.filter((x) => x !== day) : [...d.lectureDays, day],
                      }))
                    }
                  >
                    <Text style={[type.body, { color: native.label }]}>{day}</Text>
                    <Ionicons
                      name={active ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      color={active ? FACULTY_PROJECTS_COLOR.link : native.tertiaryLabel}
                    />
                  </Pressable>
                )
              })}
            </FacultySheetSection>
            <FacultySheetField label="Daily window">
              <View style={localStyles.timeRow}>
                <FacultySheetTextInput
                  value={draft.startTime}
                  onChangeText={(v) => setDraft((d) => ({ ...d, startTime: v }))}
                  placeholder="HH:MM"
                  style={localStyles.timeInputFlex}
                />
                <Text style={{ color: native.secondaryLabel }}>to</Text>
                <FacultySheetTextInput
                  value={draft.endTime}
                  onChangeText={(v) => setDraft((d) => ({ ...d, endTime: v }))}
                  placeholder="HH:MM"
                  style={localStyles.timeInputFlex}
                />
              </View>
            </FacultySheetField>
            <FacultySheetField label="Slot duration (minutes)">
              <FacultySheetTextInput
                value={draft.slotDuration}
                onChangeText={(v) => setDraft((d) => ({ ...d, slotDuration: v }))}
                keyboardType="number-pad"
              />
            </FacultySheetField>
            <FacultySheetField label="Location">
              <FacultySheetTextInput value={draft.location} onChangeText={(v) => setDraft((d) => ({ ...d, location: v }))} />
            </FacultySheetField>
            <FacultySheetSubmitButton
              label="Save configuration"
              onPress={() => void saveConfig()}
              disabled={saving}
              loading={saving}
            />
          </ScrollView>
        </FacultySheetContainer>
      </Modal>
    </>
  )
}

function ScoreProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const { native } = useModuleTheme()
  return (
    <View style={[localStyles.progressTrack, { backgroundColor: native.separator }]}>
      <View style={[localStyles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  )
}

export function FacultyProjectScoresOverviewPanel({
  scope,
  search,
  sessionFilter,
}: {
  scope: Scope
  search: string
  sessionFilter: string
}) {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const [rows, setRows] = useState<ProjectScoreRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedScore, setSelectedScore] = useState<ProjectLeaderboardEntry | null>(null)

  const load = useCallback(async () => {
    setError("")
    const session = sessionFilter === "all" ? undefined : sessionFilter
    const [projects, voteTotals] = await Promise.all([
      instructorApi.getProjects(scope, session ? { session } : undefined),
      instructorApi.getProjectVoteTotals(scope),
    ])
    setRows(
      buildProjectScores(projects, voteTotals).sort((a, b) => b.totalScore - a.totalScore),
    )
  }, [scope, sessionFilter])

  useEffect(() => {
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load scores."))
      .finally(() => setLoading(false))
  }, [load])

  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        matchesProjectSearch([row.title, row.groupName, row.leaderName, row.session], search),
      ),
    [rows, search],
  )

  if (loading) return <ActivityIndicator color={FACULTY_PROJECTS_COLOR.link} style={localStyles.loader} />

  return (
    <>
      {error ? (
        <View style={moduleStyles.errorBox}>
          <Text style={moduleStyles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18, marginBottom: 4 }]}>
        Scoring breakdown for all projects. Students: up to 30 pts · Instructor: up to 20 pts.
      </Text>

      {filtered.length === 0 ? (
        <FacultyEmptyState
          icon="stats-chart-outline"
          title="No scores yet"
          body="Scores appear after students vote and you rate approved projects."
        />
      ) : (
        <View style={localStyles.list}>
          {filtered.map((row, index) => {
            const rankThumb = facultyProjectPanelThumbFor("rank", String(row.projectId))
            return (
              <FacultySignatureListCard
                key={row.projectId}
                thumb={rankThumb}
                thumbChild={
                  <Text style={[type.caption, { color: rankThumb.icon, fontWeight: "800", fontSize: 11 }]}>
                    #{index + 1}
                  </Text>
                }
                title={row.title}
                description={`${row.groupName} · ${row.session} · ${row.leaderName}`}
                accentLine={{ text: `${row.totalScore.toFixed(1)} / 50 total`, color: FACULTY_PROJECTS_COLOR.totalScore }}
                status={facultyProjectStatusMeta(row.status, String(row.projectId))}
                onPress={() => setSelectedScore(scoreRowToLeaderboardEntry(row, index + 1))}
                footer={
                  <View style={localStyles.scoreBreakdown}>
                    <View style={localStyles.scoreColumn}>
                      <View style={localStyles.scoreRowHeader}>
                        <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                          Students ({row.studentVotes})
                        </Text>
                        <Text style={[type.caption, { color: native.label, fontWeight: "700" }]}>
                          {row.studentPoints.toFixed(1)} / 30
                        </Text>
                      </View>
                      <ScoreProgressBar value={row.studentPoints} max={30} color={FACULTY_PROJECTS_COLOR.studentScore} />
                      {row.studentVotes < 30 ? (
                        <Text style={[type.caption, { color: FACULTY_PROJECTS_COLOR.nudge, marginTop: 4 }]}>
                          Need {30 - row.studentVotes} more vote{30 - row.studentVotes === 1 ? "" : "s"}
                        </Text>
                      ) : null}
                    </View>
                    <View style={localStyles.scoreColumn}>
                      <View style={localStyles.scoreRowHeader}>
                        <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
                          Instructor
                        </Text>
                        <Text style={[type.caption, { color: native.label, fontWeight: "700" }]}>
                          {row.instructorPoints.toFixed(1)} / 20
                        </Text>
                      </View>
                      <ScoreProgressBar value={row.instructorPoints} max={20} color={FACULTY_PROJECTS_COLOR.instructorScore} />
                      {row.instructorVotes === 0 ? (
                        <Text style={[type.caption, { color: FACULTY_PROJECTS_COLOR.nudge, marginTop: 4 }]}>Rating needed</Text>
                      ) : null}
                    </View>
                  </View>
                }
              />
            )
          })}
        </View>
      )}

      <FacultyProjectLeaderboardDetailSheet
        visible={selectedScore != null}
        scope={scope}
        entry={selectedScore}
        onClose={() => setSelectedScore(null)}
      />
    </>
  )
}

export function FacultyProjectScoreProjectsPanel({
  scope,
  search,
  sessionFilter,
}: {
  scope: Scope
  search: string
  sessionFilter: string
}) {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const [projects, setProjects] = useState<InstructorProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState<InstructorProject | null>(null)
  const [scoreInput, setScoreInput] = useState("")
  const [comment, setComment] = useState("")
  const [currentPoints, setCurrentPoints] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const INSTRUCTOR_MAX_POINTS = 20
  const POINTS_PER_STAR = 4

  const load = useCallback(async () => {
    setError("")
    const session = sessionFilter === "all" ? undefined : sessionFilter
    const rows = await instructorApi.getProjects(scope, {
      session,
      status: "approved",
    })
    setProjects(rows)
  }, [scope, sessionFilter])

  useEffect(() => {
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load projects."))
      .finally(() => setLoading(false))
  }, [load])

  const filtered = useMemo(
    () =>
      projects.filter((project) =>
        matchesProjectSearch(
          [project.title, project.group?.name, project.leader?.full_name, project.group?.session],
          search,
        ),
      ),
    [projects, search],
  )

  async function openProject(project: InstructorProject) {
    setSelected(project)
    setScoreInput("")
    setComment("")
    setCurrentPoints(null)
    try {
      const data = await instructorApi.getProjectInstructorStarVote(scope, project.id)
      if (data.userVote) {
        const points = data.userVote.rating * POINTS_PER_STAR
        setScoreInput(points.toFixed(1))
        setCurrentPoints(points)
        setComment(data.userVote.comment ?? "")
      }
    } catch {
      /* fresh score */
    }
  }

  async function submitScore() {
    if (!selected) return
    const score = parseFloat(scoreInput)
    if (Number.isNaN(score) || score < 0 || score > INSTRUCTOR_MAX_POINTS) {
      AppAlert.alert("Invalid score", `Enter a score between 0 and ${INSTRUCTOR_MAX_POINTS}.`)
      return
    }
    const rating = score / POINTS_PER_STAR
    setSaving(true)
    try {
      await instructorApi.submitProjectStarVote(scope, {
        projectId: selected.id,
        rating,
        comment: comment.trim() || null,
      })
      setSelected(null)
      await load()
    } catch (err) {
      AppAlert.alert("Submit failed", err instanceof ApiError ? err.message : "Could not submit score.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <ActivityIndicator color={FACULTY_PROJECTS_COLOR.link} style={localStyles.loader} />

  return (
    <>
      {error ? (
        <View style={moduleStyles.errorBox}>
          <Text style={moduleStyles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18, marginBottom: 4 }]}>
        Rate approved projects (0–20 pts). Your score contributes up to 20 points toward the 50-point total.
      </Text>

      {filtered.length === 0 ? (
        <FacultyEmptyState
          icon="star-outline"
          title="No approved projects"
          body="Approved team projects appear here for instructor scoring."
        />
      ) : (
        <View style={localStyles.list}>
          {filtered.map((project) => (
            <FacultySignatureListCard
              key={project.id}
              thumb={facultyProjectPanelThumbFor("score", String(project.id))}
              icon="star-outline"
              title={project.title}
              description={`${project.group?.name ?? "Group"} · ${project.leader?.full_name ?? "Leader"}`}
              metaLine={project.group?.session ?? ""}
              status={facultyProjectStatusMeta(project.status, String(project.id))}
              onPress={() => void openProject(project)}
            />
          ))}
        </View>
      )}

      <Modal visible={selected != null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        <FacultySheetContainer>
          <FacultySheetChrome
            topInset={insets.top}
            title="Score project"
            onClose={() => !saving && setSelected(null)}
          />
          {selected ? (
            <ScrollView contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}>
              <FacultySheetSection label={selected.title} tone={SHEET_PROJECT.score}>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>
                  {selected.group?.name} · {selected.leader?.full_name}
                </Text>
                {currentPoints != null ? (
                  <Text style={[type.caption, { color: FACULTY_PROJECTS_COLOR.instructorScore, fontWeight: "700", marginTop: 4 }]}>
                    Current score: {currentPoints.toFixed(1)} / {INSTRUCTOR_MAX_POINTS} pts
                  </Text>
                ) : null}
              </FacultySheetSection>
              <FacultySheetField label={`Instructor score (0–${INSTRUCTOR_MAX_POINTS})`}>
                <FacultySheetTextInput
                  value={scoreInput}
                  onChangeText={setScoreInput}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 18"
                />
              </FacultySheetField>
              <FacultySheetField label="Comment (optional)">
                <FacultySheetTextInput
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  placeholder="Feedback for the team…"
                  style={localStyles.notesInput}
                />
              </FacultySheetField>
              <FacultySheetSubmitButton
                label="Submit score"
                onPress={() => void submitScore()}
                disabled={saving}
                loading={saving}
              />
            </ScrollView>
          ) : null}
        </FacultySheetContainer>
      </Modal>
    </>
  )
}

function buildStudentGrades(
  groups: InstructorGroup[],
  projects: InstructorProject[],
  voteTotals: Record<string, { totalScore?: number; studentPoints?: number; instructorPoints?: number }>,
  overrides: Array<{ project_id: number; student_id: number; score_0_50: number }>,
): ProjectStudentGradeRow[] {
  const overrideMap = new Map<string, number>()
  for (const row of overrides) {
    overrideMap.set(`${row.project_id}-${row.student_id}`, Number(row.score_0_50))
  }

  const out: ProjectStudentGradeRow[] = []
  for (const group of groups) {
    const project = projects.find((p) => p.group?.id === group.id)
    if (!project || project.status !== "approved") continue
    const totals = voteTotals[String(project.id)]
    const groupScore = Number(totals?.totalScore) || 0
    const members = group.members ?? []
    for (const member of members) {
      const overrideScore = overrideMap.get(`${project.id}-${member.id}`) ?? null
      const effectiveScore = overrideScore ?? groupScore
      out.push({
        studentId: member.id,
        projectId: project.id,
        studentNumber: member.student_id,
        fullName: member.full_name,
        groupName: group.name,
        projectTitle: project.title,
        session: group.session,
        groupScore,
        effectiveScore,
        overrideScore,
        studentPoints: Number(totals?.studentPoints) || 0,
        instructorPoints: Number(totals?.instructorPoints) || 0,
      })
    }
  }
  return out.sort((a, b) => a.fullName.localeCompare(b.fullName))
}

export function FacultyProjectStudentGradesPanel({
  scope,
  search,
  sessionFilter,
}: {
  scope: Scope
  search: string
  sessionFilter: string
}) {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const [grades, setGrades] = useState<ProjectStudentGradeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState<ProjectStudentGradeRow | null>(null)
  const [scoreDraft, setScoreDraft] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setError("")
    const session = sessionFilter === "all" ? undefined : sessionFilter
    const [groups, projects, voteTotals, overrides] = await Promise.all([
      instructorApi.getGroups(scope, session ? { session } : undefined),
      instructorApi.getProjects(scope, session ? { session } : undefined),
      instructorApi.getProjectVoteTotals(scope),
      instructorApi.getProjectMemberScoreOverrides(scope, session),
    ])
    setGrades(buildStudentGrades(groups, projects, voteTotals, overrides))
  }, [scope, sessionFilter])

  useEffect(() => {
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load grades."))
      .finally(() => setLoading(false))
  }, [load])

  const filtered = useMemo(
    () =>
      grades.filter((row) =>
        matchesProjectSearch(
          [row.fullName, row.studentNumber, row.groupName, row.projectTitle, row.session],
          search,
        ),
      ),
    [grades, search],
  )

  function openRow(row: ProjectStudentGradeRow) {
    setSelected(row)
    setScoreDraft(String(row.overrideScore ?? row.groupScore))
  }

  async function saveScore(clearOverride = false) {
    if (!selected) return
    setSaving(true)
    try {
      await instructorApi.saveProjectMemberScore(scope, {
        projectId: selected.projectId,
        studentId: selected.studentId,
        session: selected.session,
        score0To50: clearOverride ? null : parseFloat(scoreDraft),
      })
      setSelected(null)
      await load()
    } catch (err) {
      AppAlert.alert("Save failed", err instanceof ApiError ? err.message : "Could not save score.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <ActivityIndicator color={FACULTY_PROJECTS_COLOR.link} style={localStyles.loader} />

  return (
    <>
      {error ? (
        <View style={moduleStyles.errorBox}>
          <Text style={moduleStyles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18, marginBottom: 4 }]}>
        Per-student project scores (0–50). Overrides replace the group total for gradebook export.
      </Text>

      {filtered.length === 0 ? (
        <FacultyEmptyState
          icon="people-outline"
          title="No student grades"
          body="Grades appear after groups have approved projects and scoring begins."
        />
      ) : (
        <View style={localStyles.list}>
          {filtered.map((row) => (
            <FacultySignatureListCard
              key={`${row.projectId}-${row.studentId}`}
              thumb={facultyProjectPanelThumbFor("grade", `${row.projectId}-${row.studentId}`)}
              icon="person-outline"
              title={row.fullName}
              description={`${row.projectTitle} · ${row.groupName}`}
              metaLine={`${row.studentNumber} · ${row.session}`}
              accentLine={{
                text: `${row.effectiveScore.toFixed(1)} / 50 pts${row.overrideScore != null ? " · override" : ` · group ${row.groupScore.toFixed(1)}`}`,
                color: FACULTY_PROJECTS_COLOR.grade,
              }}
              trailing={
                <FacultyStatusPill
                  label={letterGradeFromScore(row.effectiveScore)}
                  tone={row.overrideScore != null ? "warning" : "live"}
                />
              }
              onPress={() => openRow(row)}
            />
          ))}
        </View>
      )}

      <Modal visible={selected != null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        <FacultySheetContainer>
          <FacultySheetChrome topInset={insets.top} title="Edit score" onClose={() => !saving && setSelected(null)} />
          {selected ? (
            <ScrollView contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}>
              <FacultySheetSection label={selected.fullName} tone={SHEET_PROJECT.grade}>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>
                  {selected.projectTitle} · {selected.groupName}
                </Text>
                <Text style={[type.caption, { color: native.tertiaryLabel, marginTop: 4 }]}>
                  Group total {selected.groupScore.toFixed(1)} · Student {selected.studentPoints.toFixed(1)} · Faculty{" "}
                  {selected.instructorPoints.toFixed(1)}
                </Text>
              </FacultySheetSection>
              <FacultySheetField label="Score (0–50)">
                <FacultySheetTextInput value={scoreDraft} onChangeText={setScoreDraft} keyboardType="decimal-pad" />
              </FacultySheetField>
              <View style={localStyles.actionRow}>
                {selected.overrideScore != null ? (
                  <Pressable
                    style={[localStyles.actionBtn, { borderColor: tokens.border }]}
                    disabled={saving}
                    onPress={() => void saveScore(true)}
                  >
                    <Text style={[type.caption, { color: native.label, fontWeight: "700" }]}>Use group total</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={[localStyles.actionBtn, { backgroundColor: FACULTY_PROJECTS_COLOR.action, flex: 1 }]}
                  disabled={saving}
                  onPress={() => void saveScore(false)}
                >
                  {saving ? (
                    <ActivityIndicator color={FACULTY_PROJECTS_COLOR.actionInk} />
                  ) : (
                    <Text style={[type.caption, { color: FACULTY_PROJECTS_COLOR.actionInk, fontWeight: "700" }]}>
                      Save score
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          ) : null}
        </FacultySheetContainer>
      </Modal>
    </>
  )
}

const localStyles = StyleSheet.create({
  list: { gap: 12 },
  loader: { marginVertical: 32 },
  notesInput: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: NATIVE.sectionRadius,
    paddingVertical: 12,
  },
  deleteLink: { alignItems: "center", marginTop: 16 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: NATIVE.sectionRadius,
    paddingVertical: 12,
    marginBottom: 8,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  fieldInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "600",
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  timeInputFlex: { flex: 1 },
  scoreBreakdown: { gap: 12, paddingHorizontal: 12, paddingBottom: 12 },
  scoreColumn: { gap: 4 },
  scoreRowHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
})
