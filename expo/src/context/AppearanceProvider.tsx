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
import { useColorScheme, Platform } from "react-native"
import { StatusBar } from "expo-status-bar"
import * as SystemUI from "expo-system-ui"
import { ThemeApplyingOverlay } from "../components/theme/ThemeApplyingOverlay"
import {
  DEFAULT_APPEARANCE_PREFS,
  getAppearancePrefs,
  saveAppearancePrefs,
  type AppearancePrefs,
} from "../lib/appearance-preferences"
import {
  resolveThemeTokens,
  type AppearanceMode,
  type AppThemeTokens,
  type ThemeId,
} from "../constants/app-themes"
import { NATIVE as STATIC_NATIVE } from "../constants/faculty-native-theme"
import { isBootComplete, subscribeBootLogs } from "../lib/boot-diagnostics"

const STATIC_CHROME = resolveThemeTokens(
  DEFAULT_APPEARANCE_PREFS.themeId,
  DEFAULT_APPEARANCE_PREFS.appearanceMode,
  null,
).chrome

const APPLY_THEME_MS = 520

type AppearanceContextValue = {
  prefs: AppearancePrefs
  tokens: AppThemeTokens
  isDark: boolean
  ready: boolean
  applying: boolean
  setAppearanceMode: (mode: AppearanceMode) => void
  setThemeId: (themeId: ThemeId) => void
  resetAppearance: () => void
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme()
  const [prefs, setPrefs] = useState<AppearancePrefs>(DEFAULT_APPEARANCE_PREFS)
  const [ready, setReady] = useState(false)
  const [applying, setApplying] = useState(false)
  const applyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let mounted = true
    void getAppearancePrefs().then((stored) => {
      if (mounted) {
        setPrefs(stored)
        setReady(true)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    return () => {
      if (applyTimerRef.current) clearTimeout(applyTimerRef.current)
    }
  }, [])

  const beginApplyTransition = useCallback(() => {
    setApplying(true)
    if (applyTimerRef.current) clearTimeout(applyTimerRef.current)
    applyTimerRef.current = setTimeout(() => setApplying(false), APPLY_THEME_MS)
  }, [])

  const persist = useCallback(async (next: AppearancePrefs) => {
    setPrefs(next)
    await saveAppearancePrefs(next)
  }, [])

  const tokens = useMemo(
    () => resolveThemeTokens(prefs.themeId, prefs.appearanceMode, systemScheme ?? null),
    [prefs.themeId, prefs.appearanceMode, systemScheme],
  )

  useEffect(() => {
    if (Platform.OS === "web" || !ready) return

    const apply = () => {
      if (!isBootComplete()) return
      void SystemUI.setBackgroundColorAsync(tokens.native.groupedBackground).catch(() => {})
    }

    apply()
    return subscribeBootLogs(apply)
  }, [ready, tokens.native.groupedBackground])

  const value = useMemo<AppearanceContextValue>(
    () => ({
      prefs,
      tokens,
      isDark: tokens.isDark,
      ready,
      applying,
      setAppearanceMode: (mode) => {
        setPrefs((prev) => {
          if (prev.appearanceMode === mode) return prev
          const next = { ...prev, appearanceMode: mode }
          void saveAppearancePrefs(next)
          beginApplyTransition()
          return next
        })
      },
      setThemeId: (themeId) => {
        setPrefs((prev) => {
          if (prev.themeId === themeId) return prev
          const next = { ...prev, themeId }
          void saveAppearancePrefs(next)
          beginApplyTransition()
          return next
        })
      },
      resetAppearance: () => {
        beginApplyTransition()
        void persist(DEFAULT_APPEARANCE_PREFS)
      },
    }),
    [prefs, tokens, ready, applying, persist, beginApplyTransition],
  )

  return (
    <AppearanceContext.Provider value={value}>
      <StatusBar style={tokens.isDark ? "light" : "dark"} />
      {children}
      {applying ? <ThemeApplyingOverlay tokens={tokens} /> : null}
    </AppearanceContext.Provider>
  )
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext)
  if (!ctx) {
    throw new Error("useAppearance must be used within AppearanceProvider")
  }
  return ctx
}

/** Safe hook — returns static tokens when provider is absent (e.g. auth screens). */
export function useAppearanceOptional(): AppearanceContextValue | null {
  return useContext(AppearanceContext)
}

export function useThemedNative() {
  const ctx = useAppearanceOptional()
  return ctx?.tokens.native ?? STATIC_NATIVE
}

export function useShellChrome() {
  const ctx = useAppearanceOptional()
  return ctx?.tokens.chrome ?? STATIC_CHROME
}

export function useAppThemeTokens(): AppThemeTokens {
  const ctx = useAppearanceOptional()
  if (ctx) return ctx.tokens
  return resolveThemeTokens(DEFAULT_APPEARANCE_PREFS.themeId, DEFAULT_APPEARANCE_PREFS.appearanceMode, null)
}
