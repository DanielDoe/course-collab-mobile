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
import { formatFacultyRelativeTime, instructorApi, type InstructorStudent } from "../../lib/instructor-api"
import {
  buildStudentProfileSnapshot,
  type StudentProfileActivity,
  type StudentProfileSnapshot} from "../../lib/faculty-student-profile-utils"
import { studentInitials } from "../../lib/faculty-students-utils"
import { useModuleTheme } from "../../lib/themed-module-shell"
import {
  facultyStudentProfileEngagementPillTone,
  facultyStudentProfileHeroThumb,
  facultyStudentProfileMetricSolid,
  facultyStudentProfileTimelineSolid,
  PROFILE_KPI_SOLID,
  PROFILE_META_SOLID,
  PROFILE_TYPE_BAR_COLORS,
} from "../../lib/faculty-student-profile-theme"
import { FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetSection,
  FacultySheetStatChip,
  FacultySheetStatRow
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"

type Scope = { instructorId: number; courseId: number }

type Props = {
  student: InstructorStudent | null
  scope: Scope | null
  profileEyebrow?: string
  onClose: () => void
  onAwardPoints?: (student: InstructorStudent) => void
}

const SUMMARY_METRICS: Array<{
  icon: keyof typeof Ionicons.glyphMap
  label: string
  alert?: boolean
  value: (snapshot: StudentProfileSnapshot) => string
}> = [
  { icon: "pulse-outline", label: "Engagement", value: (s) => String(Math.round(s.engagementScore)) },
  { icon: "analytics-outline", label: "Avg score", value: (s) => (s.avgScore != null ? `${s.avgScore}%` : "—") },
  { icon: "layers-outline", label: "Submissions", value: (s) => String(s.assessmentCount) },
  { icon: "trophy-outline", label: "Class points", value: (s) => String(Math.round(s.classroomPoints)) },
  { icon: "flash-outline", label: "Attempts", value: (s) => String(s.platformAttempts) },
  { icon: "time-outline", label: "Office hours", value: (s) => String(s.officeHourCount) },
  { icon: "alert-circle-outline", label: "Open issues", alert: true, value: (s) => String(s.openIssues) },
  { icon: "document-text-outline", label: "Letters", value: (s) => String(s.recommendations) },
  { icon: "key-outline", label: "Resets", value: (s) => String(s.passwordResets) },
  { icon: "flag-outline", label: "Flagged", alert: true, value: (s) => String(s.flaggedCount) },
  { icon: "hourglass-outline", label: "In progress", value: (s) => String(s.inProgressCount) },
]

export function FacultyStudentDetailModal({ student, scope, profileEyebrow = "Student profile", onClose, onAwardPoints }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const { native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const [snapshot, setSnapshot] = useState<StudentProfileSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!scope || !student) return
    setError("")
    try {
      const [
        resultsResult,
        activityResult,
        summaryResult,
        pointsResult,
        officeHoursResult,
        issuesResult,
        recommendationsResult,
        passwordResetsResult,
      ] = await Promise.allSettled([
        instructorApi.getAssessmentResults(scope, { limit: 500 }),
        instructorApi.getRecentActivity(scope),
        instructorApi.getClassroomPointsSummary(scope),
        instructorApi.getClassroomPoints(scope, { limit: 200 }),
        instructorApi.getOfficeHours(scope),
        instructorApi.getIssues(scope, "open"),
        instructorApi.getRecommendations(scope),
        instructorApi.getPasswordResets(scope),
      ])

      const unwrap = <T,>(result: PromiseSettledResult<T>, fallback: T): T =>
        result.status === "fulfilled" ? result.value : fallback

      const results = unwrap(resultsResult, [])
      const activity = unwrap(activityResult, [])
      const summary = unwrap(summaryResult, [])
      const points = unwrap(pointsResult, [])
      const officeHours = unwrap(officeHoursResult, [])
      const issues = unwrap(issuesResult, [])
      const recommendations = unwrap(recommendationsResult, [])
      const passwordResets = unwrap(passwordResetsResult, [])

      const failed = [resultsResult, activityResult, summaryResult, pointsResult, officeHoursResult].some(
        (r) => r.status === "rejected",
      )
      if (failed) {
        setError("Some profile data could not be loaded.")
      }

      setSnapshot(
        buildStudentProfileSnapshot({
          student,
          results,
          activity,
          summary,
          points,
          officeHours,
          issues,
          recommendations,
          passwordResets}),
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load student profile.")
      setSnapshot(null)
    }
  }, [scope, student])

  useEffect(() => {
    if (!student) {
      setSnapshot(null)
      setError("")
      return
    }
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [student, load])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  if (!student) return null

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title={profileEyebrow} onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={tokens.accent} />
          }
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={student.full_name}
            subtitle={student.student_id}
            initials={studentInitials(student.full_name)}
            thumbColor={facultyStudentProfileHeroThumb(student.student_id ?? student.id).fill}
            pills={
              <>
                {student.section ? <FacultyStatusPill label={student.section} tone="live" /> : null}
                {snapshot ? (
                  <FacultyStatusPill
                    label={snapshot.engagementLabel}
                    tone={facultyStudentProfileEngagementPillTone(snapshot.engagementLabel)}
                  />
                ) : null}
              </>
            }
          />
          {snapshot ? (
            <Text style={[type.caption, { color: native.secondaryLabel, textAlign: "center", marginTop: -6, paddingHorizontal: 8, lineHeight: 18 }]}>
              {snapshot.engagementHint}
            </Text>
          ) : null}

          {snapshot ? (
            <FacultySheetStatRow>
              <FacultySheetStatChip
                icon="pulse-outline"
                label="Engagement"
                value={String(Math.round(snapshot.engagementScore))}
                solidAccent={PROFILE_KPI_SOLID.engagement}
              />
              <FacultySheetStatChip
                icon="analytics-outline"
                label="Avg score"
                value={snapshot.avgScore != null ? `${snapshot.avgScore}%` : "—"}
                solidAccent={PROFILE_KPI_SOLID.avgScore}
              />
              <FacultySheetStatChip
                icon="trophy-outline"
                label="Points"
                value={String(Math.round(snapshot.classroomPoints))}
                solidAccent={PROFILE_KPI_SOLID.points}
              />
            </FacultySheetStatRow>
          ) : null}

          {loading && !snapshot ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={tokens.accent} />
              <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>Loading profile…</Text>
            </View>
          ) : null}

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: `${tokens.danger}14`, borderColor: `${tokens.danger}33` }]}>
              <Text style={[type.caption, { color: tokens.danger, fontWeight: "600" }]}>{error}</Text>
            </View>
          ) : null}

          {snapshot ? (
            <>
              <FacultySheetSection label="Summary" tone={SHEET_SECTION.highlight}>
                <FacultySheetGroupedList>
                  {SUMMARY_METRICS.map((metric, index) => {
                    const metricValue = metric.value(snapshot)
                    const isAlert = Boolean(metric.alert && Number(metricValue) > 0)
                    return (
                      <FacultySheetMetricRow
                        key={metric.label}
                        icon={metric.icon}
                        label={metric.label}
                        value={metricValue}
                        solidAccent={isAlert ? undefined : facultyStudentProfileMetricSolid(metric.label)}
                        tone={isAlert ? "rose" : "slate"}
                        isLast={index === SUMMARY_METRICS.length - 1}
                      />
                    )
                  })}
                </FacultySheetGroupedList>
              </FacultySheetSection>

              <FacultySheetSection label="Platform footprint">
                {snapshot.typeBreakdown.length === 0 ? (
                  <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 20 }]}>No graded submissions yet.</Text>
                ) : (
                  snapshot.typeBreakdown.map((row, index) => (
                    <FootprintRow
                      key={row.label}
                      label={row.label}
                      count={row.count}
                      total={snapshot.assessmentCount}
                      barColor={PROFILE_TYPE_BAR_COLORS[index % PROFILE_TYPE_BAR_COLORS.length]}
                    />
                  ))
                )}
                <View style={styles.metaRow}>
                  <MetaChip
                    icon="time-outline"
                    label="Last active"
                    value={formatLastActive(snapshot.lastActiveAt)}
                    solidAccent={PROFILE_META_SOLID.lastActive}
                  />
                  <MetaChip
                    icon="calendar-outline"
                    label="Member since"
                    value={snapshot.memberSince}
                    solidAccent={PROFILE_META_SOLID.memberSince}
                  />
                </View>
              </FacultySheetSection>

              <FacultySheetSection label="Contact" tone={SHEET_SECTION.roster}>
                <FacultySheetGroupedList>
                  <InfoRow label="Email" value={student.email ?? "Not on file"} />
                  <InfoRow label="Section" value={student.section ?? student.session_code ?? "—"} isLast={!student.session_description} />
                  {student.session_description ? (
                    <InfoRow label="Session" value={student.session_description} isLast />
                  ) : null}
                </FacultySheetGroupedList>
                {student.email ? (
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: native.fill, borderColor: native.separator }]}
                    onPress={() => void Linking.openURL(`mailto:${student.email}`)}
                  >
                    <Ionicons name="mail-outline" size={18} color={tokens.accent} />
                    <Text style={[type.bodyEmphasis, { color: native.label, fontSize: 14 }]}>Email student</Text>
                  </Pressable>
                ) : null}
                {onAwardPoints ? (
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: tokens.accent, borderColor: tokens.accent }]}
                    onPress={() => onAwardPoints(student)}
                  >
                    <Ionicons name="trophy-outline" size={18} color="#ffffff" />
                    <Text style={[type.bodyEmphasis, { color: "#ffffff", fontSize: 14 }]}>Award classroom points</Text>
                  </Pressable>
                ) : null}
              </FacultySheetSection>

              <FacultySheetSection label="Recent activity">
                {snapshot.timeline.length === 0 ? (
                  <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 20 }]}>
                    No platform interactions recorded yet.
                  </Text>
                ) : (
                  snapshot.timeline.map((item, index) => (
                    <TimelineRow key={item.id} item={item} isLast={index === snapshot.timeline.length - 1} />
                  ))
                )}
              </FacultySheetSection>
            </>
          ) : null}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

function InfoRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  const { native, type } = useModuleTheme()
  return (
    <View
      style={[
        styles.infoRow,
        { backgroundColor: native.secondaryGrouped },
        !isLast && { borderBottomColor: native.separator, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <Text style={[type.body, { color: native.secondaryLabel, fontWeight: "600" }]}>{label}</Text>
      <Text style={[type.bodyEmphasis, { flex: 1, textAlign: "right", color: native.label }]}>{value}</Text>
    </View>
  )
}

function FootprintRow({
  label,
  count,
  total,
  barColor,
}: {
  label: string
  count: number
  total: number
  barColor: string
}) {
  const { native, type } = useModuleTheme()
  const pct = total > 0 ? Math.max(8, (count / total) * 100) : 8
  return (
    <View style={styles.footprintRow}>
      <View style={styles.footprintHead}>
        <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>{label}</Text>
        <Text style={[type.caption, { color: native.label, fontWeight: "600" }]}>{count}</Text>
      </View>
      <View style={[styles.footprintTrack, { backgroundColor: native.fill }]}>
        <View style={[styles.footprintFill, { width: `${pct}%` as `${number}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  )
}

function MetaChip({
  icon,
  label,
  value,
  solidAccent,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  solidAccent: { fill: string; icon: string }
}) {
  const { native, type } = useModuleTheme()
  return (
    <View style={[styles.metaChip, { backgroundColor: native.fill, borderColor: native.separator }]}>
      <View style={[styles.metaIconTile, { backgroundColor: solidAccent.fill }]}>
        <Ionicons name={icon} size={14} color={solidAccent.icon} />
      </View>
      <View style={styles.metaChipCopy}>
        <Text style={[type.caption, { color: native.tertiaryLabel, fontWeight: "700", fontSize: 10 }]}>{label}</Text>
        <Text style={[type.caption, { color: native.label, fontWeight: "700" }]} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  )
}

function TimelineRow({ item, isLast }: { item: StudentProfileActivity; isLast: boolean }) {
  const { native, type } = useModuleTheme()
  const solid = facultyStudentProfileTimelineSolid(item.tone)
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineDot, { backgroundColor: solid.fill, borderColor: solid.fill }]}>
          <Ionicons name={item.icon} size={12} color={solid.icon} />
        </View>
        {!isLast ? <View style={[styles.timelineLine, { backgroundColor: native.separator }]} /> : null}
      </View>
      <View
        style={[
          styles.timelineCard,
          { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
          isLast && styles.timelineCardLast,
        ]}
      >
        <Text style={[type.bodyEmphasis, { color: native.label, fontSize: 14 }]}>{item.title}</Text>
        <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]} numberOfLines={2}>
          {item.subtitle}
        </Text>
        {item.at ? (
          <Text style={[type.caption, { color: native.tertiaryLabel, fontWeight: "600" }]}>
            {formatFacultyRelativeTime(item.at)}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

function formatLastActive(value: string | null): string {
  if (!value) return "No recent activity"
  return formatFacultyRelativeTime(value)
}

const styles = StyleSheet.create({
  loadingBox: { paddingVertical: 32, alignItems: "center", gap: 10 },
  errorBox: { borderRadius: 12, padding: 12, borderWidth: StyleSheet.hairlineWidth },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  footprintRow: { gap: 6 },
  footprintHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footprintTrack: { height: 6, borderRadius: 999, overflow: "hidden" },
  footprintFill: { height: "100%", borderRadius: 999 },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  metaChip: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    borderRadius: 12,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaIconTile: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  metaChipCopy: { flex: 1, gap: 2 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  timelineRow: { flexDirection: "row", gap: 10 },
  timelineRail: { width: 28, alignItems: "center" },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  timelineLine: { flex: 1, width: 2, marginTop: 4, minHeight: 24 },
  timelineCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    gap: 4,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  timelineCardLast: { marginBottom: 0 },
})