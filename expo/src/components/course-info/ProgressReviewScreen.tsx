import { useCallback, useEffect, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { ModuleScreen } from "../modules/ModuleScreen"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import {
  courseInfoApi,
  formatListDate,
  periodBadgeLabel,
  type ProgressReview,
  type ProgressReviewGradebook,
} from "../../lib/course-info-api"
import {
  COURSE_INFO_PROGRESS_REVIEW_SECTIONS,
  courseInfoProgressReviewAccent,
  courseInfoProgressTrack,
} from "../../lib/course-info-color-theme"
import { InfoBulletList, InfoHero, InfoSectionCard, useCourseInfoTheme } from "./course-info-shared"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function CategoryProgressBar({ pct, label }: { pct: number; label: string }) {
  const tokens = useAppThemeTokens()
  const fill = courseInfoProgressReviewAccent(label)
  const clamped = Math.min(100, Math.max(0, pct))
  return (
    <View style={[styles.progressTrack, { backgroundColor: courseInfoProgressTrack(fill, tokens.isDark) }]}>
      <View style={[styles.progressFill, { width: `${clamped}%` as `${number}%`, backgroundColor: fill }]} />
    </View>
  )
}

function GradeStatGrid({ gb }: { gb: ProgressReviewGradebook }) {
  const native = useThemedNative()
  const type = useNativeType()
  const tokens = useAppThemeTokens()
  const items = [
    { label: "Quiz", value: gb.quizScore, status: gb.categoryStatus?.quiz },
    { label: "Homework", value: gb.homeworkScore, status: gb.categoryStatus?.homework },
    { label: "Midterm", value: gb.midtermScore, status: gb.categoryStatus?.midterm },
    { label: "Attendance", value: gb.attendanceScore, status: gb.categoryStatus?.attendance },
    { label: "Classroom", value: gb.classroomScore, status: gb.categoryStatus?.classroom },
    { label: "Overall", value: gb.totalScore, status: "scored" as const },
  ]

  return (
    <View style={styles.statWrap}>
      {items.map((item) => {
        const pending = item.status === "pending"
        const display =
          item.label === "Overall"
            ? `${Number(item.value ?? 0).toFixed(1)}%`
            : pending
              ? "Pending"
              : `${Number(item.value ?? 0).toFixed(1)}%`
        return (
          <View
            key={item.label}
            style={[styles.statCell, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}
          >
            <Text style={[type.caption, styles.statLabel]}>{item.label}</Text>
            <Text style={[type.bodyEmphasis, styles.statValue, pending && { color: tokens.textMuted }]}>
              {display}
            </Text>
            {!pending && item.label !== "Overall" ? (
              <CategoryProgressBar pct={Math.min(100, Number(item.value ?? 0))} label={item.label} />
            ) : null}
          </View>
        )
      })}
    </View>
  )
}

export function ProgressReviewScreen() {
  const session = useStudentSession()
  const theme = useCourseInfoTheme()
  const native = useThemedNative()
  const type = useNativeType()
  const tokens = useAppThemeTokens()
  const [review, setReview] = useState<ProgressReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const data = await courseInfoApi.getProgressReview(session)
      setReview(data.review)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No progress review available.")
    }
  }, [session])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useNotificationModuleRefresh("progress-review", onRefresh)

  const sections = review?.sections
  const gb = review?.progressData?.gradebook
  const courseCode = review?.progressData?.courseCode

  if (!loading && !review?.sections) {
    return (
      <ModuleScreen
        empty
        emptyTitle="No progress review yet"
        emptyBody="Your instructor will publish a personalized progress review here when it is ready."
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <></>
      </ModuleScreen>
    )
  }

  return (
    <ModuleScreen
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <InfoHero
        badge={periodBadgeLabel(review?.reviewPeriod ?? "midterm", review?.asOfDate)}
        title="Your Progress So Far"
        subtitle={courseCode ?? undefined}
        stat={gb ? `${gb.totalScore.toFixed(1)}%` : undefined}
        statLabel={gb?.gradeIsProvisional ? "In progress" : gb?.letterGrade ?? "Overall"}
        theme={theme}
      />

      {gb?.gradeIsProvisional && (gb.pendingCategories?.length ?? 0) > 0 ? (
        <Text style={[type.caption, styles.provisionalNote]}>
          Overall reflects graded work only. Still pending: {gb.pendingCategories?.join(", ")}.
        </Text>
      ) : null}

      {sections?.overallSummary ? (
        <Text style={[type.secondary, styles.summary]}>{sections.overallSummary}</Text>
      ) : null}

      {gb ? <GradeStatGrid gb={gb} /> : null}

      {sections ? (
        <>
          <InfoSectionCard
            title="What You're Doing Well"
            icon="sparkles-outline"
            iconThumb={COURSE_INFO_PROGRESS_REVIEW_SECTIONS.strengths}
          >
            <InfoBulletList items={sections.strengths ?? []} />
          </InfoSectionCard>
          <InfoSectionCard
            title="Where to Focus Next"
            icon="locate-outline"
            iconThumb={COURSE_INFO_PROGRESS_REVIEW_SECTIONS.focus}
          >
            <InfoBulletList items={sections.areasToImprove ?? []} />
          </InfoSectionCard>
          <InfoSectionCard
            title="Assessments & Feedback"
            icon="book-outline"
            iconThumb={COURSE_INFO_PROGRESS_REVIEW_SECTIONS.assessments}
          >
            <Text style={[type.secondary, styles.body]}>{sections.assessmentFeedback}</Text>
          </InfoSectionCard>
          <InfoSectionCard
            title="Practice Hub & Lecture Practice"
            icon="trending-up-outline"
            iconThumb={COURSE_INFO_PROGRESS_REVIEW_SECTIONS.practice}
          >
            <Text style={[type.secondary, styles.body]}>{sections.practiceFeedback}</Text>
          </InfoSectionCard>
          <InfoSectionCard
            title="Attendance"
            icon="calendar-outline"
            iconThumb={COURSE_INFO_PROGRESS_REVIEW_SECTIONS.attendance}
          >
            <Text style={[type.secondary, styles.body]}>{sections.attendanceFeedback}</Text>
          </InfoSectionCard>
          <InfoSectionCard
            title="Classroom Participation"
            icon="trophy-outline"
            iconThumb={COURSE_INFO_PROGRESS_REVIEW_SECTIONS.classroom}
          >
            <Text style={[type.secondary, styles.body]}>{sections.classroomFeedback}</Text>
          </InfoSectionCard>
          <InfoSectionCard
            title="Your Action Plan"
            icon="list-outline"
            iconThumb={COURSE_INFO_PROGRESS_REVIEW_SECTIONS.actionPlan}
          >
            <InfoBulletList items={sections.actionPlan ?? []} />
          </InfoSectionCard>
          <View style={[styles.encourage, { backgroundColor: `${tokens.success}14`, borderColor: `${tokens.success}40` }]}>
            <Text style={[type.caption, styles.encourageLabel, { color: tokens.success }]}>Encouragement</Text>
            <Text style={[type.secondary, styles.body]}>{sections.encouragement}</Text>
          </View>
        </>
      ) : null}

      {review?.createdAt ? (
        <Text style={[type.caption, styles.footer]}>
          Review published {formatListDate(String(review.createdAt)) ?? ""}
        </Text>
      ) : null}
    </ModuleScreen>
  )
}

const styles = StyleSheet.create({
  summary: { lineHeight: 22 },
  provisionalNote: { lineHeight: 18 },
  statWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCell: {
    width: "31%",
    minWidth: 100,
    flexGrow: 1,
    borderRadius: 12,
    padding: 10,
    gap: 4,
    borderWidth: 1,
  },
  statLabel: { fontWeight: "600" },
  statValue: { fontSize: 16 },
  progressTrack: { height: 4, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 999 },
  body: { lineHeight: 21 },
  encourage: {
    borderRadius: 16,
    padding: 16,
    gap: 6,
    borderWidth: 1,
  },
  encourageLabel: {
    fontWeight: "600",
  },
  footer: { textAlign: "center", marginTop: 4 },
})
