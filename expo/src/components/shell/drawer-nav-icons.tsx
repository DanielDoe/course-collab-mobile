import type { StyleProp, ViewStyle } from "react-native"
import { Ionicons, type IoniconName } from "@/components/icons/AppIcon"

type Props = {
  name: IoniconName
  size?: number
  color: string
  style?: StyleProp<ViewStyle>
  strokeWidth?: number
}

/** Drawer nav rows — same Lucide set as the rest of the app. */
export function DrawerNavIcon({ name, size = 19, color, style, strokeWidth = 2 }: Props) {
  return <Ionicons name={name} size={size} color={color} style={style} strokeWidth={strokeWidth} />
}

export function DrawerNavChevron({
  expanded,
  color,
  size = 17,
}: {
  expanded: boolean
  color: string
  size?: number
}) {
  return (
    <Ionicons
      name={expanded ? "chevron-up" : "chevron-forward"}
      size={size}
      color={color}
      strokeWidth={2}
      style={{ marginLeft: 2 }}
    />
  )
}
