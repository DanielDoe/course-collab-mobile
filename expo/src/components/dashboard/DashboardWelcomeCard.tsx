import { useEffect, useMemo, type ReactNode, type RefObject } from "react"
import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { LinearGradient } from "expo-linear-gradient"
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated"
import type { LoginPortal } from "../../constants/portals"
import { portalMeta } from "../../constants/portals"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import type { AppThemeTokens, HeroThemeTokens } from "../../constants/app-themes"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useNativeType } from "../../lib/themed-module-theme"
import { studentInitials } from "../../lib/faculty-students-utils"

type WelcomeTheme = HeroThemeTokens

const AVATAR_SIZE = 62

function normalizeLabel(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase()
}

/** Hide subtitle when it repeats the badge (e.g. ECE2202 vs "ECE 2202 (Review Demo)"). */
function visibleSubtitle(badge?: string | null, subtitle?: string | null): string | null {
  const trimmed = subtitle?.trim()
  if (!trimmed) return null
  const badgeTrimmed = badge?.trim()
  if (!badgeTrimmed) return trimmed

  const badgeKey = badgeTrimmed.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
  const subKey = trimmed.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
  if (badgeKey && (subKey === badgeKey || subKey.startsWith(badgeKey))) {
    // Drop leading course-code tokens; if only a parenthetical/demo label remains, hide.
    const remainder = trimmed
      .replace(new RegExp(`^\\s*${badgeTrimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "i"), "")
      .replace(/^[A-Za-z]+\s*\d+[A-Za-z0-9]*\s*/i, "")
      .replace(/^[(\-–—:]\s*/, "")
      .replace(/\)$/, "")
      .trim()
    if (!remainder || /^\([^)]*\)$/.test(remainder) || remainder.length < 3) return null
  }

  if (normalizeLabel(badgeTrimmed) === normalizeLabel(trimmed)) return null
  return trimmed
}

function portalWelcomeTheme(portal: LoginPortal, tokens: AppThemeTokens): WelcomeTheme {
  if (portal === "guest") {
    return {
      ...tokens.hero,
      gradientSoft: [tokens.accentSoft, tokens.background, tokens.tint],
    }
  }
  return tokens.hero
}

function FloatingBubble({
  style,
  color,
  driftX,
  driftY,
  duration,
}: {
  style: object
  color: string
  driftX: number
  driftY: number
  duration: number
}) {
  const tx = useSharedValue(0)
  const ty = useSharedValue(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    // Respect the OS "Reduce Motion" setting, and never leave a -1 repeat
    // running after unmount — an un-cancelled loop keeps the UI thread busy
    // for the life of the app even once the dashboard is off screen.
    if (reduceMotion) {
      tx.value = 0
      ty.value = 0
      return
    }

    tx.value = withRepeat(
      withSequence(
        withTiming(driftX, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(-driftX, { duration, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    )
    ty.value = withRepeat(
      withSequence(
        withTiming(-driftY, { duration: duration * 1.15, easing: Easing.inOut(Easing.sin) }),
        withTiming(driftY, { duration: duration * 1.15, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    )

    return () => {
      cancelAnimation(tx)
      cancelAnimation(ty)
    }
  }, [driftX, driftY, duration, reduceMotion, tx, ty])

  const motion = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }))

  return (
    <Animated.View
      style={[style, { backgroundColor: color }, motion]}
      pointerEvents="none"
    />
  )
}

export type DashboardWelcomeCardProps = {
  portal: LoginPortal
  name: string
  roleLabel?: string
  roleIcon?: keyof typeof Ionicons.glyphMap
  /** Short badge text, e.g. course code or program id */
  badge?: string | null
  /** Secondary line under the name */
  subtitle?: string | null
  /** When set, renders a single meta line instead of role/badge/subtitle pills */
  metaLine?: string | null
  /** Replaces the initials avatar (e.g. Cora brand mark). */
  leading?: ReactNode
  leadingRef?: RefObject<View | null>
  hideLeading?: boolean
  onLeadingLayout?: () => void
  /** Disable built-in mount animation when a parent handles entry (Cora hub stagger). */
  animateEntry?: boolean
}

export function DashboardWelcomeCard({
  portal,
  name,
  roleLabel,
  roleIcon,
  badge,
  subtitle,
  metaLine,
  leading,
  leadingRef,
  hideLeading = false,
  onLeadingLayout,
  animateEntry = true,
}: DashboardWelcomeCardProps) {
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const meta = portalMeta(portal)
  const theme = useMemo(() => portalWelcomeTheme(portal, tokens), [portal, tokens])
  const initials = studentInitials(name)
  const label = roleLabel ?? meta.label
  const icon = roleIcon ?? meta.icon

  const pillBg = tokens.isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.72)"
  const badgeBg = tokens.isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.78)"
  const avatarRing = tokens.isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.85)"

  const avatarPulse = useSharedValue(1)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion) {
      avatarPulse.value = 1
      return
    }

    avatarPulse.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    )

    return () => cancelAnimation(avatarPulse)
  }, [avatarPulse, reduceMotion])

  const avatarMotion = useAnimatedStyle(() => ({
    transform: [{ scale: avatarPulse.value }],
  }))

  const metaSubtitle = visibleSubtitle(badge, subtitle)
  const metaLineText = metaLine?.trim()
  const hasMetaRow = metaLineText ? true : Boolean(label || badge || metaSubtitle)

  const metaContent = hasMetaRow ? (
    metaLineText ? (
      <View style={styles.metaLineStack}>
        {label ? (
          <View style={[styles.rolePill, { borderColor: theme.pillBorder, backgroundColor: pillBg }]}>
            <Ionicons name={icon} size={12} color={theme.pillText} />
            <Text style={[type.footnote, styles.roleText, { fontWeight: "600", color: theme.pillText }]}>
              {label}
            </Text>
          </View>
        ) : null}
        <Text style={[type.secondary, styles.metaLine]} numberOfLines={2}>
          {metaLineText}
        </Text>
      </View>
    ) : (
      <View style={styles.metaRow}>
        {label ? (
          <View style={[styles.rolePill, { borderColor: theme.pillBorder, backgroundColor: pillBg }]}>
            <Ionicons name={icon} size={12} color={theme.pillText} />
            <Text style={[type.footnote, styles.roleText, { fontWeight: "600", color: theme.pillText }]}>
              {label}
            </Text>
          </View>
        ) : null}

        {badge ? (
          <View style={[styles.badgePill, { borderColor: theme.pillBorder, backgroundColor: badgeBg }]}>
            <Text
              style={[type.footnote, styles.badgeText, { fontWeight: "700", color: theme.codeText }]}
              numberOfLines={1}
            >
              {badge}
            </Text>
          </View>
        ) : null}

        {metaSubtitle ? (
          <Text style={[type.secondary, styles.subtitle]} numberOfLines={2}>
            {metaSubtitle}
          </Text>
        ) : null}
      </View>
    )
  ) : null

  const cardBody = (
    <LinearGradient
      colors={theme.gradientSoft}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <FloatingBubble style={styles.bubbleA} color={theme.bubbleA} driftX={5} driftY={7} duration={3400} />
      <FloatingBubble style={styles.bubbleB} color={theme.bubbleB} driftX={-4} driftY={5} duration={4200} />
      <FloatingBubble style={styles.bubbleC} color={theme.bubbleC} driftX={3} driftY={-4} duration={3800} />

      <View style={styles.row}>
        {animateEntry ? (
          <Animated.View
            entering={FadeInDown.delay(60).springify().damping(15).stiffness(180)}
            style={avatarMotion}
          >
            <View
              ref={leadingRef}
              onLayout={onLeadingLayout}
              style={[
                styles.avatarShell,
                { backgroundColor: avatarRing, opacity: hideLeading ? 0 : 1 },
              ]}
            >
              {leading ? (
                <LinearGradient
                  colors={theme.avatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarInner}
                >
                  {leading}
                </LinearGradient>
              ) : (
                <LinearGradient
                  colors={theme.avatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarInner}
                >
                  <Text style={styles.initials}>{initials}</Text>
                </LinearGradient>
              )}
            </View>
          </Animated.View>
        ) : (
          <View>
            <View
              ref={leadingRef}
              onLayout={onLeadingLayout}
              style={[
                styles.avatarShell,
                { backgroundColor: avatarRing, opacity: hideLeading ? 0 : 1 },
              ]}
            >
              {leading ? (
                <LinearGradient
                  colors={theme.avatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarInner}
                >
                  {leading}
                </LinearGradient>
              ) : (
                <LinearGradient
                  colors={theme.avatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarInner}
                >
                  <Text style={styles.initials}>{initials}</Text>
                </LinearGradient>
              )}
            </View>
          </View>
        )}

        <View style={styles.copy}>
          {animateEntry ? (
            <Animated.Text
              entering={FadeInDown.delay(120).duration(380)}
              style={[type.sheetTitle, styles.name, { fontSize: 22, lineHeight: 28, letterSpacing: -0.3 }]}
              numberOfLines={2}
            >
              {name}
            </Animated.Text>
          ) : (
            <Text
              style={[type.sheetTitle, styles.name, { fontSize: 22, lineHeight: 28, letterSpacing: -0.3 }]}
              numberOfLines={2}
            >
              {name}
            </Text>
          )}

          {metaContent ? (
            animateEntry ? (
              <Animated.View entering={FadeInDown.delay(190).duration(380)}>{metaContent}</Animated.View>
            ) : (
              metaContent
            )
          ) : null}
        </View>
      </View>
    </LinearGradient>
  )

  const shellStyle = [
    styles.shellOuter,
    tokens.cardShadow,
    { borderColor: tokens.border, borderWidth: StyleSheet.hairlineWidth },
  ]

  if (animateEntry) {
    return (
      <Animated.View entering={FadeIn.duration(420)} style={shellStyle}>
        {cardBody}
      </Animated.View>
    )
  }

  return <View style={shellStyle}>{cardBody}</View>
}

const styles = StyleSheet.create({
  shellOuter: {
    borderRadius: NATIVE.sectionRadius,
  },
  gradient: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 112,
    borderRadius: NATIVE.sectionRadius,
    overflow: "hidden",
  },
  bubbleA: {
    position: "absolute",
    top: -22,
    right: -10,
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  bubbleB: {
    position: "absolute",
    bottom: -20,
    right: 48,
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  bubbleC: {
    position: "absolute",
    top: 28,
    left: -18,
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    zIndex: 1,
  },
  avatarShell: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: 20,
    padding: 2,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 4,
  },
  name: {
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  metaLineStack: {
    gap: 4,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  roleText: {
    fontWeight: "600",
  },
  badgePill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  badgeText: {
    fontWeight: "700",
  },
  subtitle: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    lineHeight: 20,
  },
  metaLine: {
    lineHeight: 20,
  },
})
