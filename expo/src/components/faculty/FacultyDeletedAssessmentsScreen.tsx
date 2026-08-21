import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import {
  deletedAssessmentTypeLabel,
  gracePeriodRemaining,
} from "../../lib/faculty-question-bank-utils"
import type { AssessmentType } from "../../lib/faculty-assessment-utils"
import { formatFacultyRelativeTime, instructorApi, type InstructorDeletedAssessment } from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { semanticSoft } from "../../lib/themed-module-theme"
import { FacultyEmptyState, FacultyStatusPill } from "./faculty-shared"
import { useFacultyStickyHeaderScrollLayout, FacultyFilterSheet, FacultySearchToolbar } from "./faculty-module-shell"

const TYPE_OPTIONS = [
  { value: "ALL", label: "All types" },
  { value: "quiz", label: "Quizzes" },
  { value: "homework", label: "Homework" },
  { value: "mid_semester", label: "Mid-Semester" },
  { value: "final", label: "Finals" },
] as const

export function FacultyDeletedAssessmentsScreen({
  assessmentType,
  onCountsChange,
}: {
  assessmentType?: AssessmentType
  onCountsChange?: (count: number) => void
}) {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const { scope, ready } = useFacultyScope()

  const [items, setItems] = useState<InstructorDeletedAssessment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actingId, setActingId] = useState<number | null>(null)
  const [error, setError] = useState("")

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>(assessmentType ?? "ALL")
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  useEffect(() => {
    setTypeFilter(assessmentType ?? "ALL")
  }, [assessmentType])

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    const type = typeFilter === "ALL" ? undefined : typeFilter
    const rows = await instructorApi.getDeletedAssessments(scope, type)
    setItems(rows)
    onCountsChange?.(rows.length)
  }, [scope, typeFilter, onCountsChange])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load deleted items."))
      .finally(() => setLoading(false))
  }, [ready, load])

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) =>
      [item.title, item.description, item.deleted_by, item.assessment_type]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    )
  }, [items, search])

  async function restoreItem(item: InstructorDeletedAssessment) {
    if (!scope) return
    setActingId(item.id)
    try {
      await instructorApi.restoreDeletedAssessment(scope, item.id)
      await load()
    } catch (err) {
      AppAlert.alert("Could not restore", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setActingId(null)
    }
  }

  function confirmPermanentDelete(item: InstructorDeletedAssessment) {
    AppAlert.alert("Delete forever?", `"${item.title}" will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete forever",
        style: "destructive",
        onPress: () => {
          void (async () => {
            if (!scope) return
            setActingId(item.id)
            try {
              await instructorApi.permanentlyDeleteAssessment(scope, item.id)
              await load()
            } catch (err) {
              AppAlert.alert("Could not delete", err instanceof ApiError ? err.message : "Try again.")
            } finally {
              setActingId(null)
            }
          })()
        },
      },
    ])
  }

  if (!ready) {
    return (
      <View style={moduleStyles.center}>
        <FacultyEmptyState
          icon="trash-outline"
          title="Select a course"
          body="Deleted assessments are scoped to your active course."
        />
      </View>
    )
  }

  return (
    <ScrollView
      style={moduleStyles.scroll}
      contentContainerStyle={[styles.content, listScrollPad]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={tokens.accent} />
      }
      keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {error ? (
        <View style={[styles.errorBox, { backgroundColor: `${tokens.danger}14` }]}>
          <Text style={[type.caption, { color: tokens.danger, fontWeight: "600" }]}>{error}</Text>
        </View>
      ) : null}

      <View
        style={[
          styles.banner,
          {
            backgroundColor: semanticSoft(tokens.accent, tokens.isDark),
            borderColor: tokens.accentBorder,
          },
        ]}
      >
        <View style={[styles.bannerIcon, { backgroundColor: native.secondaryGrouped }]}>
          <Ionicons name="time-outline" size={18} color={tokens.accent} />
        </View>
        <View style={styles.bannerCopy}>
          <Text style={[type.bodyEmphasis, { color: native.label, fontSize: 14 }]}>24-hour grace period</Text>
          <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18, fontWeight: "600" }]}>
            Deleted assessments can be restored within 24 hours, then they are permanently removed.
          </Text>
        </View>
      </View>

      <FacultySearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search deleted assessments…"
        filterActive={!assessmentType && typeFilter !== "ALL"}
        onOpenFilter={assessmentType ? undefined : () => setFilterSheetOpen(true)}
        showFilter={!assessmentType}
      />

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={tokens.accent} />
        </View>
      ) : filtered.length === 0 ? (
        <FacultyEmptyState
          icon="checkmark-circle-outline"
          title={items.length === 0 ? "No deleted items" : "No matches"}
          body={
            items.length === 0
              ? "Assessments you delete will appear here for recovery."
              : "Try another filter or search term."
          }
        />
      ) : (
        filtered.map((item) => (
          <DeletedCard
            key={item.id}
            item={item}
            acting={actingId === item.id}
            onRestore={() => void restoreItem(item)}
            onDelete={() => confirmPermanentDelete(item)}
          />
        ))
      )}

      {!assessmentType ? (
        <FacultyFilterSheet
          visible={filterSheetOpen}
          title="Assessment type"
          subtitle="Show deleted items for one assessment type."
          options={[...TYPE_OPTIONS]}
          value={typeFilter}
          onSelect={setTypeFilter}
          onClose={() => setFilterSheetOpen(false)}
        />
      ) : null}
    </ScrollView>
  )
}

function DeletedCard({
  item,
  acting,
  onRestore,
  onDelete,
}: {
  item: InstructorDeletedAssessment
  acting: boolean
  onRestore: () => void
  onDelete: () => void
}) {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const grace = gracePeriodRemaining(item.deleted_at)
  const questionCount = item.total_questions ?? item.question_count

  return (
    <View style={[moduleStyles.card, styles.card]}>
      <View style={styles.cardCopy}>
        <Text style={moduleStyles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.cardPills}>
          <FacultyStatusPill label={deletedAssessmentTypeLabel(item.assessment_type)} tone="neutral" />
          <FacultyStatusPill label="Deleted" tone="danger" />
        </View>
        {item.description ? (
          <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>{item.description}</Text>
        ) : null}
        <Text style={[type.caption, { color: native.tertiaryLabel, fontWeight: "600" }]}>
          {questionCount != null ? `${questionCount} questions · ` : ""}
          Deleted {formatFacultyRelativeTime(item.deleted_at)}
          {item.deleted_by ? ` · ${item.deleted_by}` : ""}
        </Text>
        {!grace.expired ? (
          <View style={[styles.graceBox, { backgroundColor: semanticSoft(tokens.accent, tokens.isDark) }]}>
            <Ionicons name="hourglass-outline" size={14} color={tokens.accent} />
            <Text style={[type.caption, { color: tokens.accent, fontWeight: "700" }]}>
              {grace.hours}h {grace.minutes}m until permanent deletion
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Pressable
          style={[
            styles.actionBtn,
            { backgroundColor: semanticSoft(tokens.success, tokens.isDark), borderColor: `${tokens.success}33` },
          ]}
          onPress={onRestore}
          disabled={acting}
          accessibilityRole="button"
          accessibilityLabel="Restore"
        >
          <Ionicons name="refresh-outline" size={16} color={tokens.success} />
          <Text style={[type.caption, { color: tokens.success, fontWeight: "700" }]}>{acting ? "…" : "Restore"}</Text>
        </Pressable>
        <Pressable
          style={[
            styles.actionBtn,
            { backgroundColor: semanticSoft(tokens.danger, tokens.isDark), borderColor: `${tokens.danger}33` },
          ]}
          onPress={onDelete}
          disabled={acting}
          accessibilityRole="button"
          accessibilityLabel="Delete forever"
        >
          <Ionicons name="trash-outline" size={16} color={tokens.danger} />
          <Text style={[type.caption, { color: tokens.danger, fontWeight: "700" }]}>
            {acting ? "…" : "Delete forever"}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
  errorBox: { borderRadius: 12, padding: 12 },
  loadingBox: { paddingVertical: 48, alignItems: "center" },
  banner: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerCopy: { flex: 1, gap: 4 },
  card: { gap: 12 },
  cardCopy: { gap: 8 },
  cardPills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  graceBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
})
