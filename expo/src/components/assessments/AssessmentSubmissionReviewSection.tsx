import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { WebView } from "react-native-webview"
import { Ionicons } from "@/components/icons/AppIcon"
import { API_BASE_URL } from "../../constants"
import { useAssessmentTheme } from "../../lib/themed-module-theme"
import { listSolutionFiles, parseSubmissionAnswerForReview } from "../../lib/classroom-submission"
import { parseCircuitSubmissionAnswer } from "../../lib/circuit-submission-utils"
import { workspaceHasContent } from "../../lib/circuit-workspace"
import { QuestionContentWebView } from "../rewards/QuestionContent"

function resolveFileUrl(url: string): string {
  const trimmed = url.trim()
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
  return `${API_BASE_URL}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`
}

function SubmissionFilePreview({
  url,
  name,
  mime,
  pageLabel,
}: {
  url: string
  name: string
  mime: string
  pageLabel?: string
}) {
  const { tokens } = useAssessmentTheme()
  const [zoomOpen, setZoomOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const fileUrl = resolveFileUrl(url)
  const isImage = mime.startsWith("image/")
  const isPdf = mime.includes("pdf")
  const label = pageLabel ?? name

  if (isImage) {
    return (
      <>
        <Pressable
          style={[styles.filePreview, { borderColor: tokens.border, backgroundColor: tokens.surface }]}
          onPress={() => setZoomOpen(true)}
        >
          {failed ? (
            <View style={styles.fileFallback}>
              <Ionicons name="image-outline" size={24} color={tokens.textSecondary} />
              <Text style={[styles.fileFallbackText, { color: tokens.textSecondary }]}>Image unavailable</Text>
            </View>
          ) : (
            <Image
              source={{ uri: fileUrl }}
              style={styles.fileImage}
              resizeMode="contain"
              onError={() => setFailed(true)}
            />
          )}
          <Text style={[styles.fileName, { color: tokens.textSecondary }]} numberOfLines={2}>
            {label}
          </Text>
        </Pressable>
        <Modal visible={zoomOpen} animationType="fade" transparent onRequestClose={() => setZoomOpen(false)}>
          <View style={styles.zoomBackdrop}>
            <Pressable style={styles.zoomClose} onPress={() => setZoomOpen(false)}>
              <Ionicons name="close" size={28} color="#ffffff" />
            </Pressable>
            {!failed ? (
              <Image source={{ uri: fileUrl }} style={styles.zoomImage} resizeMode="contain" />
            ) : (
              <ActivityIndicator color="#ffffff" size="large" />
            )}
          </View>
        </Modal>
      </>
    )
  }

  if (isPdf) {
    return (
      <View style={[styles.filePreview, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
        <WebView
          source={{ uri: fileUrl }}
          style={styles.pdfWebView}
          originWhitelist={["*"]}
          startInLoadingState
          renderLoading={() => <ActivityIndicator color={tokens.accent} style={{ marginTop: 24 }} />}
        />
        <View style={styles.fileActions}>
          <Text style={[styles.fileName, { color: tokens.textSecondary }]} numberOfLines={1}>
            {label}
          </Text>
          <Pressable style={[styles.openBtn, { borderColor: tokens.border }]} onPress={() => void Linking.openURL(fileUrl)}>
            <Ionicons name="open-outline" size={14} color={tokens.accent} />
            <Text style={[styles.openBtnText, { color: tokens.accent }]}>Open</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.filePreview, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
      <View style={[styles.fileIcon, { backgroundColor: tokens.accentSoft }]}>
        <Ionicons name="document-outline" size={28} color={tokens.accent} />
      </View>
      <Text style={[styles.fileName, { color: tokens.textSecondary }]}>{label}</Text>
      <Pressable style={[styles.openBtn, { borderColor: tokens.border }]} onPress={() => void Linking.openURL(fileUrl)}>
        <Text style={[styles.openBtnText, { color: tokens.accent }]}>Open file</Text>
      </Pressable>
    </View>
  )
}

type Props = {
  answerRaw: string | null
}

/** Renders uploaded circuit / solution files and notes from a stored answer payload. */
export function AssessmentSubmissionReviewSection({ answerRaw }: Props) {
  const { tokens } = useAssessmentTheme()

  const submission = useMemo(() => {
    if (!answerRaw?.trim()) return null
    const circuit = parseCircuitSubmissionAnswer(answerRaw)
    const review = parseSubmissionAnswerForReview(answerRaw)
    const files = listSolutionFiles(circuit.solution_uploads ?? review.solution_uploads)
    const writtenNotes = circuit.written_notes?.trim() || review.written_notes?.trim() || ""
    const usedWorkspace =
      circuit.submission_mode === "workspace" || review.submission_mode === "workspace" || workspaceHasContent(circuit.workspace)
    return { files, writtenNotes, usedWorkspace }
  }, [answerRaw])

  if (!submission) {
    return (
      <View style={[styles.emptyBox, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
        <Ionicons name="cloud-upload-outline" size={18} color={tokens.textSecondary} />
        <Text style={[styles.emptyText, { color: tokens.textSecondary }]}>No submission uploaded</Text>
      </View>
    )
  }

  const { files, writtenNotes, usedWorkspace } = submission

  if (files.length === 0 && !writtenNotes && !usedWorkspace) {
    return (
      <View style={[styles.emptyBox, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
        <Ionicons name="cloud-upload-outline" size={18} color={tokens.textSecondary} />
        <Text style={[styles.emptyText, { color: tokens.textSecondary }]}>No submission uploaded</Text>
      </View>
    )
  }

  return (
    <View style={styles.wrap}>
      {usedWorkspace ? (
        <View style={[styles.notice, { backgroundColor: tokens.accentSoft, borderColor: tokens.accentBorder }]}>
          <Ionicons name="easel-outline" size={16} color={tokens.accent} />
          <Text style={[styles.noticeText, { color: tokens.text }]}>
            {files.length > 0
              ? "Submitted via workspace notebook. Exported pages are shown below."
              : "Submitted via workspace notebook. Open the web app to replay notebook activity."}
          </Text>
        </View>
      ) : null}

      {files.map((file, index) => (
        <SubmissionFilePreview
          key={`${file.url}-${index}`}
          url={file.url}
          name={file.name}
          mime={file.mime}
          pageLabel={
            files.length > 1
              ? `${usedWorkspace ? "Workspace page" : "Page"} ${index + 1}${file.name ? ` — ${file.name}` : ""}`
              : file.name
          }
        />
      ))}

      {writtenNotes ? (
        <View style={[styles.notesBox, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
          <Text style={[styles.notesLabel, { color: tokens.textSecondary }]}>Written notes</Text>
          <QuestionContentWebView text={writtenNotes} embedded compact />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  emptyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  emptyText: { fontSize: 13, fontWeight: "500", flex: 1 },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 10,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  filePreview: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    padding: 10,
    gap: 8,
  },
  fileImage: { width: "100%", height: 220, borderRadius: 8 },
  fileFallback: { height: 160, alignItems: "center", justifyContent: "center", gap: 8 },
  fileFallbackText: { fontSize: 13 },
  fileName: { fontSize: 12, fontWeight: "600" },
  fileActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  openBtnText: { fontSize: 12, fontWeight: "700" },
  fileIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  pdfWebView: { width: "100%", height: 280, borderRadius: 8 },
  notesBox: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 6 },
  notesLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.4 },
  zoomBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.92)",
    justifyContent: "center",
    padding: 16,
  },
  zoomClose: { alignSelf: "flex-end", padding: 8 },
  zoomImage: { width: "100%", height: "70%" },
})
