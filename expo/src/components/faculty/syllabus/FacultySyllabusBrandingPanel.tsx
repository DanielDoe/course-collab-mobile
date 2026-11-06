import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../../lib/api"
import { AppAlert } from "../../../lib/app-alert"
import { instructorApi, type InstructorSyllabus } from "../../../lib/instructor-api"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { useFacultyModuleStyles } from "../../../lib/faculty-themed-ui"
import { useNativeType } from "../../../lib/themed-module-theme"
import { useThemedNative } from "../../../context/AppearanceProvider"
import {
  resolveSyllabusAssetUrl,
  resolveUniversityBranding,
  universityBrandingLogoUri,
} from "../../../lib/syllabus"
import { COURSE_INFO_ACTION, COURSE_INFO_SYLLABUS_STATUS } from "../../../lib/course-info-color-theme"

type Props = {
  syllabus: InstructorSyllabus
  university?: string | null
  canEdit: boolean
  onUpdated: (syllabus: InstructorSyllabus) => void
  contentPad: { paddingBottom: number }
}

export function FacultySyllabusBrandingPanel({
  syllabus,
  university,
  canEdit,
  onUpdated,
  contentPad,
}: Props) {
  const { scope } = useFacultyScope()
  const styles = useFacultyModuleStyles()
  const native = useThemedNative()
  const type = useNativeType()
  const [uploading, setUploading] = useState(false)

  const branding = useMemo(() => resolveUniversityBranding(university), [university])
  const hasCustomLogo = Boolean(syllabus.logoUrl)
  const displayUri =
    resolveSyllabusAssetUrl(syllabus.logoUrl) ?? universityBrandingLogoUri(branding)

  async function pickAndUpload() {
    if (!scope || !canEdit) return
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      AppAlert.alert("Photos access", "Allow photo library access to upload a logo.")
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.92,
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    const name = asset.fileName ?? "logo.png"
    const mime = asset.mimeType ?? "image/png"

    setUploading(true)
    try {
      const res = await instructorApi.uploadSyllabusLogo(scope, {
        uri: asset.uri,
        name,
        type: mime,
      })
      onUpdated(res.syllabus)
      AppAlert.alert("Logo uploaded", "Custom logo replaces the university default on the student syllabus.")
    } catch (err) {
      AppAlert.alert("Upload failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setUploading(false)
    }
  }

  function removeLogo() {
    if (!scope || !canEdit || !hasCustomLogo) return
    AppAlert.alert("Remove custom logo", "Restore the university default logo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setUploading(true)
            try {
              const res = await instructorApi.deleteSyllabusLogo(scope)
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
            <Ionicons name="business-outline" size={18} color={COURSE_INFO_ACTION.ink} />
          </View>
          <View style={localStyles.headerCopy}>
            <Text style={[type.bodyEmphasis, { color: native.label }]}>Logo & branding</Text>
            <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>
              Shown at the top of the student syllabus. A custom upload replaces the university default.
            </Text>
          </View>
          <View
            style={[
              localStyles.chip,
              {
                backgroundColor: hasCustomLogo
                  ? COURSE_INFO_SYLLABUS_STATUS.published.bg
                  : native.secondaryGrouped,
              },
            ]}
          >
            <Text
              style={[
                localStyles.chipText,
                {
                  color: hasCustomLogo
                    ? COURSE_INFO_SYLLABUS_STATUS.published.text
                    : native.secondaryLabel,
                },
              ]}
            >
              {hasCustomLogo ? "Custom logo" : "University default"}
            </Text>
          </View>
        </View>

        <View style={[localStyles.previewGrid, { backgroundColor: native.secondaryGrouped }]}>
          <View style={localStyles.logoPreview}>
            {displayUri ? (
              <Image source={{ uri: displayUri }} style={localStyles.logoImage} resizeMode="contain" />
            ) : (
              <Text style={[type.caption, { color: native.secondaryLabel }]}>No logo</Text>
            )}
            {syllabus.logoFileName ? (
              <Text style={[type.caption, { color: native.secondaryLabel, marginTop: 8 }]} numberOfLines={1}>
                {syllabus.logoFileName}
              </Text>
            ) : null}
          </View>
          <View style={localStyles.identity}>
            <Text style={[type.caption, localStyles.identityLabel, { color: native.secondaryLabel }]}>
              University identity
            </Text>
            <Text style={[type.bodyEmphasis, { color: native.label }]}>{branding.displayName}</Text>
            <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>
              Header colors stay with the university brand. The logo above is what students see first.
            </Text>
            <View style={localStyles.swatches}>
              <View style={localStyles.swatchRow}>
                <View style={[localStyles.dot, { backgroundColor: branding.primaryColor }]} />
                <Text style={[type.caption, { color: native.label }]}>Primary</Text>
              </View>
              <View style={localStyles.swatchRow}>
                <View style={[localStyles.dot, { backgroundColor: branding.secondaryColor }]} />
                <Text style={[type.caption, { color: native.label }]}>Secondary</Text>
              </View>
            </View>
          </View>
        </View>

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
                  {hasCustomLogo ? "Replace logo" : "Choose logo image"}
                </Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>
                  PNG or JPG · max 5 MB
                </Text>
              </>
            )}
          </Pressable>
        ) : null}

        {canEdit && hasCustomLogo ? (
          <Pressable
            style={[localStyles.removeBtn, { borderColor: native.separator }]}
            onPress={removeLogo}
            disabled={uploading}
            accessibilityRole="button"
          >
            <Ionicons name="close-circle-outline" size={16} color={native.label} />
            <Text style={[type.bodyEmphasis, { color: native.label }]}>Remove custom logo</Text>
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
  previewGrid: { borderRadius: 12, padding: 12, gap: 12 },
  logoPreview: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  logoImage: { width: "100%", height: 96, maxWidth: 220 },
  identity: { gap: 6 },
  identityLabel: { fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  swatchRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  uploadZone: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderStyle: "dashed",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
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
