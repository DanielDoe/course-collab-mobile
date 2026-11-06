import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ModalProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { KeyboardAwareForm } from "../ui/KeyboardAwareForm"
import { Ionicons } from "@/components/icons/AppIcon"
import { Children, cloneElement, forwardRef, Fragment, isValidElement, useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react"
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { useSuppressModuleSearchDock } from "../../context/ModuleSearchDockContext"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { BRAND } from "../../constants"
import { MODERN, NATIVE, nativeType } from "../../constants/faculty-native-theme"
import { FacultyStatusPill } from "./faculty-shared"
import { NativeSwitch } from "../NativeSwitch"
import { useFacultySheetTones, useSheetSurface } from "../../lib/themed-sheet-tones"
import { useNativeType, semanticSoft } from "../../lib/themed-module-theme"
import { hexToRgba, type AppThemeTokens } from "../../constants/app-themes"
import { AppButton } from "../theme/AppButton"
import { FACULTY_SHEET_COLOR } from "../../lib/faculty-sheet-theme"
import { facultySheetSolidAccent, FACULTY_SHEET_SOLID } from "../../lib/faculty-sheet-accents"
import type { FacultySheetSolidAccent } from "../../lib/faculty-sheet-accents"
import { solidListThumbFixed } from "../../lib/solid-list-thumb"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"

export type { FacultySheetTone } from "../../lib/themed-sheet-tones"
import type { FacultySheetTone } from "../../lib/themed-sheet-tones"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { GlassSheetBackground, useThemedGlassSheets } from "../theme/GlassSurface"
import { GlassSheetHandle } from "../theme/GlassActionSheetMenu"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import { AppErrorNotice } from "../errors/AppErrorNotice"
import { DismissKeyboardView } from "../ui/DismissKeyboardView"
import { useAppReducedMotion } from "../../lib/motion"

/** Sheet filter/type chips — subtle corners (12px), not stadium pills. */
export const FACULTY_SHEET_CHIP_RADIUS = NATIVE.sectionRadius

export type FacultySheetSurfaces = {
  isGlass: boolean
  rootBg: string
  cardBg: string
  cardBorder: string
  groupedBg: string
  pressedBg: string
}

/** Theme-aware sheet surfaces — frosted grouped cards when Liquid Glass is active. */
export function useFacultySheetSurfaces(): FacultySheetSurfaces {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  /** Sheet-only — do not reuse `useGlassChromeActive()` (nav headers are separate). */
  const isGlass = useThemedGlassSheets()

  return useMemo(() => {
    if (!isGlass) {
      return {
        isGlass: false,
        rootBg: native.groupedBackground,
        cardBg: native.secondaryGrouped,
        cardBorder: tokens.border,
        groupedBg: native.secondaryGrouped,
        pressedBg: native.fill,
      }
    }

    const line = tokens.glassBorder ?? tokens.border
    const cardBg =
      tokens.surfaceGlass ??
      hexToRgba(native.secondaryGrouped, tokens.isDark ? 0.82 : 0.94)
    return {
      isGlass: true,
      rootBg: "transparent",
      cardBg,
      cardBorder: line,
      groupedBg: hexToRgba(native.groupedBackground, tokens.isDark ? 0.55 : 0.72),
      pressedBg: native.fill,
    }
  }, [isGlass, native, tokens])
}

/** Modal / pageSheet root — regular glass + frosted tint when Liquid Glass is active. */
export function FacultySheetContainer({
  children,
  style,
  menuSheet = false,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  /** Denser frosted tint for profile / capability sheets over busy hub content. */
  menuSheet?: boolean
}) {
  const surfaces = useFacultySheetSurfaces()

  if (surfaces.isGlass) {
    return (
      <GlassSheetBackground style={[{ flex: 1 }, style]} menuSheet={menuSheet} fillHeight>
        <View style={sheetContainerStyles.flex}>{children}</View>
      </GlassSheetBackground>
    )
  }

  return (
    <View style={[{ flex: 1, backgroundColor: surfaces.rootBg }, style]}>
      {children}
    </View>
  )
}

/** Page-sheet or glass-bottom host — hides the module search dock so sheet fields receive IME. */
export function FacultySheetModal({
  visible,
  onRequestClose,
  children,
  animationType,
  presentationStyle = "pageSheet",
  containerStyle,
  menuSheet,
  layout = "pageSheet",
  keyboardAvoiding = false,
  maxHeight = "92%",
}: {
  visible: boolean
  onRequestClose: () => void
  children: ReactNode
  animationType?: ModalProps["animationType"]
  presentationStyle?: ModalProps["presentationStyle"]
  containerStyle?: StyleProp<ViewStyle>
  menuSheet?: boolean
  /** `glassBottom` uses the shared GlassBottomSheetModal motion (filters, action sheets). */
  layout?: "pageSheet" | "glassBottom"
  keyboardAvoiding?: boolean
  maxHeight?: `${number}%` | number
}) {
  useSuppressModuleSearchDock(visible)
  const reduceMotion = useAppReducedMotion()

  useEffect(() => {
    if (visible) Keyboard.dismiss()
  }, [visible])

  if (layout === "glassBottom") {
    return (
      <GlassBottomSheetModal
        visible={visible}
        onClose={onRequestClose}
        keyboardAvoiding={keyboardAvoiding}
        maxHeight={maxHeight}
        scrollable={false}
        accessibilityLabel="Close sheet"
      >
        <FacultySheetContainer style={containerStyle} menuSheet={menuSheet}>
          <DismissKeyboardView style={sheetContainerStyles.flex}>{children}</DismissKeyboardView>
        </FacultySheetContainer>
      </GlassBottomSheetModal>
    )
  }

  const resolvedAnimation = animationType ?? (reduceMotion ? "none" : "slide")

  return (
    <Modal
      visible={visible}
      animationType={resolvedAnimation}
      presentationStyle={presentationStyle}
      onRequestClose={onRequestClose}
    >
      {visible ? (
        <FacultySheetContainer style={containerStyle} menuSheet={menuSheet}>
          <DismissKeyboardView style={sheetContainerStyles.flex}>{children}</DismissKeyboardView>
        </FacultySheetContainer>
      ) : null}
    </Modal>
  )
}

const sheetContainerStyles = StyleSheet.create({
  flex: { flex: 1, position: "relative" },
})

/** Header + scrollable body + sticky safe-area footer for faculty sheets. */
export function FacultySheetFormLayout({
  header,
  footer,
  children,
  contentContainerStyle,
}: {
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
  contentContainerStyle?: StyleProp<ViewStyle>
}) {
  return (
    <View style={sheetContainerStyles.flex}>
      {header}
      <KeyboardAwareForm
        footer={footer}
        contentContainerStyle={contentContainerStyle}
        footerStyle={sheetFooterStyles.embedded}
      >
        {children}
      </KeyboardAwareForm>
    </View>
  )
}

export function FacultySheetStickyFooter({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets()
  const surfaces = useFacultySheetSurfaces()
  return (
    <View
      style={[
        sheetFooterStyles.bar,
        {
          paddingBottom: Math.max(insets.bottom, 12),
          borderTopColor: surfaces.cardBorder,
          backgroundColor: surfaces.isGlass ? "transparent" : surfaces.rootBg,
        },
      ]}
    >
      {children}
    </View>
  )
}

const sheetFooterStyles = StyleSheet.create({
  embedded: {
    paddingHorizontal: 0,
    borderTopColor: "transparent",
  },
  bar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
})

/** @deprecated Use useFacultySheetTones() — static map is light-mode only. */
export const FACULTY_SHEET_TONES: Record<
  FacultySheetTone,
  { bg: string; icon: string; value: string; border: string; soft: string }
> = {
  teal: { bg: "#FFFFFF", icon: "#0d9488", value: "#0f172a", border: "#c5e8e0", soft: "rgba(13,148,136,0.06)" },
  blue: { bg: "#FFFFFF", icon: "#007AFF", value: "#0f172a", border: "#c7d2fe", soft: "rgba(0,122,255,0.05)" },
  violet: { bg: "#FFFFFF", icon: "#5856D6", value: "#0f172a", border: "#d9d6fe", soft: "rgba(88,86,214,0.05)" },
  amber: { bg: "#FFFFFF", icon: "#FF9500", value: "#0f172a", border: "#f0dcc0", soft: "rgba(255,149,0,0.05)" },
  rose: { bg: "#FFFFFF", icon: "#FF3B30", value: "#0f172a", border: "#f5c4c0", soft: "rgba(255,59,48,0.05)" },
  sky: { bg: "#FFFFFF", icon: "#32ADE6", value: "#0f172a", border: "#c2e3f3", soft: "rgba(50,173,230,0.05)" },
  slate: { bg: "#FFFFFF", icon: "#8E8E93", value: "#0f172a", border: "#e5e5ea", soft: "rgba(142,142,147,0.05)" }}

type ChromeProps = {
  topInset: number
  title: string
  subtitle?: string
  onClose: () => void
  rightSlot?: ReactNode
  /** Overrides theme accent for the Done action. */
  accentColor?: string
  /** iOS pageSheet already provides a system grabber — skip custom handle and surface band. */
  pageSheet?: boolean
}

/** pageSheet modals already sit below the status bar — cap top gutter to handle room only. */
export function facultySheetTopInset(rawInset: number): number {
  if (Platform.OS === "ios") return 8
  return Math.max(rawInset, 8)
}

export function FacultySheetChrome({
  topInset,
  title,
  subtitle,
  onClose,
  rightSlot,
  accentColor,
  pageSheet = false,
}: ChromeProps) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const surfaces = useFacultySheetSurfaces()
  const doneColor = accentColor ?? native.tint
  const showHandle = !pageSheet

  return (
    <View
      style={[
        chromeStyles.wrap,
        pageSheet && chromeStyles.wrapPageSheet,
        {
          paddingTop: pageSheet ? 8 : facultySheetTopInset(topInset) + 6,
          borderBottomColor: surfaces.cardBorder,
          backgroundColor: pageSheet
            ? "transparent"
            : surfaces.isGlass
              ? "transparent"
              : tokens.surface,
        },
      ]}
    >
      {showHandle ? (
        surfaces.isGlass ? (
          <GlassSheetHandle />
        ) : (
          <View style={chromeStyles.handleWrap}>
            <View style={[chromeStyles.handle, { backgroundColor: tokens.textMuted, opacity: 0.35 }]} />
          </View>
        )
      ) : null}
      <View style={[chromeStyles.titleRow, pageSheet && chromeStyles.titleRowPageSheet]}>
        <Pressable
          onPress={onClose}
          hitSlop={8}
          style={chromeStyles.doneBtnWrap}
          accessibilityRole="button"
          accessibilityLabel="Done"
        >
          <Text style={[chromeStyles.doneBtn, { color: doneColor }]} numberOfLines={1}>
            Done
          </Text>
        </Pressable>
        <Text
          style={[chromeStyles.title, { color: native.label }]}
          numberOfLines={1}
          ellipsizeMode="tail"
          accessibilityRole="header"
          onPress={() => Keyboard.dismiss()}
        >
          {title}
        </Text>
        <View style={chromeStyles.side}>{rightSlot ?? null}</View>
      </View>
      {subtitle ? (
        <Text style={[chromeStyles.subtitle, { color: native.secondaryLabel }]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  )
}

type HeroProps = {
  title: string
  subtitle?: string
  icon?: keyof typeof Ionicons.glyphMap
  initials?: string
  pills?: ReactNode
  thumbColor?: string
}

function flattenHeroPills(nodes: ReactNode): ReactNode[] {
  const out: ReactNode[] = []
  Children.forEach(nodes, (child) => {
    if (child == null || typeof child === "boolean") return
    if (isValidElement(child) && child.type === Fragment) {
      out.push(...flattenHeroPills((child.props as { children?: ReactNode }).children))
      return
    }
    out.push(child)
  })
  return out
}

function heroPillsContent(pills: ReactNode): ReactNode {
  return flattenHeroPills(pills).map((child, index) => {
    if (!isValidElement(child)) return child
    if (child.type === FacultyStatusPill) {
      const pillProps = child.props as { onDark?: boolean }
      return cloneElement(child as ReactElement<{ onDark?: boolean }>, {
        key: child.key ?? `hero-pill-${index}`,
        onDark: pillProps.onDark ?? false,
      })
    }
    return child
  })
}

export function FacultySheetHero({ title, subtitle, icon, initials, pills, thumbColor }: HeroProps) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const thumb = solidListThumbFixed(thumbColor ?? FACULTY_SHEET_COLOR.thumb)

  return (
    <View
      style={[
        heroStyles.shell,
        tokens.cardShadow,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: tokens.border,
          borderWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={heroStyles.body}>
        <SolidListThumbTile thumb={thumb} icon={icon} size="list">
          {initials ? <Text style={[heroStyles.initials, { color: thumb.icon }]}>{initials}</Text> : null}
        </SolidListThumbTile>
        <Text style={[type.sheetTitle, heroStyles.name, { color: native.label }]} numberOfLines={2} ellipsizeMode="tail">
          {title}
        </Text>
        {pills ? <View style={heroStyles.pills}>{heroPillsContent(pills)}</View> : null}
        {subtitle ? (
          <Text style={[type.caption, heroStyles.subtitle, { color: native.secondaryLabel }]}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  )
}

export function FacultySheetSection({
  label,
  hint,
  children,
  action,
  tone}: {
  label: string
  hint?: string
  children: ReactNode
  action?: ReactNode
  tone?: FacultySheetTone
}) {
  const sheetTones = useFacultySheetTones()
  const type = useNativeType()
  const tint = tone ? sheetTones[tone] : null
  return (
    <View style={sectionStyles.wrap}>
      <View style={sectionStyles.head}>
        <View style={sectionStyles.headCopy}>
          <View style={sectionStyles.labelRow}>
            {tint ? <View style={[sectionStyles.labelDot, { backgroundColor: tint.icon }]} /> : null}
            <Text style={[type.sectionHeader, { textTransform: "none" }]}>{label}</Text>
          </View>
          {hint ? <Text style={type.caption}>{hint}</Text> : null}
        </View>
        {action ?? null}
      </View>
      <View style={sectionStyles.body}>{children}</View>
    </View>
  )
}

export function FacultySheetMetricRow({
  icon,
  label,
  value,
  isLast,
  tone = "slate",
  solidAccent,
  numberOfLines = 1,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  isLast?: boolean
  tone?: FacultySheetTone
  /** Solid Color Hunt tile — overrides soft-wash tone styling. */
  solidAccent?: FacultySheetSolidAccent
  numberOfLines?: number
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const sheetTones = useFacultySheetTones()
  const colors = sheetTones[tone]
  const isAlert = tone === "rose" && !solidAccent
  const iconColor = solidAccent
    ? solidAccent.icon
    : isAlert
      ? FACULTY_SHEET_COLOR.danger
      : colors.icon
  const iconBg = solidAccent
    ? solidAccent.fill
    : isAlert
      ? semanticSoft(FACULTY_SHEET_COLOR.danger, tokens.isDark)
      : colors.soft
  const iconBorder = solidAccent
    ? solidAccent.fill
    : isAlert
      ? hexToRgba(FACULTY_SHEET_COLOR.danger, 0.35)
      : hexToRgba(colors.icon, tokens.isDark ? 0.28 : 0.16)
  const valueColor = isAlert ? FACULTY_SHEET_COLOR.danger : native.label
  const multiline = numberOfLines > 1

  return (
    <View
      style={[
        metricStyles.row,
        multiline && metricStyles.rowMultiline,
        !isLast && { borderBottomColor: native.separator, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={[metricStyles.left, multiline && metricStyles.leftMultiline]}>
        <View
          style={[
            metricStyles.iconWrap,
            solidAccent && metricStyles.iconWrapSolid,
            { backgroundColor: iconBg, borderColor: iconBorder },
          ]}
        >
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text style={[type.body, metricStyles.label]}>{label}</Text>
      </View>
      <Text
        style={[
          metricStyles.value,
          multiline && metricStyles.valueMultiline,
          { color: valueColor },
        ]}
        numberOfLines={numberOfLines}
      >
        {value}
      </Text>
    </View>
  )
}

export function FacultySheetGroupedList({ children }: { children: ReactNode }) {
  return <View style={metricStyles.group}>{children}</View>
}

export function FacultySheetStatChip({
  icon,
  label,
  value,
  tone = "slate",
  solidAccent,
}: {
  icon?: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  tone?: FacultySheetTone
  /** Solid Color Hunt tile — overrides tone mapping. */
  solidAccent?: FacultySheetSolidAccent
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const surfaces = useFacultySheetSurfaces()
  const solid = solidAccent ?? facultySheetSolidAccent(tone)
  return (
    <View
      style={[
        statStyles.chip,
        !surfaces.isGlass && tokens.cardShadow,
        {
          backgroundColor: surfaces.cardBg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: surfaces.cardBorder,
        },
      ]}
    >
      {icon ? (
        <View style={[statStyles.iconTile, { backgroundColor: solid.fill }]}>
          <Ionicons name={icon} size={15} color={solid.icon} />
        </View>
      ) : null}
      <Text style={[type.caption, statStyles.label, { color: native.secondaryLabel }]} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[statStyles.value, { color: native.label }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
    </View>
  )
}

export function FacultySheetPipelineProgress({
  step,
  total,
  headline,
  subline,
  tone = "teal"}: {
  step: number
  total: number
  headline: string
  subline: string
  tone?: FacultySheetTone
}) {
  const sheetTones = useFacultySheetTones()
  const native = useThemedNative()
  const type = useNativeType()
  const colors = sheetTones[tone]
  const clampedStep = Math.min(Math.max(step, 0), total)
  const progress = total > 0 ? clampedStep / total : 0

  return (
    <View style={[pipelineStyles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={pipelineStyles.topRow}>
        <View style={[pipelineStyles.badge, { backgroundColor: colors.soft, borderColor: colors.border }]}>
          <Ionicons name="git-network-outline" size={14} color={colors.icon} />
          <Text style={[pipelineStyles.badgeText, { color: colors.value }]}>Pipeline</Text>
        </View>
        <Text style={[pipelineStyles.stepText, { color: colors.value }]}>
          {clampedStep}/{total}
        </Text>
      </View>

      <View style={pipelineStyles.track}>
        <View
          style={[
            pipelineStyles.fill,
            { width: `${Math.max(progress * 100, clampedStep > 0 ? 8 : 0)}%`, backgroundColor: colors.icon },
          ]}
        />
      </View>

      <View style={pipelineStyles.dotsRow}>
        {Array.from({ length: total }, (_, index) => {
          const filled = index < clampedStep
          const current = index === clampedStep - 1 && clampedStep > 0
          return (
            <View
              key={index}
              style={[
                pipelineStyles.dot,
                filled
                  ? { backgroundColor: colors.icon }
                  : current
                    ? { backgroundColor: colors.icon, opacity: 0.45, transform: [{ scale: 1.15 }] }
                    : { backgroundColor: native.tertiaryLabel, opacity: 0.35 },
              ]}
            />
          )
        })}
      </View>

      <Text style={[type.bodyEmphasis, { color: native.label }]}>{headline}</Text>
      <Text style={[type.caption, { marginTop: 4 }]}>{subline}</Text>
    </View>
  )
}

export function FacultySheetStatRow({ children }: { children: ReactNode }) {
  return <View style={statStyles.row}>{children}</View>
}

export function FacultySheetErrorBanner({ message }: { message: string }) {
  return (
    <AppErrorNotice
      presentation={{
        kind: "unknown",
        title: "Something went wrong",
        message,
        retryable: false,
      }}
      variant="compact"
    />
  )
}

export function FacultySheetNotice({
  message,
  tone = "warning",
  dismissible = false,
  autoDismissMs = 8000,
  onDismiss,
}: {
  message: string
  tone?: "warning" | "danger"
  dismissible?: boolean
  autoDismissMs?: number
  onDismiss?: () => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const accent = tone === "danger" ? FACULTY_SHEET_COLOR.danger : FACULTY_SHEET_COLOR.nudge
  const solid = tone === "danger" ? FACULTY_SHEET_SOLID.red : FACULTY_SHEET_SOLID.orange
  const icon = tone === "danger" ? "alert-circle-outline" : "information-circle-outline"
  const [mounted, setMounted] = useState(true)
  const progress = useSharedValue(dismissible ? 0 : 1)
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dismissingRef = useRef(false)

  const dismiss = useCallback(() => {
    if (!dismissible || dismissingRef.current) return
    dismissingRef.current = true
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current)
    progress.value = withTiming(
      0,
      { duration: 320, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(setMounted)(false)
          if (onDismiss) runOnJS(onDismiss)()
        }
      },
    )
  }, [dismissible, onDismiss, progress])

  useEffect(() => {
    if (!dismissible || !mounted) return
    progress.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })
    autoDismissRef.current = setTimeout(dismiss, autoDismissMs)
    return () => {
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current)
    }
  }, [autoDismissMs, dismiss, dismissible, mounted, progress])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: dismissible ? progress.value : 1,
    transform: dismissible
      ? [
          { translateY: (1 - progress.value) * -10 },
          { scale: 0.98 + progress.value * 0.02 },
        ]
      : [],
  }))

  if (!mounted) return null

  const body = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        padding: 14,
        borderRadius: NATIVE.sectionRadius,
        backgroundColor: native.secondaryGrouped,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: hexToRgba(accent, tokens.isDark ? 0.42 : 0.24),
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: solid.fill,
          flexShrink: 0,
        }}
      >
        <Ionicons name={icon} size={16} color={solid.icon} />
      </View>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", lineHeight: 20, color: native.label }}>
        {message}
      </Text>
      {dismissible ? (
        <Pressable
          onPress={dismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notice"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: native.fill,
            flexShrink: 0,
          }}
        >
          <Ionicons name="close" size={16} color={native.secondaryLabel} />
        </Pressable>
      ) : null}
    </View>
  )

  if (!dismissible) {
    return body
  }

  return <Animated.View style={animatedStyle}>{body}</Animated.View>
}

export function FacultySheetSaveChip({ saving, onPress }: { saving?: boolean; onPress: () => void }) {
  const sheet = useCollabSheetStyles()

  return (
    <Pressable
      style={sheet.saveChip}
      disabled={saving}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Save"
    >
      {saving ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <>
          <Ionicons name="checkmark" size={14} color="#ffffff" />
          <Text style={sheet.saveChipText}>Save</Text>
        </>
      )}
    </Pressable>
  )
}

/** Native text Save action for form sheet headers (right slot). */
export function FacultySheetSaveAction({
  label = "Save",
  saving,
  disabled,
  onPress}: {
  label?: string
  saving?: boolean
  disabled?: boolean
  onPress: () => void
}) {
  const type = useNativeType()

  return (
    <Pressable
      hitSlop={8}
      onPress={onPress}
      disabled={disabled || saving}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {saving ? (
        <ActivityIndicator size="small" color={FACULTY_SHEET_COLOR.action} />
      ) : (
        <Text
          style={[
            type.bodyEmphasis,
            { color: FACULTY_SHEET_COLOR.action, textAlign: "right" },
            (disabled || saving) && { opacity: 0.45 },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </Pressable>
  )
}

/** Native text action for sheet headers (Edit, Duplicate, etc.). */
export function FacultySheetTextAction({
  label,
  onPress,
  disabled}: {
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  const type = useNativeType()

  return (
    <Pressable hitSlop={8} onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}>
      <Text
        style={[type.bodyEmphasis, { color: FACULTY_SHEET_COLOR.link, textAlign: "right" }, disabled && { opacity: 0.45 }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}

export function FacultySheetSelectButton({
  value,
  onPress,
  disabled}: {
  value: string
  onPress: () => void
  disabled?: boolean
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const sheet = useCollabSheetStyles()

  return (
    <Pressable
      style={[sheet.selectBtn, disabled && sheet.controlDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={sheet.selectText} numberOfLines={2}>
        {value}
      </Text>
      <Ionicons name="chevron-down" size={16} color={native.secondaryLabel} />
    </Pressable>
  )
}

export function FacultySheetOutlineButton({
  icon,
  label,
  onPress,
  disabled,
  loading,
}: {
  icon?: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <AppButton
      label={label}
      onPress={onPress}
      icon={icon}
      iconPosition="left"
      variant="outline"
      disabled={disabled}
      loading={loading}
    />
  )
}

export function FacultySheetAddButton({ label, onPress }: { label: string; onPress: () => void }) {
  const tokens = useAppThemeTokens()
  const sheet = useCollabSheetStyles()

  return (
    <Pressable style={sheet.addBtn} onPress={onPress}>
      <Ionicons name="add-circle-outline" size={18} color={FACULTY_SHEET_COLOR.link} />
      <Text style={sheet.addBtnText}>{label}</Text>
    </Pressable>
  )
}

/** Primary CTA at the bottom of form sheets. */
export function FacultySheetSubmitButton({
  label,
  onPress,
  disabled,
  loading,
  testID,
  accessibilityLabel,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  testID?: string
  accessibilityLabel?: string
}) {
  const sheet = useCollabSheetStyles()

  return (
    <Pressable
      style={[
        sheet.submitBtn,
        { backgroundColor: FACULTY_SHEET_COLOR.action },
        (disabled || loading) && sheet.controlDisabled,
      ]}
      disabled={disabled || loading}
      onPress={onPress}
      testID={testID ?? "faculty-sheet-submit"}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `Submit ${label}`}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
    >
      {loading ? (
        <ActivityIndicator color={FACULTY_SHEET_COLOR.actionInk} />
      ) : (
        <Text style={sheet.submitBtnText}>{label}</Text>
      )}
    </Pressable>
  )
}

export function useSheetPlaceholderColor(): string {
  const native = useThemedNative()
  return native.tertiaryLabel
}

/** @deprecated Use useSheetPlaceholderColor() */
export const sheetPlaceholderColor = NATIVE.tertiaryLabel

export function FacultySheetToggleRow({
  icon,
  title,
  subtitle,
  value,
  disabled,
  onValueChange}: {
  icon?: keyof typeof Ionicons.glyphMap
  title: string
  subtitle?: string
  value: boolean
  disabled?: boolean
  onValueChange: (next: boolean) => void
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const surfaces = useFacultySheetSurfaces()

  return (
    <Pressable
      onPress={() => {
        if (!disabled) onValueChange(!value)
      }}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      style={[toggleStyles.row, { backgroundColor: surfaces.cardBg, borderColor: surfaces.cardBorder }]}
    >
      {icon ? <Ionicons name={icon} size={18} color={native.secondaryLabel} /> : null}
      <View style={toggleStyles.copy} pointerEvents="none">
        <Text style={[type.bodyEmphasis, { fontSize: 15 }]}>{title}</Text>
        {subtitle ? <Text style={type.caption}>{subtitle}</Text> : null}
      </View>
      <View pointerEvents="none" accessible={false}>
        <NativeSwitch
          value={value}
          disabled={disabled}
          onValueChange={onValueChange}
          activeTrackColor={FACULTY_SHEET_COLOR.link}
        />
      </View>
    </Pressable>
  )
}

export function FacultySheetActionRow({
  icon,
  label,
  subtitle,
  tone = "default",
  accent = "teal",
  loading,
  disabled,
  onPress}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  subtitle?: string
  tone?: "default" | "primary" | "danger"
  /** Solid Color Hunt tile behind the row icon. */
  accent?: FacultySheetTone
  loading?: boolean
  disabled?: boolean
  onPress: () => void
}) {
  const native = useThemedNative()
  const surfaces = useFacultySheetSurfaces()
  const solid = facultySheetSolidAccent(accent)
  const colors =
    tone === "danger"
      ? {
          bg: `${FACULTY_SHEET_COLOR.danger}12`,
          text: FACULTY_SHEET_COLOR.danger,
          border: `${FACULTY_SHEET_COLOR.danger}33`,
          icon: solid.icon,
          iconBg: solid.fill,
        }
      : {
          bg: surfaces.cardBg,
          text: native.label,
          border: surfaces.cardBorder,
          icon: solid.icon,
          iconBg: solid.fill,
        }

  return (
    <Pressable
      style={({ pressed }) => [
        actionRowStyles.row,
        { backgroundColor: colors.bg, borderColor: colors.border },
        (pressed || disabled || loading) && { opacity: 0.78 },
      ]}
      disabled={disabled || loading}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${label}. ${subtitle}` : label}
    >
      <View style={[actionRowStyles.icon, { backgroundColor: colors.iconBg }]}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.icon} />
        ) : (
          <Ionicons name={icon} size={18} color={colors.icon} />
        )}
      </View>
      <View style={actionRowStyles.copy}>
        <Text style={[actionRowStyles.label, { color: colors.text }]}>{label}</Text>
        {subtitle ? (
          <Text style={[actionRowStyles.subtitle, { color: native.secondaryLabel }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
    </Pressable>
  )
}

export function FacultySheetWorkflow({
  title,
  body,
  acting,
  onApprove,
  onReject,
  approveLabel = "Approve",
  rejectLabel = "Reject"}: {
  title: string
  body: string
  acting?: boolean
  onApprove: () => void
  onReject: () => void
  approveLabel?: string
  rejectLabel?: string
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const surfaces = useFacultySheetSurfaces()

  return (
    <View
      style={[
        workflowStyles.card,
        !surfaces.isGlass && tokens.cardShadow,
        {
          backgroundColor: surfaces.cardBg,
          borderColor: `${FACULTY_SHEET_COLOR.nudge}33`,
        },
      ]}
    >
      <View style={workflowStyles.titleRow}>
        <View style={[workflowStyles.titleDot, { backgroundColor: FACULTY_SHEET_COLOR.nudge }]} />
        <Text style={[type.caption, { color: FACULTY_SHEET_COLOR.nudge, letterSpacing: 0.4 }]}>{title}</Text>
      </View>
      <Text style={[type.secondary, { lineHeight: 20 }]}>{body}</Text>
      <View style={workflowStyles.actions}>
        <Pressable
          style={[workflowStyles.approveBtn, { backgroundColor: FACULTY_SHEET_COLOR.action }]}
          disabled={acting}
          onPress={onApprove}
          accessibilityRole="button"
          accessibilityLabel={approveLabel}
        >
          {acting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text style={workflowStyles.approveText}>{approveLabel}</Text>
            </>
          )}
        </Pressable>
        <Pressable
          style={[workflowStyles.rejectBtn, { borderColor: `${tokens.danger}33`, backgroundColor: `${tokens.danger}10` }]}
          disabled={acting}
          onPress={onReject}
          accessibilityRole="button"
          accessibilityLabel={rejectLabel}
        >
          <Ionicons name="close-circle-outline" size={18} color={tokens.danger} />
          <Text style={[workflowStyles.rejectText, { color: tokens.danger }]}>{rejectLabel}</Text>
        </Pressable>
      </View>
    </View>
  )
}

export function FacultySheetField({
  label,
  children}: {
  label: string
  children: ReactNode
}) {
  const type = useNativeType()

  return (
    <View style={fieldStyles.wrap}>
      <Text style={type.caption} accessible={false}>
        {label}
      </Text>
      {children}
    </View>
  )
}

/** Themed text field — always applies readable label color in dark mode. */
export const FacultySheetTextInput = forwardRef<TextInput, TextInputProps>(function FacultySheetTextInput(
  { style, multiline, placeholderTextColor, onChangeText, onEndEditing, ...props },
  ref,
) {
  const sheet = useCollabSheetStyles()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const placeholder = useSheetPlaceholderColor()

  return (
    <TextInput
      ref={ref}
      {...props}
      multiline={multiline}
      blurOnSubmit={props.blurOnSubmit ?? !multiline}
      placeholderTextColor={placeholderTextColor ?? placeholder}
      keyboardAppearance={tokens.isDark ? "dark" : "light"}
      onChangeText={onChangeText}
      onEndEditing={(event) => {
        onEndEditing?.(event)
        const text = event.nativeEvent.text
        if (onChangeText && typeof text === "string") onChangeText(text)
      }}
      style={[
        sheet.fieldInput,
        { minHeight: 44 },
        multiline ? sheet.textArea : null,
        style,
        { color: native.label },
      ]}
    />
  )
})

export function FacultySheetConfirm({
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
  danger = true}: {
  title: string
  body: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
  danger?: boolean
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        style={[confirmStyles.overlay, { backgroundColor: tokens.isDark ? "rgba(0,0,0,0.55)" : "rgba(15,23,42,0.35)" }]}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Cancel"
      >
        <Pressable
          style={[confirmStyles.card, tokens.cardShadow, { backgroundColor: native.secondaryGrouped }]}
          onPress={() => {}}
        >
          <Text style={[type.sheetTitle, confirmStyles.title]}>{title}</Text>
          <Text style={[type.secondary, confirmStyles.body]}>{body}</Text>
          <View style={confirmStyles.actions}>
            <Pressable
              style={[confirmStyles.cancel, { backgroundColor: native.fill }]}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={[type.bodyEmphasis, { color: native.secondaryLabel }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[confirmStyles.confirm, { backgroundColor: danger ? FACULTY_SHEET_COLOR.danger : FACULTY_SHEET_COLOR.action }]}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              <Text style={confirmStyles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

/** Centered acknowledgment dialog — matches confirm modal chrome with a success tone. */
export function FacultySheetAcknowledge({
  visible,
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel = "Done",
  onSecondary,
  icon = "checkmark-circle",
}: {
  visible: boolean
  title: string
  body: string
  primaryLabel: string
  onPrimary: () => void
  secondaryLabel?: string
  onSecondary: () => void
  icon?: keyof typeof Ionicons.glyphMap
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSecondary}>
      <Pressable
        style={[confirmStyles.overlay, { backgroundColor: tokens.isDark ? "rgba(0,0,0,0.55)" : "rgba(15,23,42,0.35)" }]}
        onPress={onSecondary}
      >
        <Pressable
          style={[confirmStyles.card, tokens.cardShadow, { backgroundColor: native.secondaryGrouped }]}
          onPress={() => {}}
        >
          <View style={[confirmStyles.iconWrap, { backgroundColor: `${tokens.success}18` }]}>
            <Ionicons name={icon} size={28} color={tokens.success} />
          </View>
          <Text style={[type.sheetTitle, confirmStyles.title, { textAlign: "center" }]}>{title}</Text>
          <Text style={[type.secondary, confirmStyles.body, { textAlign: "center", fontWeight: "500" }]}>{body}</Text>
          <View style={confirmStyles.actions}>
            <Pressable
              style={[confirmStyles.cancel, { backgroundColor: native.fill, borderColor: native.separator }]}
              onPress={onSecondary}
              accessibilityRole="button"
              accessibilityLabel={secondaryLabel}
            >
              <Text style={[type.bodyEmphasis, { color: native.secondaryLabel }]}>{secondaryLabel}</Text>
            </Pressable>
            <Pressable
              style={[confirmStyles.confirm, { backgroundColor: FACULTY_SHEET_COLOR.action }]}
              onPress={onPrimary}
              accessibilityRole="button"
              accessibilityLabel={primaryLabel}
            >
              <Text style={confirmStyles.confirmText}>{primaryLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export function sheetScrollPadding(bottomInset: number, scrollStyle: { paddingHorizontal: number; paddingTop: number; gap: number }) {
  return [scrollStyle, { paddingBottom: bottomInset + 24 }] as const
}

function createCollabSheetStyles(
  native: ReturnType<typeof useThemedNative>,
  tokens: AppThemeTokens,
  type: ReturnType<typeof useNativeType>,
  surfaces: FacultySheetSurfaces,
) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: surfaces.rootBg },
  /** Standard inset for all action-sheet scroll content — hero + sections share the same breathing room. */
  scroll: {
    paddingHorizontal: NATIVE.pagePadding,
    paddingTop: 16,
    gap: NATIVE.sectionGap},
  /** Inner stack gap when a sheet nests blocks inside a padded scroll area. */
  body: { gap: 14 },
  memberList: { gap: 8 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: surfaces.cardBg,
    borderWidth: 1,
    borderColor: surfaces.cardBorder},
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: native.fill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: native.separator},
  memberAvatarText: { fontSize: 12, fontWeight: "600", color: native.secondaryLabel },
  memberCopy: { flex: 1, gap: 2 },
  memberNameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  memberName: { fontSize: 15, fontWeight: "700", color: native.label },
  memberId: { fontSize: 12, fontWeight: "600", color: native.secondaryLabel },
  emptyText: { fontSize: 14, color: native.secondaryLabel, fontStyle: "italic" },
  dangerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: native.secondaryGrouped,
    borderRadius: NATIVE.sectionRadius,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hexToRgba(FACULTY_SHEET_COLOR.danger, tokens.isDark ? 0.42 : 0.24),
  },
  dangerText: { flex: 1, fontSize: 14, fontWeight: "600", color: native.label, lineHeight: 20 },
  alertBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: native.secondaryGrouped,
    borderRadius: NATIVE.sectionRadius,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hexToRgba(FACULTY_SHEET_COLOR.nudge, tokens.isDark ? 0.42 : 0.24),
  },
  alertText: { flex: 1, fontSize: 14, fontWeight: "600", color: native.label, lineHeight: 20 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: surfaces.cardBg,
    borderColor: surfaces.cardBorder},
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: semanticSoft(FACULTY_SHEET_COLOR.link, tokens.isDark),
  },
  actionCopy: { flex: 1, gap: 2 },
  actionLabel: { fontSize: 15, fontWeight: "700", color: native.label },
  actionSubtitle: { fontSize: 12, fontWeight: "600", color: native.secondaryLabel },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: semanticSoft(FACULTY_SHEET_COLOR.link, tokens.isDark),
    borderWidth: 1,
    borderColor: hexToRgba(FACULTY_SHEET_COLOR.link, tokens.isDark ? 0.35 : 0.2),
  },
  linkBtnText: { fontSize: 13, fontWeight: "700", color: FACULTY_SHEET_COLOR.link },
  saveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: FACULTY_SHEET_COLOR.action,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  saveChipText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
  fieldInput: {
    borderWidth: 1,
    borderColor: surfaces.cardBorder,
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "600",
    color: native.label,
    backgroundColor: native.secondaryGrouped,
  },
  textArea: { minHeight: 96, textAlignVertical: "top" },
  textAreaLg: { minHeight: 120, textAlignVertical: "top" },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderWidth: 1,
    borderColor: surfaces.cardBorder,
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: native.secondaryGrouped,
  },
  selectText: { ...type.bodyEmphasis, flex: 1, fontSize: 15, textTransform: "capitalize" },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: 1,
    borderColor: surfaces.cardBorder,
    backgroundColor: native.secondaryGrouped,
  },
  outlineBtnText: { ...type.callout, fontWeight: "600", color: FACULTY_SHEET_COLOR.link },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
  },
  addBtnText: { ...type.callout, fontWeight: "600", color: FACULTY_SHEET_COLOR.link },
  submitBtn: {
    borderRadius: NATIVE.buttonRadius,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: { ...type.bodyEmphasis, color: "#ffffff" },
  introText: { ...type.secondary, lineHeight: 20 },
  controlDisabled: { opacity: 0.55 },
  errorText: { color: tokens.danger, fontSize: 14, fontWeight: "600" },
  bodyText: { fontSize: 14, lineHeight: 21, fontWeight: "600", color: native.secondaryLabel }})
}

export function useCollabSheetStyles() {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const surfaces = useFacultySheetSurfaces()
  return useMemo(
    () => createCollabSheetStyles(native, tokens, type, surfaces),
    [native, tokens, type, surfaces],
  )
}

const chromeStyles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  wrapPageSheet: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  handleWrap: { alignItems: "center", paddingBottom: 8 },
  handle: { width: 40, height: 4, borderRadius: 999, backgroundColor: "#cbd5e1" },
  titleRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  titleRowPageSheet: {
    minHeight: 44,
    paddingBottom: 10,
    paddingTop: 2,
  },
  doneBtnWrap: {
    minWidth: 56,
    justifyContent: "center",
    alignSelf: "stretch",
  },
  doneBtn: {
    ...nativeType.body,
    fontSize: 17,
    lineHeight: 22,
    color: NATIVE.tint,
  },
  saveBtn: {
    ...nativeType.bodyEmphasis,
    color: NATIVE.tint,
    textAlign: "right"},
  saveBtnDisabled: { opacity: 0.45 },
  title: { ...nativeType.navTitle, flex: 1, textAlign: "center" },
  subtitle: {
    ...nativeType.caption,
    textAlign: "center",
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingBottom: 10,
    marginTop: -4,
  },
  side: { minWidth: 56, alignItems: "flex-end", justifyContent: "center" }})

const heroStyles = StyleSheet.create({
  shell: {
    borderRadius: NATIVE.sectionRadius,
    overflow: "hidden",
  },
  body: { alignItems: "center", gap: 10, paddingHorizontal: 20, paddingVertical: 22 },
  initials: { fontSize: 22, fontWeight: "600" },
  name: { textAlign: "center" },
  pills: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  subtitle: {
    fontWeight: "500" as const,
    textAlign: "center",
    lineHeight: 18,
  },
})

const sectionStyles = StyleSheet.create({
  wrap: { gap: 10, paddingHorizontal: 2 },
  head: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  headCopy: { flex: 1, gap: 4 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  labelDot: { width: 6, height: 6, borderRadius: 3 },
  label: { ...nativeType.sectionHeader, textTransform: "none" },
  hint: { ...nativeType.caption, color: NATIVE.secondaryLabel },
  body: { gap: 10 }})

const metricStyles = StyleSheet.create({
  group: { overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 0,
    paddingVertical: 11,
    gap: 12,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BRAND.border },
  rowMultiline: { alignItems: "flex-start" },
  left: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  leftMultiline: { flex: 0, minWidth: 112 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  iconWrapSolid: {
    borderWidth: 0,
  },
  label: { fontSize: 14, fontWeight: "600", flex: 1 },
  value: { fontSize: 15, fontWeight: "600", maxWidth: "40%", textAlign: "right", fontVariant: ["tabular-nums"] },
  valueMultiline: { flex: 1, maxWidth: "100%", textAlign: "left", lineHeight: 21 }})

const statStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  chip: {
    flex: 1,
    minWidth: 0,
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 10,
    paddingVertical: 11,
    gap: 6,
  },
  iconTile: {
    width: 28,
    height: 28,
    borderRadius: MODERN.metricIconRadius,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  label: { fontSize: 11, lineHeight: 13, fontWeight: "500" },
  value: { fontSize: 14, fontWeight: "600", lineHeight: 17, width: "100%" },
})

const pipelineStyles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10},
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1},
  badgeText: { fontSize: 11, fontWeight: "600", letterSpacing: 0.4 },
  stepText: { fontSize: 15, fontWeight: "600", fontVariant: ["tabular-nums"] },
  track: {
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.18)",
    overflow: "hidden"},
  fill: { height: "100%", borderRadius: 999 },
  dotsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, justifyContent: "space-between" },
  dot: { width: 7, height: 7, borderRadius: 999 },
  headline: { fontSize: 16, fontWeight: "600", lineHeight: 22 },
  subline: { fontSize: 13, fontWeight: "700", lineHeight: 18 }})

const toggleStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: BRAND.white,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NATIVE.separator,
    padding: 14},
  copy: { flex: 1, gap: 2 },
  title: { ...nativeType.bodyEmphasis, fontSize: 15 },
  subtitle: { ...nativeType.caption, lineHeight: 18 }})

const actionRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1},
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"},
  copy: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: "700" },
  subtitle: { fontSize: 12, fontWeight: "600" }})

const workflowStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1},
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  titleDot: { width: 8, height: 8, borderRadius: 4 },
  title: { letterSpacing: 0.4 },
  body: { lineHeight: 20 },
  actions: { flexDirection: "row", gap: 8 },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 12},
  approveText: { color: "#ffffff", fontWeight: "600", fontSize: 15 },
  rejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1},
  rejectText: { fontWeight: "600", fontSize: 15 }})

const fieldStyles = StyleSheet.create({
  wrap: { gap: 6 },
})

const confirmStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    padding: 18,
    gap: 12},
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  title: {},
  body: { lineHeight: 21, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 10 },
  cancel: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1},
  confirm: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center"},
  confirmDanger: {},
  cancelText: { fontWeight: "700" },
  confirmText: { fontWeight: "600", color: "#ffffff" }})
