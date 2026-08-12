import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { IOS } from "../../constants/faculty-communication-theme"
import { NATIVE, nativeType } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useThemedStudentNative } from "../../lib/themed-module-theme"
import {
  collaborationApi,
  formatRelativeTime,
  statusTone,
  stripHtml,
  type ProjectRecord,
  type ProjectReport,
} from "../../lib/collaboration-api"
import { CommGroupedList, CommSectionFooter } from "../faculty/faculty-communication-ui"
import { FacultyStatusPill } from "../faculty/faculty-shared"
import { ModuleSectionHeader } from "../modules/ModuleScreen"
import { CollabScreenTitle } from "./collab-nav"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

export function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const projectId = Number(id)
  const session = useStudentSession()
  const router = useRouter()
  const scrollPad = useModuleScrollContentPadding(24)
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const [project, setProject] = useState<ProjectRecord | null>(null)
  const [reports, setReports] = useState<ProjectReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showReportForm, setShowReportForm] = useState(false)
  const [reportProgress, setReportProgress] = useState("")
  const [reportChallenges, setReportChallenges] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!session || !Number.isFinite(projectId)) return
    setError("")
    try {
      const [projectRes, reportsRes] = await Promise.all([
        collaborationApi.getProject(session, projectId),
        collaborationApi.getProjectReports(session, projectId),
      ])
      setProject(projectRes.project ?? null)
      setReports(reportsRes.reports ?? [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load project.")
    }
  }, [session, projectId])

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load, session])

  const isLeader = project?.group?.created_by === Number(session?.databaseId)

  const voteStar = async () => {
    if (!session || project?.status !== "approved") return
    try {
      await collaborationApi.voteProjectStar(session, projectId)
      AppAlert.alert("Thanks!", "Your vote was recorded.")
    } catch (err) {
      AppAlert.alert("Vote failed", err instanceof ApiError ? err.message : "Could not vote.")
    }
  }

  const submitReport = async () => {
    if (!session || !reportProgress.trim()) return
    setSubmitting(true)
    try {
      await collaborationApi.submitProjectReport(session, projectId, {
        progress: reportProgress.trim(),
        challenges: reportChallenges.trim() || undefined,
      })
      setReportProgress("")
      setReportChallenges("")
      setShowReportForm(false)
      await load()
    } catch (err) {
      AppAlert.alert("Failed", err instanceof ApiError ? err.message : "Could not submit report.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={native.tint} />
      </View>
    )
  }

  if (!project) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "Project not found."}</Text>
      </View>
    )
  }

  const tone = statusTone(project.status)

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, scrollPad]}
    >
      <CollabScreenTitle title={project.title} subtitle={project.group?.name ?? "Group project"} />

      <CommGroupedList>
        <View style={styles.summaryRow}>
          <FacultyStatusPill label={tone.label} tone="neutral" />
          <Text style={styles.meta}>
            {project.leader?.full_name ? `Led by ${project.leader.full_name}` : ""}
            {project.target_platform ? ` · ${project.target_platform}` : ""}
            {project.created_at ? ` · ${formatRelativeTime(project.created_at)}` : ""}
          </Text>
        </View>
      </CommGroupedList>

      {project.summary ? (
        <>
          <ModuleSectionHeader title="Summary" />
          <CommGroupedList>
            <View style={styles.blockRow}>
              <Text style={styles.blockBody}>{stripHtml(project.summary)}</Text>
            </View>
          </CommGroupedList>
        </>
      ) : null}

      {project.deliverables ? (
        <>
          <ModuleSectionHeader title="Deliverables" />
          <CommGroupedList>
            <View style={styles.blockRow}>
              <Text style={styles.blockBody}>{stripHtml(project.deliverables)}</Text>
            </View>
          </CommGroupedList>
        </>
      ) : null}

      {project.project_link ? (
        <Pressable style={styles.linkBtn} onPress={() => Linking.openURL(project.project_link!)}>
          <Ionicons name="link-outline" size={18} color={SN.accent} />
          <Text style={[styles.linkBtnText, { color: SN.accent }]}>Open project link</Text>
          <Ionicons name="chevron-forward" size={16} color={NATIVE.tertiaryLabel} />
        </Pressable>
      ) : null}

      {project.status === "approved" ? (
        <Pressable style={[styles.primaryBtn, { backgroundColor: SN.accent }]} onPress={voteStar}>
          <Ionicons name="star-outline" size={18} color="#ffffff" />
          <Text style={styles.primaryBtnText}>Vote for this project</Text>
        </Pressable>
      ) : null}

      {isLeader ? (
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => router.push(`/collaboration/projects/submit?projectId=${projectId}` as never)}
        >
          <Text style={[styles.secondaryBtnText, { color: SN.accent }]}>Edit project</Text>
        </Pressable>
      ) : null}

      <ModuleSectionHeader title="Progress reports" />
      {reports.length === 0 ? (
        <Text style={styles.emptyReports}>No progress reports yet.</Text>
      ) : (
        <CommGroupedList>
          {reports.map((report, index) => (
            <View key={report.id} style={[styles.reportRow, index < reports.length - 1 && styles.rowBorder]}>
              <Text style={styles.reportAuthor}>{report.student_name ?? "Member"}</Text>
              <Text style={styles.reportBody}>{report.progress}</Text>
              {report.challenges ? <Text style={styles.reportSub}>Challenges: {report.challenges}</Text> : null}
              <Text style={styles.reportTime}>{formatRelativeTime(report.created_at)}</Text>
            </View>
          ))}
        </CommGroupedList>
      )}

      {!showReportForm ? (
        <Pressable style={styles.secondaryBtn} onPress={() => setShowReportForm(true)}>
          <Text style={[styles.secondaryBtnText, { color: SN.accent }]}>Submit progress report</Text>
        </Pressable>
      ) : (
        <CommGroupedList>
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              value={reportProgress}
              onChangeText={setReportProgress}
              placeholder="What progress did you make?"
              placeholderTextColor={NATIVE.tertiaryLabel}
              multiline
            />
            <TextInput
              style={styles.input}
              value={reportChallenges}
              onChangeText={setReportChallenges}
              placeholder="Any blockers? (optional)"
              placeholderTextColor={NATIVE.tertiaryLabel}
              multiline
            />
            <Pressable style={[styles.primaryBtn, { backgroundColor: SN.accent }]} onPress={submitReport} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryBtnText}>Post report</Text>
              )}
            </Pressable>
          </View>
        </CommGroupedList>
      )}

      <CommSectionFooter>Team members can post weekly progress updates for your instructor.</CommSectionFooter>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: NATIVE.groupedBackground },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: NATIVE.groupedBackground },
  content: { padding: NATIVE.pagePadding, gap: 12 },
  errorText: { ...nativeType.destructive },
  summaryRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: IOS.secondaryGrouped,
  },
  meta: nativeType.caption,
  blockRow: { paddingHorizontal: 14, paddingVertical: 12, backgroundColor: IOS.secondaryGrouped },
  blockBody: { ...nativeType.callout, lineHeight: 20 },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: NATIVE.rowMinHeight,
    borderRadius: NATIVE.sectionRadius,
    backgroundColor: IOS.secondaryGrouped,
  },
  linkBtnText: { flex: 1, fontSize: 15, fontWeight: "600" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: NATIVE.sectionRadius,
  },
  primaryBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: NATIVE.sectionRadius,
    backgroundColor: IOS.secondaryGrouped,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: "600" },
  emptyReports: { ...nativeType.caption, textAlign: "center", paddingVertical: 12 },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: IOS.separator,
  },
  reportRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
    backgroundColor: IOS.secondaryGrouped,
  },
  reportAuthor: nativeType.bodyEmphasis,
  reportBody: { ...nativeType.callout, lineHeight: 20 },
  reportSub: nativeType.footnote,
  reportTime: { ...nativeType.footnote, marginTop: 4 },
  form: { padding: 14, gap: 10, backgroundColor: IOS.secondaryGrouped },
  input: {
    backgroundColor: NATIVE.fill,
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: IOS.label,
    minHeight: 80,
    textAlignVertical: "top",
  },
})
