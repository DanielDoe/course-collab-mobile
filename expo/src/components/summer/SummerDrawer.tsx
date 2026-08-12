import { useCallback, useEffect, useMemo, useState, memo } from "react"
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { LinearGradient } from "expo-linear-gradient"
import { usePathname, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
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
  getSummerNavGroupIdForPath,
  type SummerNavGroup,
  type SummerNavItem,
} from "../../constants/summer-nav"
import { useSummerShell } from "../../context/SummerShellContext"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useDrawerNavTheme } from "../../lib/drawer-nav-theme"
import { useNativeType } from "../../lib/themed-module-theme"
import { MODERN } from "../../constants/faculty-native-theme"
import type { SummerSession } from "../../lib/session"
import { formatSummerRole } from "./summer-utils"
import { DrawerGlassBackground, drawerGlassStyles } from "../../lib/drawer-glass-ui"
import { GLASS_SHEET_BACKDROP } from "../theme/GlassActionSheetMenu"
import { BrandLogoMark } from "../brand/BrandLogoMark"
import { DrawerNavAnchor, useDrawerScrollToActive } from "../../lib/drawer-scroll-to-active"
import { useDrawerPanelWidth } from "../../lib/responsive-layout"
import { isDrawerShellRouteActive, navigateDrawerShellRoute } from "../../lib/drawer-shell-navigation"
import { normalizeRoutePathname } from "../../lib/navigation-reset"

const SUMMER_GROUP_IDS = [SUMMER_NAV_GROUP.id]
const DEFAULT_EXPANDED_GROUP_ID = SUMMER_NAV_GROUP.id

function createCollapsedGroups(): Record<string, boolean> {
  return Object.fromEntries(SUMMER_GROUP_IDS.map((id) => [id, false]))
}

function expandSingleGroup(groupId: string): Record<string, boolean> {
  const next = createCollapsedGroups()
  if (SUMMER_GROUP_IDS.includes(groupId)) {
    next[groupId] = true
  }
  return next
}

type Props = { session: SummerSession }

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
  const { scrollRef, contentRef, registerRow, unregisterRow } = useDrawerScrollToActive(activeItemId, drawerOpen)

  const [drawerMounted, setDrawerMounted] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const backdropOpacity = useSharedValue(0)
  const panelOpacity = useSharedValue(0)
  const panelScale = useSharedValue(0.97)

  const finishClose = useCallback(() => setModalVisible(false), [])
  const matchedGroupId = useMemo(() => getSummerNavGroupIdForPath(pathname), [pathname])
  const [preferredExpandedGroupId, setPreferredExpandedGroupId] = useState(DEFAULT_EXPANDED_GROUP_ID)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    expandSingleGroup(DEFAULT_EXPANDED_GROUP_ID),
  )

  const applyExpandedGroup = useCallback((groupId: string) => {
    setPreferredExpandedGroupId(groupId)
    setExpandedGroups(expandSingleGroup(groupId))
  }, [])

  useEffect(() => {
    if (matchedGroupId) applyExpandedGroup(matchedGroupId)
  }, [matchedGroupId, applyExpandedGroup])

  const toggleGroup = useCallback(
    (groupId: string) => {
      setExpandedGroups((prev) => {
        if (prev[groupId]) return { ...prev, [groupId]: false }
        setPreferredExpandedGroupId(groupId)
        return expandSingleGroup(groupId)
      })
    },
    [],
  )

  useEffect(() => {
    closeDrawer()
  }, [pathname, closeDrawer])

  useEffect(() => {
    if (drawerOpen) setDrawerMounted(true)
  }, [drawerOpen])

  useEffect(() => {
    if (drawerOpen) {
      setModalVisible(true)
      setExpandedGroups(expandSingleGroup(preferredExpandedGroupId))
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
  }, [drawerOpen, preferredExpandedGroupId, backdropOpacity, panelOpacity, panelScale, finishClose])

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }))
  const panelStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value,
    transform: [{ scale: panelScale.value }],
  }))

  function navigate(route: string) {
    const groupId = getSummerNavGroupIdForPath(route)
    if (groupId) applyExpandedGroup(groupId)
    closeDrawer()
    navigateDrawerShellRoute(router, pathname, route)
  }

  function isActive(route: string) {
    return isDrawerShellRouteActive(normalizedPathname, route)
  }

  const roleLabel = formatSummerRole(session.studentProgramRole)

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
            drawerTheme.isGlass && drawerGlassStyles.panelBorder,
          ]}
        >
          {drawerTheme.isGlass ? (
            <DrawerGlassBackground style={StyleSheet.absoluteFill} />
          ) : null}
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
                <Text style={[type.drawerBrand, styles.brand]}>CourseCollab</Text>
                <View style={styles.headerMetaRow}>
                  <Text style={[type.drawerMeta, styles.userName]} numberOfLines={1}>
                    {session.name}
                  </Text>
                  <View style={[styles.roleChip, { backgroundColor: tokens.accentSoft, borderColor: tokens.border }]}>
                    <View style={[styles.roleDot, { backgroundColor: tokens.accent }]} />
                    <Text style={[type.footnote, styles.roleText, { color: drawerTheme.secondaryLabel }]} numberOfLines={1}>
                      {roleLabel}
                    </Text>
                  </View>
                </View>
              </View>
              <Pressable style={[styles.closeBtn, { backgroundColor: drawerTheme.closeBtnBg }]} onPress={closeDrawer} hitSlop={8}>
                <Ionicons name="close" size={18} color={drawerTheme.secondaryLabel} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            style={[styles.scroll, { backgroundColor: drawerTheme.isGlass ? "transparent" : tokens.background }]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View ref={contentRef} collapsable={false}>
              <DrawerNavAnchor itemId={SUMMER_DASHBOARD_LINK.id} registerRow={registerRow} unregisterRow={unregisterRow}>
                <NavRow
                  item={SUMMER_DASHBOARD_LINK}
                  active={isActive(SUMMER_DASHBOARD_LINK.route)}
                  onPress={() => navigate(SUMMER_DASHBOARD_LINK.route)}
                />
              </DrawerNavAnchor>

              <NavGroupSection
                group={SUMMER_NAV_GROUP}
                expanded={expandedGroups[SUMMER_NAV_GROUP.id] ?? false}
                pathname={normalizedPathname}
                onToggle={() => toggleGroup(SUMMER_NAV_GROUP.id)}
                onPress={(item) => navigate(item.route)}
                registerRow={registerRow}
                unregisterRow={unregisterRow}
              />

              <DrawerNavAnchor itemId={SUMMER_SETTINGS_LINK.id} registerRow={registerRow} unregisterRow={unregisterRow}>
                <NavRow
                  item={SUMMER_SETTINGS_LINK}
                  active={isActive(SUMMER_SETTINGS_LINK.route)}
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

function NavGroupSection({
  group,
  expanded,
  pathname,
  onToggle,
  onPress,
  registerRow,
  unregisterRow,
}: {
  group: SummerNavGroup
  expanded: boolean
  pathname: string
  onToggle: () => void
  onPress: (item: SummerNavItem) => void
  registerRow: (itemId: string, ref: React.RefObject<View | null>) => void
  unregisterRow: (itemId: string) => void
}) {
  const theme = useDrawerNavTheme()
  const tokens = useAppThemeTokens()
  const hasActive = group.items.some((item) => isDrawerShellRouteActive(pathname, item.route))
  const chipEmphasized = expanded || hasActive
  const chevron = useSharedValue(expanded ? 1 : 0)

  useEffect(() => {
    chevron.value = withSpring(expanded ? 1 : 0, { damping: 15, stiffness: 200 })
  }, [expanded, chevron])

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevron.value * 180}deg` }],
  }))

  return (
    <View style={styles.group}>
      <Pressable
        style={({ pressed }) => [
          styles.groupChip,
          { backgroundColor: theme.chipBg, borderColor: theme.softBorder },
          hasActive && { borderColor: theme.navActiveBorder, backgroundColor: theme.chipActiveBg },
          theme.isGlass && drawerGlassStyles.groupChipFlat,
          pressed && styles.groupChipPressed,
        ]}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={[styles.groupChipIcon, { backgroundColor: theme.iconWellBg }]}>
          <Ionicons
            name={group.icon}
            size={16}
            color={chipEmphasized ? tokens.accent : theme.secondaryLabel}
          />
        </View>
        <Text
          style={[
            styles.groupChipLabel,
            { color: chipEmphasized ? tokens.accent : theme.label },
            chipEmphasized && { fontWeight: "700" },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          {group.label}
        </Text>
        {hasActive ? (
          <View style={[styles.groupLiveDot, { backgroundColor: theme.primary, shadowColor: theme.primary }]} />
        ) : (
          <View style={[styles.groupCount, { backgroundColor: theme.iconWellBg }]}>
            <Text style={[styles.groupCountText, { color: theme.secondaryLabel }]}>{group.items.length}</Text>
          </View>
        )}
        <Animated.View style={[styles.groupChevron, { backgroundColor: theme.iconWellBg }, chevronStyle]}>
          <Ionicons name="chevron-down" size={14} color={theme.secondaryLabel} />
        </Animated.View>
      </Pressable>

      {expanded ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={styles.groupBody}>
          <View style={[styles.groupRail, { backgroundColor: theme.softBorder }]} />
          <View style={styles.groupItems}>
            {group.items.map((item, index) => (
              <Animated.View key={item.id} entering={FadeIn.delay(index * 35).duration(220)}>
                <DrawerNavAnchor itemId={item.id} registerRow={registerRow} unregisterRow={unregisterRow}>
                  <NavRow
                    item={item}
                    active={isDrawerShellRouteActive(pathname, item.route)}
                    onPress={() => onPress(item)}
                  />
                </DrawerNavAnchor>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      ) : null}
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
  const tokens = useAppThemeTokens()
  const focus = useSharedValue(active ? 1 : 0)
  const press = useSharedValue(1)

  useEffect(() => {
    focus.value = withSpring(active ? 1 : 0, { damping: 16, stiffness: 210 })
  }, [active, focus])

  const rowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(focus.value, [0, 1], [theme.navIdleBg, theme.navActiveBg]),
    borderColor: interpolateColor(focus.value, [0, 1], [theme.softBorder, theme.navActiveBorder]),
    shadowOpacity: theme.isGlass ? 0 : interpolate(focus.value, [0, 1], [0.04, 0.14]),
    transform: [{ scale: press.value }],
  }))

  return (
    <AnimatedPressable
      style={[styles.navRow, theme.isGlass && drawerGlassStyles.navRowFlat, rowStyle]}
      onPress={onPress}
      onPressIn={() => {
        press.value = withSpring(0.985, { damping: 18, stiffness: 420 })
      }}
      onPressOut={() => {
        press.value = withSpring(1, { damping: 14, stiffness: 320 })
      }}
      accessibilityState={{ selected: active }}
    >
      {active ? (
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.navIconGradient}
        >
          <Ionicons name={item.icon} size={17} color="#ffffff" />
        </LinearGradient>
      ) : (
        <View style={[styles.navIconMuted, { backgroundColor: theme.soft }]}>
          <Ionicons name={item.icon} size={17} color={theme.primary} />
        </View>
      )}

      <Text
        style={[
          styles.navLabel,
          { color: active ? theme.primary : theme.label },
          active && { fontWeight: "700" },
        ]}
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
    borderBottomWidth: 1,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 },
  logoFrame: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  logo: { width: 30, height: 30 },
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
  roleDot: { width: 6, height: 6, borderRadius: 3 },
  roleText: {
    fontWeight: "500" as const,
    flexShrink: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 12, gap: 8, paddingBottom: 20 },
  group: { gap: 6 },
  groupChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: MODERN.chipRadius,
    borderWidth: 1,
    ...MODERN.chipShadow,
  },
  groupChipPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  groupChipIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  groupChipLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: Platform.OS === "ios" ? -0.2 : 0,
    lineHeight: 20,
  },
  groupCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  groupCountText: { fontWeight: "600" as const, fontSize: 12, lineHeight: 16 },
  groupLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  groupChevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  groupBody: { flexDirection: "row", paddingLeft: 18, gap: 10 },
  groupRail: {
    width: 2,
    borderRadius: 999,
    marginVertical: 4,
  },
  groupItems: { flex: 1, gap: 6 },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: MODERN.navRowRadius,
    borderWidth: 1,
    shadowColor: "#64748b",
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    overflow: "hidden",
  },
  navIconGradient: {
    width: MODERN.iconGradientSize,
    height: MODERN.iconGradientSize,
    borderRadius: MODERN.iconGradientRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  navIconMuted: {
    width: MODERN.iconGradientSize,
    height: MODERN.iconGradientSize,
    borderRadius: MODERN.iconGradientRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: { flex: 1, fontSize: 15, fontWeight: "500", lineHeight: 20 },
})
