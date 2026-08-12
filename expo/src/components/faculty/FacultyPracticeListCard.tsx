import type { ReactNode } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons, type IoniconName } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import type { SolidListThumb } from "../../lib/solid-list-thumb"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

export function FacultyPracticeListCard({
  thumb,
  icon,
  thumbChild,
  title,
  subtitle,
  meta,
  pills,
  trailing,
  onPress,
}: {
  thumb: SolidListThumb
  icon?: IoniconName
  thumbChild?: ReactNode
  title: string
  subtitle?: string
  meta?: string
  pills?: ReactNode
  trailing?: ReactNode
  onPress?: () => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  const body = (
    <View style={styles.cardTop}>
      <SolidListThumbTile thumb={thumb} icon={icon} size="compact">
        {thumbChild}
      </SolidListThumbTile>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={2}>
            {title}
          </Text>
          {trailing ??
            (onPress ? <Ionicons name="chevron-forward" size={18} color={native.tertiaryLabel} /> : null)}
        </View>
        {subtitle ? (
          <Text style={[type.caption, styles.subtitle, { color: native.secondaryLabel }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={[type.caption, styles.meta, { color: native.tertiaryLabel }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        {pills ? <View style={styles.pills}>{pills}</View> : null}
      </View>
    </View>
  )

  return (
    <View
      style={[
        styles.card,
        tokens.cardShadow,
        { backgroundColor: native.secondaryGrouped, borderColor: tokens.border },
      ]}
    >
      {onPress ? (
        <Pressable
          style={({ pressed }) => [styles.press, { opacity: pressed ? NATIVE.pressedOpacity : 1 }]}
          onPress={onPress}
        >
          {body}
        </Pressable>
      ) : (
        <View style={styles.press}>{body}</View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  press: { padding: 16 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  copy: { flex: 1, gap: 4, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  title: { flex: 1, fontSize: 18, letterSpacing: -0.2 },
  subtitle: { lineHeight: 18, fontWeight: "600" },
  meta: { lineHeight: 16, fontWeight: "600" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
})
