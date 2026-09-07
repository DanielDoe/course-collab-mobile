import { useEffect, useMemo, useState, memo, type RefObject } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { Pressable as GesturePressable } from "react-native-gesture-handler"
import { ShellDrawerChrome, useShellDrawerMotion } from "../navigation/ShellDrawerMotionProvider"
import { DrawerNavIcon } from "../shell/drawer-nav-icons"
import { BrandLogoMark } from "../brand/BrandLogoMark"
import { usePathname, useRouter } from "expo-router"
import { GUEST_CORA_CAREER_CHECKOUT_ROUTE } from "../../lib/guest-checkout-paths"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import {
  GUEST_CAREER_TOOLS_GROUP,
  GUEST_COMMUNICATION_GROUP,
  GUEST_CORA_GROUP,
  GUEST_SUPPORT_GROUP,
  GUEST_DASHBOARD_LINK,
  GUEST_RECOMMENDATIONS_GROUP,
  GUEST_SETTINGS_LINK,
  filterGuestNavItems,
  getGuestActiveNavItemId,
  guestCoraCommerceEnabled,
  type GuestNavGroup,
  type GuestNavItem,
} from "../../constants/guest-nav"
import { useGuestEntitlements } from "../../context/GuestEntitlementsProvider"
import { useGuestShell } from "../../context/GuestShellContext"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useDrawerNavTheme } from "../../lib/drawer-nav-theme"
import { drawerShellLayout } from "../../lib/drawer-shell-layout"
import { useNativeType } from "../../lib/themed-module-theme"
import type { GuestSession } from "../../lib/session"
import { GLASS_SHEET_BACKDROP } from "../theme/GlassActionSheetMenu"
import { DrawerNavAnchor, useDrawerScrollToActive } from "../../lib/drawer-scroll-to-active"
import { useDrawerPanelWidth } from "../../lib/responsive-layout"
import { isDrawerShellRouteActive, navigateDrawerShellRoute } from "../../lib/drawer-shell-navigation"
import { normalizeRoutePathname } from "../../lib/navigation-reset"
import { GUEST_CORA_CAREER_LIFETIME_CREDITS } from "../../lib/guest-membership-config"

type Props = { session: GuestSession }

/**
 * Guest side menu — flat module list with section dividers (matches student/faculty drawer).
 */
export function GuestDrawer({ session }: Props) {
  const insets = useSafeAreaInsets()
  const panelWidth = useDrawerPanelWidth()
  const router = useRouter()
  const pathname = usePathname()
  const { drawerOpen, closeDrawer } = useGuestShell()
  const { modalVisible } = useShellDrawerMotion()
  const drawerTheme = useDrawerNavTheme()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const activeItemId = useMemo(() => getGuestActiveNavItemId(pathname), [pathname])
  const { entitlements } = useGuestEntitlements()
  const coraNavItems = useMemo(
    () =>
      filterGuestNavItems(GUEST_CORA_GROUP.items, {
        careerNavEnabled: entitlements.nav.career !== false,
        hasCoraCareer: entitlements.plan === "cora_career",
        coraCommerceEnabled: guestCoraCommerceEnabled(entitlements),
      }),
    [entitlements],
  )
  const showCoraGroup = coraNavItems.length > 0
  const careerToolsItems = useMemo(
    () =>
      filterGuestNavItems(GUEST_CAREER_TOOLS_GROUP.items, {
        careerNavEnabled: entitlements.nav.career !== false,
        hasCoraCareer: entitlements.plan === "cora_career",
        coraCommerceEnabled: guestCoraCommerceEnabled(entitlements),
      }),
    [entitlements],
  )
  const normalizedPathname = useMemo(() => normalizeRoutePathname(pathname), [pathname])
  const { scrollRef, contentRef, registerRow, unregisterRow, onRowLayout, onScroll } =
    useDrawerScrollToActive(activeItemId, drawerOpen)

  useEffect(() => {
    closeDrawer()
  }, [pathname, closeDrawer])

  function navigate(route: string) {
    closeDrawer()
    navigateDrawerShellRoute(router, pathname, route)
  }

  const roleLabel =
    session.guestAccessPurpose === "recommendation_letter" ? "Recommendation letters" : "Career Member"
  const layout = drawerShellLayout(panelWidth, insets, drawerTheme)

  return (
    <ShellDrawerChrome
      visible={modalVisible}
      onRequestClose={closeDrawer}
      backdropBaseStyle={styles.backdrop}
      panelBaseStyle={[styles.panel, layout.panel]}
    >
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
                  <View
                    style={[
                      styles.roleChip,
                      { backgroundColor: tokens.accentSoft, borderColor: tokens.border },
                    ]}
                  >
                    <Text
                      style={[type.footnote, styles.roleText, { color: tokens.accent }]}
                      numberOfLines={1}
                    >
                      {roleLabel}
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
                <DrawerNavIcon name="close" size={18} color={drawerTheme.secondaryLabel} />
              </GesturePressable>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            style={[styles.scroll, { backgroundColor: layout.scrollBackground }]}
            contentContainerStyle={[styles.scrollContent, layout.scrollContent]}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            <View ref={contentRef} collapsable={false}>
              <DrawerNavAnchor itemId={GUEST_DASHBOARD_LINK.id} registerRow={registerRow} unregisterRow={unregisterRow} onRowLayout={onRowLayout}>
                <NavRow
                  item={GUEST_DASHBOARD_LINK}
                  active={isDrawerShellRouteActive(normalizedPathname, GUEST_DASHBOARD_LINK.route)}
                  onPress={() => navigate(GUEST_DASHBOARD_LINK.route)}
                />
              </DrawerNavAnchor>

              <FlatNavSection
                group={GUEST_RECOMMENDATIONS_GROUP}
                pathname={normalizedPathname}
                onPress={(item) => navigate(item.route)}
                registerRow={registerRow}
                unregisterRow={unregisterRow}
                onRowLayout={onRowLayout}
              />

              {careerToolsItems.length > 0 ? (
                <FlatNavSection
                  group={{ ...GUEST_CAREER_TOOLS_GROUP, items: careerToolsItems }}
                  pathname={normalizedPathname}
                  onPress={(item) => navigate(item.route)}
                  registerRow={registerRow}
                  unregisterRow={unregisterRow}
                  onRowLayout={onRowLayout}
                />
              ) : null}

              {showCoraGroup ? (
                <FlatNavSection
                  group={{ ...GUEST_CORA_GROUP, items: coraNavItems }}
                  pathname={normalizedPathname}
                  onPress={(item) => navigate(item.route)}
                  registerRow={registerRow}
                  unregisterRow={unregisterRow}
                  onRowLayout={onRowLayout}
                />
              ) : null}

              <FlatNavSection
                group={GUEST_COMMUNICATION_GROUP}
                pathname={normalizedPathname}
                onPress={(item) => navigate(item.route)}
                registerRow={registerRow}
                unregisterRow={unregisterRow}
                onRowLayout={onRowLayout}
              />

              <FlatNavSection
                group={GUEST_SUPPORT_GROUP}
                pathname={normalizedPathname}
                onPress={(item) => navigate(item.route)}
                registerRow={registerRow}
                unregisterRow={unregisterRow}
                onRowLayout={onRowLayout}
              />

              <View style={[styles.divider, { backgroundColor: drawerTheme.headerBorder }]} />

              <DrawerNavAnchor itemId={GUEST_SETTINGS_LINK.id} registerRow={registerRow} unregisterRow={unregisterRow} onRowLayout={onRowLayout}>
                <NavRow
                  item={GUEST_SETTINGS_LINK}
                  active={isDrawerShellRouteActive(normalizedPathname, GUEST_SETTINGS_LINK.route) || normalizedPathname.startsWith("/settings/")}
                  onPress={() => navigate(GUEST_SETTINGS_LINK.route)}
                />
              </DrawerNavAnchor>

              {entitlements.plan !== "cora_career" && guestCoraCommerceEnabled(entitlements) ? (
                <GuestCoraCareerPromo onPress={() => navigate(GUEST_CORA_CAREER_CHECKOUT_ROUTE)} />
              ) : null}
            </View>
            </ScrollView>
    </ShellDrawerChrome>
  )
}

function FlatNavSection({
  group,
  pathname,
  onPress,
  registerRow,
  unregisterRow,
  onRowLayout,
}: {
  group: GuestNavGroup
  pathname: string
  onPress: (item: GuestNavItem) => void
  registerRow: (itemId: string, ref: RefObject<View | null>) => void
  unregisterRow: (itemId: string) => void
  onRowLayout: (itemId: string) => void
}) {
  const theme = useDrawerNavTheme()

  return (
    <View style={styles.section}>
      <View style={[styles.divider, { backgroundColor: theme.headerBorder }]} />
      <Text style={[styles.sectionLabel, { color: theme.secondaryLabel }]}>{group.label}</Text>
      {group.items.map((item) => (
        <DrawerNavAnchor key={item.id} itemId={item.id} registerRow={registerRow} unregisterRow={unregisterRow} onRowLayout={onRowLayout}>
          <NavRow
            item={item}
            active={
              isDrawerShellRouteActive(pathname, item.route) || pathname.startsWith("/recommendation/")
            }
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
  onPress,
}: {
  item: GuestNavItem
  active: boolean
  onPress: () => void
}) {
  const theme = useDrawerNavTheme()
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
      style={[styles.navRow, rowStyle]}
      onPress={onPress}
      onPressIn={() => {
        press.value = withSpring(0.985, { damping: 18, stiffness: 420 })
      }}
      onPressOut={() => {
        press.value = withSpring(1, { damping: 14, stiffness: 320 })
      }}
      accessibilityState={{ selected: active }}
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
    </AnimatedPressable>
  )
}

const NavRow = memo(NavRowComponent)

function GuestCoraCareerPromo({ onPress }: { onPress: () => void }) {
  const theme = useDrawerNavTheme()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <Pressable
      style={[
        styles.promoCard,
        tokens.cardShadow,
        { backgroundColor: theme.panelBg, borderColor: theme.headerBorder },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Unlock Cora Career"
    >
      <Text style={[type.bodyEmphasis, { color: theme.label }]}>Unlock Cora Career</Text>
      <Text style={[type.caption, styles.promoCopy, { color: theme.secondaryLabel }]}>
        Résumé review, interview prep, and {GUEST_CORA_CAREER_LIFETIME_CREDITS.toLocaleString()} Cora Credits — lifetime access.
      </Text>
      <View style={[styles.promoBtn, { backgroundColor: tokens.accent }]}>
        <Text style={styles.promoBtnText}>Get Cora Career</Text>
      </View>
    </Pressable>
  )
}

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
  headerCopy: { flex: 1, gap: 4 },
  headerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  brand: {},
  userName: { flexShrink: 1, flex: 1, minWidth: 0 },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    maxWidth: "52%",
  },
  roleText: {
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
  navIconSlot: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: { flex: 1, fontSize: 15, fontWeight: "500", lineHeight: 20 },
  navLabelActive: { fontWeight: "600" },
  promoCard: {
    marginHorizontal: 12,
    marginTop: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  promoCopy: { lineHeight: 20 },
  promoBtn: {
    marginTop: 4,
    borderRadius: 999,
    paddingVertical: 11,
    alignItems: "center",
  },
  promoBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
})
