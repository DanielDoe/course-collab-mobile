import type { ReactNode } from "react"
import { useState } from "react"
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated"
import { MOBILE_LOGIN_PORTALS, portalMeta, type MobileLoginPortal, type PortalMeta } from "../../constants/portals"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useLoginTheme } from "./login-theme"

/** Login focus choreography — slower, staged transitions. */
const MOTION = {
  fadeIn: 420,
  fadeOut: 340,
  tileStagger: 65,
  gridExit: 300,
  chipDelay: 220,
  chipSpring: { damping: 24, stiffness: 110, mass: 1.05 },
  panelDelay: 360,
  panelDuration: 520,
  promptDelay: 180,
} as const

export type { MobileLoginPortal as LoginPortal } from "../../constants/portals"

type PortalTileProps = {
  portal: PortalMeta
  selected?: boolean
  focused?: boolean
  onPress: () => void
}

function PortalTile({ portal, selected, focused, onPress }: PortalTileProps) {
  const { width } = useWindowDimensions()
  const { LOGIN, loginType } = useLoginTheme()
  const isSummer = portal.id === "summer"
  const active = selected || focused
  const focusedMinWidth = Math.min(184, width - 56)

  return (
    <Pressable
      style={({ pressed }) => [
        styles.tile,
        {
          borderRadius: LOGIN.sectionRadius,
          backgroundColor: active && !isSummer ? LOGIN.purple : active && isSummer ? LOGIN.gold : LOGIN.fill,
        },
        focused && [styles.tileFocused, { minWidth: focusedMinWidth }],
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityHint={focused ? "Show all sign-in options" : undefined}
    >
      <Ionicons
        name={portal.icon}
        size={focused ? 20 : 18}
        color={active ? (isSummer ? LOGIN.purpleDark : "#ffffff") : portal.accent}
      />
      <Text
        style={[
          loginType.tileLabel,
          focused && loginType.tileLabelFocused,
          active && isSummer && { color: LOGIN.purpleDark },
          active && !isSummer && styles.tileLabelActive,
        ]}
      >
        {portal.label}
      </Text>
      {focused ? (
        <Ionicons
          name="chevron-down"
          size={16}
          color={isSummer ? LOGIN.purpleDark : "#ffffff"}
          style={styles.tileChevron}
        />
      ) : null}
    </Pressable>
  )
}

type SwitcherProps = {
  active: MobileLoginPortal
  onChange: (portal: MobileLoginPortal) => void
}

/** @deprecated Use LoginPortalExperience for animated focus flow. */
export function PortalSwitcher({ active, onChange }: SwitcherProps) {
  return (
    <View style={styles.grid}>
      {MOBILE_LOGIN_PORTALS.map((portal) => (
        <View key={portal.id} style={styles.gridCell}>
          <PortalTile
            portal={portal}
            selected={portal.id === active}
            onPress={() => onChange(portal.id)}
          />
        </View>
      ))}
    </View>
  )
}

type ExperienceProps = {
  portal: MobileLoginPortal
  onPortalChange: (portal: MobileLoginPortal) => void
  onFocusChange?: (focused: boolean) => void
  children: ReactNode
}

export function LoginPortalExperience({
  portal,
  onPortalChange,
  onFocusChange,
  children,
}: ExperienceProps) {
  const [focused, setFocused] = useState(false)
  const { loginType } = useLoginTheme()
  const meta = portalMeta(portal)

  function setFocus(next: boolean) {
    setFocused(next)
    onFocusChange?.(next)
  }

  function handlePortalSelect(id: MobileLoginPortal) {
    onPortalChange(id)
    setFocus(true)
  }

  function handleCollapse() {
    setFocus(false)
  }

  return (
    <View style={styles.experience}>
      <View style={styles.switcherSlot}>
        {!focused ? (
          <Animated.View
            key="portal-grid"
            entering={FadeIn.duration(MOTION.fadeIn)}
            exiting={FadeOut.duration(MOTION.gridExit)}
            style={styles.grid}
          >
            {MOBILE_LOGIN_PORTALS.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeIn.delay(index * MOTION.tileStagger).duration(MOTION.fadeIn)}
                exiting={FadeOut.duration(MOTION.fadeOut)}
                style={styles.gridCell}
              >
                <PortalTile
                  portal={item}
                  selected={item.id === portal}
                  onPress={() => handlePortalSelect(item.id)}
                />
              </Animated.View>
            ))}
          </Animated.View>
        ) : (
          <Animated.View
            key="portal-focused"
            entering={ZoomIn.delay(MOTION.chipDelay)
              .springify()
              .damping(MOTION.chipSpring.damping)
              .stiffness(MOTION.chipSpring.stiffness)
              .mass(MOTION.chipSpring.mass)}
            exiting={ZoomOut.duration(MOTION.fadeOut)}
            style={styles.focusedWrap}
          >
            <PortalTile portal={meta} focused onPress={handleCollapse} />
            <Text style={[loginType.info, styles.changePortalHint]}>Tap to switch portal</Text>
          </Animated.View>
        )}
      </View>

      {!focused ? (
        <Animated.View
          key="pick-prompt"
          entering={FadeIn.delay(MOTION.promptDelay).duration(MOTION.fadeIn)}
          exiting={FadeOut.duration(MOTION.fadeOut)}
          style={styles.pickPrompt}
        >
          <Text style={[loginType.info, styles.pickPromptText]}>Choose how you sign in to continue</Text>
        </Animated.View>
      ) : (
        <Animated.View
          key={`panel-${portal}`}
          entering={FadeInDown.delay(MOTION.panelDelay)
            .duration(MOTION.panelDuration)
            .easing(Easing.out(Easing.cubic))}
          exiting={FadeOutUp.duration(MOTION.fadeOut).easing(Easing.in(Easing.cubic))}
          style={styles.panelSlot}
        >
          <LoginPanelShell portal={portal}>{children}</LoginPanelShell>
        </Animated.View>
      )}
    </View>
  )
}

type ShellProps = {
  portal: MobileLoginPortal
  children: ReactNode
}

export function LoginPanelShell({ portal, children }: ShellProps) {
  const { loginType } = useLoginTheme()
  const meta = portalMeta(portal)

  return (
    <View style={styles.sheetPlain}>
      <View style={styles.headerPlain}>
        <Text style={loginType.panelTitle}>{meta.headline}</Text>
        <Text style={loginType.panelDescription}>{meta.description}</Text>
      </View>
      <View style={styles.bodyPlain}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  experience: {
    gap: 16,
  },
  switcherSlot: {
    minHeight: 132,
    justifyContent: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridCell: {
    width: "47.5%",
    flexGrow: 1,
    flexBasis: "45%",
  },
  focusedWrap: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  changePortalHint: {
    fontWeight: "500",
  },
  pickPrompt: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pickPromptText: {
    textAlign: "center",
  },
  panelSlot: {
    width: "100%",
  },
  tile: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tileFocused: {
    flexDirection: "row",
    alignSelf: "center",
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 11,
    gap: 8,
    borderRadius: 999,
  },
  tileActive: {},
  tileSummer: {},
  pressed: { opacity: 0.82 },
  tileLabelActive: {
    color: "#ffffff",
  },
  tileLabelSummer: {},
  tileChevron: {
    marginLeft: 2,
  },
  sheet: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 6,
  },
  headerSummer: {},
  goldStripe: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 14,
  },
  bodySummer: {
    paddingTop: 12,
  },
  sheetPlain: {
    alignSelf: "stretch",
    gap: 20,
  },
  headerPlain: {
    alignItems: "center",
    gap: 6,
  },
  bodyPlain: {
    gap: 14,
    alignSelf: "stretch",
  },
})
