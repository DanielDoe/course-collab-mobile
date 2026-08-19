import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { usePathname } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { getFacultyNavLabel, FACULTY_CORA_ROUTE } from "../../constants/faculty-nav"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { useFacultyModuleHeaderOptional } from "../../context/FacultyModuleHeaderContext"
import { useAppThemeTokens, useShellChrome } from "../../context/AppearanceProvider"
import type { FacultySession } from "../../lib/session"
import { NativeCountBadge } from "../faculty/faculty-shared"
import { GlassChromeBar } from "../theme/GlassSurface"
import { CoraBrand } from "../cora/CoraBrand"
import {
  HeaderProfileButton,
  NATIVE_HEADER_BAR_HEIGHT,
  shellTopBarStyles} from "./shell-shared"

type Props = {
  session: FacultySession
}

export function FacultyTopBar({ session }: Props) {
  const insets = useSafeAreaInsets()
  const pathname = usePathname()
  const screenTitle = getFacultyNavLabel(pathname)
  const nestedHeader = useFacultyModuleHeaderOptional()?.nestedHeader ?? null
  const chrome = useShellChrome()
  const tokens = useAppThemeTokens()
  const { openDrawer, toggleProfile, profileOpen, notificationCount } = useFacultyShell()
  const headerTitle = nestedHeader?.title ?? screenTitle
  const isCoraModule = pathname === FACULTY_CORA_ROUTE

  return (
    <GlassChromeBar
      style={[styles.wrapAndroid, { paddingTop: insets.top }]}
      borderBottomColor={chrome.headerBorder}
    >
      <View style={[shellTopBarStyles.bar, { minHeight: NATIVE_HEADER_BAR_HEIGHT }]}>
        <Pressable
          style={({ pressed }) => [
            shellTopBarStyles.iconBtn,
            pressed && { backgroundColor: tokens.native.fill },
          ]}
          onPress={nestedHeader ? nestedHeader.onBack : openDrawer}
          hitSlop={6}
          testID="open-navigation-menu"
          accessibilityRole="button"
          accessibilityLabel={nestedHeader ? "Go back" : "Open navigation menu"}
        >
          <Ionicons
            name={nestedHeader ? "chevron-back" : "menu-outline"}
            size={24}
            color={chrome.label}
          />
        </Pressable>

        <View style={shellTopBarStyles.titleBlock}>
          {isCoraModule && !nestedHeader ? (
            <CoraBrand size="md" />
          ) : (
            <Text style={[shellTopBarStyles.title, { color: chrome.label }]} numberOfLines={1}>
              {headerTitle}
            </Text>
          )}
        </View>

        <HeaderProfileButton
          name={session.name}
          active={profileOpen}
          onPress={toggleProfile}
          badge={
            notificationCount > 0 ? (
              <NativeCountBadge
                count={notificationCount}
                variant="overlay"
                borderColor={chrome.headerBg}
              />
            ) : null
          }
        />
      </View>
    </GlassChromeBar>
  )
}

const styles = StyleSheet.create({
  wrapAndroid: Platform.select({
    ios: {},
    android: { elevation: 2 },
    default: {},
  }),
})
