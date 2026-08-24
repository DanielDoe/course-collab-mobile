import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import type { IoniconName } from "@/components/icons/AppIcon"
import { DrawerNavChevron, DrawerNavIcon } from "./drawer-nav-icons"
import { BrandLogoMark } from "../brand/BrandLogoMark"
import { useRouter, usePathname } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming} from "react-native-reanimated"
import {
  STUDENT_DASHBOARD_LINK,
  STUDENT_NAV_GROUPS,
  STUDENT_SETTINGS_LINK,
  STUDENT_SUPPORT_GROUP,
  getNavGroupIdForPath,
  hasNavAccess,
  type StudentNavGroup,
  type StudentNavItem} from "../../constants/student-nav"
import {
  getStoredDrawerExpandedGroup,
  setStoredDrawerExpandedGroup,
  STUDENT_DRAWER_GROUP_IDS} from "../../lib/drawer-nav-memory"
import { useMembershipTier } from "../../hooks/useMembershipTier"
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
import { useDrawerPanelWidth } from "../../lib/responsive-layout"
import { getQueryClient } from "../../lib/query/client"
import { prefetchForRoute } from "../../lib/query/nav-prefetch"

/** Small gap below status bar / Dynamic Island — no left or bottom outer inset. */
const DRAWER_TOP_GAP = 8
const DEFAULT_EXPANDED_GROUP_ID = STUDENT_NAV_GROUPS[0]?.id ?? "learning-center"

function createCollapsedGroups(): Record<string, boolean> {
  return Object.fromEntries(STUDENT_DRAWER_GROUP_IDS.map((id) => [id, false]))
}

function expandSingleGroup(groupId: string): Record<string, boolean> {
  const next = createCollapsedGroups()
  if (STUDENT_DRAWER_GROUP_IDS.includes(groupId)) {
    next[groupId] = true
  }
  return next
}

type Props = {
  session: StudentSession
}

/**
 * ARCHIVED accordion student drawer (expand/collapse groups).
 * Kept for easy revert — active drawer is `StudentDrawer.tsx` (flat + dividers).
 * Not imported by the app shell.
 */
export function StudentDrawerAccordion({ session }: Props) {
  const insets = useSafeAreaInsets()
  const panelWidth = useDrawerPanelWidth()
  const router = useRouter()
  const pathname = usePathname()
  const { drawerOpen, closeDrawer, membershipTier, membershipTierLoaded, refreshStudentData } =
    useStudentShell()
  const { refreshAll: refreshMembershipFromHook } = useMembershipTier(session, { loadOnMount: false })
  const refreshShell = refreshStudentData ?? refreshMembershipFromHook
  const drawerTheme = useDrawerNavTheme()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  const [modalVisible, setModalVisible] = useState(false)
  const backdropOpacity = useSharedValue(0)
  const panelOpacity = useSharedValue(0)
  const panelScale = useSharedValue(0.97)

  const finishClose = useCallback(() => setModalVisible(false), [])

  const matchedGroupId = useMemo(() => getNavGroupIdForPath(pathname), [pathname])

  const [preferredExpandedGroupId, setPreferredExpandedGroupId] = useState(DEFAULT_EXPANDED_GROUP_ID)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    expandSingleGroup(DEFAULT_EXPANDED_GROUP_ID),
  )
  const memoryHydratedRef = useRef(false)
  const lastMatchedGroupIdRef = useRef<string | null>(null)

  const rememberExpandedGroup = useCallback(
    (groupId: string) => {
      setPreferredExpandedGroupId(groupId)
      void setStoredDrawerExpandedGroup(session.databaseId, groupId)
    },
    [session.databaseId],
  )

  const applyExpandedGroup = useCallback(
    (groupId: string) => {
      rememberExpandedGroup(groupId)
      setExpandedGroups(expandSingleGroup(groupId))
    },
    [rememberExpandedGroup],
  )

  useEffect(() => {
    memoryHydratedRef.current = false
    lastMatchedGroupIdRef.current = null
  }, [session.databaseId])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const storedGroupId = await getStoredDrawerExpandedGroup(session.databaseId)
      if (cancelled || memoryHydratedRef.current) return
      memoryHydratedRef.current = true
      const initialGroupId = matchedGroupId ?? storedGroupId ?? DEFAULT_EXPANDED_GROUP_ID
      lastMatchedGroupIdRef.current = matchedGroupId
      applyExpandedGroup(initialGroupId)
    })()
    return () => {
      cancelled = true
    }
  }, [session.databaseId, matchedGroupId, applyExpandedGroup])

  useEffect(() => {
    if (!memoryHydratedRef.current || !matchedGroupId) return
    if (matchedGroupId === lastMatchedGroupIdRef.current) return
    lastMatchedGroupIdRef.current = matchedGroupId
    applyExpandedGroup(matchedGroupId)
  }, [matchedGroupId, applyExpandedGroup])

  const toggleGroup = useCallback(
    (groupId: string) => {
      setExpandedGroups((prev) => {
        if (prev[groupId]) {
          return { ...prev, [groupId]: false }
        }
        rememberExpandedGroup(groupId)
        return expandSingleGroup(groupId)
      })
    },
    [rememberExpandedGroup],
  )

  useEffect(() => {
    closeDrawer()
  }, [pathname, closeDrawer])

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
    transform: [{ scale: panelScale.value }]}))

  function navigate(route: string) {
    const groupId = getNavGroupIdForPath(route)
    if (groupId) applyExpandedGroup(groupId)
    prefetchForRoute(getQueryClient(), session, route)
    closeDrawer()
    router.push(route as never)
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

  if (!modalVisible) return null

  return (
    <Modal visible transparent animationType="none" onRequestClose={closeDrawer} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} accessibilityLabel="Close menu" />
        </Animated.View>

        <Animated.View
          style={[
            styles.panelFrame,
            {
              top: insets.top + DRAWER_TOP_GAP,
              left: 0,
              bottom: 0,
              width: panelWidth,
            },
            panelStyle,
          ]}
        >
          <View style={styles.panel}>
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: drawerTheme.panelBg,
                  borderTopLeftRadius: 32,
                  borderTopRightRadius: 32,
                  borderBottomRightRadius: 32,
                },
              ]}
            />
            <View
              style={[
                styles.header,
                {
                  paddingTop: 14,
                  backgroundColor: drawerTheme.headerBg,
                  borderBottomColor: drawerTheme.headerBorder,
                },
              ]}
            >
              <View style={styles.headerRow}>
                <BrandLogoMark size="drawer" />
                <View style={styles.headerCopy}>
                  <Text style={[type.drawerBrand, styles.brand, { color: drawerTheme.label }]}>CourseCollab</Text>
                  <View style={styles.headerMetaRow}>
                    <Text style={[type.drawerMeta, styles.userName, { color: drawerTheme.secondaryLabel }]} numberOfLines={1}>
                      {session.name}
                    </Text>
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
                    ) : (
                      <Text style={[type.footnote, { color: drawerTheme.secondaryLabel }]}>Loading plan…</Text>
                    )}
                  </View>
                </View>
                <Pressable style={[styles.closeBtn, { backgroundColor: drawerTheme.closeBtnBg }]} onPress={closeDrawer} hitSlop={8}>
                  <DrawerNavIcon name="close" size={18} color={drawerTheme.secondaryLabel} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
              showsVerticalScrollIndicator={false}
            >
            <NavRow
              item={STUDENT_DASHBOARD_LINK}
              active={pathname === STUDENT_DASHBOARD_LINK.route}
              tier={membershipTier}
              tierLoaded={membershipTierLoaded}
              onPress={() => handleNavPress(STUDENT_DASHBOARD_LINK)}
            />

            {STUDENT_NAV_GROUPS.map((group) => (
              <NavGroupSection
                key={group.id}
                group={group}
                expanded={expandedGroups[group.id] ?? false}
                pathname={pathname}
                tier={membershipTier}
                tierLoaded={membershipTierLoaded}
                onToggle={() => toggleGroup(group.id)}
                onPress={handleNavPress}
              />
            ))}

            <NavRow
              item={STUDENT_SETTINGS_LINK}
              active={pathname === STUDENT_SETTINGS_LINK.route}
              tier={membershipTier}
              tierLoaded={membershipTierLoaded}
              onPress={() => handleNavPress(STUDENT_SETTINGS_LINK)}
            />

            <View style={styles.sectionGap} />

            <NavGroupSection
              group={STUDENT_SUPPORT_GROUP}
              expanded={expandedGroups[STUDENT_SUPPORT_GROUP.id] ?? false}
              pathname={pathname}
              tier={membershipTier}
              tierLoaded={membershipTierLoaded}
              onToggle={() => toggleGroup(STUDENT_SUPPORT_GROUP.id)}
              onPress={handleNavPress}
            />

            <DrawerUpgradeCard
              tier={membershipTier}
              tierLoaded={membershipTierLoaded}
              onPress={() => navigate("/membership")}
            />
          </ScrollView>
          </View>
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

function NavGroupSection({
  group,
  expanded,
  pathname,
  tier,
  tierLoaded,
  onToggle,
  onPress,
}: {
  group: StudentNavGroup
  expanded: boolean
  pathname: string
  tier: MembershipTier
  tierLoaded: boolean
  onToggle: () => void
  onPress: (item: StudentNavItem) => void
}) {
  const theme = useDrawerNavTheme()
  const hasActive = group.items.some((item) => pathname === item.route || pathname.startsWith(`${item.route}/`))
  const chipEmphasized = expanded || hasActive

  return (
    <View style={styles.group}>
      <Pressable
        style={({ pressed }) => [styles.groupChip, pressed && styles.groupChipPressed]}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <DrawerNavIcon
          name={group.icon}
          size={19}
          color={chipEmphasized ? theme.navActiveFg : theme.inactiveIcon}
          style={styles.groupChipGlyph}
        />
        <Text
          style={[
            styles.groupChipLabel,
            { color: chipEmphasized ? theme.navActiveFg : theme.label },
            chipEmphasized && { fontWeight: "600" },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          {group.label}
        </Text>
        {hasActive ? (
          <View style={[styles.groupLiveDot, { backgroundColor: theme.navActiveFg }]} />
        ) : (
          <View style={[styles.groupCount, { backgroundColor: theme.countPillBg }]}>
            <Text style={[styles.groupCountText, { color: theme.countPillText }]}>{group.items.length}</Text>
          </View>
        )}
        <DrawerNavChevron expanded={expanded} color={theme.inactiveIcon} />
      </Pressable>

      {expanded ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={styles.groupBody}>
          <View style={[styles.groupRail, { backgroundColor: theme.rail }]} />
          <View style={styles.groupItems}>
            {group.items.map((item, index) => (
              <Animated.View key={item.id} entering={FadeIn.delay(index * 35).duration(220)}>
                <NavRow
                  item={item}
                  active={pathname === item.route || pathname.startsWith(`${item.route}/`)}
                  tier={tier}
                  tierLoaded={tierLoaded}
                  nested
                  onPress={() => onPress(item)}
                />
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      ) : null}
    </View>
  )
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

function NavRow({
  item,
  active,
  tier,
  tierLoaded,
  nested = false,
  onPress,
}: {
  item: StudentNavItem
  active: boolean
  tier: MembershipTier
  tierLoaded: boolean
  nested?: boolean
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

  const iconColor = active
    ? theme.navActiveFg
    : nested
      ? theme.label
      : theme.inactiveIcon
  const labelColor = active ? theme.navActiveFg : theme.label

  return (
    <AnimatedPressable
      style={[
        styles.navRow,
        nested && styles.navRowNested,
        nested && active && styles.navRowNestedActive,
        locked && styles.navRowLocked,
        rowStyle,
      ]}
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
        <DrawerNavIcon name={item.icon} size={19} color={iconColor} />
      </View>

      <Text
        style={[
          styles.navLabel,
          nested && styles.navLabelNested,
          { color: labelColor },
          active && styles.navLabelActive,
        ]}
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: GLASS_SHEET_BACKDROP },
  panelFrame: {
    position: "absolute",
  },
  panel: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOpacity: 0.14,
    shadowRadius: 32,
    shadowOffset: { width: 4, height: 0 },
    elevation: 16,
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoFrame: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 34, height: 34 },
  headerCopy: { flex: 1, gap: 4, minWidth: 0 },
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
  scroll: { flex: 1, backgroundColor: "transparent" },
  scrollContent: { paddingHorizontal: 14, paddingTop: 10, gap: 4 },
  sectionGap: { height: 6 },
  group: { gap: 2 },
  groupChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  groupChipPressed: { opacity: 0.88 },
  groupChipGlyph: { width: 22 },
  groupChipLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: Platform.OS === "ios" ? -0.2 : 0,
    lineHeight: 21,
  },
  groupCount: {
    minWidth: 24,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  groupCountText: { fontWeight: "600" as const, fontSize: 12, lineHeight: 16 },
  groupLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  groupBody: { flexDirection: "row", paddingLeft: 14, gap: 10, marginTop: 0 },
  groupRail: {
    width: 2,
    borderRadius: 999,
    marginVertical: 4,
  },
  groupItems: { flex: 1, gap: 4, paddingRight: 6 },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  navRowNested: {},
  navRowNestedActive: {},
  navRowLocked: { opacity: 0.65 },
  navIconSlot: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: { flex: 1, fontSize: 15, fontWeight: "500", lineHeight: 20 },
  navLabelNested: { fontWeight: "500" },
  navLabelActive: { fontWeight: "600" },
  lockChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeWrap: { marginTop: 8, borderRadius: 18, overflow: "hidden" },
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
