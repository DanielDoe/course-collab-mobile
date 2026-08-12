import type { ReactNode } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useSelfPresence } from "../../context/PresenceSelfProvider"
import { useShellChrome } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { PresenceAvatarBadge } from "./PresenceAvatarBadge"
import { PresenceStatusMenu } from "./PresenceStatusMenu"
import { PresenceStatusTrigger } from "./PresenceStatusTrigger"

export function ProfileAvatarWithPresence({
  children,
  avatarSize = 56,
}: {
  children: ReactNode
  avatarSize?: number
}) {
  const { status, enabled } = useSelfPresence()
  if (!enabled) return <>{children}</>

  return (
    <View style={styles.avatarWrap}>
      {children}
      <PresenceAvatarBadge status={status} avatarSize={avatarSize} />
    </View>
  )
}

export function ProfileRoleWithStatus({ role }: { role: string }) {
  const chrome = useShellChrome()
  const type = useNativeType()
  const { enabled } = useSelfPresence()
  if (!enabled) {
    return (
      <Text style={[type.caption, { color: chrome.secondaryLabel }]} numberOfLines={2}>
        {role}
      </Text>
    )
  }

  return (
    <View style={styles.roleRow}>
      <Text style={[type.caption, { color: chrome.secondaryLabel }]} numberOfLines={1}>
        {role}
      </Text>
      <Text style={[type.caption, { color: chrome.tertiaryLabel }]} aria-hidden>
        ·
      </Text>
      <PresenceStatusTrigger />
    </View>
  )
}

export function ProfileDropdownPresenceBlock() {
  const { enabled } = useSelfPresence()
  if (!enabled) return null

  return (
    <View style={styles.block}>
      <PresenceStatusMenu />
    </View>
  )
}

const styles = StyleSheet.create({
  avatarWrap: {
    position: "relative",
    overflow: "visible",
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  block: {
    paddingVertical: 4,
    paddingBottom: 12,
    marginBottom: 4,
  },
})
