import { useEffect, useMemo, useState, memo, type RefObject } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { Pressable as GesturePressable } from "react-native-gesture-handler"
import {
  DrawerPanelScrollHost,
  ShellDrawerChrome,
  useShellDrawerMotion,
} from "../navigation/ShellDrawerMotionProvider"
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter, usePathname } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, {
  interpolateColor,
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
  hasFacultyNavAccess,
  isFacultyNavItemVisible,
  type FacultyNavGroup,
  type FacultyNavItem,
} from "../../constants/faculty-nav"
import { getFacultyNavUpgradePrompt, facultyMembershipTierShortLabel } from "../../lib/faculty-membership-tier"
import { isIosPurchaseUiHidden, tierLockedAlertButtons } from "../../lib/purchase-navigation"
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
import { resolveFacultyNavBadgeCount } from "../../lib/module-nav-badges"
import type { FacultySession } from "../../lib/session"
import type { InstructorCourse } from "../../lib/instructor-api"
import type { FacultyMembershipTier } from "../../types/dashboard"

import { facultyScopeLabel } from "../../lib/faculty-scope-label"
import { DrawerNavAnchor, useDrawerScrollToActive } from "../../lib/drawer-scroll-to-active"
import { useDrawerPanelWidth } from "../../lib/responsive-layout"
import { isFacultyDrawerRouteActive, navigateFacultyDrawerRoute } from "../../lib/faculty-drawer-navigation"
import { normalizeRoutePathname } from "../../lib/navigation-reset"
import { getQueryClient } from "../../lib/query/client"
import { prefetchForRoute } from "../../lib/query/nav-prefetch"

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
  const { modalVisible } = useShellDrawerMotion()
  const drawerTheme = useDrawerNavTheme()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const glassChrome = useGlassChromeActive()
  const activeItemId = useMemo(() => getFacultyActiveNavItemId(pathname), [pathname])
  const normalizedPathname = useMemo(() => normalizeRoutePathname(pathname), [pathname])
  const { scrollRef, contentRef, registerRow, unregisterRow, onRowLayout, onScroll } =
    useDrawerScrollToActive(activeItemId, drawerOpen)

  useEffect(() => {
    closeDrawer()
  }, [pathname, closeDrawer])

  function badgeFor(item: FacultyNavItem): number | null {
    return resolveFacultyNavBadgeCount(badges, notificationCount, item.badgeKey)
  }

  function navigate(item: FacultyNavItem) {
    const locked =
      membershipTierLoaded && item.locked && !hasFacultyNavAccess(membershipTier, item.minTier)
    if (locked) {
      const prompt = getFacultyNavUpgradePrompt(item, membershipTier)
      AppAlert.alert(prompt.title, prompt.message, tierLockedAlertButtons(() => navigateTo("/membership")))
      return
    }
    navigateTo(item.route)
  }

  function navigateTo(route: string) {
    prefetchForRoute(getQueryClient(), session, route)
    closeDrawer()
    navigateFacultyDrawerRoute(router, pathname, route)
  }

  const tierLabel = membershipTierLoaded ? facultyMembershipTierShortLabel(membershipTier) : "…"
  const tierPlan = membershipTierLoaded ? getFacultyMembershipPlan(membershipTier) : null
  const tierBadge = membershipTierLoaded ? facultyMembershipTierSolidBadge(membershipTier) : null
  const layout = drawerShellLayout(panelWidth, insets, drawerTheme)

  return (
    <ShellDrawerChrome
      visible={modalVisible}
      onRequestClose={closeDrawer}
      backdropBaseStyle={styles.backdrop}
      panelBaseStyle={[
        styles.panel,
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
                      {facultyScopeLabel(selectedCourse)}
                      {session.role ? ` · ${session.role}` : ""}
                    </Text>
                  </View>
                </View>
              </View>
              <GesturePressable
                style={[styles.closeBtn, { backgroundColor: drawerTheme.closeBtnBg }]}
                onPress={closeDrawer}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close menu"
              >
                <Ionicons name="close" size={18} color={drawerTheme.secondaryLabel} />
              </GesturePressable>
            </View>
          </View>

          <DrawerPanelScrollHost>
          <ScrollView
            ref={scrollRef}
            style={[styles.scroll, { backgroundColor: layout.scrollBackground }]}
            contentContainerStyle={[styles.scrollContent, layout.scrollContent]}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            <View ref={contentRef} collapsable={false}>
              <DrawerNavAnchor
                itemId={FACULTY_DASHBOARD_LINK.id}
                registerRow={registerRow}
                unregisterRow={unregisterRow}
                onRowLayout={onRowLayout}
              >
                <NavRow
                  item={FACULTY_DASHBOARD_LINK}
                  active={isFacultyDrawerRouteActive(normalizedPathname, FACULTY_DASHBOARD_LINK.route)}
                  badge={null}
                  tier={membershipTier}
                  tierLoaded={membershipTierLoaded}
                  onPress={() => navigate(FACULTY_DASHBOARD_LINK)}
                />
              </DrawerNavAnchor>

              <DrawerNavAnchor
                itemId={FACULTY_CORA_LINK.id}
                registerRow={registerRow}
                unregisterRow={unregisterRow}
                onRowLayout={onRowLayout}
              >
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
                  onRowLayout={onRowLayout}
                  tier={membershipTier}
                  tierLoaded={membershipTierLoaded}
                  selectedCourse={selectedCourse}
                />
              ))}

              <FlatNavSection
                group={FACULTY_SUPPORT_GROUP}
                pathname={normalizedPathname}
                badgeFor={badgeFor}
                onPress={navigate}
                registerRow={registerRow}
                unregisterRow={unregisterRow}
                onRowLayout={onRowLayout}
                tier={membershipTier}
                tierLoaded={membershipTierLoaded}
                selectedCourse={selectedCourse}
              />

              <View style={[styles.divider, { backgroundColor: drawerTheme.headerBorder }]} />

              <DrawerNavAnchor
                itemId={FACULTY_PROFILE_SETTINGS_LINK.id}
                registerRow={registerRow}
                unregisterRow={unregisterRow}
                onRowLayout={onRowLayout}
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

              {isIosPurchaseUiHidden() ? null : (
                <DrawerMembershipUpgradeCard
                  tier={membershipTier}
                  tierLoaded={membershipTierLoaded}
                  onPress={() => navigateTo("/membership")}
                />
              )}
            </View>
            </ScrollView>
          </DrawerPanelScrollHost>
    </ShellDrawerChrome>
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
  onRowLayout,
  tier,
  tierLoaded,
  selectedCourse,
}: {
  group: FacultyNavGroup
  pathname: string
  badgeFor: (item: FacultyNavItem) => number | null
  onPress: (item: FacultyNavItem) => void
  registerRow: (itemId: string, ref: RefObject<View | null>) => void
  unregisterRow: (itemId: string) => void
  onRowLayout: (itemId: string) => void
  tier: FacultyMembershipTier
  tierLoaded: boolean
  selectedCourse: import("../../lib/instructor-api").InstructorCourse | null
}) {
  const theme = useDrawerNavTheme()
  const visibleItems = group.items.filter((item) => isFacultyNavItemVisible(item, selectedCourse))

  if (!visibleItems.length) return null

  return (
    <View style={styles.section}>
      <View style={[styles.divider, { backgroundColor: theme.headerBorder }]} />
      <Text style={[styles.sectionLabel, { color: theme.secondaryLabel }]}>{group.label}</Text>
      {visibleItems.map((item) => (
        <DrawerNavAnchor
          key={item.id}
          itemId={item.id}
          registerRow={registerRow}
          unregisterRow={unregisterRow}
          onRowLayout={onRowLayout}
        >
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
