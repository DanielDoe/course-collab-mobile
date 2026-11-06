import type { ReactNode } from "react"
import { useEffect, useMemo } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { motion, timing, useAppReducedMotion } from "../../lib/motion"
import { NATIVE } from "../../constants/faculty-native-theme"
import { facultySettingsRowThumb } from "../../lib/faculty-settings-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

type Props = {
  id: string
  title: string
  icon: keyof typeof Ionicons.glyphMap
  summary?: string
  expanded: boolean
  onToggle: (id: string) => void
  children: ReactNode
}

function useSettingsAccordionStyles() {
  const { native, type } = useModuleTheme()
  return useMemo(
    () =>
      StyleSheet.create({
        section: {
          borderRadius: NATIVE.sectionRadius,
          overflow: "hidden",
          backgroundColor: native.secondaryGrouped,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 14,
          paddingVertical: 13,
          minHeight: 52,
          backgroundColor: native.secondaryGrouped,
        },
        headerPressed: {
          backgroundColor: native.fill,
        },
        iconTileWrap: { marginTop: 1 },
        headerCopy: { flex: 1, gap: 2 },
        title: { ...type.bodyEmphasis, color: native.label },
        summary: { ...type.caption, color: native.secondaryLabel },
        body: {
          paddingHorizontal: 14,
          paddingBottom: 14,
          gap: 12,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: native.separator,
          backgroundColor: native.secondaryGrouped,
        },
      }),
    [native, type],
  )
}

export function FacultySettingsAccordion({
  id,
  title,
  icon,
  summary,
  expanded,
  onToggle,
  children}: Props) {
  const { native } = useModuleTheme()
  const styles = useSettingsAccordionStyles()
  const reduceMotion = useAppReducedMotion()
  const thumb = facultySettingsRowThumb(icon)
  const chevron = useSharedValue(expanded ? 1 : 0)

  useEffect(() => {
    chevron.value = withTiming(expanded ? 1 : 0, {
      duration: reduceMotion ? 0 : motion.normal,
      easing: timing.fadeIn.easing,
    })
  }, [expanded, chevron, reduceMotion])

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevron.value * 90}deg` }]}))

  return (
    <View style={styles.section}>
      <Pressable
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
        onPress={() => onToggle(id)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={styles.iconTileWrap}>
          <SolidListThumbTile thumb={thumb} icon={icon} size="compact" />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{title}</Text>
          {!expanded && summary ? <Text style={styles.summary}>{summary}</Text> : null}
        </View>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-forward" size={18} color={native.tertiaryLabel} />
        </Animated.View>
      </Pressable>
      {expanded ? (
        <Animated.View
          style={styles.body}
          entering={reduceMotion ? undefined : FadeIn.duration(motion.fast)}
          exiting={reduceMotion ? undefined : FadeOut.duration(motion.fast)}
          layout={reduceMotion ? undefined : LinearTransition.duration(motion.fast)}
        >
          {children}
        </Animated.View>
      ) : null}
    </View>
  )
}
