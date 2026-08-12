import { StyleSheet, Text, View } from "react-native"
import { usePathname } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { usePortalShell } from "../../context/PortalShellContext"
import { useShellChrome } from "../../context/AppearanceProvider"
import { getPortalScreenTitle, type PortalSession } from "../../lib/portal-shell-utils"
import { GlassChromeBar } from "../theme/GlassSurface"
import {
  HeaderProfileButton,
  NATIVE_HEADER_BAR_HEIGHT,
  shellTopBarStyles} from "./shell-shared"

type Props = {
  session: PortalSession
}

export function PortalTopBar({ session }: Props) {
  const insets = useSafeAreaInsets()
  const pathname = usePathname()
  const { toggleProfile, profileOpen } = usePortalShell()
  const chrome = useShellChrome()
  const screenTitle = getPortalScreenTitle(pathname, session.portal)

  return (
    <GlassChromeBar
      style={{ paddingTop: insets.top }}
      borderBottomColor={chrome.headerBorder}
    >
      <View style={[styles.bar, { minHeight: NATIVE_HEADER_BAR_HEIGHT }]}>
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
  bar: {
    ...shellTopBarStyles.bar,
    paddingHorizontal: 16,
    gap: 8}})
