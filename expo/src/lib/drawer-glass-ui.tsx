import { StyleSheet, type StyleProp, type ViewStyle } from "react-native"
import { useAppThemeTokens } from "../context/AppearanceProvider"
import { GlassSurface } from "../components/theme/GlassSurface"

/** Side drawer panel — regular glass + frosted tint for readable nav over content. */
export function DrawerGlassBackground({ style }: { style?: StyleProp<ViewStyle> }) {
  const tokens = useAppThemeTokens()
  const tint = tokens.isDark ? "rgba(30, 30, 32, 0.74)" : "rgba(255, 255, 255, 0.84)"

  return (
    <GlassSurface
      style={style}
      glassEffectStyle="regular"
      overlayColor={tint}
      intensity={tokens.isDark ? 64 : 88}
    />
  )
}

export const drawerGlassStyles = StyleSheet.create({
  panelBorder: {
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  navRowFlat: {
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  groupChipFlat: {
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
})
