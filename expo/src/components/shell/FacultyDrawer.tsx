import { useCallback, useEffect, useMemo, useState, memo, type RefObject } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter, usePathname } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, {
  Easing,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import {
  FACULTY_DASHBOARD_LINK,
  FACULTY_CORA_LINK,
  FACULTY_NAV_GROUPS,
  FACULTY_PROFILE_SETTINGS_LINK,
  FACULTY_SUPPORT_GROUP,
  getFacultyActiveNavItemId,
  getFacultyNavGroupIdForPath,
  hasFacultyNavAccess,
  type FacultyNavGroup,
  type FacultyNavItem,
} from "../../constants/faculty-nav"
import { getFacultyNavUpgradePrompt, facultyMembershipTierShortLabel } from "../../lib/faculty-membership-tier"
import { getFacultyMembershipPlan, nextFacultyUpgradeTier } from "../../lib/faculty-membership-plans"
import { facultyMembershipTierSolidBadge } from "../../lib/faculty-membership-plan-theme"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useDrawerNavTheme } from "../../lib/drawer-nav-theme"
import { drawerShellLayout } from "../../lib/drawer-shell-layout"
import { DrawerGlassBackground, drawerGlassStyles } from "../../lib/drawer-glass-ui"
import { useNativeType } from "../../lib/themed-module-theme"
import { GLASS_SHEET_BACKDROP } from "../theme/GlassActionSheetMenu"
import { useGlassChromeActive } from "../theme/GlassSurface"
import { NativeCountBadge } from "../faculty/faculty-shared"
import { BrandLogoMark } from "../brand/BrandLogoMark"
import { useFacultyShell } from "../../context/FacultyShellContext"
import type { FacultySession } from "../../lib/session"
import type { FacultyMembershipTier } from "../../types/dashboard"
import { DrawerNavAnchor, useDrawerScrollToActive } from "../../lib/drawer-scroll-to-active"
import { useDrawerPanelWidth } from "../../lib/responsive-layout"
import { isFacultyDrawerRouteActive, navigateFacultyDrawerRoute } from "../../lib/faculty-drawer-navigation"
import { normalizeRoutePathname } from "../../lib/navigation-reset"

type Props = {
  session: FacultySession
}

/**
 * Faculty side menu — flat module list with section dividers (Gmail-style trial).
 * Accordion version preserved in `FacultyDrawer.accordion.tsx`.
 */
export function FacultyDrawer({ session }: Props) {
  const insets = useSafeAreaInsets()
  const panelWidth = useDrawerPanelWidth()
  const router = useRouter()
  const pathname = usePathname()
  const { drawerOpen, closeDrawer, badges, selectedCourse, notificationCount, membershipTier, membershipTierLoaded } =
    useFacultyShell()
  const drawerTheme = useDrawerNavTheme()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const glassChrome = useGlassChromeActive()
  const activeItemId = useMemo(() => getFacultyActiveNavItemId(pathname), [pathname])
  const activeGroupId = useMemo(() => getFacultyNavGroupIdForPath(pathname), [pathname])
  const scrollTargetId =
    activeGroupId === "administration" || activeGroupId === "support" ? null : activeItemId
  const normalizedPathname = useMemo(() => normalizeRoutePathname(pathname), [pathname])
  const { scrollRef, contentRef, registerRow, unregisterRow } = useDrawerScrollToActive(scrollTargetId, drawerOpen)

  const [drawerMounted, setDrawerMounted] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const backdropOpacity = useSharedValue(0)
  const panelOpacity = useSharedValue(0)
  const panelScale = useSharedValue(0.97)

  const finishClose = useCallback(() => setModalVisible(false), [])

  useEffect(() => {
    closeDrawer()
  }, [pathname, closeDrawer])

  useEffect(() => {
    if (drawerOpen) setDrawerMounted(true)
  }, [drawerOpen])

  useEffect(() => {
    if (drawerOpen) {
      setModalVisible(true)
      backdropOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) })
      panelOpacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) })
      panelScale.value = withSpring(1, { damping: 19, stiffness: 240 })
      return
    }

    backdropOpacity.value = withTiming(0, { duration: 180 })
    panelOpacity.value = withTiming(0, { duration: 160 })
    panelScale.value = withTiming(0.97, { duration: 160 }, (finished) => {
      runOnJS(finishClose)()
    })
  }, [drawerOpen, backdropOpacity, panelOpacity, panelScale, finishClose])

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }))
  const panelStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value,
    transform: [{ scale: panelScale.value }],
  }))

  function badgeFor(item: FacultyNavItem): number | null {
    if (item.badgeKey === "pendingPoints") return badges.pendingPoints || null
    if (item.badgeKey === "pendingIssues") return badges.pendingIssues || null
    if (item.badgeKey === "officeHours") return badges.officeHours || null
    if (item.badgeKey === "notifications") return notificationCount || null
    return null
  }

  function navigate(item: FacultyNavItem) {
    const locked =
      membershipTierLoaded && item.locked && !hasFacultyNavAccess(membershipTier, item.minTier)
    if (locked) {
      const prompt = getFacultyNavUpgradePrompt(item, membershipTier)
      AppAlert.alert(prompt.title, prompt.message, [
        { text: "Not now", style: "cancel" },
        { text: "View plans", onPress: () => navigateTo("/membership") },
      ])
      return
    }
    navigateTo(item.route)
  }

  function navigateTo(route: string) {
    navigateFacultyDrawerRoute(router, pathname, route)
    closeDrawer()
  }

  const tierLabel = membershipTierLoaded ? facultyMembershipTierShortLabel(membershipTier) : "…"
  const tierPlan = membershipTierLoaded ? getFacultyMembershipPlan(membershipTier) : null
  const tierBadge = membershipTierLoaded ? facultyMembershipTierSolidBadge(membershipTier) : null
  const layout = drawerShellLayout(panelWidth, insets, drawerTheme)

  if (!drawerMounted) return null

  return (
    <Modal visible={modalVisible} transparent animationType="none" onRequestClose={closeDrawer} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeDrawer}
            accessible={false}
            importantForAccessibility="no"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.panel,
            panelStyle,
            layout.panel,
            glassChrome && drawerGlassStyles.panelBorder,
          ]}
        >
          {glassChrome ? <DrawerGlassBackground style={StyleSheet.absoluteFill} /> : null}
          <View
            style={[
              styles.header,
              layout.header,
              {
                backgroundColor: drawerTheme.headerBg,
                borderBottomColor: drawerTheme.headerBorder,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <BrandLogoMark size="drawer" />
              <View style={styles.headerCopy}>
                <Text style={[type.drawerBrand, styles.brand]}>CourseCollab</Text>
                <Text
                  style={[type.drawerMeta, styles.userName, { color: drawerTheme.secondaryLabel }]}
                  numberOfLines={1}
                >
                  {session.name}
                </Text>
                <View style={styles.headerMetaRow}>
                  {tierPlan && tierBadge ? (
                    <View
                      style={[
                        styles.tierChip,
                        { backgroundColor: tierBadge.fill, borderColor: tierBadge.border },
                      ]}
                    >
                      <Text style={[type.footnote, styles.tierText, { color: tierBadge.ink }]} numberOfLines={1}>
                        {tierLabel}
                      </Text>
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.courseChip,
                      { backgroundColor: tokens.accentSoft, borderColor: tokens.border },
                    ]}
                  >
                    <View style={[styles.courseDot, { backgroundColor: tokens.warning }]} />
                    <Text
                      style={[type.footnote, styles.courseText, { color: drawerTheme.secondaryLabel }]}
                      numberOfLines={1}
                    >
                      {selectedCourse?.course_code ?? "Select course"}
                      {session.role ? ` · ${session.role}` : ""}
                    </Text>
                  </View>
                </View>
              </View>
              <Pressable
                style={[styles.closeBtn, { backgroundColor: drawerTheme.closeBtnBg }]}
                onPress={closeDrawer}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close menu"
              >
                <Ionicons name="close" size={18} color={drawerTheme.secondaryLabel} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            style={[styles.scroll, { backgroundColor: layout.scrollBackground }]}
            contentContainerStyle={[styles.scrollContent, layout.scrollContent]}
            showsVerticalScrollIndicator={false}
          >
            <View ref={contentRef} collapsable={false}>
              <DrawerNavAnchor itemId={FACULTY_DASHBOARD_LINK.id} registerRow={registerRow} unregisterRow={unregisterRow}>
                <NavRow
                  item={FACULTY_DASHBOARD_LINK}
                  active={isFacultyDrawerRouteActive(normalizedPathname, FACULTY_DASHBOARD_LINK.route)}
                  badge={null}
                  tier={membershipTier}
                  tierLoaded={membershipTierLoaded}
                  onPress={() => navigate(FACULTY_DASHBOARD_LINK)}
                />
              </DrawerNavAnchor>

              <DrawerNavAnchor itemId={FACULTY_CORA_LINK.id} registerRow={registerRow} unregisterRow={unregisterRow}>
                <NavRow
                  item={FACULTY_CORA_LINK}
                  active={isFacultyDrawerRouteActive(normalizedPathname, FACULTY_CORA_LINK.route)}
                  badge={null}
                  tier={membershipTier}
                  tierLoaded={membershipTierLoaded}
                  onPress={() => navigate(FACULTY_CORA_LINK)}
                />
              </DrawerNavAnchor>

              {FACULTY_NAV_GROUPS.map((group) => (
                <FlatNavSection
                  key={group.id}
                  group={group}
                  pathname={normalizedPathname}
                  badgeFor={badgeFor}
                  onPress={navigate}
                  registerRow={registerRow}
                  unregisterRow={unregisterRow}
                  tier={membershipTier}
                  tierLoaded={membershipTierLoaded}
                />
              ))}

              <FlatNavSection
                group={FACULTY_SUPPORT_GROUP}
                pathname={normalizedPathname}
                badgeFor={badgeFor}
                onPress={navigate}
                registerRow={registerRow}
                unregisterRow={unregisterRow}
                tier={membershipTier}
                tierLoaded={membershipTierLoaded}
              />

              <View style={[styles.divider, { backgroundColor: drawerTheme.headerBorder }]} />

              <DrawerNavAnchor
                itemId={FACULTY_PROFILE_SETTINGS_LINK.id}
                registerRow={registerRow}
                unregisterRow={unregisterRow}
              >
                <NavRow
                  item={FACULTY_PROFILE_SETTINGS_LINK}
                  active={
                    isFacultyDrawerRouteActive(normalizedPathname, FACULTY_PROFILE_SETTINGS_LINK.route) ||
                    normalizedPathname === "/module/profile"
                  }
                  badge={null}
                  tier={membershipTier}
                  tierLoaded={membershipTierLoaded}
                  onPress={() => navigate(FACULTY_PROFILE_SETTINGS_LINK)}
                />
              </DrawerNavAnchor>

              <DrawerMembershipUpgradeCard
                tier={membershipTier}
                tierLoaded={membershipTierLoaded}
                onPress={() => navigateTo("/membership")}
              />
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  )
}

function DrawerMembershipUpgradeCard({
  tier,
  tierLoaded,
  onPress,
}: {
  tier: FacultyMembershipTier
  tierLoaded: boolean
  onPress: () => void
}) {
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  if (!tierLoaded) return null
  const next = nextFacultyUpgradeTier(tier)
  if (!next) return null
  const nextPlan = getFacultyMembershipPlan(next)
  return (
    <Pressable
      style={({ pressed }) => [styles.upgradeWrap, pressed && { opacity: 0.88 }]}
      onPress={onPress}
    >
      <View style={[styles.upgradeCard, { backgroundColor: nextPlan.softBg, borderColor: nextPlan.softBorder }]}>
        <View style={[styles.upgradeIcon, { backgroundColor: nextPlan.accent }]}>
          <Ionicons name="diamond-outline" size={18} color="#FFFFFF" />
        </View>
        <View style={styles.upgradeCopy}>
          <Text style={[type.footnote, styles.upgradeTitle, { color: tokens.text }]}>
            Upgrade to {nextPlan.name}
          </Text>
          <Text style={[type.caption, { color: tokens.textSecondary }]} numberOfLines={2}>
            {nextPlan.tagline}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={nextPlan.accentDark} />
      </View>
    </Pressable>
  )
}

function FlatNavSection({
  group,
  pathname,
  badgeFor,
  onPress,
  registerRow,
  unregisterRow,
  tier,
  tierLoaded,
}: {
  group: FacultyNavGroup
  pathname: string
  badgeFor: (item: FacultyNavItem) => number | null
  onPress: (item: FacultyNavItem) => void
  registerRow: (itemId: string, ref: RefObject<View | null>) => void
  unregisterRow: (itemId: string) => void
  tier: FacultyMembershipTier
  tierLoaded: boolean
}) {
  const theme = useDrawerNavTheme()

  return (
    <View style={styles.section}>
      <View style={[styles.divider, { backgroundColor: theme.headerBorder }]} />
      <Text style={[styles.sectionLabel, { color: theme.secondaryLabel }]}>{group.label}</Text>
      {group.items.map((item) => (
        <DrawerNavAnchor key={item.id} itemId={item.id} registerRow={registerRow} unregisterRow={unregisterRow}>
          <NavRow
            item={item}
            active={isFacultyDrawerRouteActive(pathname, item.route)}
            badge={badgeFor(item)}
            tier={tier}
            tierLoaded={tierLoaded}
            onPress={() => onPress(item)}
          />
        </DrawerNavAnchor>
      ))}
    </View>
  )
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

function NavRowComponent({
  item,
  active,
  badge,
  tier,
  tierLoaded,
  onPress,
}: {
  item: FacultyNavItem
  active: boolean
  badge: number | null
  tier: FacultyMembershipTier
  tierLoaded: boolean
  onPress: () => void
}) {
  const theme = useDrawerNavTheme()
  const locked = tierLoaded && item.locked && !hasFacultyNavAccess(tier, item.minTier)
  const focus = useSharedValue(active ? 1 : 0)
  const press = useSharedValue(1)

  useEffect(() => {
    focus.value = withSpring(active ? 1 : 0, { damping: 16, stiffness: 210 })
  }, [active, focus])

  const rowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(focus.value, [0, 1], [theme.navIdleBg, theme.navActiveBg]),
    transform: [{ scale: press.value }],
  }))

  const iconColor = active ? theme.navActiveFg : theme.inactiveIcon
  const labelColor = active ? theme.navActiveFg : theme.label

  return (
    <AnimatedPressable
      style={[styles.navRow, locked && styles.navRowLocked, rowStyle]}
      onPress={onPress}
      onPressIn={() => {
        press.value = withSpring(0.985, { damping: 18, stiffness: 420 })
      }}
      onPressOut={() => {
        press.value = withSpring(1, { damping: 14, stiffness: 320 })
      }}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      accessibilityHint={locked ? `Requires ${item.minTier ?? "Pro"} plan` : undefined}
    >
      <View style={styles.navIconSlot}>
        <Ionicons name={item.icon} size={22} color={iconColor} />
      </View>

      <Text
        style={[styles.navLabel, { color: labelColor }, active && styles.navLabelActive]}
        numberOfLines={1}
      >
        {item.label}
      </Text>

      {badge ? <NativeCountBadge count={badge} variant="compact" /> : null}
      {locked ? (
        <View style={[styles.lockChip, { backgroundColor: theme.iconWellBg }]}>
          <Ionicons name="lock-closed" size={11} color={theme.inactiveIcon} />
        </View>
      ) : null}
    </AnimatedPressable>
  )
}

const NavRow = memo(NavRowComponent)

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", alignItems: "stretch" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: GLASS_SHEET_BACKDROP },
  panel: {
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 8, height: 0 },
    elevation: 12,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 6 },
  logoFrame: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  logo: { width: 30, height: 30 },
  headerCopy: { flex: 1, gap: 6, minWidth: 0 },
  headerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  brand: {},
  userName: { minWidth: 0 },
  courseChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
  },
  courseDot: { width: 6, height: 6, borderRadius: 3 },
  courseText: {
    fontWeight: "500" as const,
    flexShrink: 1,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 20 },
  section: { paddingTop: 2 },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
    marginVertical: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.08,
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 6,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28,
    marginHorizontal: 4,
  },
  navIconSlot: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: { flex: 1, fontSize: 15, fontWeight: "500", lineHeight: 20 },
  navLabelActive: { fontWeight: "600" },
  navRowLocked: { opacity: 0.72 },
  lockChip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  tierChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    maxWidth: "46%",
  },
  tierText: { fontWeight: "600" as const },
  upgradeWrap: { marginTop: 12, marginHorizontal: 6, borderRadius: 18, overflow: "hidden" },
  upgradeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  upgradeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeCopy: { flex: 1, gap: 2, minWidth: 0 },
  upgradeTitle: { fontWeight: "700" as const },
})
