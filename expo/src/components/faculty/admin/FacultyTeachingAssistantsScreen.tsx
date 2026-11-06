import { useCallback, useEffect, useMemo, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { instructorAdminApi, type TeachingAssistant } from "../../../lib/instructor-admin-api"
import { instructorApi, type InstructorCourse } from "../../../lib/instructor-api"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { useFacultyListPager } from "../../../hooks/useFacultyListPager"
import { FacultySearchToolbar } from "../faculty-module-shell"
import { FacultyEmptyState } from "../faculty-shared"
import { facultyAdminTaThumb } from "../../../lib/faculty-admin-theme"
import {
  FacultyAdminScreen,
  FacultyAdminTierGate,
  useAdminStyles,
} from "../faculty-admin-ui"
import { FacultyListPagerFooter } from "../FacultyListPagerFooter"
import { FacultySignatureListCard } from "../FacultyCollabListCards"
import { useModuleTheme } from "../../../lib/themed-module-shell"
import { FacultyTeachingAssistantActionSheet } from "./FacultyTeachingAssistantsActionSheet"

type CourseWithTerm = InstructorCourse & { is_active_term?: boolean }

export function FacultyTeachingAssistantsScreen() {
  return (
    <FacultyAdminTierGate minTier="Enterprise" featureLabel="Teaching Assistants">
      <FacultyTeachingAssistantsContent />
    </FacultyAdminTierGate>
  )
}

function FacultyTeachingAssistantsContent() {
  const { session } = useFacultyScope()
  const { tokens } = useModuleTheme()
  const adminStyles = useAdminStyles()

  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tas, setTas] = useState<TeachingAssistant[]>([])
  const [courses, setCourses] = useState<CourseWithTerm[]>([])

  const [createOpen, setCreateOpen] = useState(false)
  const [detailTa, setDetailTa] = useState<TeachingAssistant | null>(null)

  const load = useCallback(async () => {
    if (!session) return
    setError(null)
    const [nextTas, courseResponse] = await Promise.all([
      instructorAdminApi.getTeachingAssistants(session.id),
      instructorApi.getCourses(session.id),
    ])
    setTas(nextTas)
    setCourses(courseResponse.courses as CourseWithTerm[])
  }, [session])

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load teaching assistants."))
      .finally(() => setLoading(false))
  }, [session, load])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load teaching assistants.")
    } finally {
      setRefreshing(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tas
    return tas.filter(
      (ta) =>
        ta.name.toLowerCase().includes(q) ||
        ta.username.toLowerCase().includes(q) ||
        ta.email.toLowerCase().includes(q),
    )
  }, [tas, search])

  const pager = useFacultyListPager(filtered, `assistants:${search}`, "assistants")
  const activeCount = useMemo(() => tas.filter((ta) => ta.is_active).length, [tas])

  return (
    <>
      <FacultyAdminScreen
        loading={loading}
        refreshing={refreshing}
        error={error}
        onRefresh={() => void handleRefresh()}
        suppressSearchDock={false}
      >
        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder="Search name, username, or email…"
          showFilter={false}
          trailingAction={{
            onPress: () => setCreateOpen(true),
            accessibilityLabel: "Add teaching assistant",
            icon: "add",
          }}
        />

        {filtered.length === 0 && !loading ? (
          <FacultyEmptyState
            icon="people-outline"
            title={search.trim() ? "No matches" : "No teaching assistants"}
            body={
              search.trim()
                ? "Try a different search term."
                : "Tap + to add a TA with course access and module permissions."
            }
          />
        ) : (
          <View style={adminStyles.sectionWrap}>
            <Text style={adminStyles.sectionHeader}>Assistants</Text>
            <View style={styles.list}>
              {pager.items.map((ta) => {
                const courseMeta =
                  ta.course_codes?.filter(Boolean).join(", ") ||
                  (ta.assigned_course_ids?.length
                    ? `${ta.assigned_course_ids.length} course${ta.assigned_course_ids.length === 1 ? "" : "s"}`
                    : undefined)

                return (
                  <FacultySignatureListCard
                    key={ta.id}
                    thumb={facultyAdminTaThumb(ta.id)}
                    icon="person-outline"
                    title={ta.name}
                    description={`@${ta.username} · ${ta.email}`}
                    metaLine={courseMeta}
                    status={
                      !ta.is_active
                        ? { label: "Inactive", color: tokens.danger, icon: "ellipse" }
                        : undefined
                    }
                    onPress={() => setDetailTa(ta)}
                  />
                )
              })}
            </View>
            <FacultyListPagerFooter pager={pager} />
            <Text style={adminStyles.sectionFooter}>
              {activeCount === tas.length
                ? `${tas.length} assistant${tas.length === 1 ? "" : "s"} with course-scoped module access.`
                : `${activeCount} active · ${tas.length - activeCount} inactive`}
            </Text>
          </View>
        )}
      </FacultyAdminScreen>

      {session ? (
        <>
          <FacultyTeachingAssistantActionSheet
            visible={createOpen}
            mode="create"
            courses={courses}
            instructorId={session.id}
            onClose={() => setCreateOpen(false)}
            onSaved={async () => {
              setCreateOpen(false)
              await load()
            }}
          />
          <FacultyTeachingAssistantActionSheet
            visible={Boolean(detailTa)}
            mode="edit"
            courses={courses}
            instructorId={session.id}
            initial={detailTa}
            onClose={() => setDetailTa(null)}
            onSaved={async () => {
              setDetailTa(null)
              await load()
            }}
          />
        </>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
})
