import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { StyleSheet, Text, View } from "react-native"
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "./AppearanceProvider"
import { useNativeType } from "../lib/themed-module-theme"
import { NATIVE } from "../constants/faculty-native-theme"
import { durationOrInstant, motion, timing, useAppReducedMotion } from "../lib/motion"

export type AppToastTone = "success" | "error" | "info"

type ToastPayload = {
  id: number
  message: string
  tone: AppToastTone
}

type AppToastContextValue = {
  showSuccess: (message?: string) => void
  showError: (message: string) => void
  showInfo: (message: string) => void
}

const AppToastContext = createContext<AppToastContextValue | null>(null)

const DEFAULT_SUCCESS = "Saved"
const TOAST_MS = 2600

const TONE_ICON: Record<AppToastTone, keyof typeof Ionicons.glyphMap> = {
  success: "checkmark-circle",
  error: "alert-circle",
  info: "information-circle",
}

function AppToastBanner({ toast, onDismiss }: { toast: ToastPayload; onDismiss: () => void }) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const reduceMotion = useAppReducedMotion()
  const progress = useSharedValue(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const accent =
    toast.tone === "success" ? tokens.success : toast.tone === "error" ? tokens.danger : tokens.accent

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const outMs = durationOrInstant(timing.fadeOut.duration, reduceMotion)
    progress.value = withTiming(0, { duration: outMs, easing: timing.fadeOut.easing }, (finished) => {
      if (finished) runOnJS(onDismiss)()
    })
  }, [onDismiss, progress, reduceMotion])

  useEffect(() => {
    const inMs = durationOrInstant(timing.fadeIn.duration, reduceMotion)
    progress.value = withTiming(1, { duration: inMs, easing: timing.fadeIn.easing })
    timerRef.current = setTimeout(dismiss, TOAST_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [dismiss, progress, reduceMotion, toast.id])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -10 }],
  }))

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.host, { top: insets.top + 8 }, animatedStyle]}
    >
      <View
        style={[
          styles.banner,
          {
            backgroundColor: native.secondaryGrouped,
            borderColor: native.separator,
            ...tokens.cardShadow,
          },
        ]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <Ionicons name={TONE_ICON[toast.tone]} size={20} color={accent} />
        <Text style={[type.callout, styles.message, { color: native.label }]} numberOfLines={2}>
          {toast.message}
        </Text>
      </View>
    </Animated.View>
  )
}

export function AppToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastPayload | null>(null)
  const idRef = useRef(0)

  const push = useCallback((message: string, tone: AppToastTone) => {
    idRef.current += 1
    setToast({ id: idRef.current, message, tone })
  }, [])

  const value = useMemo<AppToastContextValue>(
    () => ({
      showSuccess: (message = DEFAULT_SUCCESS) => push(message, "success"),
      showError: (message) => push(message, "error"),
      showInfo: (message) => push(message, "info"),
    }),
    [push],
  )

  return (
    <AppToastContext.Provider value={value}>
      {children}
      {toast ? <AppToastBanner key={toast.id} toast={toast} onDismiss={() => setToast(null)} /> : null}
    </AppToastContext.Provider>
  )
}

export function useAppToast(): AppToastContextValue {
  const ctx = useContext(AppToastContext)
  if (!ctx) throw new Error("useAppToast must be used within AppToastProvider")
  return ctx
}

/** Optional hook for modules that may render outside the toast provider (dev screens). */
export function useOptionalAppToast(): AppToastContextValue | null {
  return useContext(AppToastContext)
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: NATIVE.pagePadding,
    right: NATIVE.pagePadding,
    zIndex: 9999,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  message: {
    flex: 1,
    fontWeight: "600",
    lineHeight: 20,
  },
})
