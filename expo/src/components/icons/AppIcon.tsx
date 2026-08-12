import { Ionicons as ExpoIonicons } from "@expo/vector-icons"
import type { Ionicons as IoniconsType } from "@expo/vector-icons"
import type { StyleProp, ViewStyle } from "react-native"
import { isBrandLogoIcon, resolveLucideIcon, type IoniconName } from "./ion-to-lucide-map"

export type { IoniconName }

type IconProps = {
  name: IoniconName
  size?: number
  color?: string
  style?: StyleProp<ViewStyle>
  strokeWidth?: number
}

function IoniconsComponent({
  name,
  size = 24,
  color = "#000",
  style,
  strokeWidth = 2,
}: IconProps) {
  if (isBrandLogoIcon(name)) {
    return <ExpoIonicons name={name} size={size} color={color} style={style} />
  }

  const Icon = resolveLucideIcon(name)
  return <Icon size={size} color={color} strokeWidth={strokeWidth} style={style} />
}

/**
 * Drop-in Ionicons replacement — renders Lucide across the app.
 * Brand logos (Apple/Google sign-in) still use native Ionicons glyphs.
 */
export const Ionicons = Object.assign(IoniconsComponent, {
  glyphMap: {} as typeof IoniconsType.glyphMap,
})

export const AppIcon = Ionicons
