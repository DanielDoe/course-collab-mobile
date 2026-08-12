import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, usePathname } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { getSummerNavLabel, getSummerWebNavLabel } from "../../constants/summer-nav"
import { usePortalShell } from "../../context/PortalShellContext"
import { useSummerShell } from "../../context/SummerShellContext"
import { useAppThemeTokens, useShellChrome } from "../../context/AppearanceProvider"
import type { SummerSession } from "../../lib/session"
import { GlassChromeBar } from "../theme/GlassSurface"
import { HeaderProfileButton, NATIVE_HEADER_BAR_HEIGHT, shellTopBarStyles } from "../shell/shell-shared"

type Props = { session: SummerSession }

export function SummerTopBar({ session }: Props) {
  const insets = useSafeAreaInsets()
  const pathname = usePathname()
  const { path: webPathParam } = useLocalSearchParams<{ path?: string }>()
  const webPath = typeof webPathParam === "string" ? decodeURIComponent(webPathParam) : ""
  const screenTitle =
    pathname === "/web" && webPath ? getSummerWebNavLabel(webPath) : getSummerNavLabel(pathname)
  const chrome = useShellChrome()
  const tokens = useAppThemeTokens()
  const { openDrawer } = useSummerShell()
  const { toggleProfile, profileOpen } = usePortalShell()

  return (
    <GlassChromeBar
      style={[styles.wrapAndroid, { paddingTop: insets.top }]}
      borderBottomColor={chrome.headerBorder}
    >
      <View style={[shellTopBarStyles.bar, { minHeight: NATIVE_HEADER_BAR_HEIGHT }]}>
        <Pressable
          style={({ pressed }) => [shellTopBarStyles.iconBtn, pressed && { backgroundColor: tokens.native.fill }]}
          onPress={openDrawer}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
        >
          <Ionicons name="menu-outline" size={24} color={chrome.label} />
        </Pressable>

        <View style={shellTopBarStyles.titleBlock}>
          <Text style={[shellTopBarStyles.title, { color: chrome.label }]} numberOfLines={1}>
            {screenTitle}
          </Text>
        </View>

        <HeaderProfileButton name={session.name} active={profileOpen} onPress={toggleProfile} />
      </View>
    </GlassChromeBar>
  )
}

const styles = StyleSheet.create({
  wrapAndroid: Platform.select({ ios: {}, android: { elevation: 2 }, default: {} }),
})
