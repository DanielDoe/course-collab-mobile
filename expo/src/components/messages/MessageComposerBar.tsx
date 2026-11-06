import { startTransition, useEffect, useState } from "react"
import {
  plainTextHasLocalDeviceFileUrl,
  stripLocalDeviceFileUrls,
} from "../../lib/message-local-file"
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { ComposerSendButton } from "../theme/ComposerSendButton"
import { LiquidGlassSearchIconButton } from "../theme/LiquidGlassSearchField"
import {
  GLASS_FLOATING_PILL_HEIGHT,
  GlassFloatingPill,
} from "../theme/GlassFloatingPill"
import { LIQUID_GLASS_SEARCH_DOCK_FLOAT_GAP } from "../theme/GlassBottomSearchDock"
import { useGlassChromeActive } from "../theme/GlassSurface"
import { useMessagesLayout } from "../../hooks/useMessagesLayout"

export const MESSAGE_COMPOSER_DOCK_HEIGHT =
  GLASS_FLOATING_PILL_HEIGHT + LIQUID_GLASS_SEARCH_DOCK_FLOAT_GAP * 2

const ICON_SIZE = 32

type Props = {
  /** External draft (e.g. quoted reply / course import). Synced into local text. */
  value?: string
  onChange?: (value: string) => void
  onSend: (text: string) => void
  onAttach: () => void
  /** iPhone pasted a file:// path instead of the photo. Parent uploads the clipboard image. */
  onRecoverPastedPhoto?: () => void
  placeholder?: string
  sending?: boolean
  uploading?: boolean
  /** Extra send enablement (e.g. pending attachments). */
  hasAttachments?: boolean
  /** Course question attached for discussion. */
  hasCourseImport?: boolean
  /** iMessage-style edit mode — original text loaded into composer. */
  editing?: boolean
  onCancelEdit?: () => void
  bottomInset?: number
}

/** Liquid Glass message composer — + attach and send integrated inside the glass pill. */
export function MessageComposerBar({
  value = "",
  onChange,
  onSend,
  onAttach,
  onRecoverPastedPhoto,
  placeholder = "Message…",
  sending = false,
  uploading = false,
  hasAttachments = false,
  hasCourseImport = false,
  editing = false,
  onCancelEdit,
  bottomInset = 10,
}: Props) {
  const tokens = useAppThemeTokens()
  const glassActive = useGlassChromeActive()
  const layout = useMessagesLayout()
  const [text, setText] = useState(value)
  const sendActive =
    (text.trim().length > 0 || (!editing && (hasAttachments || hasCourseImport))) && !sending && !uploading
  const composerPlaceholder = editing
    ? "Edit message…"
    : hasCourseImport
      ? "Add a note about this question…"
      : placeholder
  const textColor = tokens.isDark ? "#FFFFFF" : tokens.text
  const placeholderColor = tokens.isDark ? "rgba(235, 235, 245, 0.42)" : "rgba(60, 60, 67, 0.42)"
  const bottomPad = Math.max(bottomInset, LIQUID_GLASS_SEARCH_DOCK_FLOAT_GAP)

  useEffect(() => {
    setText(value)
  }, [value])

  function handleChange(next: string) {
    if (plainTextHasLocalDeviceFileUrl(next) && !plainTextHasLocalDeviceFileUrl(text)) {
      const cleaned = stripLocalDeviceFileUrls(next)
      setText(cleaned)
      startTransition(() => onChange?.(cleaned))
      onRecoverPastedPhoto?.()
      return
    }
    setText(next)
    startTransition(() => onChange?.(next))
  }

  function handleSend() {
    if (!sendActive) return
    const payload = text
    onChange?.(payload)
    onSend(payload)
    setText("")
    onChange?.("")
  }

  return (
    <View
      style={[styles.host, { paddingBottom: bottomPad, paddingHorizontal: layout.composerHorizontalInset }]}
      pointerEvents="box-none"
    >
      {editing ? (
        <View style={[styles.editBanner, { borderBottomColor: tokens.accentBorder }]}>
          <Text style={[styles.editBannerText, { color: tokens.accent }]}>Editing message</Text>
          <Pressable onPress={onCancelEdit} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancel edit">
            <Ionicons name="close-circle" size={18} color={tokens.accent} />
          </Pressable>
        </View>
      ) : null}
      <GlassFloatingPill>
        <View style={styles.row}>
          {!editing ? (
            glassActive ? (
              uploading ? (
                <View style={styles.iconSlot}>
                  <ActivityIndicator size="small" color={tokens.accent} />
                </View>
              ) : (
                <LiquidGlassSearchIconButton
                  icon="add"
                  onPress={onAttach}
                  accessibilityLabel="Add attachment"
                />
              )
            ) : (
              <Pressable
                style={styles.iconPressable}
                onPress={onAttach}
                disabled={uploading || sending}
                accessibilityRole="button"
                accessibilityLabel="Add attachment"
                hitSlop={4}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={tokens.accent} />
                ) : (
                  <Ionicons name="add" size={22} color={tokens.accent} />
                )}
              </Pressable>
            )
          ) : (
            <Pressable
              style={styles.iconPressable}
              onPress={onCancelEdit}
              accessibilityRole="button"
              accessibilityLabel="Cancel edit"
              hitSlop={4}
            >
              <Ionicons name="close" size={22} color={tokens.accent} />
            </Pressable>
          )}

          <TextInput
            style={[styles.input, { color: textColor }]}
            value={text}
            onChangeText={handleChange}
            placeholder={composerPlaceholder}
            placeholderTextColor={placeholderColor}
            multiline
            maxLength={8000}
            editable={!sending}
            selectionColor={tokens.accent}
            keyboardAppearance={tokens.isDark ? "dark" : "light"}
            blurOnSubmit={false}
            scrollEnabled
            textAlignVertical="center"
          />

          <ComposerSendButton
            active={sendActive}
            sending={sending}
            onPress={handleSend}
            testID="message-composer-send"
          />
        </View>
      </GlassFloatingPill>
    </View>
  )
}

const styles = StyleSheet.create({
  host: {
    paddingTop: LIQUID_GLASS_SEARCH_DOCK_FLOAT_GAP,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: 36,
  },
  iconSlot: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPressable: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: Platform.OS === "ios" ? 6 : 4,
    paddingHorizontal: 4,
  },
  editBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 6,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  editBannerText: {
    fontSize: 13,
    fontWeight: "600",
  },
})
