import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { AppAlert } from "../../lib/app-alert"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import {
  collaborationApi,
  formatRelativeTime,
  statusTone,
  stripHtml,
  type ProjectRecord,
  type ProjectReport,
} from "../../lib/collaboration-api"
import {
  CommGroupedList,
  CommListRow,
  CommSectionFooter,
  CommSectionHeader,
} from "../faculty/faculty-communication-ui"
import { FacultyStatusPill } from "../faculty/faculty-shared"
import { AppButton } from "../theme/AppButton"
import { CollabFlowHeader } from "./collab-nav"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

export function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const projectId = Number(id)
  const session = useStudentSession()
  const router = useRouter()
  const native = useThemedNative()
  const type = useNativeType()
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
      AppAlert.alert("Vote Failed", err instanceof ApiError ? err.message : "Could not vote.")
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
      <View style={[styles.screen, { backgroundColor: native.groupedBackground }]}>
        <CollabFlowHeader title="Project" fallbackHref="/module/projects" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={native.tint} />
        </View>
      </View>
    )
  }

  if (!project) {
    return (
      <View style={[styles.screen, { backgroundColor: native.groupedBackground }]}>
        <CollabFlowHeader title="Project" fallbackHref="/module/projects" />
        <View style={styles.center}>
          <Text style={type.destructive}>{error || "Project not found."}</Text>
        </View>
      </View>
    )
  }

  const tone = statusTone(project.status)

  return (
    <View style={[styles.screen, { backgroundColor: native.groupedBackground }]}>
      <CollabFlowHeader
        title={project.title}
        subtitle={project.group?.name ?? "Group project"}
        fallbackHref="/module/projects"
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <CommGroupedList>
          <View style={styles.summaryRow}>
            <FacultyStatusPill label={tone.label} tone="neutral" />
            <Text style={[type.caption, { color: native.secondaryLabel }]}>
              {project.leader?.full_name ? `Led by ${project.leader.full_name}` : "Group project"}
              {project.target_platform ? ` · ${project.target_platform}` : ""}
              {project.created_at ? ` · ${formatRelativeTime(project.created_at)}` : ""}
            </Text>
          </View>
        </CommGroupedList>

        {project.summary ? (
          <>
            <CommSectionHeader title="Summary" />
            <CommGroupedList>
              <Text style={[type.callout, styles.bodyCopy, { color: native.label }]}>{stripHtml(project.summary)}</Text>
            </CommGroupedList>
          </>
        ) : null}

        {project.deliverables ? (
          <>
            <CommSectionHeader title="Deliverables" />
            <CommGroupedList>
              <Text style={[type.callout, styles.bodyCopy, { color: native.label }]}>
                {stripHtml(project.deliverables)}
              </Text>
            </CommGroupedList>
          </>
        ) : null}

        <CommSectionHeader title="Workspace" />
        <CommGroupedList>
          <CommListRow
            icon="folder-open-outline"
            iconColor={SN.accent}
            iconSoft={SN.accentSoft}
            title="Open Workspace"
            subtitle="Files, comments, and submission"
            onPress={() => router.push(`/collaboration/projects/workspace/${projectId}` as never)}
            isLast={false}
          />
          <CommListRow
            icon="document-text-outline"
            iconColor={SN.accent}
            iconSoft={SN.accentSoft}
            title="View Reports"
            subtitle="Instructor grades and feedback"
            onPress={() => router.push(`/collaboration/projects/report/${projectId}` as never)}
            isLast={!project.project_link && !isLeader}
          />
          {project.project_link ? (
            <CommListRow
              icon="link-outline"
              iconColor={SN.accent}
              iconSoft={SN.accentSoft}
              title="Open Project Link"
              onPress={() => Linking.openURL(project.project_link!)}
              isLast={!isLeader}
            />
          ) : null}
          {isLeader ? (
            <CommListRow
              icon="create-outline"
              iconColor={SN.accent}
              iconSoft={SN.accentSoft}
              title="Edit Project"
              onPress={() => router.push(`/collaboration/projects/submit?projectId=${projectId}` as never)}
              isLast
            />
          ) : null}
        </CommGroupedList>

        {project.status === "approved" ? (
          <AppButton
            label="Vote for This Project"
            icon="star-outline"
            iconPosition="left"
            variant="soft"
            onPress={() => void voteStar()}
          />
        ) : null}

        <CommSectionHeader title="Progress Reports" />
        {reports.length === 0 ? (
          <Text style={[type.caption, styles.empty, { color: native.secondaryLabel }]}>No progress reports yet.</Text>
        ) : (
          <CommGroupedList>
            {reports.map((report, index) => (
              <View
                key={report.id}
                style={[
                  styles.reportRow,
                  index < reports.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: native.separator },
                ]}
              >
                <Text style={[type.bodyEmphasis, { color: native.label }]}>{report.student_name ?? "Member"}</Text>
                <Text style={[type.callout, { color: native.label }]}>{report.progress}</Text>
                {report.challenges ? (
                  <Text style={[type.footnote, { color: native.secondaryLabel }]}>Challenges: {report.challenges}</Text>
                ) : null}
                <Text style={[type.footnote, { color: native.tertiaryLabel }]}>{formatRelativeTime(report.created_at)}</Text>
              </View>
            ))}
          </CommGroupedList>
        )}

        {!showReportForm ? (
          <AppButton
            label="Submit Progress Report"
            variant="outline"
            onPress={() => setShowReportForm(true)}
          />
        ) : (
          <CommGroupedList>
            <TextInput
              style={[styles.input, { color: native.label }]}
              value={reportProgress}
              onChangeText={setReportProgress}
              placeholder="What progress did you make?"
              placeholderTextColor={native.tertiaryLabel}
              multiline
            />
            <View style={[styles.sep, { backgroundColor: native.separator }]} />
            <TextInput
              style={[styles.input, { color: native.label }]}
              value={reportChallenges}
              onChangeText={setReportChallenges}
              placeholder="Any blockers? (optional)"
              placeholderTextColor={native.tertiaryLabel}
              multiline
            />
            <View style={styles.formActions}>
              <AppButton label="Post Report" onPress={() => void submitReport()} loading={submitting} disabled={submitting} />
            </View>
          </CommGroupedList>
        )}

        <CommSectionFooter>Team members can post weekly progress updates for your instructor.</CommSectionFooter>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: NATIVE.pagePadding, gap: 12, paddingBottom: 40 },
  summaryRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  bodyCopy: { paddingHorizontal: 14, paddingVertical: 12, lineHeight: 22 },
  empty: { textAlign: "center", paddingVertical: 8 },
  reportRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  input: {
    fontSize: 17,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 72,
    textAlignVertical: "top",
  },
  sep: { height: StyleSheet.hairlineWidth },
  formActions: { padding: 12 },
})
