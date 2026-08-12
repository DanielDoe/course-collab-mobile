import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import * as DocumentPicker from "expo-document-picker"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi, type InstructorLecture } from "../../lib/instructor-api"
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

type Props = {
  visible: boolean
  lecture: InstructorLecture | null
  createMode?: boolean
  defaultWeek?: number
  onClose: () => void
  onSaved: () => void
}

function hasDeck(lecture: InstructorLecture): boolean {
  return Boolean(lecture.pdf_url || lecture.document_url)
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
  const { scope } = useFacultyScope()

  const [title, setTitle] = useState("")
  const [week, setWeek] = useState("")
  const [description, setDescription] = useState("")
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
      if (data.lecture) syncDeckFromLecture(data.lecture)
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
    if (!scope) return
    const weekNum = Number.parseInt(week, 10)
    if (!title.trim()) {
      setError("Title is required.")
      return
    }
    if (!Number.isFinite(weekNum)) {
      setError("Week must be a number.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const payload = {
        title: title.trim(),
        week: weekNum,
        description: description.trim() || undefined,
        is_published: published,
        ...(createMode ? {} : { allow_download: allowDownload })}
      if (createMode) {
        await instructorApi.createLecture(scope, {
          ...payload,
          is_published: published})
      } else {
        await instructorApi.updateLecture(scope, lectureId, {
          ...payload,
          allow_download: allowDownload})
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save lecture.")
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

  async function removeDeck() {
    if (!scope || createMode) return
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

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          {error ? <FacultySheetErrorBanner message={error} /> : null}

          <FacultySheetSection
            label="Details"
            hint={createMode ? `Week ${defaultWeek}` : `Week ${lecture?.week ?? week}`}
            tone={SHEET_SECTION.edit}
          >
            <FacultySheetField label="Title">
              <TextInput style={collabSheetStyles.fieldInput} value={title} onChangeText={setTitle} />
            </FacultySheetField>
            <FacultySheetField label="Week">
              <TextInput
                style={collabSheetStyles.fieldInput}
                value={week}
                onChangeText={setWeek}
                keyboardType="number-pad"
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
                  onPress={() => void removeDeck()}
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
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const localStyles = StyleSheet.create({
  deckRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  deckTitle: { flex: 1, fontSize: 15, fontWeight: "600" },
})