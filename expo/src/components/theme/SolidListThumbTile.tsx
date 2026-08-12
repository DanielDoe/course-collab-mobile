import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { Ionicons, type IoniconName } from "@/components/icons/AppIcon"
import type { SolidListThumb } from "../../lib/solid-list-thumb"

type Props = {
  thumb: SolidListThumb
  icon?: IoniconName
  size?: "list" | "compact"
  iconSize?: number
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
}

const SIZES = {
  list: { tile: 56, radius: 14, icon: 24 },
  compact: { tile: 30, radius: 8, icon: 16 },
} as const

export function SolidListThumbTile({
  thumb,
  icon,
  size = "list",
  iconSize,
  style,
  children,
}: Props) {
  const dims = SIZES[size]
  return (
    <View
      style={[
        styles.tile,
        {
          width: dims.tile,
          height: dims.tile,
          borderRadius: dims.radius,
          backgroundColor: thumb.fill,
          borderColor: thumb.fill,
        },
        style,
      ]}
    >
      {children ?? (icon ? <Ionicons name={icon} size={iconSize ?? dims.icon} color={thumb.icon} /> : null)}
    </View>
  )
}

const styles = StyleSheet.create({
  tile: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
})
