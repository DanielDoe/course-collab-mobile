import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../lib/api"
import { filterProgressReviews } from "../../lib/faculty-analytics-utils"
import {
  formatAsOfLabel,
  getReviewPeriodConfig,
  REVIEW_PERIOD_OPTIONS,
  todayIsoDate,
  type ProgressReviewPeriod,
} from "../../lib/progress-review-utils"
import { useSuppressModuleSearchDock } from "../../context/ModuleSearchDockContext"
import {
  instructorApi,
  type InstructorProgressReviewRow,
} from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { NATIVE } from "../../constants/faculty-native-theme"
import { FacultyEmptyState } from "./faculty-shared"
import {
  FacultyAnalyticsKpiTile,
  FacultyProgressReviewCard,
} from "./FacultyAnalyticsListCards"
import { FACULTY_PROGRESS_REVIEWS_COLOR } from "../../lib/faculty-progress-reviews-theme"
import { useFacultyStickyHeaderScrollLayout,
  FacultyModuleStickyHeader,
  FacultyModuleTabBar,
  FacultySearchToolbar} from "./faculty-module-shell"
import { FacultyProgressReviewDetailModal } from "./FacultyProgressReviewDetailModal"
import { FacultyProgressReviewRunSheet } from "./FacultyProgressReviewRunSheet"
import { FacultySummerCampDatePicker } from "./FacultySummerCampDatePicker"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FacultyListPagerFooter } from "./FacultyListPagerFooter"

export function FacultyProgressReviewsScreen() {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const { scope, ready } = useFacultyScope()

  const [period, setPeriod] = useState<ProgressReviewPeriod>("midterm")
  const [asOfDate, setAsOfDate] = useState(todayIsoDate())
  const [reviews, setReviews] = useState<InstructorProgressReviewRow[]>([])
  const [savedCount, setSavedCount] = useState(0)
  const [missingCount, setMissingCount] = useState(0)
  const [enrolledCount, setEnrolledCount] = useState(0)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [selectedReview, setSelectedReview] = useState<InstructorProgressReviewRow | null>(null)
  const [runSheetOpen, setRunSheetOpen] = useState(false)

  const periodCfg = getReviewPeriodConfig(period)

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    // Custom browse lists all custom + targeted reviews for the offering (no as-of date filter).
    // Snapshot date is only used when generating a dated batch from the run sheet.
    const res = await instructorApi.getProgressReviews(scope, {
      reviewPeriod: period,
    })
    const enrolled = res.enrolledStudentCount ?? res.studentCount ?? 0
    const list = res.reviews ?? []
    setReviews(list)
    setSavedCount(res.savedReviewCount ?? list.length)
    setMissingCount(res.missingReviewCount ?? 0)
    setEnrolledCount(enrolled)
  }, [scope, period])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load progress reviews."))
      .finally(() => setLoading(false))
  }, [ready, load])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not refresh.")
    } finally {
      setRefreshing(false)
    }
  }, [load])

  useNotificationModuleRefresh("progress-review", handleRefresh)

  useSuppressModuleSearchDock(runSheetOpen || selectedReview != null)

  const filtered = useMemo(() => filterProgressReviews(reviews, search), [reviews, search])
  const pager = useFacultyListPager(filtered, `${period}:${search}:${asOfDate}`, "reviews")

  if (!ready) {
    return (
      <View style={moduleStyles.center}>
        <FacultyEmptyState
          icon="sparkles-outline"
          title="Select a course"
          body="Progress reviews require an active course."
        />
      </View>
    )
  }

  return (
    <View style={moduleStyles.root}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar
          scrollable
          tabs={REVIEW_PERIOD_OPTIONS.map((opt) => ({
            id: opt.id,
            label: opt.shortLabel,
            icon:
              opt.id === "midterm"
                ? ("school-outline" as const)
                : opt.id === "final"
                  ? ("ribbon-outline" as const)
                  : ("calendar-outline" as const),
          }))}
          tab={period}
          onChange={(next) => {
            setPeriod(next)
            if (next === "custom" && !asOfDate.trim()) setAsOfDate(todayIsoDate())
          }}
        />
        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search students…"
          showFilter={false}
          trailingAction={{
            onPress: () => setRunSheetOpen(true),
            accessibilityLabel: "Generate progress reviews",
          }}
        />
      </FacultyModuleStickyHeader>

      <ScrollView
        style={moduleStyles.scroll}
        contentContainerStyle={[styles.content, listScrollPad]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_PROGRESS_REVIEWS_COLOR.link} />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryRow}>
          <FacultyAnalyticsKpiTile label="Saved" value={String(savedCount)} accentIndex={0} />
          <FacultyAnalyticsKpiTile label="Missing" value={String(missingCount)} accentIndex={1} />
          <FacultyAnalyticsKpiTile label="Enrolled" value={String(enrolledCount)} accentIndex={2} />
        </View>

        <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600", paddingHorizontal: 4 }]}>
          {periodCfg.description}
        </Text>

        {period === "custom" ? (
          <View style={styles.dateRow}>
            <Text style={[type.sectionHeader, { color: native.label }]}>Snapshot date</Text>
            <FacultySummerCampDatePicker
              value={asOfDate}
              onChange={setAsOfDate}
              accessibilityLabel="Snapshot date"
            />
            <Text style={[type.caption, { color: native.tertiaryLabel }]}>
              Used when generating a dated snapshot. Targeted practice and other custom reviews for
              this course appear below.
              {asOfDate.trim()
                ? ` Generate as of ${formatAsOfLabel(asOfDate) ?? asOfDate}.`
                : ""}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={moduleStyles.errorBox}>
            <Text style={moduleStyles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.generateBanner,
            {
              backgroundColor: `${FACULTY_PROGRESS_REVIEWS_COLOR.ai}14`,
              borderColor: `${FACULTY_PROGRESS_REVIEWS_COLOR.ai}33`,
            },
          ]}
          onPress={() => setRunSheetOpen(true)}
        >
          <View style={[styles.bannerIconTile, { backgroundColor: FACULTY_PROGRESS_REVIEWS_COLOR.ai }]}>
            <Ionicons name="sparkles-outline" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.generateCopy}>
            <Text style={[type.bodyEmphasis, { color: native.label }]}>Generate & send reviews</Text>
            <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
              AI reviews with email, announcement, and notification — same as web.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={FACULTY_PROGRESS_REVIEWS_COLOR.link} />
        </Pressable>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={FACULTY_PROGRESS_REVIEWS_COLOR.link} />
          </View>
        ) : filtered.length === 0 ? (
          <FacultyEmptyState
            icon="sparkles-outline"
            title={
              reviews.length === 0
                ? `No ${periodCfg.shortLabel.toLowerCase()} reviews yet`
                : "No matches"
            }
            body={
              reviews.length === 0
                ? period === "custom"
                  ? "Generate a dated snapshot, or open Cora Insights to send targeted practice — those reviews show here."
                  : "Generate reviews for this period, or switch to another review type."
                : "Try another search term."
            }
          />
        ) : (
          <View style={styles.list}>
            {pager.items.map((review) => (
              <FacultyProgressReviewCard key={review.id} review={review} onPress={() => setSelectedReview(review)} />
            ))}
            <FacultyListPagerFooter pager={pager} />
          </View>
        )}
      </ScrollView>

      <FacultyProgressReviewDetailModal
        visible={selectedReview != null}
        scope={scope}
        reviewRow={selectedReview}
        onClose={() => setSelectedReview(null)}
        onUpdated={() => void load()}
      />

      <FacultyProgressReviewRunSheet
        visible={runSheetOpen}
        scope={scope}
        period={period}
        asOfDate={asOfDate}
        missingCount={missingCount}
        onClose={() => setRunSheetOpen(false)}
        onComplete={() => void load()}
        onPeriodChange={setPeriod}
        onAsOfDateChange={setAsOfDate}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  content: { padding: NATIVE.pagePadding, gap: NATIVE.sectionGap / 2 },
  dateRow: { gap: 8 },
  summaryRow: { flexDirection: "row", gap: 10 },
  generateBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: NATIVE.sectionRadius,
    padding: 14,
    borderWidth: 1,
  },
  bannerIconTile: {
    width: 40,
    height: 40,
    borderRadius: NATIVE.iconTileRadius + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  generateCopy: { flex: 1, gap: 4 },
  loadingBox: { paddingVertical: 48, alignItems: "center" },
  list: { gap: 12 },
})
