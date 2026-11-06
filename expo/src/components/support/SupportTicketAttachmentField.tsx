import { useState, type Dispatch, type SetStateAction } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
import { Ionicons } from "@/components/icons/AppIcon"
import { AppAlert } from "../../lib/app-alert"
import { ApiError } from "../../lib/api"
import { formatUploadBytes, workspaceUploadError } from "../../lib/workspace-upload"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"

export type SupportTicketAttachmentDraft = {
  id: string
  url: string
  name: string
  mime?: string
  size?: number
  uploading?: boolean
}

type Props = {
  attachments: SupportTicketAttachmentDraft[]
  onChange: Dispatch<SetStateAction<SupportTicketAttachmentDraft[]>>
  uploadFile: (file: {
    uri: string
    name: string
    mimeType: string
  }) => Promise<{ url: string; name?: string; mime?: string; size?: number }>
  disabled?: boolean
}

/** Shared screenshot/file picker for student and faculty support tickets. */
export function SupportTicketAttachmentField({ attachments, onChange, uploadFile, disabled }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const [busy, setBusy] = useState(false)

  async function uploadPickedFile(uri: string, name: string, mime: string, size?: number) {
    const invalid = workspaceUploadError({ name, mime, size })
    if (invalid) {
      AppAlert.alert("File not supported", invalid)
      return
    }
    const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    onChange((prev) => [...prev, { id, url: "", name, mime, size, uploading: true }])
    setBusy(true)
    try {
      const uploaded = await uploadFile({ uri, name, mimeType: mime })
      onChange((prev) =>
        prev.map((file) =>
          file.id === id
            ? {
                id,
                url: uploaded.url,
                name: uploaded.name ?? name,
                mime: uploaded.mime ?? mime,
                size: uploaded.size ?? size,
              }
            : file,
        ),
      )
    } catch (err) {
      onChange((prev) => prev.filter((file) => file.id !== id))
      AppAlert.alert("Upload failed", err instanceof ApiError ? err.message : "Could not attach this file.")
    } finally {
      setBusy(false)
    }
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ["application/pdf", "image/*"],
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    await uploadPickedFile(
      asset.uri,
      asset.name ?? "attachment",
      asset.mimeType ?? "application/octet-stream",
      asset.size,
    )
  }

  async function pickPhoto(fromCamera: boolean) {
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) {
        AppAlert.alert("Camera access", "Allow camera access to attach a screenshot.")
        return
      }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        AppAlert.alert("Photos access", "Allow photo library access to attach a screenshot.")
        return
      }
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: false })
      : await ImagePicker.launchImageLibraryAsync({
          quality: 0.85,
          allowsEditing: false,
          mediaTypes: ["images"],
        })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    await uploadPickedFile(
      asset.uri,
      asset.fileName ?? `screenshot-${Date.now()}.jpg`,
      asset.mimeType ?? "image/jpeg",
      asset.fileSize,
    )
  }

  const locked = disabled || busy || attachments.some((file) => file.uploading)

  return (
    <View style={styles.wrap}>
      <View style={styles.attachRow}>
        <Pressable
          style={[styles.attachBtn, { borderColor: tokens.border, backgroundColor: native.fill }]}
          onPress={() => void pickPhoto(false)}
          disabled={locked}
          accessibilityRole="button"
          accessibilityLabel="Choose photo"
        >
          <Ionicons name="images-outline" size={16} color={tokens.accent} />
          <Text style={[type.caption, { color: tokens.text }]}>Choose photo</Text>
        </Pressable>
        <Pressable
          style={[styles.attachBtn, { borderColor: tokens.border, backgroundColor: native.fill }]}
          onPress={() => void pickPhoto(true)}
          disabled={locked}
          accessibilityRole="button"
          accessibilityLabel="Take photo"
        >
          <Ionicons name="camera-outline" size={16} color={tokens.accent} />
          <Text style={[type.caption, { color: tokens.text }]}>Take photo</Text>
        </Pressable>
        <Pressable
          style={[styles.attachBtn, { borderColor: tokens.border, backgroundColor: native.fill }]}
          onPress={() => void pickFile()}
          disabled={locked}
          accessibilityRole="button"
          accessibilityLabel="Choose file"
        >
          <Ionicons name="document-outline" size={16} color={tokens.accent} />
          <Text style={[type.caption, { color: tokens.text }]}>Choose file</Text>
        </Pressable>
      </View>
      {attachments.map((file) => (
        <View
          key={file.id}
          style={[styles.attachChip, { backgroundColor: native.fill, borderColor: tokens.border }]}
        >
          <View style={styles.chipCopy}>
            <Text style={[type.caption, { color: tokens.text }]} numberOfLines={1}>
              {file.name}
            </Text>
            <Text style={[type.caption, { color: tokens.textMuted }]}>
              {[file.mime, formatUploadBytes(file.size)].filter(Boolean).join(" · ") || "Attachment"}
            </Text>
          </View>
          {file.uploading ? (
            <ActivityIndicator size="small" color={tokens.accent} />
          ) : (
            <Pressable
              onPress={() => onChange((prev) => prev.filter((item) => item.id !== file.id))}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${file.name}`}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={native.secondaryLabel} />
            </Pressable>
          )}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  attachRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 40,
  },
  attachChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipCopy: { flex: 1, minWidth: 0 },
})
