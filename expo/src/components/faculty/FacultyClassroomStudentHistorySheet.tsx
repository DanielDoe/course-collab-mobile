import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import {
  formatFacultyRelativeTime,
  instructorApi,
  type ClassroomPointRow,
  type ClassroomPointsSummaryRow,
} from "../../lib/instructor-api"
import {
  classroomPointTitle,
  formatClassroomPoints,
} from "../../lib/faculty-classroom-points-utils"
import { categoryLabel } from "../../lib/rewards-api"
import {
  FACULTY_CLASSROOM_POINTS_COLOR,
  facultyClassroomAwardThumb,
  facultyClassroomSubmissionThumb,
} from "../../lib/faculty-classroom-points-theme"
import { FacultyEmptyState, FacultyStatusPill } from "./faculty-shared"
import { FacultySignatureListCard } from "./FacultyCollabListCards"
import {
  FacultySheetChrome,
  FacultySheetHero,
  FacultySheetModal,
  FacultySheetSection,
  FacultySheetStatChip,
  FacultySheetStatRow,
  useCollabSheetStyles,
} from "./faculty-collab-sheet-ui"
import { SHEET_CLASSROOM_POINTS } from "./faculty-sheet-semantics"

type Scope = { instructorId: number; courseId: number }

type Props = {
  student: ClassroomPointsSummaryRow | null
  scope: Scope | null
  onClose: () => void
  onSelectPoint: (point: ClassroomPointRow, variant: "review" | "award") => void
}

function historyStatus(point: ClassroomPointRow): {
  label: string
  color: string
  icon: "checkmark-circle-outline" | "time-outline" | "close-circle-outline" | "ellipse"
} {
  const status = String(point.status ?? "approved").toLowerCase()
  if (status === "pending") {
    return { label: "Pending", color: FACULTY_CLASSROOM_POINTS_COLOR.pending, icon: "time-outline" }
  }
  if (status === "rejected") {
    return { label: "Rejected", color: FACULTY_CLASSROOM_POINTS_COLOR.rejected, icon: "close-circle-outline" }
  }
  return { label: "Approved", color: FACULTY_CLASSROOM_POINTS_COLOR.approved, icon: "checkmark-circle-outline" }
}

export function FacultyClassroomStudentHistorySheet({ student, scope, onClose, onSelectPoint }: Props) {
  const insets = useSafeAreaInsets()
  const collabSheetStyles = useCollabSheetStyles()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [awards, setAwards] = useState<ClassroomPointRow[]>([])
  const [pending, setPending] = useState<ClassroomPointRow[]>([])

  const load = useCallback(async () => {
    if (!scope || !student) return
    setError("")
    setAwards([])
    setPending([])
    setLoading(true)
    try {
      const session = student.session?.trim() || undefined
      const [approvedRows, pendingRows] = await Promise.all([
        instructorApi.getClassroomPoints(scope, {
          status: "approved",
          studentId: student.student_id,
          session,
          limit: 200,
        }),
        instructorApi.getClassroomPoints(scope, {
          status: "pending",
          studentId: student.student_id,
          session,
          limit: 80,
        }),
      ])
      setAwards(approvedRows)
      setPending(pendingRows)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this student's point history.")
      setAwards([])
      setPending([])
    } finally {
      setLoading(false)
    }
  }, [scope, student])

  useEffect(() => {
    if (!student || !scope) {
      setAwards([])
      setPending([])
      setError("")
      return
    }
    void load()
  }, [student, scope, load])

  const history = useMemo(() => {
    return [...awards].sort((a, b) => {
      const aAt = Date.parse(a.awarded_at ?? a.created_at)
      const bAt = Date.parse(b.awarded_at ?? b.created_at)
      return (Number.isFinite(bAt) ? bAt : 0) - (Number.isFinite(aAt) ? aAt : 0)
    })
  }, [awards])

  const lastAwarded = student?.last_awarded
    ? formatFacultyRelativeTime(student.last_awarded)
    : history[0]
      ? formatFacultyRelativeTime(history[0].awarded_at ?? history[0].created_at)
      : "—"

  function enrich(point: ClassroomPointRow): ClassroomPointRow {
    if (!student) return point
    return {
      ...point,
      student_name: point.student_name ?? student.full_name,
      student_number: point.student_number ?? student.student_number,
      session: point.session ?? student.session,
    }
  }

  return (
    <FacultySheetModal visible={Boolean(student)} onRequestClose={onClose} layout="glassBottom">
      <FacultySheetChrome topInset={insets.top} title="Point history" onClose={onClose} pageSheet />
      {student ? (
        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={student.full_name}
            subtitle={[student.student_number, student.session].filter(Boolean).join(" · ")}
            icon="person-outline"
            pills={
              <>
                {student.session ? <FacultyStatusPill label={student.session} tone="neutral" /> : null}
                <FacultyStatusPill
                  label={`${student.award_count} award${student.award_count === 1 ? "" : "s"}`}
                  tone="neutral"
                />
              </>
            }
          />

          <FacultySheetStatRow>
            <FacultySheetStatChip
              label="Accumulated"
              value={`${formatClassroomPoints(student.total_points)} pts`}
              tone={SHEET_CLASSROOM_POINTS.award}
            />
            <FacultySheetStatChip
              label="Awards"
              value={String(student.award_count)}
              tone={SHEET_CLASSROOM_POINTS.leaderboard}
            />
            <FacultySheetStatChip
              label="Last awarded"
              value={lastAwarded}
              tone={SHEET_CLASSROOM_POINTS.review}
            />
          </FacultySheetStatRow>

          {pending.length > 0 ? (
            <FacultySheetSection
              label="Pending Review"
              hint="These submissions are not in the accumulated total yet."
              tone={SHEET_CLASSROOM_POINTS.review}
            >
              <View style={localStyles.list}>
                {pending.map((point) => {
                  const status = historyStatus(point)
                  return (
                    <FacultySignatureListCard
                      key={`pending-${point.id}`}
                      thumb={facultyClassroomSubmissionThumb(point.category, point.id)}
                      icon="time-outline"
                      title={classroomPointTitle(point)}
                      eyebrow={categoryLabel(point.category)}
                      metaLine={formatFacultyRelativeTime(point.created_at)}
                      accentLine={{
                        text: `+${formatClassroomPoints(point.points)}`,
                        color: FACULTY_CLASSROOM_POINTS_COLOR.pending,
                      }}
                      status={status}
                      onPress={() => onSelectPoint(enrich(point), "review")}
                    />
                  )
                })}
              </View>
            </FacultySheetSection>
          ) : null}

          <FacultySheetSection
            label="Award History"
            hint="Approved classroom points that count toward this student’s total."
            tone={SHEET_CLASSROOM_POINTS.award}
          >
            {loading ? (
              <ActivityIndicator color={FACULTY_CLASSROOM_POINTS_COLOR.link} style={localStyles.spinner} />
            ) : error ? (
              <FacultyEmptyState icon="alert-circle-outline" title="Couldn’t load history" body={error} />
            ) : history.length === 0 ? (
              <FacultyEmptyState
                icon="ribbon-outline"
                title="No awards yet"
                body="Approved classroom points for this student will show up here."
              />
            ) : (
              <View style={localStyles.list}>
                {history.map((point) => {
                  const status = historyStatus(point)
                  return (
                    <FacultySignatureListCard
                      key={`award-${point.id}`}
                      thumb={facultyClassroomAwardThumb(point.id)}
                      icon="ribbon-outline"
                      title={classroomPointTitle(point)}
                      eyebrow={
                        [categoryLabel(point.category), point.instructor_name ? `by ${point.instructor_name}` : null]
                          .filter(Boolean)
                          .join(" · ") || undefined
                      }
                      metaLine={formatFacultyRelativeTime(point.awarded_at ?? point.created_at)}
                      accentLine={{
                        text: `+${formatClassroomPoints(point.points)}`,
                        color: FACULTY_CLASSROOM_POINTS_COLOR.points,
                      }}
                      status={status}
                      onPress={() => onSelectPoint(enrich(point), "award")}
                    />
                  )
                })}
              </View>
            )}
          </FacultySheetSection>
        </ScrollView>
      ) : null}
    </FacultySheetModal>
  )
}

const localStyles = StyleSheet.create({
  list: { gap: 12 },
  spinner: { marginVertical: 20 },
})
