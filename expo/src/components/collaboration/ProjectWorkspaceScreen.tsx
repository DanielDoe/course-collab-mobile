import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
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
  type WorkspaceBundle,
  type WorkspaceComment,
  type WorkspaceFile,
} from "../../lib/collaboration-api"
import {
  CommGroupedList,
  CommListRow,
  CommSectionFooter,
  CommSectionHeader,
} from "../faculty/faculty-communication-ui"
import { FacultyStatusPill } from "../faculty/faculty-shared"
import { AppButton } from "../theme/AppButton"
import { ComposerSendButton } from "../theme/ComposerSendButton"
import { CollabFlowHeader } from "./collab-nav"
import { CollabActionSheet } from "./collab-native-sheet"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

export function ProjectWorkspaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const projectId = Number(id)
  const session = useStudentSession()
  const router = useRouter()
  const native = useThemedNative()
  const type = useNativeType()
  const SN = useThemedStudentNative()
  const [bundle, setBundle] = useState<WorkspaceBundle | null>(null)
  const [comments, setComments] = useState<WorkspaceComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [comment, setComment] = useState("")
  const [uploading, setUploading] = useState(false)
  const [acting, setActing] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
  const [fileSheet, setFileSheet] = useState<WorkspaceFile | null>(null)

  const load = useCallback(async () => {
    if (!session || !Number.isFinite(projectId)) return
    setError("")
    try {
      const [workspace, commentsRes] = await Promise.all([
        collaborationApi.getWorkspace(session, projectId),
        collaborationApi.getWorkspaceComments(session, projectId),
      ])
      setBundle(workspace)
      setComments(commentsRes.comments ?? [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load workspace.")
      setBundle(null)
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

  const isLeader = Number(bundle?.leaderId) === Number(session?.databaseId)
  const confirmedIds = useMemo(
    () => new Set((bundle?.confirmations ?? []).map((c) => Number(c.student_id))),
    [bundle?.confirmations],
  )
  const iConfirmed = confirmedIds.has(Number(session?.databaseId))
  const files = bundle?.files ?? []
  const sections = bundle?.sections ?? []
  const checklist = bundle?.checklist ?? []
  const blocked = checklist.filter((item) => !item.ok)

  async function pickAndUpload(kind: "file" | "photo" | "camera") {
    if (!session) return
    let uri = ""
    let name = "upload"
    let mimeType = "application/octet-stream"
    try {
      if (kind === "file") {
        const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false })
        if (result.canceled || !result.assets?.[0]) return
        uri = result.assets[0].uri
        name = result.assets[0].name ?? "attachment"
        mimeType = result.assets[0].mimeType ?? "application/octet-stream"
      } else {
        if (kind === "camera") {
          const perm = await ImagePicker.requestCameraPermissionsAsync()
          if (!perm.granted) {
            AppAlert.alert("Camera Access", "Allow camera access to attach a photo.")
            return
          }
        } else {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
          if (!perm.granted) {
            AppAlert.alert("Photos Access", "Allow photo library access to attach an image.")
            return
          }
        }
        const result =
          kind === "camera"
            ? await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: false })
            : await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: false, mediaTypes: ["images"] })
        if (result.canceled || !result.assets?.[0]) return
        uri = result.assets[0].uri
        name = result.assets[0].fileName ?? `photo-${Date.now()}.jpg`
        mimeType = result.assets[0].mimeType ?? "image/jpeg"
      }
    } catch (err) {
      AppAlert.alert("Picker Failed", err instanceof Error ? err.message : "Could not pick a file.")
      return
    }

    setUploading(true)
    try {
      await collaborationApi.uploadWorkspaceFile(session, projectId, { uri, name, mimeType })
      await load()
    } catch (err) {
      AppAlert.alert("Upload Failed", err instanceof ApiError ? err.message : "Could not upload file.")
    } finally {
      setUploading(false)
    }
  }

  const submitComment = async () => {
    if (!session || !comment.trim()) return
    setActing(true)
    try {
      await collaborationApi.postWorkspaceComment(session, projectId, comment.trim())
      setComment("")
      await load()
    } catch (err) {
      AppAlert.alert("Failed", err instanceof ApiError ? err.message : "Could not post comment.")
    } finally {
      setActing(false)
    }
  }

  const confirmOrSubmit = async (action: "confirm" | "submit") => {
    if (!session) return
    setActing(true)
    try {
      await collaborationApi.submitWorkspace(session, projectId, action)
      AppAlert.alert(
        action === "submit" ? "Submitted" : "Confirmed",
        action === "submit" ? "Your group project was submitted." : "Your confirmation was recorded.",
      )
      await load()
    } catch (err) {
      AppAlert.alert("Not Ready", err instanceof ApiError ? err.message : "Could not update submission.")
    } finally {
      setActing(false)
    }
  }

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: native.groupedBackground }]}>
        <CollabFlowHeader title="Workspace" fallbackHref="/module/projects" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={native.tint} />
        </View>
      </View>
    )
  }

  if (!bundle) {
    return (
      <View style={[styles.screen, { backgroundColor: native.groupedBackground }]}>
        <CollabFlowHeader title="Workspace" fallbackHref="/module/projects" />
        <View style={styles.center}>
          <Text style={type.destructive}>{error || "Workspace not found."}</Text>
        </View>
      </View>
    )
  }

  const status = String(bundle.workspace?.submission_status || "DRAFT").replace(/_/g, " ")

  return (
    <View style={[styles.screen, { backgroundColor: native.groupedBackground }]}>
      <CollabFlowHeader
        title={bundle.project?.title ?? "Workspace"}
        subtitle={bundle.assignment?.title ?? "Group workspace"}
        fallbackHref={`/collaboration/projects/${projectId}`}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <CommGroupedList>
          <View style={styles.summaryRow}>
            <FacultyStatusPill label={status} tone="neutral" />
            <Text style={[type.caption, { color: native.secondaryLabel }]}>
              {(bundle.members ?? []).length} members{isLeader ? " · You are the leader" : ""}
            </Text>
          </View>
        </CommGroupedList>

        {bundle.assignment?.instructions ? (
          <>
            <CommSectionHeader title="Assignment" />
            <CommGroupedList>
              <Text style={[type.callout, styles.bodyCopy, { color: native.label }]}>
                {bundle.assignment.instructions}
              </Text>
            </CommGroupedList>
          </>
        ) : null}

        {checklist.length > 0 ? (
          <>
            <CommSectionHeader title="Submission Checklist" />
            <CommGroupedList>
              {checklist.map((item, index) => (
                <CommListRow
                  key={`${item.label ?? item.title ?? index}`}
                  icon={item.ok ? "checkmark-circle" : "ellipse-outline"}
                  iconColor={item.ok ? SN.accent : native.tertiaryLabel}
                  iconSoft={SN.accentSoft}
                  title={item.label ?? item.title ?? item.message ?? "Requirement"}
                  showChevron={false}
                  isLast={index === checklist.length - 1}
                />
              ))}
            </CommGroupedList>
          </>
        ) : null}

        {sections.length > 0 ? (
          <>
            <CommSectionHeader title="Sections" />
            <CommGroupedList>
              {sections.map((section, index) => (
                <CommListRow
                  key={section.id}
                  icon="list-outline"
                  iconColor={SN.accent}
                  iconSoft={SN.accentSoft}
                  title={section.title ?? "Section"}
                  subtitle={section.status ?? "In progress"}
                  showChevron={false}
                  isLast={index === sections.length - 1}
                />
              ))}
            </CommGroupedList>
          </>
        ) : null}

        <CommSectionHeader title="Files" />
        {files.length === 0 ? (
          <Text style={[type.caption, styles.empty, { color: native.secondaryLabel }]}>No files uploaded yet.</Text>
        ) : (
          <CommGroupedList>
            {files.map((file: WorkspaceFile, index) => (
              <CommListRow
                key={file.id}
                icon="document-outline"
                iconColor={SN.accent}
                iconSoft={SN.accentSoft}
                title={file.file_name}
                subtitle={formatRelativeTime(file.created_at)}
                isLast={index === files.length - 1}
                onPress={() => setFileSheet(file)}
              />
            ))}
          </CommGroupedList>
        )}

        <AppButton
          label={uploading ? "Uploading…" : "Attach File"}
          icon="attach-outline"
          iconPosition="left"
          variant="outline"
          onPress={() => setAttachOpen(true)}
          disabled={uploading}
          loading={uploading}
        />

        <CommSectionHeader title="Discussion" />
        {comments.length === 0 ? (
          <Text style={[type.caption, styles.empty, { color: native.secondaryLabel }]}>No comments yet.</Text>
        ) : (
          <CommGroupedList>
            {comments.map((row, index) => (
              <View
                key={row.id}
                style={[
                  styles.commentRow,
                  index < comments.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: native.separator },
                ]}
              >
                <Text style={[type.bodyEmphasis, { color: native.label }]}>{row.author_name ?? "Member"}</Text>
                <Text style={[type.callout, { color: native.label }]}>{row.body}</Text>
                <Text style={[type.footnote, { color: native.tertiaryLabel }]}>{formatRelativeTime(row.created_at)}</Text>
              </View>
            ))}
          </CommGroupedList>
        )}

        <CommGroupedList>
          <View style={styles.composer}>
            <TextInput
              style={[styles.composerInput, { color: native.label }]}
              value={comment}
              onChangeText={setComment}
              placeholder="Write a team comment…"
              placeholderTextColor={native.tertiaryLabel}
              multiline
            />
            <ComposerSendButton
              active={Boolean(comment.trim())}
              sending={acting}
              onPress={() => void submitComment()}
            />
          </View>
        </CommGroupedList>

        <CommGroupedList>
          <CommListRow
            icon="document-text-outline"
            iconColor={SN.accent}
            iconSoft={SN.accentSoft}
            title="View Reports"
            subtitle="Instructor grades and feedback"
            onPress={() => router.push(`/collaboration/projects/report/${projectId}` as never)}
            isLast
          />
        </CommGroupedList>

        {!iConfirmed ? (
          <AppButton
            label="Confirm My Section"
            variant="outline"
            onPress={() => void confirmOrSubmit("confirm")}
            disabled={acting}
          />
        ) : null}

        {isLeader ? (
          <AppButton
            label={blocked.length > 0 ? `${blocked.length} Checklist Items Remaining` : "Submit Project"}
            onPress={() => void confirmOrSubmit("submit")}
            disabled={acting || blocked.length > 0}
            loading={acting}
          />
        ) : null}

        <CommSectionFooter>Uploads, comments, and submission use the same project workspace as the web app.</CommSectionFooter>
      </ScrollView>

      <CollabActionSheet
        visible={attachOpen}
        onClose={() => setAttachOpen(false)}
        title="Attach File"
        message="Add evidence to this workspace."
        options={[
          { label: "Choose File", icon: "document-outline", onPress: () => void pickAndUpload("file") },
          { label: "Photo Library", icon: "image-outline", onPress: () => void pickAndUpload("photo") },
          { label: "Take Photo", icon: "camera-outline", onPress: () => void pickAndUpload("camera") },
        ]}
      />

      <CollabActionSheet
        visible={fileSheet != null}
        onClose={() => setFileSheet(null)}
        title={fileSheet?.file_name ?? "File"}
        options={[
          ...(fileSheet?.storage_url
            ? [{ label: "Open File", icon: "open-outline" as const, onPress: () => Linking.openURL(fileSheet.storage_url!) }]
            : []),
          ...(isLeader && fileSheet
            ? [
                {
                  label: "Delete File",
                  icon: "trash-outline" as const,
                  destructive: true,
                  onPress: () =>
                    collaborationApi
                      .deleteWorkspaceFile(session!, projectId, fileSheet.id)
                      .then(load)
                      .catch((err) =>
                        AppAlert.alert("Failed", err instanceof ApiError ? err.message : "Could not delete file."),
                      ),
                },
              ]
            : []),
        ]}
      />
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
  commentRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  composerInput: {
    flex: 1,
    fontSize: 17,
    minHeight: 36,
    maxHeight: 120,
    paddingVertical: 6,
  },
})
