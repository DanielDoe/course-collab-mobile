import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { WebView } from "react-native-webview"
import type { ClassroomPointRow } from "../../lib/instructor-api"
import { isCodeSubmission } from "../../lib/faculty-classroom-points-utils"
import {
  listSolutionFiles,
  parseQuestionConfig,
  parseSubmissionAnswerForReview} from "../../lib/classroom-submission"
import { API_BASE_URL } from "../../constants"
import { FACULTY_BRAND } from "../../constants/faculty-theme"
import { BRAND } from "../../constants"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useFacultyTheme } from "../../lib/themed-module-theme"
import { QuestionContentWebView, QuestionMediaView } from "../rewards/QuestionContent"
import { FacultySectionCard } from "./faculty-shared"

function resolveFileUrl(url: string): string {
  const trimmed = url.trim()
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
  return `${API_BASE_URL}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`
}

function SubmissionFilePreview({
  url,
  name,
  mime,
  pageLabel}: {
  url: string
  name: string
  mime: string
  pageLabel?: string
}) {
  const [zoomOpen, setZoomOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const fileUrl = resolveFileUrl(url)
  const isImage = mime.startsWith("image/")
  const isPdf = mime.includes("pdf")
  const label = pageLabel ?? name

  if (isImage) {
    return (
      <>
        <Pressable style={styles.filePreview} onPress={() => setZoomOpen(true)}>
          {failed ? (
            <View style={styles.fileFallback}>
              <Ionicons name="image-outline" size={24} color={BRAND.slate} />
              <Text style={styles.fileFallbackText}>Image unavailable</Text>
            </View>
          ) : (
            <Image
              source={{ uri: fileUrl }}
              style={styles.fileImage}
              resizeMode="contain"
              onError={() => setFailed(true)}
            />
          )}
          <Text style={styles.fileName}>{label}</Text>
        </Pressable>
        <Modal visible={zoomOpen} animationType="fade" transparent onRequestClose={() => setZoomOpen(false)}>
          <View style={styles.zoomBackdrop}>
            <Pressable style={styles.zoomClose} onPress={() => setZoomOpen(false)}>
              <Ionicons name="close" size={28} color={BRAND.white} />
            </Pressable>
            <Image source={{ uri: fileUrl }} style={styles.zoomImage} resizeMode="contain" />
          </View>
        </Modal>
      </>
    )
  }

  if (isPdf) {
    return (
      <View style={styles.filePreview}>
        <WebView
          source={{ uri: fileUrl }}
          style={styles.pdfWebView}
          originWhitelist={["*"]}
          startInLoadingState
          renderLoading={() => <ActivityIndicator color={FACULTY_BRAND.accent} style={{ marginTop: 24 }} />}
        />
        <View style={styles.fileActions}>
          <Text style={styles.fileName} numberOfLines={1}>
            {label}
          </Text>
          <Pressable style={styles.openBtn} onPress={() => void Linking.openURL(fileUrl)}>
            <Ionicons name="open-outline" size={14} color={FACULTY_BRAND.accent} />
            <Text style={styles.openBtnText}>Open</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.filePreview}>
      <View style={styles.fileIcon}>
        <Ionicons name="document-outline" size={28} color={FACULTY_BRAND.accent} />
      </View>
      <Text style={styles.fileName}>{label}</Text>
      <Pressable style={styles.openBtn} onPress={() => void Linking.openURL(fileUrl)}>
        <Text style={styles.openBtnText}>Open file</Text>
      </Pressable>
    </View>
  )
}

export function FacultySubmissionReviewPanel({ point }: { point: ClassroomPointRow }) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const facultyTheme = useFacultyTheme()

  const questionConfig = useMemo(
    () => parseQuestionConfig(point.assignment_question_config),
    [point.assignment_question_config],
  )

  const solutionAnswer = useMemo(
    () => (point.solution_answer_json != null ? parseSubmissionAnswerForReview(point.solution_answer_json) : null),
    [point.solution_answer_json],
  )

  const solutionFiles = useMemo(
    () => (solutionAnswer ? listSolutionFiles(solutionAnswer.solution_uploads) : []),
    [solutionAnswer],
  )

  const questionText = questionConfig?.question_text?.trim() ?? ""
  const instructions = questionConfig?.solution_upload_config?.submission_instructions?.trim()
  const uploadTitle = questionConfig?.solution_upload_config?.title?.trim()
  const usedWorkspace = solutionAnswer?.submission_mode === "workspace"
  const hasProblem =
    Boolean(questionText || questionConfig?.question_media || instructions || uploadTitle)
  const hasSubmission =
    Boolean(solutionAnswer && (solutionFiles.length > 0 || solutionAnswer.written_notes?.trim() || usedWorkspace))
  const plotUri = point.plot_image ? resolveFileUrl(point.plot_image) : null

  if (!hasProblem && !hasSubmission && !point.code && !plotUri) {
    return (
      <FacultySectionCard title="Submission content" icon="document-text-outline" flush>
        <Text style={styles.emptyText}>No submission content was attached to this record.</Text>
      </FacultySectionCard>
    )
  }

  return (
    <View style={styles.wrap}>
      {hasProblem ? (
        <FacultySectionCard title="Problem" icon="help-circle-outline" flush>
          {uploadTitle ? (
            <Text style={[styles.uploadTitle, { color: native.label }]}>{uploadTitle}</Text>
          ) : null}
          <QuestionMediaView media={questionConfig?.question_media} embedded />
          {questionText ? (
            <View style={styles.questionBody}>
              <QuestionContentWebView text={questionText} embedded />
            </View>
          ) : null}
          {instructions ? (
            <View
              style={[
                styles.instructionsBox,
                { backgroundColor: tokens.accentSoft, borderColor: tokens.accentBorder },
              ]}
            >
              <View style={styles.instructionsHead}>
                <Ionicons name="information-circle-outline" size={16} color={facultyTheme.primary} />
                <Text style={[styles.instructionsLabel, { color: native.label }]}>Instructions</Text>
              </View>
              <QuestionContentWebView text={instructions} embedded compact />
            </View>
          ) : null}
        </FacultySectionCard>
      ) : null}

      {hasSubmission ? (
        <FacultySectionCard
          title={usedWorkspace ? "Student workspace" : "Student submission"}
          icon="document-attach-outline"
          flush
        >
          {usedWorkspace ? (
            <View style={[styles.notice, { backgroundColor: native.fill }]}>
              <Ionicons name="easel-outline" size={16} color={native.secondaryLabel} />
              <Text style={[styles.noticeText, { color: native.secondaryLabel }]}>
                {solutionFiles.length > 0
                  ? "Workspace pages exported below. Open the web app to replay notebook activity if needed."
                  : "Submitted via workspace notebook. Open the web app to view workspace replay."}
              </Text>
            </View>
          ) : null}

          {solutionFiles.length === 0 && !solutionAnswer?.written_notes?.trim() ? (
            <Text style={styles.emptyText}>No uploaded files or notes in this submission.</Text>
          ) : null}

          {solutionFiles.map((file, index) => (
            <SubmissionFilePreview
              key={`${file.url}-${index}`}
              url={file.url}
              name={file.name}
              mime={file.mime}
              pageLabel={
                solutionFiles.length > 1
                  ? `${usedWorkspace ? "Workspace page" : "Page"} ${index + 1}${file.name ? ` — ${file.name}` : ""}`
                  : file.name
              }
            />
          ))}

          {solutionAnswer?.written_notes?.trim() ? (
            <View
              style={[
                styles.notesBox,
                { backgroundColor: native.fill, borderColor: native.separator },
              ]}
            >
              <Text style={[styles.notesLabel, { color: native.label }]}>Written notes</Text>
              <QuestionContentWebView text={solutionAnswer.written_notes.trim()} embedded compact />
            </View>
          ) : null}
        </FacultySectionCard>
      ) : null}

      {isCodeSubmission(point) && point.code ? (
        <FacultySectionCard title="Submitted code" icon="code-slash-outline" flush>
          <View
            style={[
              styles.codePane,
              {
                backgroundColor: tokens.isDark ? tokens.background : "#f8fafc",
                borderColor: native.separator,
              },
            ]}
          >
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator>
              <Text style={[styles.codeText, { color: native.label }]} selectable>
                {point.code}
              </Text>
            </ScrollView>
          </View>
        </FacultySectionCard>
      ) : null}

      {plotUri ? (
        <FacultySectionCard title="Plot output" icon="analytics-outline" flush>
          <Image source={{ uri: plotUri }} style={styles.plotImage} resizeMode="contain" />
        </FacultySectionCard>
      ) : null}

      {point.reason && point.reason !== point.submission_title ? (
        <FacultySectionCard title="Submission note" icon="chatbox-outline" flush>
          <Text style={[styles.reasonText, { color: native.secondaryLabel }]}>
            {point.reason.replace(/§\s*/g, "")}
          </Text>
        </FacultySectionCard>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  uploadTitle: {
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingTop: 4},
  questionBody: { paddingHorizontal: 14, paddingBottom: 8 },
  instructionsBox: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 12,
    gap: 8,
    borderRadius: 12,
    borderWidth: 1},
  instructionsHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  instructionsLabel: { fontSize: 12, fontWeight: "600" },
  notice: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    marginHorizontal: 14,
    marginTop: 4,
    borderRadius: 10},
  noticeText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  emptyText: {
    fontSize: 13,
    color: BRAND.slate,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingBottom: 14},
  filePreview: {
    marginHorizontal: 14,
    marginBottom: 12,
    gap: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    overflow: "hidden"},
  fileImage: { width: "100%", height: 220, backgroundColor: BRAND.white },
  fileName: {
    fontSize: 12,
    fontWeight: "700",
    color: FACULTY_BRAND.inkSecondary,
    paddingHorizontal: 12,
    paddingBottom: 10},
  fileFallback: { height: 140, alignItems: "center", justifyContent: "center", gap: 8 },
  fileFallbackText: { fontSize: 13, color: BRAND.slate },
  pdfWebView: { width: "100%", height: 320, backgroundColor: BRAND.white },
  fileActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8},
  fileIcon: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: FACULTY_BRAND.surfaceSoft},
  openBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  openBtnText: { fontSize: 12, fontWeight: "700", color: FACULTY_BRAND.accent },
  notesBox: {
    marginHorizontal: 14,
    marginBottom: 14,
    gap: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth},
  notesLabel: { fontSize: 12, fontWeight: "600" },
  codePane: {
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden"},
  codeText: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 12,
    paddingVertical: 12},
  plotImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#f8fafc",
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 10},
  reasonText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingBottom: 14},
  zoomBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.92)",
    justifyContent: "center",
    padding: 16},
  zoomClose: { alignSelf: "flex-end", padding: 8 },
  zoomImage: { width: "100%", height: "75%" }})
