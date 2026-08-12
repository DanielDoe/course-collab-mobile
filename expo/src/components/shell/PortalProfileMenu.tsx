import { Platform, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { portalMeta } from "../../constants/portals"
import { getThemeLabel } from "../../constants/app-themes"
import { usePortalShell } from "../../context/PortalShellContext"
import { useSession } from "../../context/SessionProvider"
import { useAppearance, useAppThemeTokens, useShellChrome } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { portalSessionMeta, type PortalSession } from "../../lib/portal-shell-utils"
import { formatSummerRole } from "../summer/summer-utils"
import { GlassSheetBackground } from "../theme/GlassSurface"
import {
  GlassMenuList,
  GlassMenuRow,
  GlassMenuSectionGap,
  GlassSheetHandle,
  GlassSheetProfileHeader,
} from "../theme/GlassActionSheetMenu"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import { ProfileAvatar } from "./shell-shared"
import {
  ProfileAvatarWithPresence,
  ProfileDropdownPresenceBlock,
  ProfileRoleWithStatus,
} from "../presence/ProfilePresenceChrome"

type Props = {
  session: PortalSession
}

function getPortalSubtitle(session: PortalSession): string {
  if (session.portal === "summer") {
    return session.email?.trim() || portalSessionMeta(session)
  }
  return portalSessionMeta(session)
}

export function PortalProfileMenu({ session }: Props) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { signOut } = useSession()
  const { profileOpen, closeProfile, openNotifications, notificationCount } = usePortalShell()
  const chrome = useShellChrome()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const { prefs } = useAppearance()
  const themeLabel = getThemeLabel(prefs.themeId)
  const meta = portalMeta(session.portal)

  function go(route: string) {
    closeProfile()
    router.push(route as never)
  }

  async function handleSignOut() {
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
              {session.portal === "summer" ? (
                <View
                  style={[
                    styles.rolePill,
                    { backgroundColor: tokens.accentSoftStrong, borderColor: tokens.accentBorder },
                  ]}
                >
                  <Ionicons name="sunny-outline" size={11} color={tokens.accent} />
                  <Text style={[styles.roleText, { color: tokens.accentDark }]}>
                    {formatSummerRole(session.studentProgramRole)}
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.rolePill,
                    { backgroundColor: tokens.accentSoftStrong, borderColor: tokens.accentBorder },
                  ]}
                >
                  <Ionicons name={meta.icon} size={11} color={tokens.accent} />
                  <Text style={[styles.roleText, { color: tokens.accentDark }]}>{meta.shortLabel}</Text>
                </View>
              )}
            </View>
            <ProfileRoleWithStatus role={getPortalSubtitle(session)} />
          </View>
        </GlassSheetProfileHeader>

        <ProfileDropdownPresenceBlock />

        <GlassMenuList>
          {session.portal === "guest" && session.guestAccessPurpose === "recommendation_letter" ? (
            <GlassMenuRow
              icon="folder-open-outline"
              label="My letters"
              onPress={() => go("/module/recommendations")}
              showSeparator
            />
          ) : null}
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
            icon="color-palette-outline"
            label="Appearance"
            detail={themeLabel}
            onPress={() => go("/settings/appearance")}
            showSeparator
          />
          <GlassMenuRow icon="settings-outline" label="Settings" onPress={() => go("/settings")} />
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
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.14,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: -4 },
      },
      android: { elevation: 16 },
    }),
  },
  profileCopy: { flex: 1, minWidth: 0, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 },
  name: { flexShrink: 1, flex: 1, minWidth: 0 },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  roleText: { fontSize: 11, fontWeight: "700" },
})
