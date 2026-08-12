import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import {
  instructorApi,
  type ProjectLeaderboardEntry,
  type ProjectVoteScoreBreakdown} from "../../lib/instructor-api"
import { FACULTY_SHEET_COLOR } from "../../lib/faculty-sheet-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetContainer,
  FacultySheetChrome,
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetSection,
  useCollabSheetStyles,
  FacultySheetStatChip,
  FacultySheetStatRow
} from "./faculty-collab-sheet-ui"
import { FACULTY_PROJECTS_COLOR } from "../../lib/faculty-projects-theme"
import { SHEET_METRIC, SHEET_PROJECT } from "./faculty-sheet-semantics"

type Scope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  scope: Scope | null
  entry: ProjectLeaderboardEntry | null
  onClose: () => void
}

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const native = useThemedNative()
  const type = useNativeType()
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700" }]}>{label}</Text>
        <Text style={[type.caption, { color: native.label, fontWeight: "600" }]}>
          {formatScore(value)}/{max}
        </Text>
      </View>
      <View style={{ height: 8, borderRadius: 999, backgroundColor: native.separator, overflow: "hidden" }}>
        <View style={{ height: "100%", borderRadius: 999, width: `${pct}%`, backgroundColor: color }} />
      </View>
    </View>
  )
}

function RatingDistribution({
  distribution,
  voterType}: {
  distribution: ProjectVoteScoreBreakdown["ratingDistribution"]
  voterType: "student" | "instructor"
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const rows = useMemo(() => {
    const counts = [5, 4, 3, 2, 1].map((rating) => {
      const match = distribution.find((d) => d.rating === rating && d.voterType === voterType)
      return { rating, count: match?.count ?? 0 }
    })
    const max = Math.max(1, ...counts.map((r) => r.count))
    return counts.map((row) => ({ ...row, pct: (row.count / max) * 100 }))
  }, [distribution, voterType])

  const total = rows.reduce((sum, r) => sum + r.count, 0)
  if (total === 0) {
    return (
      <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
        No {voterType} ratings yet
      </Text>
    )
  }

  return (
    <View style={{ gap: 6 }}>
      {rows.map((row) => (
        <View key={row.rating} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 54, flexDirection: "row", flexWrap: "wrap", gap: 1 }}>
            {Array.from({ length: row.rating }).map((_, i) => (
              <Ionicons key={i} name="star" size={10} color={FACULTY_PROJECTS_COLOR.scoreStar} />
            ))}
          </View>
          <View style={{ flex: 1, height: 8, borderRadius: 999, backgroundColor: native.separator, overflow: "hidden" }}>
            <View
              style={{
                height: "100%",
                borderRadius: 999,
                width: `${row.pct}%`,
                backgroundColor: voterType === "student" ? FACULTY_PROJECTS_COLOR.studentScore : FACULTY_PROJECTS_COLOR.instructorScore,
              }}
            />
          </View>
          <Text style={[type.caption, { width: 24, fontWeight: "700", color: native.label, textAlign: "right" }]}>
            {row.count}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function FacultyProjectLeaderboardDetailSheet({ visible, scope, entry, onClose }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [breakdown, setBreakdown] = useState<ProjectVoteScoreBreakdown | null>(null)
  const [members, setMembers] = useState<Array<{ id: number; full_name: string; student_id?: string }>>([])

  const load = useCallback(async () => {
    if (!scope || !entry) return
    const [voteData, detail] = await Promise.all([
      instructorApi.getProjectVoteBreakdown(scope, entry.id),
      instructorApi.getProjectDetail(scope, entry.id).catch(() => null),
    ])
    setBreakdown(voteData)
    const team = detail?.project?.members ?? []
    const leader = detail?.project?.leader
    if (leader && !team.some((m) => m.id === leader.id)) {
      setMembers([leader, ...team])
    } else {
      setMembers(team.length ? team : leader ? [leader] : [])
    }
  }, [entry, scope])

  useEffect(() => {
    if (!visible || !entry || !scope) {
      setBreakdown(null)
      setMembers([])
      setError("")
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load score breakdown."))
      .finally(() => setLoading(false))
  }, [visible, entry, scope, load])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not refresh.")
    } finally {
      setRefreshing(false)
    }
  }

  const score = breakdown?.score
  const totalScore = score?.totalScore ?? entry?.totalScore ?? entry?.engagementScore ?? 0
  const studentPts = score?.studentPoints ?? entry?.studentPoints ?? 0
  const instructorPts = score?.instructorPoints ?? entry?.instructorPoints ?? 0

  const rankLabel =
    entry?.rank === 1 ? "1st place" : entry?.rank === 2 ? "2nd place" : entry?.rank === 3 ? "3rd place" : `#${entry?.rank}`

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer style={{ paddingBottom: insets.bottom }}>
        <FacultySheetChrome topInset={insets.top} title="Score breakdown" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_SHEET_COLOR.link} />
          }
        >
          {entry ? (
            <>
              <FacultySheetHero
                title={entry.title}
                subtitle={`${entry.groupName} · ${entry.session}`}
                icon="trophy-outline"
                thumbColor={FACULTY_PROJECTS_COLOR.leaderboard}
                pills={
                  <>
                    <FacultyStatusPill label={rankLabel} tone={entry.rank <= 3 ? "success" : "neutral"} />
                    <FacultyStatusPill label={`${formatScore(totalScore)}/50 pts`} tone="live" />
                  </>
                }
              />

              <View style={collabSheetStyles.body}>
              <FacultySheetStatRow>
                <FacultySheetStatChip icon="podium-outline" label="Rank" value={String(entry.rank)} tone={SHEET_METRIC.primary} />
                <FacultySheetStatChip icon="star-outline" label="Score" value={`${formatScore(totalScore)}/50`} tone={SHEET_METRIC.pending} />
                <FacultySheetStatChip icon="people-outline" label="Votes" value={String(score?.studentVotes ?? 0)} tone={SHEET_METRIC.people} />
              </FacultySheetStatRow>

              {loading ? (
                <ActivityIndicator color={FACULTY_SHEET_COLOR.link} style={{ marginVertical: 24 }} />
              ) : null}
              {error ? (
                <Text
                  style={[
                    type.caption,
                    {
                      color: FACULTY_PROJECTS_COLOR.cancelled,
                      backgroundColor: tokens.isDark ? "rgba(220,38,38,0.12)" : "#fef2f2",
                      padding: 12,
                      borderRadius: 10,
                      marginBottom: 12,
                    },
                  ]}
                >
                  {error}
                </Text>
              ) : null}

              {!loading ? (
                <>
                  <FacultySheetSection label="Total score" hint="Out of 50 points" tone={SHEET_PROJECT.leaderboard}>
                    <View style={{ gap: 14 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "baseline",
                          justifyContent: "center",
                          gap: 4,
                          borderRadius: 14,
                          paddingVertical: 20,
                          backgroundColor: native.secondaryGrouped,
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: tokens.border,
                        }}
                      >
                        <Text style={{ fontSize: 42, fontWeight: "600", color: FACULTY_PROJECTS_COLOR.totalScore }}>
                          {formatScore(totalScore)}
                        </Text>
                        <Text style={[type.body, { fontWeight: "700", color: native.secondaryLabel }]}>/ 50</Text>
                      </View>
                      <View style={{ gap: 12 }}>
                        <ScoreBar label="Student votes" value={studentPts} max={25} color={FACULTY_PROJECTS_COLOR.studentScore} />
                        <ScoreBar label="Instructor ratings" value={instructorPts} max={25} color={FACULTY_PROJECTS_COLOR.instructorScore} />
                      </View>
                    </View>
                  </FacultySheetSection>

                  <FacultySheetSection label="Score components" hint="How points were earned" tone={SHEET_PROJECT.score}>
                    <FacultySheetGroupedList>
                      <FacultySheetMetricRow
                        icon="people-outline"
                        label="Student votes"
                        value={`${score?.studentVotes ?? 0} · ${formatScore(studentPts)} pts`}
                      />
                      <FacultySheetMetricRow
                        icon="star-half-outline"
                        label="Student avg rating"
                        value={
                          score?.studentAvgRating
                            ? `${score.studentAvgRating.toFixed(1)} ★ · 1 pt per vote`
                            : "—"
                        }
                      />
                      <FacultySheetMetricRow
                        icon="school-outline"
                        label="Instructor ratings"
                        value={`${score?.instructorVotes ?? 0} · ${formatScore(instructorPts)} pts`}
                      />
                      <FacultySheetMetricRow
                        icon="star-outline"
                        label="Instructor avg rating"
                        value={
                          score?.instructorAvgRating
                            ? `${score.instructorAvgRating.toFixed(1)} ★ · rating × 4 pts`
                            : "—"
                        }
                        isLast
                      />
                    </FacultySheetGroupedList>
                  </FacultySheetSection>

                  <FacultySheetSection label="Engagement" hint="Community activity" tone={SHEET_PROJECT.presentation}>
                    <FacultySheetGroupedList>
                      <FacultySheetMetricRow
                        icon="heart-outline"
                        label="Likes"
                        value={String(entry.likeCount ?? 0)}
                      />
                      <FacultySheetMetricRow
                        icon="chatbubble-outline"
                        label="Comments"
                        value={String(entry.commentCount ?? 0)}
                      />
                      <FacultySheetMetricRow
                        icon="hand-left-outline"
                        label="Total votes"
                        value={String(entry.voteCount ?? (score?.studentVotes ?? 0) + (score?.instructorVotes ?? 0))}
                        isLast
                      />
                    </FacultySheetGroupedList>
                  </FacultySheetSection>

                  {breakdown?.ratingDistribution?.length ? (
                    <FacultySheetSection label="Rating distribution" hint="Star votes by audience" tone={SHEET_PROJECT.instructorScore}>
                      <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600", marginBottom: 8 }]}>
                        Students
                      </Text>
                      <RatingDistribution
                        distribution={breakdown.ratingDistribution}
                        voterType="student"
                      />
                      <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600", marginTop: 14, marginBottom: 8 }]}>
                        Instructors
                      </Text>
                      <RatingDistribution
                        distribution={breakdown.ratingDistribution}
                        voterType="instructor"
                      />
                    </FacultySheetSection>
                  ) : null}

                  {members.length > 0 ? (
                    <FacultySheetSection label="Team members" hint={`Led by ${entry.leaderName}`} tone={SHEET_PROJECT.grade}>
                      <FacultySheetGroupedList>
                        {members.map((member, index) => (
                          <FacultySheetMetricRow
                            key={member.id}
                            icon={
                              member.full_name === entry.leaderName ? "ribbon-outline" : "person-outline"
                            }
                            label={member.full_name}
                            value={member.student_id ?? ""}
                            isLast={index === members.length - 1}
                          />
                        ))}
                      </FacultySheetGroupedList>
                    </FacultySheetSection>
                  ) : null}

                  {entry.summary ? (
                    <FacultySheetSection label="Project summary" tone={SHEET_PROJECT.config}>
                      <Text style={[type.body, { lineHeight: 21, color: native.secondaryLabel }]}>{entry.summary}</Text>
                    </FacultySheetSection>
                  ) : null}
                </>
              ) : null}
              </View>
            </>
          ) : null}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}