import { useMemo } from "react"
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { FACULTY_SETTINGS_COLOR } from "../../lib/faculty-settings-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import {
  ProfileAvatar,
  formatFacultyRoleLabel,
  getCourseDisplayLine,
} from "../shell/shell-shared"
import { ProfileAvatarWithPresence } from "../presence/ProfilePresenceChrome"

type FacultyProfileSummaryCardProps = {
  name: string
  email?: string | null
  role?: string | null
  courseCode?: string | null
  courseTitle?: string | null
  avatarSize?: number
  style?: StyleProp<ViewStyle>
  /** `glass` removes opaque card chrome for liquid glass sheets. */
  variant?: "card" | "glass"
  showPresenceBadge?: boolean
}

const ROW_MIN_HEIGHT = 30
const PILL_MIN_HEIGHT = 28

export function FacultyProfileSummaryCard({
  name,
  email,
  role,
  courseCode,
  courseTitle,
  avatarSize = 52,
  style,
  variant = "card",
  showPresenceBadge = false,
}: FacultyProfileSummaryCardProps) {
  const { native, tokens, type } = useModuleTheme()
  const isGlass = variant === "glass"
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingHorizontal: isGlass ? 0 : 16,
          paddingVertical: isGlass ? 0 : 14,
          borderRadius: isGlass ? 0 : NATIVE.sectionRadius,
          backgroundColor: isGlass ? "transparent" : native.secondaryGrouped,
          borderWidth: isGlass ? 0 : StyleSheet.hairlineWidth,
          borderColor: isGlass ? "transparent" : native.separator,
          ...(isGlass ? null : tokens.cardShadow),
        },
        avatarColumn: {
          alignItems: "center",
          justifyContent: "center",
        },
        copy: {
          flex: 1,
          minWidth: 0,
          gap: 0,
        },
        gridRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          minHeight: ROW_MIN_HEIGHT,
        },
        gridRowDivider: {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: native.separator,
          marginBottom: 8,
          paddingBottom: 8,
        },
        primaryText: {
          flex: 1,
          minWidth: 0,
          paddingRight: 4,
        },
        name: {
          ...type.sheetTitle,
          fontSize: avatarSize >= 54 ? 20 : 18,
          lineHeight: avatarSize >= 54 ? 24 : 22,
          color: native.label,
        },
        email: {
          ...type.caption,
          fontSize: 13,
          lineHeight: 18,
          color: native.secondaryLabel,
        },
        pillBase: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          minHeight: PILL_MIN_HEIGHT,
          paddingHorizontal: 10,
          borderRadius: 999,
          borderWidth: StyleSheet.hairlineWidth,
          flexShrink: 0,
        },
        rolePill: {
          backgroundColor: `${FACULTY_SETTINGS_COLOR.rolePill}18`,
          borderColor: `${FACULTY_SETTINGS_COLOR.rolePill}33`,
        },
        roleText: {
          ...type.footnote,
          fontWeight: "600",
          color: FACULTY_SETTINGS_COLOR.rolePill,
        },
        sectionPill: {
          backgroundColor: native.fill,
          borderColor: native.separator,
        },
        sectionText: {
          ...type.footnote,
          fontWeight: "700",
          color: native.label,
        },
      }),
    [avatarSize, isGlass, native, tokens, type],
  )

  const roleLabel = formatFacultyRoleLabel(role)
  const emailLine = email?.trim() || null
  const sectionLine = getCourseDisplayLine(courseCode, courseTitle)

  return (
    <View style={[styles.card, style]}>
      <View style={styles.avatarColumn}>
        {showPresenceBadge ? (
          <ProfileAvatarWithPresence avatarSize={avatarSize}>
            <ProfileAvatar name={name} size={avatarSize} accentColor={FACULTY_SETTINGS_COLOR.profileThumb.fill} />
          </ProfileAvatarWithPresence>
        ) : (
          <ProfileAvatar name={name} size={avatarSize} accentColor={FACULTY_SETTINGS_COLOR.profileThumb.fill} />
        )}
      </View>

      <View style={styles.copy}>
        <View style={[styles.gridRow, styles.gridRowDivider]}>
          <View style={styles.primaryText}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
          </View>
          <View style={[styles.pillBase, styles.rolePill]}>
            <Ionicons name="shield-checkmark-outline" size={12} color={FACULTY_SETTINGS_COLOR.rolePill} />
            <Text style={styles.roleText}>{roleLabel}</Text>
          </View>
        </View>

        <View style={styles.gridRow}>
          <View style={styles.primaryText}>
            {emailLine ? (
              <Text style={styles.email} numberOfLines={1}>
                {emailLine}
              </Text>
            ) : null}
          </View>
          {sectionLine ? (
            <View style={[styles.pillBase, styles.sectionPill]}>
              <Ionicons name="book-outline" size={12} color={FACULTY_SETTINGS_COLOR.coursePill} />
              <Text style={styles.sectionText} numberOfLines={1}>
                {sectionLine}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  )
}
