import type { ReactNode } from "react"
import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { BRAND } from "../../constants"
import { NATIVE, nativeType } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useShellChrome } from "../../context/AppearanceProvider"
import { useSelfPresence } from "../../context/PresenceSelfProvider"
import type { StudentSession } from "../../lib/session"
import { PresenceAvatarBadge } from "../presence/PresenceAvatarBadge"

export { nativeType }

export const NATIVE_HEADER_BAR_HEIGHT = 44

/** iOS HIG / Material label colors for app chrome (bars, sheets, menus). */
export const nativeChrome = {
  headerBg: Platform.OS === "ios" ? "rgba(249,249,249,0.97)" : "#ffffff",
  headerBorder: Platform.OS === "ios" ? "rgba(60,60,67,0.16)" : "rgba(0,0,0,0.12)",
  sheetBg: NATIVE.groupedBackground,
  groupedBg: NATIVE.secondaryGrouped,
  groupedBorder: Platform.OS === "ios" ? "rgba(60,60,67,0.12)" : "rgba(0,0,0,0.12)",
  separator: NATIVE.separator,
  label: NATIVE.label,
  secondaryLabel: NATIVE.secondaryLabel,
  tertiaryLabel: NATIVE.tertiaryLabel,
  destructive: NATIVE.destructive,
  tint: NATIVE.tint} as const

export const nativePressedFill = NATIVE.fill

export const shellTopBarStyles = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 6,
    gap: 4},
  titleBlock: { flex: 1, minWidth: 0, justifyContent: "center", paddingHorizontal: 2 },
  title: {},
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible"},
  iconBtnPressed: { backgroundColor: nativePressedFill },
  headerProfileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    marginLeft: 4}})

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function normalizeCourseToken(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase()
}

/** One course line — dedupes code vs title (e.g. ECE2202 / ECE 2202). */
export function getCourseDisplayLine(code?: string | null, title?: string | null): string | null {
  const normalizedCode = code?.trim()
  const normalizedTitle = title?.trim()
  if (!normalizedCode && !normalizedTitle) return null
  if (
    normalizedCode &&
    normalizedTitle &&
    normalizeCourseToken(normalizedCode) === normalizeCourseToken(normalizedTitle)
  ) {
    return normalizedTitle.length >= normalizedCode.length ? normalizedTitle : normalizedCode
  }
  if (normalizedCode && normalizedTitle) return `${normalizedCode} · ${normalizedTitle}`
  return normalizedTitle ?? normalizedCode ?? null
}

/** Single course line for profile chrome — dedupes code vs title (e.g. ECE2202 / ECE 2202). */
export function getStudentCourseLine(
  session: Pick<StudentSession, "courseCode" | "courseTitle">,
): string | null {
  return getCourseDisplayLine(session.courseCode, session.courseTitle)
}

export function formatFacultyRoleLabel(role?: string | null): string {
  const trimmed = role?.trim()
  if (!trimmed) return "Instructor"
  return trimmed
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

/** Section suffix only when it differs from the course code/title. */
export function getStudentSectionLine(
  session: Pick<StudentSession, "section" | "courseCode" | "courseTitle">,
): string | null {
  const section = session.section?.trim()
  if (!section) return null
  const normalizedSection = normalizeCourseToken(section)
  const code = session.courseCode?.trim()
  const title = session.courseTitle?.trim()
  if (code && normalizedSection === normalizeCourseToken(code)) return null
  if (title && normalizedSection === normalizeCourseToken(title)) return null
  return section
}

type AvatarProps = {
  name: string
  size?: number
  active?: boolean
  accentColor?: string
  accentRingColor?: string
}

export function ProfileAvatar({
  name,
  size = 32,
  active,
  accentColor,
  accentRingColor,
}: AvatarProps) {
  const tokens = useAppThemeTokens()
  const resolvedAccent = accentColor ?? tokens.accent
  const resolvedRing = accentRingColor ?? tokens.accentHover
  const fontSize = size <= 32 ? 12 : 16
  const ring = active ? 2 : 0

  return (
    <View
      style={[
        avatarStyles.avatarOuter,
        {
          width: size + ring * 2,
          height: size + ring * 2,
          borderRadius: (size + ring * 2) / 2,
          borderWidth: ring,
          borderColor: active ? resolvedRing : "transparent",
        },
      ]}
    >
      <View
        style={[
          avatarStyles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: resolvedAccent,
          },
        ]}
      >
        <Text style={[avatarStyles.avatarText, { fontSize }]}>{getInitials(name)}</Text>
      </View>
    </View>
  )
}

const HEADER_AVATAR_SIZE = 30

/** Themed initials for nav bar — soft accent fill, accent label (not outlined white). */
export function HeaderProfileAvatar({ name, active }: { name: string; active?: boolean }) {
  const tokens = useAppThemeTokens()
  const initials = getInitials(name || "?")
  const fontSize = initials.length > 1 ? 11 : 13
  const accent = tokens.accent

  return (
    <View
      style={[
        avatarStyles.headerAvatar,
        {
          width: HEADER_AVATAR_SIZE,
          height: HEADER_AVATAR_SIZE,
          borderRadius: HEADER_AVATAR_SIZE / 2,
          backgroundColor: active ? tokens.selected : tokens.accentSoftStrong,
          borderColor: active ? accent : "transparent",
          borderWidth: active ? 2 : 0,
        },
      ]}
    >
      <Text style={[avatarStyles.headerAvatarText, { fontSize, color: accent }]} numberOfLines={1}>
        {initials}
      </Text>
    </View>
  )
}

/** Native nav-bar notification control — bell with unread dot. */
export function HeaderNotificationButton({
  onPress,
  hasUnread = false,
  accessibilityLabel = "Open notifications",
}: {
  onPress: () => void
  hasUnread?: boolean
  accessibilityLabel?: string
}) {
  const tokens = useAppThemeTokens()
  const chrome = useShellChrome()

  return (
    <Pressable
      style={({ pressed }) => [
        shellTopBarStyles.iconBtn,
        pressed && { backgroundColor: tokens.native.fill },
      ]}
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: hasUnread }}
    >
      <View style={notificationStyles.anchor}>
        <Ionicons name="notifications-outline" size={22} color={chrome.label} />
        {hasUnread ? (
          <View style={[notificationStyles.dot, { borderColor: chrome.headerBg }]} />
        ) : null}
      </View>
    </Pressable>
  )
}

/** Native nav-bar account control — themed initials avatar. */
export function HeaderProfileButton({
  name,
  active,
  onPress,
  badge,
  accessibilityLabel = "Open account menu"}: {
  name: string
  active?: boolean
  onPress: () => void
  badge?: ReactNode
  accessibilityLabel?: string
}) {
  const tokens = useAppThemeTokens()
  const { status, enabled } = useSelfPresence()
  return (
    <Pressable
      style={({ pressed }) => [
        shellTopBarStyles.headerProfileBtn,
        (pressed || active) && { backgroundColor: tokens.native.fill },
      ]}
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ expanded: active }}
    >
      <View style={avatarStyles.headerBadgeAnchor}>
        <HeaderProfileAvatar name={name} active={active} />
        {enabled ? <PresenceAvatarBadge status={status} avatarSize={HEADER_AVATAR_SIZE} /> : null}
        {badge}
      </View>
    </Pressable>
  )
}

const avatarStyles = StyleSheet.create({
  avatarOuter: {
    alignItems: "center",
    justifyContent: "center"},
  avatar: {
    alignItems: "center",
    justifyContent: "center"},
  avatarText: {
    color: BRAND.white,
    fontWeight: "600"},
  headerAvatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    fontWeight: "700",
    letterSpacing: -0.2},
  headerBadgeAnchor: {
    width: HEADER_AVATAR_SIZE,
    height: HEADER_AVATAR_SIZE,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible"}})

const notificationStyles = StyleSheet.create({
  anchor: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible",
  },
  dot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#FF3B30",
    borderWidth: 1.5,
  },
})
