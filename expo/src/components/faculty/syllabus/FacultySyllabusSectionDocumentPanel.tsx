import { useState } from "react"
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native"
import * as DocumentPicker from "expo-document-picker"
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../../lib/api"
import { AppAlert } from "../../../lib/app-alert"
import { instructorApi, type InstructorSyllabus, type SyllabusSection } from "../../../lib/instructor-api"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { useNativeType } from "../../../lib/themed-module-theme"
import { useThemedNative } from "../../../context/AppearanceProvider"
import { resolveSyllabusAssetUrl } from "../../../lib/syllabus"
import { COURSE_INFO_ACTION } from "../../../lib/course-info-color-theme"

type Props = {
  section: SyllabusSection
  onSyllabusUpdated: (syllabus: InstructorSyllabus) => void
}

export function FacultySyllabusSectionDocumentPanel({ section, onSyllabusUpdated }: Props) {
  const { scope } = useFacultyScope()
  const native = useThemedNative()
  const type = useNativeType()
  const [uploading, setUploading] = useState(false)

  const documentUrl = resolveSyllabusAssetUrl(section.content.documentUrl)
  const hasDocument = Boolean(section.content.documentUrl)

  async function pickAndUpload() {
    if (!scope) return
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]

    setUploading(true)
    try {
      const res = await instructorApi.uploadSyllabusSectionDocument(scope, section.sectionId, {
        uri: asset.uri,
        name: asset.name ?? "curriculum-vitae.pdf",
        type: "application/pdf",
      })
      onSyllabusUpdated(res.syllabus)
      AppAlert.alert("CV uploaded", "Students can open your CV from the Curriculum Vitae section.")
    } catch (err) {
      AppAlert.alert("Upload failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setUploading(false)
    }
  }

  function removeDocument() {
    if (!scope) return
    AppAlert.alert("Remove CV", "Remove the uploaded curriculum vitae PDF?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setUploading(true)
            try {
              const res = await instructorApi.deleteSyllabusSectionDocument(scope, section.sectionId)
              onSyllabusUpdated(res.syllabus)
            } catch (err) {
              AppAlert.alert("Could not remove", err instanceof ApiError ? err.message : "Try again.")
            } finally {
              setUploading(false)
            }
          })()
        },
      },
    ])
  }

  return (
    <View style={[styles.card, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
      <View style={styles.header}>
        <Ionicons name="document-text-outline" size={20} color={COURSE_INFO_ACTION.fill} />
        <View style={styles.copy}>
          <Text style={[type.bodyEmphasis, { color: native.label }]}>Curriculum vitae (PDF)</Text>
          <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>
            Upload your CV or résumé for students to open from this section.
          </Text>
        </View>
      </View>

      {hasDocument ? (
        <View style={[styles.fileRow, { backgroundColor: native.groupedBackground }]}>
          <Text style={[type.body, { color: native.label, flex: 1 }]} numberOfLines={1}>
            {section.content.documentFileName || "curriculum-vitae.pdf"}
          </Text>
          {documentUrl ? (
            <Pressable onPress={() => void Linking.openURL(documentUrl)} accessibilityRole="link">
              <Text style={[type.body, { color: COURSE_INFO_ACTION.fill, fontWeight: "600" }]}>Preview</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Pressable
        style={[styles.uploadBtn, { backgroundColor: COURSE_INFO_ACTION.fill }]}
        onPress={() => void pickAndUpload()}
        disabled={uploading}
        accessibilityRole="button"
      >
        {uploading ? (
          <ActivityIndicator color={COURSE_INFO_ACTION.ink} size="small" />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={16} color={COURSE_INFO_ACTION.ink} />
            <Text style={[type.bodyEmphasis, { color: COURSE_INFO_ACTION.ink }]}>
              {hasDocument ? "Replace CV PDF" : "Upload CV PDF"}
            </Text>
          </>
        )}
      </Pressable>

      {hasDocument ? (
        <Pressable
          style={[styles.removeBtn, { borderColor: native.separator }]}
          onPress={removeDocument}
          disabled={uploading}
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={16} color={native.label} />
          <Text style={[type.bodyEmphasis, { color: native.label }]}>Remove CV</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  header: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  copy: { flex: 1, gap: 4 },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 10,
  },
})
