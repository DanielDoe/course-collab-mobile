import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { ModuleListRow, ModuleScreen, ModuleSection, ModuleSectionHeader } from "../modules/ModuleScreen"
import { StudentSearchToolbar } from "../student/student-search-toolbar"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { courseInfoApi } from "../../lib/course-info-api"
import {
  defaultExpandedSectionIds,
  filterSyllabusSections,
  getSyllabusSectionDisplayTitle,
  getSyllabusSectionId,
  normalizeSearchQuery,
  prepareSyllabusForDisplay,
  buildSyllabusPdfProxyUrl,
  syllabusHasPublishedContent,
  syllabusPrefersPdfView,
  type SyllabusSection,
} from "../../lib/syllabus"
import { SyllabusSectionContent } from "./SyllabusSectionContent"
import { InfoHero } from "./course-info-shared"
import { courseInfoSyllabusThumb } from "../../lib/course-info-color-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { EmptyBlock } from "../rewards/rewards-shared"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { LectureDeckPdfViewer } from "../lectures/LectureDeckPdfViewer"
import { studentAuthenticatedHeaders } from "../../lib/student-api"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function SyllabusAccordionRow({
  title,
  open,
  onToggle,
  children,
  last,
  index,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
  last?: boolean
  index: number
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const thumb = courseInfoSyllabusThumb(index)

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.accordionHead,
          { borderBottomColor: open || last ? native.separator : native.separator },
          !open && last && styles.accordionHeadLast,
          pressed && { opacity: NATIVE.pressedOpacity },
        ]}
        onPress={onToggle}
        android_ripple={Platform.OS === "android" ? { color: "rgba(0,0,0,0.08)" } : undefined}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <SolidListThumbTile thumb={thumb} icon="document-text-outline" size="compact" />
        <Text style={[type.bodyEmphasis, styles.accordionTitle]} numberOfLines={2}>
          {title}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={native.tertiaryLabel} />
      </Pressable>
      {open ? (
        <View
          style={[
            styles.accordionBody,
            { borderBottomColor: native.separator },
            last && styles.accordionBodyLast,
          ]}
        >
          {children}
        </View>
      ) : null}
    </>
  )
}

export function SyllabusScreen() {
  const session = useStudentSession()
  const native = useThemedNative()
  const type = useNativeType()
  const [sections, setSections] = useState<SyllabusSection[]>([])
  const [meta, setMeta] = useState<{
    title?: string
    term?: string
    pdfUrl?: string | null
    contentMode?: string
  }>({})
  const [pdfHeaders, setPdfHeaders] = useState<Record<string, string> | undefined>()
  const [courseInfo, setCourseInfo] = useState<Record<string, unknown> | null>(null)
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const data = await courseInfoApi.getSyllabus(session)
      const prepared = prepareSyllabusForDisplay(data.syllabus)
      setSections(prepared.sections)
      setMeta({
        title: prepared.title,
        term: prepared.term,
        pdfUrl: prepared.pdfUrl,
        contentMode: prepared.contentMode,
      })
      setCourseInfo(data.courseInfo)
      setOpenIds(defaultExpandedSectionIds(prepared.sections))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load syllabus.")
    }
  }, [session])

  const hasStructured = sections.length > 0
  const hasPdf = Boolean(meta.pdfUrl?.trim())
  const showPdfPrimary = syllabusPrefersPdfView({
    sections,
    pdfUrl: meta.pdfUrl,
    contentMode: meta.contentMode,
  })
  const hasAnyContent = syllabusHasPublishedContent({
    sections,
    pdfUrl: meta.pdfUrl,
    contentMode: meta.contentMode,
  })

  const pdfProxyUrl = useMemo(() => {
    if (!session?.courseId || !hasPdf) return null
    return buildSyllabusPdfProxyUrl(session.courseId, { studentId: session.databaseId })
  }, [session?.courseId, session?.databaseId, hasPdf])

  useEffect(() => {
    if (!session || !showPdfPrimary) {
      setPdfHeaders(undefined)
      return
    }
    void studentAuthenticatedHeaders(session).then(setPdfHeaders)
  }, [session, showPdfPrimary])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  const subtitle = useMemo(() => {
    if (meta.term) return meta.term
    const code = courseInfo?.courseCode ? String(courseInfo.courseCode) : null
    return code || "Course syllabus and policies"
  }, [courseInfo?.courseCode, meta.term])

  const filteredSections = useMemo(() => {
    const q = normalizeSearchQuery(searchQuery)
    if (!q) return sections

    const metaHaystack = [meta.title, meta.term, subtitle].filter(Boolean).join(" ").toLowerCase()
    const metaMatches = metaHaystack.includes(q)
    const matched = filterSyllabusSections(sections, searchQuery)
    return metaMatches ? sections : matched
  }, [sections, searchQuery, meta.title, meta.term, subtitle])

  useEffect(() => {
    if (!normalizeSearchQuery(searchQuery)) return
    setOpenIds(defaultExpandedSectionIds(filteredSections, searchQuery))
  }, [filteredSections, searchQuery])

  const allSectionIds = useMemo(
    () => new Set(filteredSections.map((section, index) => getSyllabusSectionId(section, index))),
    [filteredSections],
  )

  const expandAll = () => setOpenIds(new Set(allSectionIds))
  const collapseAll = () => setOpenIds(new Set())

  const searchSummary = useMemo(() => {
    const q = normalizeSearchQuery(searchQuery)
    if (!q) return null
    return `${filteredSections.length} of ${sections.length} sections match`
  }, [filteredSections.length, sections.length, searchQuery])

  const allExpanded = openIds.size >= filteredSections.length && filteredSections.length > 0

  if (!session) return null

  return (
    <ModuleScreen
      loading={loading}
      error={error}
      empty={!loading && !hasAnyContent}
      emptyTitle="Syllabus not published"
      emptyBody="Your instructor has not published the syllabus yet."
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true)
        load().finally(() => setRefreshing(false))
      }}
    >
      {!showPdfPrimary ? (
        <StudentSearchToolbar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search policies, dates, materials…"
        />
      ) : null}

      <InfoHero
        badge={meta.term ? "Current term" : undefined}
        title={meta.title ?? "Course Syllabus"}
        subtitle={subtitle}
        stat={
          showPdfPrimary
            ? "PDF"
            : sections.length > 0
              ? String(sections.length)
              : undefined
        }
        statLabel={
          showPdfPrimary ? "Syllabus" : sections.length === 1 ? "Section" : "Sections"
        }
      />

      {showPdfPrimary && pdfProxyUrl ? (
        <View style={styles.pdfViewerWrap}>
          <LectureDeckPdfViewer
            deckUrl={pdfProxyUrl}
            headers={pdfHeaders}
            cacheKey={`syllabus-${session.courseId ?? "course"}-${session.databaseId}`}
          />
        </View>
      ) : null}

      {!showPdfPrimary && meta.pdfUrl ? (
        <ModuleSection title="Documents">
          <ModuleListRow
            title="Open PDF syllabus"
            subtitle="View the official syllabus document"
            icon="document-outline"
            thumbIndex={0}
            last
            onPress={() => {
              const url =
                pdfProxyUrl ??
                (meta.pdfUrl?.startsWith("http") ? meta.pdfUrl : null)
              if (url) void Linking.openURL(url)
            }}
          />
        </ModuleSection>
      ) : null}

      {searchSummary ? (
        <View style={styles.resultsBar}>
          <Text style={[type.caption, { color: native.secondaryLabel }]}>{searchSummary}</Text>
          {searchQuery.trim() ? (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Text style={[styles.clearBtn, { color: native.tint }]}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!loading && searchQuery.trim() && filteredSections.length === 0 ? (
        <EmptyBlock
          icon="search-outline"
          title="No syllabus matches"
          body={`Nothing matched “${searchQuery.trim()}”. Try “attendance”, “grading”, or “office hours”.`}
        />
      ) : null}

      {!showPdfPrimary && filteredSections.length > 0 ? (
        <View>
          <ModuleSectionHeader
            title="Sections"
            action={
              <Pressable onPress={allExpanded ? collapseAll : expandAll} hitSlop={8}>
                <Text style={[styles.expandAction, { color: native.tint }]}>
                  {allExpanded ? "Collapse all" : "Expand all"}
                </Text>
              </Pressable>
            }
          />
          <ModuleSection>
            {filteredSections.map((section, index) => {
              const id = getSyllabusSectionId(section, index)
              const title = getSyllabusSectionDisplayTitle(section)
              const last = index === filteredSections.length - 1
              return (
                <SyllabusAccordionRow
                  key={id}
                  index={index}
                  title={title}
                  open={openIds.has(id)}
                  onToggle={() =>
                    setOpenIds((prev) => {
                      const next = new Set(prev)
                      if (next.has(id)) next.delete(id)
                      else next.add(id)
                      return next
                    })
                  }
                  last={last}
                >
                  <SyllabusSectionContent section={section} searchQuery={searchQuery} />
                </SyllabusAccordionRow>
              )
            })}
          </ModuleSection>
        </View>
      ) : null}
    </ModuleScreen>
  )
}

const styles = StyleSheet.create({
  resultsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  clearBtn: { fontSize: 13, fontWeight: "600" },
  expandAction: { fontSize: 13, fontWeight: "600" },
  accordionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: NATIVE.rowMinHeight,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  accordionHeadLast: { borderBottomWidth: 0 },
  accordionTitle: { flex: 1, lineHeight: 20 },
  accordionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  accordionBodyLast: { borderBottomWidth: 0 },
  pdfViewerWrap: {
    minHeight: 420,
    borderRadius: NATIVE.sectionRadius,
    overflow: "hidden",
  },
})
