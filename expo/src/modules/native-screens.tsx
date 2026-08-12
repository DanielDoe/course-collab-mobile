import { useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@/components/icons/AppIcon"
import { AssessmentListScreen } from "../components/assessments/AssessmentListScreen"
import { GradesScreen } from "../components/assessments/GradesScreen"
import { QuizHistoryScreen } from "../components/assessments/QuizHistoryScreen"
import { ForumScreen } from "../components/collaboration/ForumScreen"
import { MessagesInboxScreen } from "../components/messages/MessagesInboxScreen"
import { GroupsScreen } from "../components/collaboration/GroupsScreen"
import { PlaygroundScreen } from "../components/collaboration/PlaygroundScreen"
import { ProjectsScreen } from "../components/collaboration/ProjectsScreen"
import { AttendanceScreen } from "../components/rewards/AttendanceScreen"
import { ClassroomPointsScreen } from "../components/rewards/ClassroomPointsScreen"
import { TradeCenterScreen } from "../components/rewards/TradeCenterScreen"
import { AnnouncementsScreen } from "../components/course-info/AnnouncementsScreen"
import { CalendarScreen } from "../components/course-info/CalendarScreen"
import { OfficeHoursScreen } from "../components/course-info/OfficeHoursScreen"
import { SettingsScreen } from "../components/settings/SettingsScreen"
import { HelpCenterScreen } from "../components/support/HelpCenterScreen"
import { MembershipScreen } from "../components/support/MembershipScreen"
import { SupportFormScreen, type SupportFormKind } from "../components/support/SupportFormScreen"
import { CourseEvaluationScreen } from "../components/course-info/CourseEvaluationScreen"
import { PoliciesScreen } from "../components/course-info/PoliciesScreen"
import { ProgressReviewScreen } from "../components/course-info/ProgressReviewScreen"
import { RecommendationsScreen } from "../components/course-info/RecommendationsScreen"
import { SyllabusScreen } from "../components/course-info/SyllabusScreen"
import { ModuleCard, ModuleRow, ModuleScreen } from "../components/modules/ModuleScreen"
import { LecturesScreen } from "../components/lectures/LecturesScreen"
import type { AssessmentListKind } from "../components/assessments/assessment-config"
import { useSession } from "../context/SessionProvider"
import { ApiError } from "../lib/api"
import { studentApi } from "../lib/student-api"
import type { StudentSession } from "../lib/session"
import { getModuleWebPath } from "../constants/module-web-paths"
import { useAppThemeTokens } from "../context/AppearanceProvider"
import { NATIVE } from "../constants/faculty-native-theme"
import { useStudentSectionTheme } from "../lib/themed-module-theme"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function openWebModule(router: ReturnType<typeof useRouter>, id: string, suffix = "") {
  const path = `${getModuleWebPath(id)}${suffix}`
  router.push({ pathname: "/web", params: { path: encodeURIComponent(path) } } as never)
}

function formatDate(value?: string): string {
  if (!value) return "No due date"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

export function AssessmentModuleScreen({ type, title }: { type: string; title: string }) {
  return <AssessmentListScreen type={type as AssessmentListKind} title={title} />
}

export function QuizHistoryModuleScreen() {
  return <QuizHistoryScreen />
}

export function GradesModuleScreen() {
  return <GradesScreen />
}

export function LecturesModuleScreen() {
  return <LecturesScreen />
}

export const AttendanceModuleScreen = () => <AttendanceScreen />

export const ClassroomPointsModuleScreen = () => <ClassroomPointsScreen />

export const TradeCenterModuleScreen = () => <TradeCenterScreen />

function ListModuleScreen({
  title,
  loadItems,
  webId,
  mapItem}: {
  title: string
  loadItems: (session: StudentSession) => Promise<Record<string, unknown>[]>
  webId: string
  mapItem: (item: Record<string, unknown>, index: number) => { key: string; title: string; meta?: string }
}) {
  const session = useStudentSession()
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const [items, setItems] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    loadItems(session)
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : `Failed to load ${title.toLowerCase()}.`))
      .finally(() => setLoading(false))
  }, [session, loadItems, title])

  return (
    <ModuleScreen loading={loading} error={error} empty={!loading && items.length === 0}>
      <ModuleCard title={title}>
        {items.map((item, index) => {
          const mapped = mapItem(item, index)
          return (
            <Pressable
              key={mapped.key}
              style={[styles.rowPressable, { borderBottomColor: tokens.border }]}
              onPress={() => openWebModule(router, webId)}
            >
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{mapped.title}</Text>
                {mapped.meta ? (
                  <Text style={[styles.rowMeta, { color: tokens.textMuted }]}>{mapped.meta}</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={tokens.textMuted} />
            </Pressable>
          )
        })}
      </ModuleCard>
    </ModuleScreen>
  )
}

export const ForumModuleScreen = () => <ForumScreen />
export const MessagesModuleScreen = () => <MessagesInboxScreen />

export const GroupsModuleScreen = () => <GroupsScreen />

export const ProjectsModuleScreen = () => <ProjectsScreen />

export const PlaygroundModuleScreen = () => <PlaygroundScreen />

export const CalendarModuleScreen = () => <CalendarScreen />

export const RecommendationsModuleScreen = () => <RecommendationsScreen />
export const CourseEvaluationModuleScreen = () => <CourseEvaluationScreen />

export const AnnouncementsModuleScreen = () => <AnnouncementsScreen />

export const PracticeModuleScreen = () => {
  const session = useStudentSession()
  const router = useRouter()
  const learningTheme = useStudentSectionTheme("learning-center", "Learning Center")
  const [topics, setTopics] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!session) return
    studentApi
      .getPracticeProgress(session)
      .then((d) => setTopics((d.topics as Record<string, unknown>[]) ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load practice hub."))
      .finally(() => setLoading(false))
  }, [session])

  return (
    <ModuleScreen loading={loading} error={error}>
      <ModuleCard title="Practice Hub" subtitle="Topic progress from the web practice module.">
        {topics.slice(0, 12).map((topic, i) => (
          <ModuleRow
            key={String(topic.id ?? i)}
            title={String(topic.name ?? topic.title ?? `Topic ${i + 1}`)}
            meta={`${Math.round(Number(topic.progress ?? topic.percent ?? 0))}%`}
          />
        ))}
      </ModuleCard>
      <Pressable
        style={[styles.primaryBtn, { backgroundColor: learningTheme.primary }]}
        onPress={() => openWebModule(router, "practice")}
      >
        <Text style={styles.primaryBtnText}>Start practice session</Text>
      </Pressable>
    </ModuleScreen>
  )
}

export const ProgressReviewModuleScreen = () => <ProgressReviewScreen />

export const SyllabusModuleScreen = () => <SyllabusScreen />

export const PoliciesModuleScreen = () => <PoliciesScreen />

export const OfficeHoursModuleScreen = () => <OfficeHoursScreen />

export const SettingsModuleScreen = () => <SettingsScreen />

export const MembershipModuleScreen = () => <MembershipScreen />

export const HelpCenterModuleScreen = () => <HelpCenterScreen />

export function SupportFormModuleScreen({ kind }: { kind: SupportFormKind }) {
  return <SupportFormScreen kind={kind} />
}

const styles = StyleSheet.create({
  rowPressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1},
  cardPressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: NATIVE.secondaryGrouped,
    borderRadius: NATIVE.sectionRadius,
    padding: 14},
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  rowMeta: { fontSize: 12 },
  rowScore: { fontSize: 13, fontWeight: "600" },
  heroValue: { fontSize: 32, fontWeight: "600" },
  bodyText: { fontSize: 14, lineHeight: 21, color: "#334155" },
  primaryBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center"},
  primaryBtnText: { color: "#ffffff", fontWeight: "600", fontSize: 15 },
  secondaryBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: NATIVE.separator,
    backgroundColor: NATIVE.secondaryGrouped},
  secondaryBtnText: { fontWeight: "600", fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: NATIVE.separator,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: NATIVE.secondaryGrouped},
  textArea: { minHeight: 120, textAlignVertical: "top" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  success: { color: "#047857", fontWeight: "600", fontSize: 14 },
})
