import type { ReactNode } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import type { SolidListThumb } from "../../lib/solid-list-thumb"
import { solidListThumb } from "../../lib/solid-list-thumb"
import type { LectureCardKind } from "../lectures/lecture-list-utils"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

export type { SolidListThumb as CoraNavSolidThumb }

export type CoraNavCardItem = {
  id: string
  title: string
  subtitle: string
  meta: string
  icon: keyof typeof Ionicons.glyphMap
  kind?: LectureCardKind
  solidThumb?: SolidListThumb
}

type Props = {
  item: CoraNavCardItem
  index: number
  onPress?: () => void
}

export function CoraNavListCard({ item, index, onPress }: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const kind = item.kind ?? "available"
  const solidThumb = item.solidThumb ?? solidListThumb(index, { locked: kind === "locked" })
  const accentColor = solidThumb.label
  const interactive = Boolean(onPress)

  const body = (
    <>
      <SolidListThumbTile thumb={solidThumb} icon={item.icon} />

      <View style={styles.copy}>
        <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.subtitle.trim() ? (
          <Text style={[type.caption, styles.subtitle, { color: native.secondaryLabel }]} numberOfLines={2}>
            {item.subtitle}
          </Text>
        ) : null}
        <View style={styles.statusRow}>
          <Ionicons name="ellipse" size={8} color={accentColor} style={styles.statusDot} />
          <Text style={[type.footnote, styles.statusText, { color: accentColor }]} numberOfLines={1}>
            {item.meta}
          </Text>
        </View>
      </View>

      {interactive ? (
        <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} style={styles.chevron} />
      ) : null}
    </>
  )

  if (!interactive) {
    return (
      <View
        style={[
          styles.card,
          tokens.cardShadow,
          { backgroundColor: native.secondaryGrouped, borderColor: tokens.border },
        ]}
        accessibilityLabel={`${item.title}, ${item.meta}`}
      >
        {body}
      </View>
    )
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        tokens.cardShadow,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: tokens.border,
          opacity: pressed ? NATIVE.pressedOpacity : 1,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.meta}`}
    >
      {body}
    </Pressable>
  )
}

export function CoraNavCardList({ children }: { children: ReactNode }) {
  return <View style={styles.list}>{children}</View>
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 88,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingVertical: 1,
  },
  title: {
    lineHeight: 20,
  },
  subtitle: {
    lineHeight: 16,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 16,
  },
  statusDot: {
    marginHorizontal: 2,
  },
  statusText: {
    fontWeight: "600",
  },
  chevron: {
    flexShrink: 0,
    marginTop: 2,
  },
})
