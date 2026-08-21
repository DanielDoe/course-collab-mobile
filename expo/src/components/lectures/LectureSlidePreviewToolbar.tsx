import type { ReactNode } from "react"
import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppThemeTokens, useShellChrome } from "../../context/AppearanceProvider"
import { NATIVE_HEADER_BAR_HEIGHT } from "../shell/shell-shared"
import { LectureToolsToolbarButton } from "./LectureToolsToolbarButton"

type Props = {
  backLabel?: string
  title?: string
  onBack: () => void
  /** Opens the lecture tools action sheet from the trailing menu icon. */
  onMenuPress?: () => void
  trailing?: ReactNode
}

/** Side slot width — keeps the title truly centered like iOS navigation bars. */
const SIDE_SLOT_WIDTH = 100
const TRAILING_SLOT_WIDTH = 88

/** Native toolbar for immersive lecture slide preview — respects appearance theme + dark mode. */
export function LectureSlidePreviewToolbar({
  backLabel = "Lectures",
  title = "Lecture",
  onBack,
  onMenuPress,
  trailing,
}: Props) {
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const chrome = useShellChrome()

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top,
          backgroundColor: chrome.headerBg,
          borderBottomColor: chrome.headerBorder,
        },
      ]}
    >
      <View style={[styles.bar, { minHeight: NATIVE_HEADER_BAR_HEIGHT }]}>
        <Pressable
          style={({ pressed }) => [
            styles.sideSlot,
            styles.backSlot,
            pressed && { backgroundColor: tokens.native.fill },
          ]}
          onPress={onBack}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Back to ${backLabel}`}
        >
          <Ionicons name="chevron-back" size={22} color={tokens.accent} />
          <Text style={[styles.backText, { color: tokens.accent }]} numberOfLines={1}>
            {backLabel}
          </Text>
        </Pressable>

        <View style={styles.titleWrap} pointerEvents="none">
          <Text
            style={[styles.title, { color: chrome.label }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
        </View>

        <View style={[styles.sideSlot, styles.trailingSlot]}>
          {trailing ?? (onMenuPress ? <LectureToolsToolbarButton onPress={onMenuPress} /> : null)}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexShrink: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
    ...Platform.select({
      android: { elevation: 12 },
      default: {},
    }),
  },
  bar: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  sideSlot: {
    width: SIDE_SLOT_WIDTH,
    flexShrink: 0,
    zIndex: 2,
  },
  backSlot: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 2,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 0,
  },
  backText: {
    fontSize: 17,
    fontWeight: "400",
    flexShrink: 1,
  },
  titleWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
            paddingHorizontal: Math.max(SIDE_SLOT_WIDTH, TRAILING_SLOT_WIDTH) + 8,
  },
  title: {
    width: "100%",
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  trailingSlot: {
    width: TRAILING_SLOT_WIDTH,
    marginLeft: "auto",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 4,
  },
})
