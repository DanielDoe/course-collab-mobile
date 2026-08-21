import { useCallback, useEffect, useMemo, useState, memo, type RefObject } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { DrawerNavIcon } from "../shell/drawer-nav-icons"
import { BrandLogoMark } from "../brand/BrandLogoMark"
import { usePathname, useRouter } from "expo-router"
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
  SUMMER_DASHBOARD_LINK,
  SUMMER_NAV_GROUP,
  SUMMER_SETTINGS_LINK,
  getSummerActiveNavItemId,
  type SummerNavGroup,
  type SummerNavItem,
} from "../../constants/summer-nav"
import { useSummerShell } from "../../context/SummerShellContext"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useDrawerNavTheme } from "../../lib/drawer-nav-theme"
import { drawerShellLayout } from "../../lib/drawer-shell-layout"
import { useNativeType } from "../../lib/themed-module-theme"
import type { SummerSession } from "../../lib/session"
import { formatSummerRole } from "./summer-utils"
import { GLASS_SHEET_BACKDROP } from "../theme/GlassActionSheetMenu"
import { DrawerNavAnchor, useDrawerScrollToActive } from "../../lib/drawer-scroll-to-active"
import { useDrawerPanelWidth } from "../../lib/responsive-layout"
import { isDrawerShellRouteActive, navigateDrawerShellRoute } from "../../lib/drawer-shell-navigation"
import { normalizeRoutePathname } from "../../lib/navigation-reset"

type Props = { session: SummerSession }

/**
 * Summer Camp side menu — flat module list with section dividers (matches student/faculty drawer).
 */
export function SummerDrawer({ session }: Props) {
  const insets = useSafeAreaInsets()
  const panelWidth = useDrawerPanelWidth()
  const router = useRouter()
  const pathname = usePathname()
  const { drawerOpen, closeDrawer } = useSummerShell()
  const drawerTheme = useDrawerNavTheme()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const activeItemId = useMemo(() => getSummerActiveNavItemId(pathname), [pathname])
  const normalizedPathname = useMemo(() => normalizeRoutePathname(pathname), [pathname])
  const { scrollRef, contentRef, registerRow, unregisterRow, onRowLayout, onScroll } =
    useDrawerScrollToActive(activeItemId, drawerOpen)

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

  const roleLabel = formatSummerRole(session.studentProgramRole)
  const layout = drawerShellLayout(panelWidth, insets, drawerTheme)

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
            layout.panel,
          ]}
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
            style={[styles.scroll, { backgroundColor: layout.scrollBackground }]}
            contentContainerStyle={[styles.scrollContent, layout.scrollContent]}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            <View ref={contentRef} collapsable={false}>
              <DrawerNavAnchor
                itemId={SUMMER_DASHBOARD_LINK.id}
                registerRow={registerRow}
                unregisterRow={unregisterRow}
                onRowLayout={onRowLayout}
              >
                <NavRow
                  item={SUMMER_DASHBOARD_LINK}
                  active={isDrawerShellRouteActive(normalizedPathname, SUMMER_DASHBOARD_LINK.route)}
                  onPress={() => navigate(SUMMER_DASHBOARD_LINK.route)}
                />
              </DrawerNavAnchor>

              <FlatNavSection
                group={SUMMER_NAV_GROUP}
                pathname={normalizedPathname}
                onPress={(item) => navigate(item.route)}
                registerRow={registerRow}
                unregisterRow={unregisterRow}
                onRowLayout={onRowLayout}
              />

              <View style={[styles.divider, { backgroundColor: drawerTheme.headerBorder }]} />

              <DrawerNavAnchor
                itemId={SUMMER_SETTINGS_LINK.id}
                registerRow={registerRow}
                unregisterRow={unregisterRow}
                onRowLayout={onRowLayout}
              >
                <NavRow
                  item={SUMMER_SETTINGS_LINK}
                  active={isDrawerShellRouteActive(normalizedPathname, SUMMER_SETTINGS_LINK.route)}
                  onPress={() => navigate(SUMMER_SETTINGS_LINK.route)}
                />
              </DrawerNavAnchor>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
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
  group: SummerNavGroup
  pathname: string
  onPress: (item: SummerNavItem) => void
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
            active={isDrawerShellRouteActive(pathname, item.route)}
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
  item: SummerNavItem
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
})
