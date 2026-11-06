import { useState } from "react"
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import * as DocumentPicker from "expo-document-picker"
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../../lib/api"
import { AppAlert } from "../../../lib/app-alert"
import { instructorApi, type InstructorSyllabus } from "../../../lib/instructor-api"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { useFacultyModuleStyles } from "../../../lib/faculty-themed-ui"
import { useNativeType } from "../../../lib/themed-module-theme"
import { useThemedNative } from "../../../context/AppearanceProvider"
import { COURSE_INFO_ACTION, COURSE_INFO_SYLLABUS_STATUS } from "../../../lib/course-info-color-theme"
import { resolveSyllabusAssetUrl } from "../../../lib/syllabus"

type Props = {
  syllabus: InstructorSyllabus
  canEdit: boolean
  onUpdated: (syllabus: InstructorSyllabus) => void
  contentPad: { paddingBottom: number }
}

export function FacultySyllabusPdfPanel({ syllabus, canEdit, onUpdated, contentPad }: Props) {
  const { scope } = useFacultyScope()
  const styles = useFacultyModuleStyles()
  const native = useThemedNative()
  const type = useNativeType()
  const [uploading, setUploading] = useState(false)

  const hasPdf = Boolean(syllabus.pdfUrl)
  const pdfUri = resolveSyllabusAssetUrl(syllabus.pdfUrl)

  async function pickAndUpload() {
    if (!scope || !canEdit) return
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    if (!asset.name?.toLowerCase().endsWith(".pdf") && asset.mimeType !== "application/pdf") {
      AppAlert.alert("PDF only", "Choose a PDF syllabus file.")
      return
    }

    setUploading(true)
    try {
      const res = await instructorApi.uploadSyllabusDocument(scope, {
        uri: asset.uri,
        name: asset.name ?? "syllabus.pdf",
        type: "application/pdf",
      })
      onUpdated(res.syllabus)
      AppAlert.alert("PDF uploaded", "Students will open this file once you publish.")
    } catch (err) {
      AppAlert.alert("Upload failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setUploading(false)
    }
  }

  function removePdf() {
    if (!scope || !canEdit) return
    AppAlert.alert("Remove PDF", "Switch back to structured syllabus sections?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setUploading(true)
            try {
              const res = await instructorApi.deleteSyllabusDocument(scope)
              onUpdated(res.syllabus)
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
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, contentPad, localStyles.pad]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.card, localStyles.card]}>
        <View style={localStyles.headerRow}>
          <View style={[localStyles.iconWell, { backgroundColor: COURSE_INFO_ACTION.fill }]}>
            <Ionicons name="document-text-outline" size={18} color={COURSE_INFO_ACTION.ink} />
          </View>
          <View style={localStyles.headerCopy}>
            <Text style={[type.bodyEmphasis, { color: native.label }]}>Syllabus PDF</Text>
            <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>
              Students open the uploaded file in the in-app reader instead of structured sections.
            </Text>
          </View>
          <View
            style={[
              localStyles.chip,
              {
                backgroundColor: hasPdf
                  ? COURSE_INFO_SYLLABUS_STATUS.published.bg
                  : native.secondaryGrouped,
              },
            ]}
          >
            <Text
              style={[
                localStyles.chipText,
                { color: hasPdf ? COURSE_INFO_SYLLABUS_STATUS.published.text : native.secondaryLabel },
              ]}
            >
              {hasPdf ? "PDF attached" : "No PDF"}
            </Text>
          </View>
        </View>

        {hasPdf ? (
          <View style={[localStyles.fileRow, { backgroundColor: native.secondaryGrouped }]}>
            <Ionicons name="document-outline" size={22} color={native.secondaryLabel} />
            <View style={localStyles.fileCopy}>
              <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={1}>
                {syllabus.pdfFileName || "syllabus.pdf"}
              </Text>
              <Text style={[type.caption, { color: native.secondaryLabel }]}>
                Ready for students once you publish
              </Text>
            </View>
            {pdfUri ? (
              <Pressable
                onPress={() => void Linking.openURL(pdfUri)}
                accessibilityRole="link"
                style={localStyles.linkBtn}
              >
                <Text style={[type.body, { color: COURSE_INFO_ACTION.fill, fontWeight: "600" }]}>Open</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {canEdit ? (
          <Pressable
            style={[localStyles.uploadZone, { borderColor: native.separator }]}
            onPress={() => void pickAndUpload()}
            disabled={uploading}
            accessibilityRole="button"
          >
            {uploading ? (
              <ActivityIndicator color={COURSE_INFO_ACTION.fill} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={28} color={COURSE_INFO_ACTION.fill} />
                <Text style={[type.bodyEmphasis, { color: native.label }]}>
                  {hasPdf ? "Replace PDF" : "Upload PDF"}
                </Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>PDF only</Text>
              </>
            )}
          </Pressable>
        ) : null}

        {canEdit && hasPdf ? (
          <Pressable
            style={[localStyles.removeBtn, { borderColor: native.separator }]}
            onPress={removePdf}
            disabled={uploading}
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={16} color={native.label} />
            <Text style={[type.bodyEmphasis, { color: native.label }]}>Remove PDF</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  )
}

const localStyles = StyleSheet.create({
  pad: { gap: 10 },
  card: { gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, gap: 4, minWidth: 0 },
  chip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { fontSize: 10, fontWeight: "700" },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    padding: 12,
  },
  fileCopy: { flex: 1, minWidth: 0, gap: 2 },
  linkBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  uploadZone: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderStyle: "dashed",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 12,
  },
})
