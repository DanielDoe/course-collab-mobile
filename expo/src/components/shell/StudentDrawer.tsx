import { useCallback, useEffect, useMemo, useState, memo, type RefObject } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import type { IoniconName } from "@/components/icons/AppIcon"
import { DrawerNavIcon } from "./drawer-nav-icons"
import { BrandLogoMark } from "../brand/BrandLogoMark"
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
  STUDENT_DASHBOARD_LINK,
  STUDENT_NAV_GROUPS,
  STUDENT_SETTINGS_LINK,
  STUDENT_SUPPORT_GROUP,
  getStudentActiveNavItemId,
  hasNavAccess,
  type StudentNavGroup,
  type StudentNavItem,
} from "../../constants/student-nav"
import { useStudentShell } from "../../context/StudentShellContext"
import { getNavUpgradePrompt } from "../../lib/membership-tier"
import type { StudentSession } from "../../lib/session"
import type { MembershipTier } from "../../types/dashboard"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { getMembershipPlan, nextUpgradeTier } from "../../lib/membership-plans"
import { membershipTierSolidBadge } from "../../lib/membership-plan-theme"
import { useDrawerNavTheme } from "../../lib/drawer-nav-theme"
import { useNativeType } from "../../lib/themed-module-theme"
import { GLASS_SHEET_BACKDROP } from "../theme/GlassActionSheetMenu"
import { LinearGradient } from "expo-linear-gradient"
import {
  promoAccentBodyStyle,
  promoAccentForegroundColor,
  promoAccentGradientColors,
  promoAccentTitleStyle,
  promoIconOnAccentStyle,
} from "../../lib/promo-accent-theme"
import { DrawerNavAnchor, useDrawerScrollToActive } from "../../lib/drawer-scroll-to-active"
import { useDrawerPanelWidth } from "../../lib/responsive-layout"
import { isDrawerShellRouteActive, navigateDrawerShellRoute } from "../../lib/drawer-shell-navigation"
import { normalizeRoutePathname } from "../../lib/navigation-reset"

type Props = {
  session: StudentSession
}

/**
 * Student side menu — flat module list with section dividers (Gmail-style trial).
 * Accordion version preserved in `StudentDrawer.accordion.tsx`.
 */
export function StudentDrawer({ session }: Props) {
  const insets = useSafeAreaInsets()
  const panelWidth = useDrawerPanelWidth()
  const router = useRouter()
  const pathname = usePathname()
  const { drawerOpen, closeDrawer, membershipTier, membershipTierLoaded } = useStudentShell()
  const drawerTheme = useDrawerNavTheme()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const activeItemId = useMemo(() => getStudentActiveNavItemId(pathname), [pathname])
  const normalizedPathname = useMemo(() => normalizeRoutePathname(pathname), [pathname])
  const { scrollRef, contentRef, registerRow, unregisterRow } = useDrawerScrollToActive(activeItemId, drawerOpen)

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
      if (finished) runOnJS(finishClose)()
    })
  }, [drawerOpen, backdropOpacity, panelOpacity, panelScale, finishClose])

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }))
  const panelStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value,
    transform: [{ scale: panelScale.value }],
  }))

  function navigate(route: string) {
    closeDrawer()
    navigateDrawerShellRoute(router, pathname, route)
  }

  function handleNavPress(item: StudentNavItem) {
    const locked =
      membershipTierLoaded && item.locked && !hasNavAccess(membershipTier, item.minTier)

    if (locked) {
      const prompt = getNavUpgradePrompt(item, membershipTier)
      AppAlert.alert(prompt.title, prompt.message, [
        { text: "Not now", style: "cancel" },
        { text: "View plans", onPress: () => navigate("/membership") },
      ])
      return
    }

    navigate(item.route)
  }

  const tierLabel = membershipTierLoaded ? membershipTier : "…"
  const tierPlan = membershipTierLoaded ? getMembershipPlan(membershipTier) : null
  const tierBadge = membershipTierLoaded ? membershipTierSolidBadge(membershipTier) : null

  if (!drawerMounted) return null

  return (
    <Modal visible={modalVisible} transparent animationType="none" onRequestClose={closeDrawer} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} accessibilityLabel="Close menu" />
        </Animated.View>

        <Animated.View
          style={[
            styles.panel,
            panelStyle,
            {
              width: panelWidth,
              paddingBottom: insets.bottom + 12,
              backgroundColor: drawerTheme.panelBg,
              borderRightColor: drawerTheme.headerBorder,
            },
          ]}
        >
          <View
            style={[
              styles.header,
              {
                paddingTop: insets.top + 12,
                backgroundColor: drawerTheme.headerBg,
                borderBottomColor: drawerTheme.headerBorder,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <BrandLogoMark size="drawer" />
              <View style={styles.headerCopy}>
                <Text style={[type.drawerBrand, styles.brand, { color: drawerTheme.label }]}>
                  CourseCollab
                </Text>
                <View style={styles.headerMetaRow}>
                  <Text
                    style={[type.drawerMeta, styles.userName, { color: drawerTheme.secondaryLabel }]}
                    numberOfLines={1}
                  >
                    {session.name}
                  </Text>
                  {tierPlan && tierBadge ? (
                    <View
                      style={[
                        styles.tierChip,
                        { backgroundColor: tierBadge.fill, borderColor: tierBadge.border },
                      ]}
                    >
                      <Text
                        style={[type.footnote, styles.tierText, { color: tierBadge.ink }]}
                        numberOfLines={1}
                      >
                        {tierLabel}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[type.footnote, { color: drawerTheme.secondaryLabel }]}>
                      Loading plan…
                    </Text>
                  )}
                </View>
              </View>
              <Pressable
                style={[styles.closeBtn, { backgroundColor: drawerTheme.closeBtnBg }]}
                onPress={closeDrawer}
                hitSlop={8}
              >
                <DrawerNavIcon name="close" size={18} color={drawerTheme.secondaryLabel} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            style={[styles.scroll, { backgroundColor: tokens.background }]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
              <View ref={contentRef} collapsable={false}>
                <DrawerNavAnchor itemId={STUDENT_DASHBOARD_LINK.id} registerRow={registerRow} unregisterRow={unregisterRow}>
                  <NavRow
                    item={STUDENT_DASHBOARD_LINK}
                    active={isDrawerShellRouteActive(normalizedPathname, STUDENT_DASHBOARD_LINK.route)}
                    tier={membershipTier}
                    tierLoaded={membershipTierLoaded}
                    onPress={() => handleNavPress(STUDENT_DASHBOARD_LINK)}
                  />
                </DrawerNavAnchor>

                {STUDENT_NAV_GROUPS.map((group) => (
                  <FlatNavSection
                    key={group.id}
                    group={group}
                    pathname={normalizedPathname}
                    tier={membershipTier}
                    tierLoaded={membershipTierLoaded}
                    onPress={handleNavPress}
                    registerRow={registerRow}
                    unregisterRow={unregisterRow}
                  />
                ))}

                <View style={[styles.divider, { backgroundColor: drawerTheme.headerBorder }]} />

                <DrawerNavAnchor itemId={STUDENT_SETTINGS_LINK.id} registerRow={registerRow} unregisterRow={unregisterRow}>
                  <NavRow
                    item={STUDENT_SETTINGS_LINK}
                    active={isDrawerShellRouteActive(normalizedPathname, STUDENT_SETTINGS_LINK.route)}
                    tier={membershipTier}
                    tierLoaded={membershipTierLoaded}
                    onPress={() => handleNavPress(STUDENT_SETTINGS_LINK)}
                  />
                </DrawerNavAnchor>

                <FlatNavSection
                  group={STUDENT_SUPPORT_GROUP}
                  pathname={normalizedPathname}
                  tier={membershipTier}
                  tierLoaded={membershipTierLoaded}
                  onPress={handleNavPress}
                  registerRow={registerRow}
                  unregisterRow={unregisterRow}
                />

                <DrawerUpgradeCard
                  tier={membershipTier}
                  tierLoaded={membershipTierLoaded}
                  onPress={() => navigate("/membership")}
                />
              </View>
            </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  )
}

function upgradeCardCopy(next: MembershipTier): { title: string; body: string } {
  if (next === "Explorer") {
    return {
      title: "Go Explorer",
      body: "AI tutor, notetaker & practice rankings.",
    }
  }
  return {
    title: "Go Trailblazer",
    body: "CodeBench IDE & deeper analytics.",
  }
}

function drawerMembershipCardCopy(
  tier: MembershipTier,
  tierLoaded: boolean,
): { title: string; body: string; icon: IoniconName } {
  if (!tierLoaded) {
    return {
      title: "Membership",
      body: "View plans & perks.",
      icon: "diamond-outline",
    }
  }

  const next = nextUpgradeTier(tier)
  if (next) {
    const plan = getMembershipPlan(next)
    const copy = upgradeCardCopy(next)
    return {
      ...copy,
      icon: plan.icon === "diamond-outline" ? "diamond" : plan.icon,
    }
  }

  const plan = getMembershipPlan(tier)
  return {
    title: "Go Trailblazer",
    body: "AI tutor, CodeBench IDE & deeper analytics.",
    icon: plan.icon === "diamond-outline" ? "diamond" : plan.icon,
  }
}

function DrawerUpgradeCard({
  tier,
  tierLoaded,
  onPress,
}: {
  tier: MembershipTier
  tierLoaded: boolean
  onPress: () => void
}) {
  const tokens = useAppThemeTokens()
  const promo = promoIconOnAccentStyle(tokens)
  const copy = drawerMembershipCardCopy(tier, tierLoaded)
  const gradientColors = promoAccentGradientColors(tokens)
  const foreground = promoAccentForegroundColor()

  return (
    <Pressable
      style={({ pressed }) => [styles.upgradeWrap, pressed && { opacity: NATIVE.pressedOpacity }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${copy.title}. ${copy.body}`}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.upgradeCard}
      >
        <View style={[styles.upgradeIcon, promo.tile]}>
          <DrawerNavIcon name={copy.icon} size={18} color={promo.iconColor} />
        </View>
        <View style={styles.upgradeCopy}>
          <Text style={promoAccentTitleStyle(tokens)}>{copy.title}</Text>
          <Text style={promoAccentBodyStyle(tokens)}>{copy.body}</Text>
        </View>
        <DrawerNavIcon name="arrow-forward-circle" size={22} color={foreground} />
      </LinearGradient>
    </Pressable>
  )
}

function FlatNavSection({
  group,
  pathname,
  tier,
  tierLoaded,
  onPress,
  registerRow,
  unregisterRow,
}: {
  group: StudentNavGroup
  pathname: string
  tier: MembershipTier
  tierLoaded: boolean
  onPress: (item: StudentNavItem) => void
  registerRow: (itemId: string, ref: RefObject<View | null>) => void
  unregisterRow: (itemId: string) => void
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
            active={isDrawerShellRouteActive(pathname, item.route)}
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
  tier,
  tierLoaded,
  onPress,
}: {
  item: StudentNavItem
  active: boolean
  tier: MembershipTier
  tierLoaded: boolean
  onPress: () => void
}) {
  const theme = useDrawerNavTheme()
  const locked = tierLoaded && item.locked && !hasNavAccess(tier, item.minTier)
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
      accessibilityState={{ selected: active }}
      accessibilityHint={locked ? `Requires ${item.minTier ?? "Explorer"} plan` : undefined}
    >
      <View style={styles.navIconSlot}>
        <DrawerNavIcon name={item.icon} size={22} color={iconColor} />
      </View>

      <Text
        style={[styles.navLabel, { color: labelColor }, active && styles.navLabelActive]}
        numberOfLines={1}
      >
        {item.label}
      </Text>

      {locked ? (
        <View style={[styles.lockChip, { backgroundColor: theme.iconWellBg }]}>
          <DrawerNavIcon name="lock-closed" size={11} color={theme.inactiveIcon} strokeWidth={2.25} />
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
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 },
  logoFrame: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 34, height: 34 },
  headerCopy: { flex: 1, gap: 4 },
  headerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  brand: {},
  userName: { flexShrink: 1, flex: 1, minWidth: 0 },
  tierChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    maxWidth: "52%",
  },
  tierDot: { width: 6, height: 6, borderRadius: 3 },
  tierText: {
    fontWeight: "600" as const,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  navRowLocked: { opacity: 0.65 },
  navIconSlot: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: { flex: 1, fontSize: 15, fontWeight: "500", lineHeight: 20 },
  navLabelActive: { fontWeight: "600" },
  lockChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeWrap: { marginTop: 12, marginHorizontal: 6, borderRadius: 18, overflow: "hidden" },
  upgradeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
  },
  upgradeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeCopy: { flex: 1, gap: 2, minWidth: 0 },
})
