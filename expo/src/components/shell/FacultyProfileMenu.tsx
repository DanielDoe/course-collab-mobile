import { Platform, StyleSheet } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { useSession } from "../../context/SessionProvider"
import { useAppearance } from "../../context/AppearanceProvider"
import { getThemeLabel } from "../../constants/app-themes"
import { GlassSheetBackground } from "../theme/GlassSurface"
import {
  GlassMenuList,
  GlassMenuRow,
  GlassMenuSectionGap,
  GlassSheetHandle,
  GlassSheetProfileHeader,
} from "../theme/GlassActionSheetMenu"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import type { FacultySession } from "../../lib/session"
import { FacultyProfileSummaryCard } from "../faculty/FacultyProfileSummaryCard"
import { facultyMembershipTierLongLabel } from "../../lib/faculty-membership-tier"
import { facultyScopeLabel } from "../../lib/faculty-scope-label"
import { ProfileDropdownPresenceBlock } from "../presence/ProfilePresenceChrome"

type Props = {
  session: FacultySession
}

export function FacultyProfileMenu({ session }: Props) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { signOut } = useSession()
  const {
    profileOpen,
    closeProfile,
    selectedCourse,
    openCoursePicker,
    openNotifications,
    notificationCount,
    membershipTier,
    membershipTierLoaded,
  } = useFacultyShell()

  const { prefs } = useAppearance()
  const themeLabel = getThemeLabel(prefs.themeId)
  const tierLabel = membershipTierLoaded ? facultyMembershipTierLongLabel(membershipTier) : null
  const courseDetail = facultyScopeLabel(selectedCourse)

  async function handleSignOut() {
    closeProfile()
    await signOut()
    router.replace("/login")
  }

  function go(route: string) {
    closeProfile()
    router.push(route as never)
  }

  return (
    <GlassBottomSheetModal
      visible={profileOpen}
      onClose={closeProfile}
      accessibilityLabel="Close account menu"
      sheetHostStyle={styles.sheetHost}
    >
      <GlassSheetBackground menuSheet style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <GlassSheetHandle />

        <GlassSheetProfileHeader>
          <FacultyProfileSummaryCard
            name={session.name}
            email={session.email}
            role={session.role}
            course={selectedCourse}
            avatarSize={48}
            variant="glass"
            showPresenceBadge
          />
        </GlassSheetProfileHeader>

        <ProfileDropdownPresenceBlock />

        <GlassMenuList>
          <GlassMenuRow
            icon="diamond-outline"
            label="Membership & Plans"
            detail={tierLabel ?? undefined}
            onPress={() => go("/membership")}
            showSeparator
          />
          <GlassMenuRow
            icon="notifications-outline"
            label="Notifications"
            badgeCount={notificationCount}
            onPress={() => {
              closeProfile()
              openNotifications()
            }}
            showSeparator
          />
          <GlassMenuRow
            icon="book-outline"
            label="Switch course"
            detail={courseDetail}
            onPress={() => openCoursePicker()}
            showSeparator
          />
          <GlassMenuRow
            icon="person-circle-outline"
            label="Profile & settings"
            onPress={() => {
              closeProfile()
              router.push("/settings" as never)
            }}
            showSeparator
          />
          <GlassMenuRow
            icon="color-palette-outline"
            label="Appearance"
            detail={themeLabel}
            onPress={() => {
              closeProfile()
              router.push("/settings/appearance" as never)
            }}
          />
          <GlassMenuSectionGap />
          <GlassMenuRow icon="log-out-outline" label="Sign out" destructive onPress={() => void handleSignOut()} />
        </GlassMenuList>
      </GlassSheetBackground>
    </GlassBottomSheetModal>
  )
}

const styles = StyleSheet.create({
  sheetHost: {
    maxHeight: "92%",
    ...Platform.select({ android: { elevation: 8 } }),
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
})
