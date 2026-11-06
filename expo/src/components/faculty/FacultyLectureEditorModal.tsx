import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import * as DocumentPicker from "expo-document-picker"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { AppAlert } from "../../lib/app-alert"
import { instructorApi, type InstructorLecture } from "../../lib/instructor-api"
import { mergeLectureDeckFromContent } from "../../lib/lecture-deck-url"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useThemedNative } from "../../context/AppearanceProvider"
import { FACULTY_SHEET_COLOR } from "../../lib/faculty-sheet-theme"
import { FacultyLectureDeckPreview } from "./FacultyLectureDeckPreview"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetActionRow,
  FacultySheetChrome,
  FacultySheetErrorBanner,
  FacultySheetField,
  FacultySheetNotice,
  FacultySheetOutlineButton,
  FacultySheetSaveAction,
  FacultySheetSection,
  FacultySheetToggleRow,
  sheetPlaceholderColor
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import { NativeSelect } from "../NativeSelect"
import { WEEK_OPTIONS } from "./FacultyNativePickers"
import { KeyboardAwareForm } from "../ui/KeyboardAwareForm"
import { validateLectureCreateFields } from "../../lib/faculty-lecture-create"
import { sanitizeUserFacingError } from "../../lib/user-facing-error"

type Props = {
  visible: boolean
  lecture: InstructorLecture | null
  createMode?: boolean
  defaultWeek?: number
  onClose: () => void
  onSaved: (created?: InstructorLecture) => void
}

function hasDeck(lecture: InstructorLecture): boolean {
  return Boolean(lecture.pdf_url || lecture.document_url)
}

function objectivesTextFromLecture(lecture: InstructorLecture): string {
  const raw = lecture.objectives
  if (Array.isArray(raw)) return raw.map((item) => String(item).trim()).filter(Boolean).join("\n")
  if (typeof raw === "string") return raw
  return ""
}

function objectivesListFromText(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

export function FacultyLectureEditorModal({
  visible,
  lecture,
  createMode = false,
  defaultWeek = 1,
  onClose,
  onSaved}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const { scope, hasCourse } = useFacultyScope()

  const [title, setTitle] = useState("")
  const [week, setWeek] = useState("")
  const [description, setDescription] = useState("")
  const [objectives, setObjectives] = useState("")
  const [published, setPublished] = useState(true)
  const [allowDownload, setAllowDownload] = useState(false)
  const [deckAttached, setDeckAttached] = useState(false)
  const [deckPreviewUrl, setDeckPreviewUrl] = useState<string | null>(null)
  const [refreshingDeck, setRefreshingDeck] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState("")

  const syncDeckFromLecture = useCallback((next: InstructorLecture) => {
    const preview = next.pdf_url || next.document_url || null
    setDeckAttached(hasDeck(next))
    setDeckPreviewUrl(preview)
  }, [])

  const refreshDeck = useCallback(async () => {
    if (!scope || !lecture || createMode) return
    setRefreshingDeck(true)
    try {
      const data = await instructorApi.getLectureContent(scope, lecture.id)
      syncDeckFromLecture(mergeLectureDeckFromContent(lecture, data))
    } catch {
      syncDeckFromLecture(lecture)
    } finally {
      setRefreshingDeck(false)
    }
  }, [scope, lecture, createMode, syncDeckFromLecture])

  useEffect(() => {
    if (!visible) return
    if (createMode) {
      setTitle("")
      setWeek(String(defaultWeek))
      setDescription("")
      setObjectives("")
      setPublished(false)
      setAllowDownload(false)
      setDeckAttached(false)
      setDeckPreviewUrl(null)
      setError("")
      return
    }
    if (!lecture) return
    setTitle(lecture.title)
    setWeek(String(lecture.week))
    setDescription(lecture.description ?? "")
    setObjectives(objectivesTextFromLecture(lecture))
    setPublished(lecture.is_published ?? lecture.is_active ?? false)
    setAllowDownload(lecture.allow_download ?? false)
    syncDeckFromLecture(lecture)
    setError("")
    void refreshDeck()
  }, [visible, lecture, createMode, defaultWeek, syncDeckFromLecture, refreshDeck])

  if (!createMode && !lecture) return null

  const lectureId = lecture?.id ?? 0
  const sheetTitle = createMode ? "New lecture" : "Lecture settings"
  const saveLabel = createMode ? "Create" : "Save"

  async function saveDetails() {
    if (!scope || !hasCourse) {
      setError("Select a course before creating a lecture.")
      return
    }
    const objectiveList = objectivesListFromText(objectives)
    const validated = validateLectureCreateFields(
      {
        title,
        week,
        description,
        objectives: objectiveList,
        is_published: published,
      },
      scope.courseId,
    )
    if (!validated.ok) {
      setError(validated.error)
      return
    }
    setSaving(true)
    setError("")
    try {
      if (createMode) {
        const result = await instructorApi.createLecture(scope, validated.payload)
        onSaved(result.lecture)
        if (!result.lecture) onClose()
      } else {
        await instructorApi.updateLecture(scope, lectureId, {
          ...validated.payload,
          allow_download: allowDownload,
        })
        onSaved()
        onClose()
      }
    } catch (err) {
      if (__DEV__) {
        console.error("[faculty] lecture save failed", {
          courseId: scope.courseId,
          createMode,
          lectureId,
          err,
        })
      }
      setError(
        sanitizeUserFacingError(
          err instanceof ApiError ? err.message : err,
          "Lecture could not be created. Check the required fields and try again.",
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  async function pickAndUploadDeck() {
    if (!scope || createMode) return
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ],
      copyToCacheDirectory: true})
    if (result.canceled || !result.assets?.[0]) return

    const asset = result.assets[0]
    setUploading(true)
    setError("")
    try {
      const result = await instructorApi.uploadLectureDocument(scope, lectureId, {
        uri: asset.uri,
        name: asset.name ?? "lecture-deck.pdf",
        type: asset.mimeType ?? "application/pdf"})
      if (result.lecture) syncDeckFromLecture(result.lecture)
      else setDeckAttached(true)
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not upload deck.")
    } finally {
      setUploading(false)
    }
  }

  function confirmRemoveDeck() {
    if (!scope || createMode) return
    AppAlert.alert("Remove slide deck?", "Students will no longer see this PDF until you upload another deck.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setRemoving(true)
            setError("")
            try {
              const result = await instructorApi.deleteLectureDocument(scope, lectureId)
              if (result.lecture) syncDeckFromLecture(result.lecture)
              else {
                setDeckAttached(false)
                setDeckPreviewUrl(null)
              }
              onSaved()
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Could not remove deck.")
            } finally {
              setRemoving(false)
            }
          })()
        },
      },
    ])
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome
          topInset={insets.top}
          title={sheetTitle}
          onClose={onClose}
          rightSlot={
            <FacultySheetSaveAction
              label={saveLabel}
              saving={saving}
              onPress={() => void saveDetails()}
            />
          }
        />

        <KeyboardAwareForm contentContainerStyle={collabSheetStyles.scroll}>
          {error ? <FacultySheetErrorBanner message={error} /> : null}

          <FacultySheetSection
            label="Details"
            hint={createMode ? `Week ${defaultWeek}` : `Week ${lecture?.week ?? week}`}
            tone={SHEET_SECTION.edit}
          >
            <FacultySheetField label="Title">
              <TextInput
                style={collabSheetStyles.fieldInput}
                value={title}
                onChangeText={setTitle}
                autoCorrect={false}
                autoCapitalize="none"
                keyboardType="ascii-capable"
                accessibilityLabel="Lecture title"
                testID="lecture-title"
              />
            </FacultySheetField>
            <FacultySheetField label="Week">
              <NativeSelect
                placeholder="Week"
                value={week}
                options={
                  WEEK_OPTIONS.some((option) => option.value === week)
                    ? WEEK_OPTIONS
                    : [...WEEK_OPTIONS, { value: week, label: `Week ${week}` }]
                }
                onChange={setWeek}
              />
            </FacultySheetField>
            <FacultySheetField label="Learning objectives">
              <TextInput
                style={[collabSheetStyles.fieldInput, collabSheetStyles.textArea]}
                value={objectives}
                onChangeText={setObjectives}
                multiline
                textAlignVertical="top"
                placeholder="One objective per line"
                placeholderTextColor={sheetPlaceholderColor}
                accessibilityLabel="Learning objectives"
                autoCorrect={false}
                autoCapitalize="sentences"
              />
            </FacultySheetField>
            <FacultySheetField label="Description">
              <TextInput
                style={[collabSheetStyles.fieldInput, collabSheetStyles.textArea]}
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
                placeholderTextColor={sheetPlaceholderColor}
                autoCorrect={false}
                keyboardType="ascii-capable"
                accessibilityLabel="Lecture description"
                testID="lecture-description"
              />
            </FacultySheetField>
          </FacultySheetSection>

          {!createMode ? (
            <FacultySheetSection
              label="Slide deck"
              hint="PDF, PPT, or PPTX — converted to PDF for students"
              tone={SHEET_SECTION.tools}
              action={refreshingDeck ? <ActivityIndicator size="small" color={FACULTY_SHEET_COLOR.link} /> : null}
            >
              {deckPreviewUrl ? (
                <FacultyLectureDeckPreview pdfUrl={deckPreviewUrl} title={title || lecture?.title} />
              ) : null}
              <View style={localStyles.deckRow}>
                <Ionicons
                  name={deckAttached ? "document-text" : "cloud-upload-outline"}
                  size={22}
                  color={FACULTY_SHEET_COLOR.link}
                />
                <Text style={[localStyles.deckTitle, { color: native.label }]}>{deckAttached ? "Deck attached" : "No deck uploaded"}</Text>
              </View>
              <FacultySheetOutlineButton
                icon="cloud-upload-outline"
                label={deckAttached ? "Replace deck" : "Upload deck"}
                loading={uploading}
                disabled={uploading || removing}
                onPress={() => void pickAndUploadDeck()}
              />
              {deckAttached ? (
                <FacultySheetActionRow
                  icon="trash-outline"
                  label="Remove deck"
                  tone="danger"
                  loading={removing}
                  disabled={uploading || removing}
                  onPress={confirmRemoveDeck}
                />
              ) : null}
            </FacultySheetSection>
          ) : (
            <FacultySheetNotice message="Save the lecture first, then upload a slide deck from the action sheet." />
          )}

          <FacultySheetSection label="Student access" tone={SHEET_SECTION.review}>
            <FacultySheetToggleRow
              icon="eye-outline"
              title="Published"
              subtitle="Students can open this lecture"
              value={published}
              onValueChange={setPublished}
            />
            <FacultySheetToggleRow
              icon="download-outline"
              title="Allow download"
              subtitle="Let students download the PDF deck"
              value={allowDownload}
              disabled={createMode}
              onValueChange={setAllowDownload}
            />
          </FacultySheetSection>
        </KeyboardAwareForm>
      </FacultySheetContainer>
    </Modal>
  )
}

const localStyles = StyleSheet.create({
  deckRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  deckTitle: { flex: 1, fontSize: 15, fontWeight: "600" },
})