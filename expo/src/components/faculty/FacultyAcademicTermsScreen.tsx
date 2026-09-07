import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming} from "react-native-reanimated"
import { ApiError } from "../../lib/api"
import {
  academicTermLabel,
  academicTermSeasonVisual,
  formatAcademicTermDateRange,
  termPayloadFromForm,
  uniqueTermCourses,
  type AcademicTermNameForm} from "../../lib/faculty-academic-term-utils"
import {
  instructorApi,
  type InstructorAcademicTerm,
  type InstructorSession} from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useFacultyModuleStyles } from "../../lib/faculty-themed-ui"
import { FACULTY_COLLAB_COLOR } from "../../lib/faculty-collab-theme"
import { semanticSoft, useNativeType } from "../../lib/themed-module-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { FacultyListPagerFooter } from "./FacultyListPagerFooter"
import { FacultyAcademicTermActionSheet } from "./FacultyAcademicTermActionSheet"
import {
  FacultyAcademicTermFormModal,
  FacultySectionFormModal} from "./FacultyAcademicTermFormModal"
import { FacultyEmptyState, FacultyStatusPill } from "./faculty-shared"
import { useFacultyModuleScrollPadding,
  FacultyFilterSheet,
  FacultySearchToolbar,
  type FacultyFilterOption} from "./faculty-module-shell"

type TermFilter = "all" | "active"

export function FacultyAcademicTermsScreen() {

  const insets = useSafeAreaInsets()
  const scrollPad = useFacultyModuleScrollPadding(24)
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const styles = useFacultyModuleStyles()
  const { scope, course, ready } = useFacultyScope()

  const [terms, setTerms] = useState<InstructorAcademicTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<TermFilter>("all")
  const [filterOpen, setFilterOpen] = useState(false)

  const [selectedTerm, setSelectedTerm] = useState<InstructorAcademicTerm | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const [termFormMode, setTermFormMode] = useState<"add" | "edit">("add")
  const [termFormOpen, setTermFormOpen] = useState(false)
  const [termFormTarget, setTermFormTarget] = useState<InstructorAcademicTerm | null>(null)

  const [sectionFormMode, setSectionFormMode] = useState<"add" | "edit">("add")
  const [sectionFormOpen, setSectionFormOpen] = useState(false)
  const [sectionFormTerm, setSectionFormTerm] = useState<InstructorAcademicTerm | null>(null)
  const [sectionFormTarget, setSectionFormTarget] = useState<InstructorSession | null>(null)
  const [sectionsByTerm, setSectionsByTerm] = useState<Record<number, InstructorSession[]>>({})

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    const data = await instructorApi.getAcademicTerms(scope)
    const nextTerms = data.terms ?? []
    setTerms(nextTerms)
    const grouped: Record<number, InstructorSession[]> = {}
    await Promise.all(
      nextTerms.map(async (term) => {
        try {
          const sessions = await instructorApi.getSessions(scope, term.id)
          grouped[term.id] = (sessions.sessions ?? []).filter((s) => s.code.toUpperCase() !== "BETA")
        } catch {
          grouped[term.id] = []
        }
      }),
    )
    setSectionsByTerm(grouped)
  }, [scope])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load academic terms."))
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

  const displayedTerms = useMemo(() => {
    let items = terms
    if (filter === "active") items = items.filter((t) => t.is_active)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      items = items.filter((t) => academicTermLabel(t).toLowerCase().includes(q))
    }
    return items
  }, [terms, filter, search])
  const pager = useFacultyListPager(displayedTerms, `${filter}:${search}`, "terms")

  const filterOptions: FacultyFilterOption[] = [
    { value: "all", label: "All terms" },
    { value: "active", label: "Active only" },
  ]

  function openTermSheet(term: InstructorAcademicTerm) {
    setSelectedTerm(term)
    setSheetOpen(true)
  }

  function openAddTerm() {
    setError("")
    setTermFormMode("add")
    setTermFormTarget(null)
    setTermFormOpen(true)
  }

  function openEditTerm(term: InstructorAcademicTerm) {
    setSheetOpen(false)
    setTermFormMode("edit")
    setTermFormTarget(term)
    setTermFormOpen(true)
  }

  function openAddSection(term: InstructorAcademicTerm) {
    setSheetOpen(false)
    setSectionFormMode("add")
    setSectionFormTerm(term)
    setSectionFormTarget(null)
    setSectionFormOpen(true)
  }

  function openEditSection(term: InstructorAcademicTerm, session: InstructorSession) {
    setSheetOpen(false)
    setSectionFormMode("edit")
    setSectionFormTerm(term)
    setSectionFormTarget(session)
    setSectionFormOpen(true)
  }

  async function handleTermSubmit(form: AcademicTermNameForm) {
    if (!scope) return
    setSubmitting(true)
    setError("")
    try {
      const payload = termPayloadFromForm(form)
      if (termFormMode === "add") {
        await instructorApi.createAcademicTerm(scope, payload)
      } else if (termFormTarget) {
        await instructorApi.updateAcademicTerm(scope, termFormTarget.id, payload)
      }
      setTermFormOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not save term.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSectionSubmit(payload: { code: string; description: string }) {
    if (!scope || !sectionFormTerm) return
    if (!payload.code) {
      setError("Section code is required.")
      return
    }
    if (payload.code.toUpperCase() === "BETA") {
      setError("BETA sections cannot be linked to an academic term.")
      return
    }

    setSubmitting(true)
    setError("")
    try {
      if (sectionFormMode === "add") {
        await instructorApi.createSession(scope, {
          code: payload.code,
          description: payload.description || null,
          academic_term_id: sectionFormTerm.id})
      } else if (sectionFormTarget) {
        await instructorApi.updateSession(scope, sectionFormTarget.id, {
          code: payload.code,
          description: payload.description || null,
          academic_term_id: sectionFormTerm.id})
      }
      setSectionFormOpen(false)
      await load()
      if (selectedTerm?.id === sectionFormTerm.id) {
        const refreshed = (await instructorApi.getAcademicTerms(scope)).terms ?? []
        setTerms(refreshed)
        const match = refreshed.find((t) => t.id === sectionFormTerm.id)
        if (match) setSelectedTerm(match)
        setSheetOpen(true)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save section.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!ready) {
    return (
      <FacultyEmptyState
        icon="calendar-outline"
        title="Select a course"
        body="Academic terms are scoped to your active course."
      />
    )
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, scrollPad]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_COLLAB_COLOR.link} />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <ActiveTermInsightBanner courseCode={course?.course_code} />

        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search terms…"
          filterActive={filter !== "all"}
          filterLabel={filter === "active" ? "Active only" : "All terms"}
          onOpenFilter={() => setFilterOpen(true)}
          trailingAction={{
            onPress: openAddTerm,
            accessibilityLabel: "Add academic term"}}
        />

        {error && !termFormOpen && !sectionFormOpen ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={tokens.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={FACULTY_COLLAB_COLOR.link} style={{ marginTop: 32 }} />
        ) : terms.length === 0 ? (
          <FacultyEmptyState
            icon="calendar-outline"
            title="No academic terms yet"
            body="Use + in the search bar to create your first term."
          />
        ) : displayedTerms.length === 0 ? (
          <FacultyEmptyState
            icon="search-outline"
            title="No matching terms"
            body="Try a different search or filter."
          />
        ) : (
          <>
            {pager.items.map((term) => (
              <TermCard
                key={term.id}
                term={term}
                sections={sectionsByTerm[term.id] ?? []}
                courseCode={course?.course_code}
                onPress={() => openTermSheet(term)}
                onAddSection={() => openAddSection(term)}
                onEditSection={(session) => openEditSection(term, session)}
                styles={styles}
                native={native}
              />
            ))}
            <FacultyListPagerFooter pager={pager} />
          </>
        )}
      </ScrollView>

      <FacultyFilterSheet
        visible={filterOpen}
        title="Filter terms"
        options={filterOptions}
        value={filter}
        onSelect={(value) => {
          setFilter(value as TermFilter)
          setFilterOpen(false)
        }}
        onClose={() => setFilterOpen(false)}
      />

      <FacultyAcademicTermActionSheet
        visible={sheetOpen}
        term={selectedTerm}
        scope={scope}
        courseCode={course?.course_code}
        onClose={() => {
          setSheetOpen(false)
          setSelectedTerm(null)
        }}
        onEditTerm={openEditTerm}
        onAddSection={openAddSection}
        onEditSection={openEditSection}
        onUpdated={() => void load()}
      />

      <FacultyAcademicTermFormModal
        visible={termFormOpen}
        mode={termFormMode}
        initial={termFormTarget}
        submitting={submitting}
        error={termFormOpen ? error : ""}
        onClose={() => setTermFormOpen(false)}
        onSubmit={(form) => void handleTermSubmit(form)}
      />

      <FacultySectionFormModal
        visible={sectionFormOpen}
        mode={sectionFormMode}
        initialCode={sectionFormTarget?.code ?? ""}
        initialDescription={sectionFormTarget?.description ?? ""}
        submitting={submitting}
        onClose={() => setSectionFormOpen(false)}
        onSubmit={(payload) => void handleSectionSubmit(payload)}
      />
    </View>
  )
}

function ActiveTermInsightBanner({ courseCode }: { courseCode?: string }) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const [mounted, setMounted] = useState(true)
  const progress = useSharedValue(0)
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dismissingRef = useRef(false)

  const dismiss = useCallback(() => {
    if (dismissingRef.current) return
    dismissingRef.current = true
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current)
    progress.value = withTiming(
      0,
      { duration: 380, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(setMounted)(false)
      },
    )
  }, [progress])

  useEffect(() => {
    progress.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) })
    autoDismissRef.current = setTimeout(dismiss, 6000)
    return () => {
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current)
    }
  }, [dismiss, progress])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * -14 },
      { scale: 0.97 + progress.value * 0.03 },
    ],
    marginBottom: progress.value * 12}))

  if (!mounted) return null

  const accent = FACULTY_COLLAB_COLOR.link

  return (
    <Animated.View style={[{ borderRadius: NATIVE.sectionRadius, overflow: "hidden" }, animatedStyle]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 12,
          padding: 14,
          borderRadius: NATIVE.sectionRadius,
          borderWidth: StyleSheet.hairlineWidth,
          backgroundColor: native.secondaryGrouped,
          borderColor: tokens.border,
          ...tokens.cardShadow,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: semanticSoft(accent, tokens.isDark),
          }}
        >
          <Ionicons name="sparkles-outline" size={18} color={accent} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                backgroundColor: FACULTY_COLLAB_COLOR.tabActive,
              }}
            />
            <Text style={[type.caption, { letterSpacing: 0.3, fontWeight: "700", color: accent }]}>
              Active term
            </Text>
          </View>
          <Text style={[type.caption, { lineHeight: 18, color: native.secondaryLabel }]}>
            Controls which term students can sign into. Section counts reflect{" "}
            <Text style={{ fontWeight: "700", color: native.label }}>{courseCode ?? "your course"}</Text>.
          </Text>
        </View>
        <Pressable
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: native.fill,
          }}
          onPress={dismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss active term info"
        >
          <Ionicons name="close" size={16} color={native.secondaryLabel} />
        </Pressable>
      </View>
    </Animated.View>
  )
}

function TermCard({
  term,
  sections,
  courseCode,
  onPress,
  onAddSection,
  onEditSection,
  styles,
  native}: {
  term: InstructorAcademicTerm
  sections: InstructorSession[]
  courseCode?: string
  onPress: () => void
  onAddSection: () => void
  onEditSection: (session: InstructorSession) => void
  styles: ReturnType<typeof useFacultyModuleStyles>
  native: ReturnType<typeof useThemedNative>
}) {
  const dateRange = formatAcademicTermDateRange(term.start_date, term.end_date)
  const season = academicTermSeasonVisual(term)
  const courses = uniqueTermCourses(term.courses)

  return (
    <View style={styles.card}>
      <Pressable
        style={({ pressed }) => [pressed && styles.cardPressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${academicTermLabel(term)}${term.is_active ? ", Active" : ""}`}
      >
      <View style={styles.cardTop}>
        <SolidListThumbTile thumb={season.thumb} icon={season.icon} size="compact" />
        <View style={styles.cardCopy}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{academicTermLabel(term)}</Text>
            {term.is_active ? <FacultyStatusPill label="Active" tone="success" /> : null}
          </View>
          {dateRange ? <Text style={styles.cardDates}>{dateRange}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={native.tertiaryLabel} />
      </View>

      <View style={termCardStyles.statsRow}>
        <MetaItem icon="layers-outline" label={`${term.session_count ?? 0} ${(term.session_count ?? 0) === 1 ? "section" : "sections"}`} accent={season.accent} native={native} />
        <MetaItem icon="people-outline" label={`${term.total_students ?? 0} ${(term.total_students ?? 0) === 1 ? "student" : "students"}`} accent={season.accent} native={native} />
      </View>

      {courses.length > 0 ? (
        <View style={styles.cardChips}>
          {courses.slice(0, 3).map((c) => (
            <View key={c.id} style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={1}>
                {c.course_code}
              </Text>
            </View>
          ))}
          {courses.length > 3 ? (
            <Text style={styles.moreChip}>+{courses.length - 3}</Text>
          ) : null}
        </View>
      ) : null}
      </Pressable>

      <View style={termCardStyles.sectionsBlock}>
        <Text style={[styles.cardDates, { fontWeight: "700" }]}>Sections</Text>
        {sections.length === 0 ? (
          <Text style={styles.cardDates}>No sections yet for {courseCode ?? "this course"}.</Text>
        ) : (
          sections.map((session) => (
            <Pressable
              key={session.id}
              onPress={() => onEditSection(session)}
              style={termCardStyles.sectionRow}
              accessibilityRole="button"
              accessibilityLabel={`Edit section ${session.code}`}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { fontSize: 15 }]}>
                  {courseCode ? `${courseCode}${session.code}` : session.code}
                </Text>
                <Text style={styles.cardDates}>
                  {session.student_count ?? 0} students
                  {session.description ? ` · ${session.description}` : ""}
                </Text>
              </View>
              <Text style={[styles.cardDates, { color: native.tint }]}>Edit</Text>
            </Pressable>
          ))
        )}
        <Pressable
          onPress={onAddSection}
          accessibilityRole="button"
          accessibilityLabel="Add section"
          style={termCardStyles.addSection}
        >
          <Ionicons name="add-circle-outline" size={16} color={native.tint} />
          <Text style={[styles.cardDates, { color: native.tint, fontWeight: "700" }]}>+ Add Section</Text>
        </Pressable>
      </View>
    </View>
  )
}

const termCardStyles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingTop: 2,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 },
  metaText: { fontWeight: "600" },
  sectionsBlock: { gap: 8, paddingTop: 10 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  addSection: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
})

function MetaItem({
  icon,
  label,
  accent,
  native}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  accent: string
  native: ReturnType<typeof useThemedNative>
}) {
  const type = useNativeType()
  return (
    <View style={termCardStyles.metaItem}>
      <Ionicons name={icon} size={14} color={accent} />
      <Text style={[type.caption, termCardStyles.metaText, { color: native.secondaryLabel }]}>{label}</Text>
    </View>
  )
}
