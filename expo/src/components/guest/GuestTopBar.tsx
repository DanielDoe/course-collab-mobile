import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter, usePathname } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { getGuestNavLabel } from "../../constants/guest-nav"
import { usePortalShell } from "../../context/PortalShellContext"
import { useGuestShell } from "../../context/GuestShellContext"
import { useAppThemeTokens, useShellChrome } from "../../context/AppearanceProvider"
import type { GuestSession } from "../../lib/session"
import { GlassChromeBar } from "../theme/GlassSurface"
import { HeaderProfileButton, NATIVE_HEADER_BAR_HEIGHT, shellTopBarStyles } from "../shell/shell-shared"

type Props = { session: GuestSession }

export function GuestTopBar({ session }: Props) {
  const insets = useSafeAreaInsets()
  const pathname = usePathname()
  const router = useRouter()
  const screenTitle = getGuestNavLabel(pathname)
  const chrome = useShellChrome()
  const tokens = useAppThemeTokens()
  const { openDrawer } = useGuestShell()
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

        <Pressable
          style={({ pressed }) => [shellTopBarStyles.iconBtn, pressed && { backgroundColor: tokens.native.fill }]}
          onPress={() => router.push("/module/messages" as never)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Open messages"
        >
          <Ionicons name="mail-outline" size={22} color={chrome.label} />
        </Pressable>

        <HeaderProfileButton name={session.name} active={profileOpen} onPress={toggleProfile} />
      </View>
    </GlassChromeBar>
  )
}

const styles = StyleSheet.create({
  wrapAndroid: Platform.select({ ios: {}, android: { elevation: 2 }, default: {} }),
})
