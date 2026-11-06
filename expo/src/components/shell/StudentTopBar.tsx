import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, usePathname, useRouter } from "expo-router"
import { useStudentShell } from "../../context/StudentShellContext"
import { useOptionalStudentActiveCourse } from "../../context/StudentActiveCourseContext"
import { studentEnrollmentCodeLabel } from "../../lib/student-enrollment"
import { studentShellShowsBack } from "../navigation/student-shell-back"
import { useStackHasHistory } from "../navigation/useStackHasHistory"
import { safeRouterBack } from "../../lib/safe-router-back"
import { useAppThemeTokens, useShellChrome } from "../../context/AppearanceProvider"
import type { StudentSession } from "../../lib/session"
import { getNavLabel, getWebNavLabel } from "../../constants/student-nav"
import { normalizeRoutePathname } from "../../lib/navigation-reset"
import { CoraBrand } from "../cora/CoraBrand"
import { CoraHeaderBreadcrumb } from "../cora/CoraHeaderBreadcrumb"
import { useCora } from "../cora/CoraProvider"
import { NativeCountBadge } from "../faculty/faculty-shared"
import { GlassChromeBar } from "../theme/GlassSurface"
import {
  HeaderCourseChip,
  HeaderProfileButton,
  NATIVE_HEADER_BAR_HEIGHT,
  shellTopBarStyles,
  useStableTopSafeInset,
} from "./shell-shared"

type Props = {
  session: StudentSession
}

export function StudentTopBar({ session }: Props) {
  const topSafeInset = useStableTopSafeInset()
  const pathname = usePathname()
  const routePath = normalizeRoutePathname(pathname)
  const { path: webPathParam } = useLocalSearchParams<{ path?: string }>()
  const webPath = typeof webPathParam === "string" ? decodeURIComponent(webPathParam) : ""
  const screenTitle =
    routePath === "/web" && webPath ? getWebNavLabel(webPath) : getNavLabel(routePath)
  const isCoraModule = routePath === "/module/ai-tutor"
  const chrome = useShellChrome()
  const tokens = useAppThemeTokens()
  const router = useRouter()
  const { openDrawer, toggleProfile, profileOpen, notificationCount, openCoursePicker } = useStudentShell()
  const courseCtx = useOptionalStudentActiveCourse()
  const stackHasHistory = useStackHasHistory()
  const showBack = studentShellShowsBack(routePath, stackHasHistory)
  const {
    overlaySection,
    setOverlaySection,
    workspaceImmersive,
  } = useCora()

  const showCoraChrome = isCoraModule && !workspaceImmersive

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
          onPress={showBack ? () => safeRouterBack(router, "/dashboard") : openDrawer}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={showBack ? "Go back" : "Open navigation menu"}
        >
          <Ionicons name={showBack ? "chevron-back" : "menu-outline"} size={24} color={chrome.label} />
        </Pressable>

        <View style={shellTopBarStyles.titleBlock}>
          {showCoraChrome && overlaySection ? (
            <CoraHeaderBreadcrumb section={overlaySection} onPressRoot={() => setOverlaySection(null)} />
          ) : showCoraChrome ? (
            <CoraBrand size="md" />
          ) : (
            <Text style={[shellTopBarStyles.title, { color: chrome.label }]} numberOfLines={1}>
              {screenTitle}
            </Text>
          )}
        </View>

        <HeaderCourseChip
          label={studentEnrollmentCodeLabel(courseCtx?.activeCourse)}
          onPress={openCoursePicker}
          interactive
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
