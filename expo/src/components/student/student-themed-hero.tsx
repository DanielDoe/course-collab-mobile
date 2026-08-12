import type { ReactNode } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { LinearGradient } from "expo-linear-gradient"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { nativeType } from "../../constants/faculty-native-theme"

export type StudentHeroStat = {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
}

type StudentThemedHeroProps = {
  icon: keyof typeof Ionicons.glyphMap
  /** Shown under the top bar — do not repeat the module title here. */
  subtitle: string
  stats?: StudentHeroStat[]
  trailing?: ReactNode
  children?: ReactNode
}

export function StudentThemedHero({ icon, subtitle, stats, trailing, children }: StudentThemedHeroProps) {
  const tokens = useAppThemeTokens()
  const hero = tokens.hero

  return (
    <LinearGradient
      colors={hero.sheetGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={[styles.glow, { backgroundColor: hero.bubbleB }]} pointerEvents="none" />
      <View style={styles.heroRow}>
        <View style={[styles.iconTile, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
          <Ionicons name={icon} size={24} color="#ffffff" />
        </View>
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
        {trailing}
      </View>

      {stats && stats.length > 0 ? (
        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Ionicons name={stat.icon} size={14} color="rgba(255,255,255,0.88)" />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {children}
    </LinearGradient>
  )
}

type StudentThemedLockedProps = {
  icon: keyof typeof Ionicons.glyphMap
  subtitle: string
  upgradeLabel?: string
  onUpgrade: () => void
  paddingTop: number
  paddingBottom?: number
}

export function StudentThemedLocked({
  icon,
  subtitle,
  upgradeLabel = "View membership plans",
  onUpgrade,
  paddingTop,
  paddingBottom = 24,
}: StudentThemedLockedProps) {
  const tokens = useAppThemeTokens()
  const hero = tokens.hero

  return (
    <View style={[styles.lockedRoot, { paddingTop, paddingBottom }]}>
      <LinearGradient colors={hero.sheetGradient} style={styles.lockedHero}>
        <Ionicons name={icon} size={40} color="#ffffff" />
        <Text style={styles.lockedSubtitle}>{subtitle}</Text>
      </LinearGradient>
      <Pressable onPress={onUpgrade} style={styles.upgradeBtnWrap}>
        <LinearGradient
          colors={[tokens.accent, tokens.accentHover]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.upgradeBtn}
        >
          <Text style={styles.upgradeBtnText}>{upgradeLabel}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: -28,
    right: -20,
    width: 96,
    height: 96,
    borderRadius: 48,
    opacity: 0.35,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 1,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    flex: 1,
    ...nativeType.secondary,
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    zIndex: 1,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.78)",
  },
  lockedRoot: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 16,
  },
  lockedHero: {
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  lockedSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    fontWeight: "500",
  },
  upgradeBtnWrap: {
    borderRadius: 999,
    overflow: "hidden",
  },
  upgradeBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  upgradeBtnText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
})
