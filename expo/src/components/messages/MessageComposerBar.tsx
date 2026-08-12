import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { ComposerSendButton } from "../theme/ComposerSendButton"
import { LiquidGlassSearchIconButton } from "../theme/LiquidGlassSearchField"
import {
  GLASS_FLOATING_PILL_HEIGHT,
  GlassFloatingPill,
} from "../theme/GlassFloatingPill"
import { LIQUID_GLASS_SEARCH_DOCK_FLOAT_GAP, LIQUID_GLASS_SEARCH_DOCK_H_INSET } from "../theme/GlassBottomSearchDock"
import { useGlassChromeActive } from "../theme/GlassSurface"

export const MESSAGE_COMPOSER_DOCK_HEIGHT =
  GLASS_FLOATING_PILL_HEIGHT + LIQUID_GLASS_SEARCH_DOCK_FLOAT_GAP * 2

const ICON_SIZE = 32

type Props = {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onAttach: () => void
  placeholder?: string
  sending?: boolean
  uploading?: boolean
  canSend?: boolean
  bottomInset?: number
}

/** Liquid Glass message composer — + attach and send integrated inside the glass pill. */
export function MessageComposerBar({
  value,
  onChange,
  onSend,
  onAttach,
  placeholder = "Message…",
  sending = false,
  uploading = false,
  canSend = false,
  bottomInset = 10,
}: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const glassActive = useGlassChromeActive()
  const sendActive = canSend && !sending && !uploading
  const textColor = tokens.isDark ? "#FFFFFF" : tokens.text
  const placeholderColor = tokens.isDark ? "rgba(235, 235, 245, 0.42)" : "rgba(60, 60, 67, 0.42)"
  const bottomPad = Math.max(bottomInset, LIQUID_GLASS_SEARCH_DOCK_FLOAT_GAP)

  return (
    <View
      style={[styles.host, { paddingBottom: bottomPad }]}
      pointerEvents="box-none"
    >
      <GlassFloatingPill>
        <View style={styles.row}>
          {glassActive ? (
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
          )}

          <TextInput
            style={[styles.input, { color: textColor }]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={placeholderColor}
            multiline
            maxLength={8000}
            editable={!sending}
            selectionColor={tokens.accent}
          />

          <ComposerSendButton
            active={sendActive}
            sending={sending}
            onPress={onSend}
            testID="message-composer-send"
          />
        </View>
      </GlassFloatingPill>
    </View>
  )
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 25,
    paddingHorizontal: LIQUID_GLASS_SEARCH_DOCK_H_INSET,
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
})
