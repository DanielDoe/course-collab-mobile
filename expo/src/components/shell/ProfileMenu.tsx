import { Platform, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useStudentShell } from "../../context/StudentShellContext"
import { useSession } from "../../context/SessionProvider"
import { useAppearance, useAppThemeTokens, useShellChrome } from "../../context/AppearanceProvider"
import { GlassSheetBackground } from "../theme/GlassSurface"
import {
  GlassMenuList,
  GlassMenuRow,
  GlassMenuSectionGap,
  GlassSheetHandle,
  GlassSheetProfileHeader,
} from "../theme/GlassActionSheetMenu"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import { getThemeLabel } from "../../constants/app-themes"
import type { StudentSession } from "../../lib/session"
import { getMembershipPlan } from "../../lib/membership-plans"
import { membershipTierSolidBadge } from "../../lib/membership-plan-theme"
import { useNativeType } from "../../lib/themed-module-theme"
import { ProfileAvatar, getStudentCourseLine, getStudentSectionLine } from "./shell-shared"
import {
  ProfileAvatarWithPresence,
  ProfileDropdownPresenceBlock,
  ProfileRoleWithStatus,
} from "../presence/ProfilePresenceChrome"

type Props = {
  session: StudentSession
}

export function ProfileMenu({ session }: Props) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { signOut } = useSession()
  const {
    profileOpen,
    closeProfile,
    openNotifications,
    openCoursePicker,
    membershipTier,
    membershipTierLoaded,
    classroomPoints,
    notificationCount,
  } = useStudentShell()

  const chrome = useShellChrome()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const { prefs } = useAppearance()
  const themeLabel = getThemeLabel(prefs.themeId)
  const plan = membershipTierLoaded ? getMembershipPlan(membershipTier) : null
  const tierBadge = membershipTierLoaded ? membershipTierSolidBadge(membershipTier) : null
  const courseLine = getStudentCourseLine(session)
  const sectionLine = getStudentSectionLine(session)
  const pointsLabel = Number.isInteger(classroomPoints)
    ? String(classroomPoints)
    : classroomPoints.toFixed(1)

  function go(route: string) {
    closeProfile()
    router.push(route as never)
  }

  async function handleLogout() {
    closeProfile()
    await signOut()
    router.replace("/login")
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
          <ProfileAvatarWithPresence avatarSize={56}>
            <ProfileAvatar
              name={session.name}
              size={56}
              accentColor={tokens.accent}
              accentRingColor={tokens.accentSoftStrong}
            />
          </ProfileAvatarWithPresence>
          <View style={styles.profileCopy}>
            <View style={styles.nameRow}>
              <Text style={[type.sheetTitle, styles.name, { color: chrome.label }]} numberOfLines={1}>
                {session.name}
              </Text>
              {plan && tierBadge ? (
                <View
                  style={[
                    styles.tierPill,
                    {
                      backgroundColor: tierBadge.fill,
                      borderColor: tierBadge.border,
                    },
                  ]}
                >
                  <Ionicons name={plan.icon} size={11} color={tierBadge.ink} />
                  <Text style={[styles.tierText, { color: tierBadge.ink }]}>{plan.name}</Text>
                </View>
              ) : (
                <Text style={[type.caption, { color: chrome.secondaryLabel }]}>Loading…</Text>
              )}
            </View>
            <ProfileRoleWithStatus
              role={[courseLine, sectionLine ? `Section ${sectionLine}` : null, `${pointsLabel} classroom points`]
                .filter(Boolean)
                .join(" · ")}
            />
          </View>
        </GlassSheetProfileHeader>

        <ProfileDropdownPresenceBlock />

        <GlassMenuList>
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
            detail={courseLine ?? undefined}
            onPress={() => openCoursePicker()}
            showSeparator
          />
          <GlassMenuRow
            icon="flash-outline"
            label="Classroom points"
            detail={pointsLabel}
            onPress={() => go("/module/classroom-points")}
            showSeparator
          />
          <GlassMenuRow icon="person-outline" label="Edit Profile" onPress={() => go("/settings")} showSeparator />
          <GlassMenuRow
            icon="color-palette-outline"
            label="Appearance"
            detail={themeLabel}
            onPress={() => go("/settings/appearance")}
            showSeparator
          />
          <GlassMenuRow
            icon="diamond-outline"
            label="Membership & Plans"
            onPress={() => go("/membership")}
            showSeparator
          />
          <GlassMenuRow icon="settings-outline" label="Settings" onPress={() => go("/settings")} showSeparator />
          <GlassMenuRow icon="help-circle-outline" label="Help Center" onPress={() => go("/module/help-center")} />
          <GlassMenuSectionGap />
          <GlassMenuRow icon="log-out-outline" label="Sign Out" destructive onPress={() => void handleLogout()} />
        </GlassMenuList>
      </GlassSheetBackground>
    </GlassBottomSheetModal>
  )
}

const styles = StyleSheet.create({
  sheetHost: {
    maxHeight: "92%",
    ...Platform.select({
      android: { elevation: 8 },
    }),
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  name: { flexShrink: 1, flex: 1, minWidth: 0 },
  tierPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  tierText: {
    fontSize: 11,
    fontWeight: "700",
  },
})
