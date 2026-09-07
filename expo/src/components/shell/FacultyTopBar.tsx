import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { usePathname, useRouter } from "expo-router"
import { getFacultyNavLabel, FACULTY_CORA_ROUTE, FACULTY_DASHBOARD_ROUTE } from "../../constants/faculty-nav"
import { facultyShellShowsBack } from "../navigation/student-shell-back"
import { useStackHasHistory } from "../navigation/useStackHasHistory"
import { safeRouterBack } from "../../lib/safe-router-back"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { useFacultyModuleHeaderOptional } from "../../context/FacultyModuleHeaderContext"
import { useAppThemeTokens, useShellChrome } from "../../context/AppearanceProvider"
import type { FacultySession } from "../../lib/session"
import { NativeCountBadge } from "../faculty/faculty-shared"
import { GlassChromeBar } from "../theme/GlassSurface"
import { CoraBrand } from "../cora/CoraBrand"
import {
  HeaderCourseChip,
  HeaderProfileButton,
  NATIVE_HEADER_BAR_HEIGHT,
  shellTopBarStyles,
  useStableTopSafeInset,
} from "./shell-shared"
import { facultyScopeLabel } from "../../lib/faculty-scope-label"

type Props = {
  session: FacultySession
}

export function FacultyTopBar({ session }: Props) {
  const topSafeInset = useStableTopSafeInset()
  const pathname = usePathname()
  const router = useRouter()
  const screenTitle = getFacultyNavLabel(pathname)
  const nestedHeader = useFacultyModuleHeaderOptional()?.nestedHeader ?? null
  const stackHasHistory = useStackHasHistory()
  const stackBack = facultyShellShowsBack(pathname, stackHasHistory)
  const showBack = Boolean(nestedHeader) || stackBack
  const chrome = useShellChrome()
  const tokens = useAppThemeTokens()
  const { openDrawer, toggleProfile, profileOpen, notificationCount, openCoursePicker, selectedCourse, courses } =
    useFacultyShell()
  const headerTitle = nestedHeader?.title ?? screenTitle
  const isCoraModule = pathname === FACULTY_CORA_ROUTE

  return (
    <GlassChromeBar
      style={[styles.wrapAndroid, { paddingTop: topSafeInset }]}
      borderBottomColor={chrome.headerBorder}
    >
      <View style={[shellTopBarStyles.bar, { minHeight: NATIVE_HEADER_BAR_HEIGHT }]}>
        <Pressable
          style={({ pressed }) => [
            shellTopBarStyles.iconBtn,
            pressed && { backgroundColor: tokens.native.fill },
          ]}
          onPress={
            nestedHeader
              ? nestedHeader.onBack
              : stackBack
                ? () => safeRouterBack(router, FACULTY_DASHBOARD_ROUTE)
                : openDrawer
          }
          hitSlop={6}
          testID={showBack ? "go-back" : "open-navigation-menu"}
          accessibilityRole="button"
          accessibilityLabel={showBack ? "Go back" : "Open navigation menu"}
        >
          <Ionicons
            name={showBack ? "chevron-back" : "menu-outline"}
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

        <HeaderCourseChip
          label={facultyScopeLabel(selectedCourse)}
          onPress={openCoursePicker}
          interactive={courses.length !== 1}
        />
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
