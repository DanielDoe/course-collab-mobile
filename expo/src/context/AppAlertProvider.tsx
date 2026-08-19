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
import { Keyboard } from "react-native"
import { AppAlertModal, type AppAlertTone } from "../components/errors/AppAlertModal"
import { logAppError } from "../lib/log-app-error"

export type AppAlertButton = {
  text: string
  onPress?: () => void
  style?: "default" | "cancel" | "destructive"
  isPreferred?: boolean
}

export type AppAlertOptions = {
  cancelable?: boolean
  onDismiss?: () => void
  tone?: AppAlertTone
  feature?: string
  logError?: boolean
}

type AlertRequest = {
  id: number
  title: string
  message?: string
  buttons: AppAlertButton[]
  options?: AppAlertOptions
}

type AppAlertContextValue = {
  alert: (
    title: string,
    message?: string,
    buttons?: AppAlertButton[],
    options?: AppAlertOptions,
  ) => void
}

type AppAlertRenderContextValue = {
  current: AlertRequest | null
  tone: AppAlertTone
  handleBackdropPress: () => void
  handleButtonPress: (button: AppAlertButton) => void
  registerInlineHost: () => () => void
  inlineHostCount: number
}

const AppAlertContext = createContext<AppAlertContextValue | null>(null)
const AppAlertRenderContext = createContext<AppAlertRenderContextValue | null>(null)

function inferTone(
  title: string,
  message?: string,
  explicit?: AppAlertTone,
  buttons?: AppAlertButton[],
): AppAlertTone {
  if (explicit) return explicit
  // Questions and destructive actions are confirms — "cannot be undone" is not an error.
  if (title.trim().endsWith("?")) return "warning"
  if (buttons?.some((button) => button.style === "destructive")) return "warning"
  const haystack = `${title} ${message ?? ""}`.toLowerCase()
  if (/fail|error|invalid|denied|couldn't|unable/.test(haystack)) return "error"
  if (/\bcannot\b/.test(haystack) && !/cannot be undone/.test(haystack)) return "error"
  if (
    /\b(success|successfully|saved|complete|completed|sent|copied|updated)\b/.test(haystack) &&
    !/fail|error|couldn't|cannot|invalid/.test(haystack)
  ) {
    return "success"
  }
  if (/delete|remove|reset|clear|end session|stop|destructive|confirm/.test(haystack)) return "warning"
  return "info"
}

function normalizeButtons(buttons?: AppAlertButton[]): AppAlertButton[] {
  if (!buttons?.length) return [{ text: "OK", style: "default" }]
  return buttons
}

let alertHandler: AppAlertContextValue["alert"] | null = null

/** Drop-in replacement for React Native `Alert.alert`. */
export function appAlert(
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
  options?: AppAlertOptions,
): void {
  if (alertHandler) {
    alertHandler(title, message, buttons, options)
    return
  }
  console.warn("[AppAlert]", title, message)
}

export const AppAlert = { alert: appAlert }

function useAppAlertRenderContext() {
  const ctx = useContext(AppAlertRenderContext)
  if (!ctx) throw new Error("AppAlertHost must be used within AppAlertProvider")
  return ctx
}

/**
 * Mount inside pageSheet / bottom-sheet modals so confirms appear above sheet content.
 * When this host is active, the root overlay is suppressed.
 */
export function AppAlertHost({ enabled = true }: { enabled?: boolean }) {
  const { registerInlineHost, inlineHostCount, current, tone, handleBackdropPress, handleButtonPress } =
    useAppAlertRenderContext()

  useEffect(() => {
    if (!enabled) return
    return registerInlineHost()
  }, [enabled, registerInlineHost])

  if (!enabled || inlineHostCount === 0 || !current) return null

  return (
    <AppAlertModal
      visible
      inline
      title={current.title}
      message={current.message}
      tone={tone}
      buttons={current.buttons}
      onBackdropPress={handleBackdropPress}
      onButtonPress={handleButtonPress}
    />
  )
}

export function AppAlertProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<AlertRequest | null>(null)
  const [inlineHostCount, setInlineHostCount] = useState(0)
  const queueRef = useRef<AlertRequest[]>([])
  const idRef = useRef(0)
  const showingRef = useRef(false)

  const pump = useCallback(() => {
    if (showingRef.current) return
    const next = queueRef.current.shift()
    if (!next) return
    showingRef.current = true
    setCurrent(next)
  }, [])

  const dismiss = useCallback(() => {
    showingRef.current = false
    setCurrent(null)
    requestAnimationFrame(() => pump())
  }, [pump])

  const alert = useCallback(
    (
      title: string,
      message?: string,
      buttons?: AppAlertButton[],
      options?: AppAlertOptions,
    ) => {
      Keyboard.dismiss()
      const tone = inferTone(title, message, options?.tone, buttons)
      if (options?.logError !== false && tone === "error") {
        logAppError(new Error(message || title), {
          feature: options?.feature,
          title,
          context: "AppAlert",
        })
      }

      queueRef.current.push({
        id: ++idRef.current,
        title,
        message,
        buttons: normalizeButtons(buttons),
        options,
      })
      pump()
    },
    [pump],
  )

  const handleButtonPress = useCallback(
    (button: AppAlertButton) => {
      const active = current
      dismiss()
      button.onPress?.()
      active?.options?.onDismiss?.()
    },
    [current, dismiss],
  )

  const handleBackdropPress = useCallback(() => {
    if (current?.options?.cancelable === false) return
    const cancel = current?.buttons.find((b) => b.style === "cancel")
    if (cancel) {
      handleButtonPress(cancel)
      return
    }
    const active = current
    dismiss()
    active?.options?.onDismiss?.()
  }, [current, dismiss, handleButtonPress])

  const registerInlineHost = useCallback(() => {
    setInlineHostCount((count) => count + 1)
    return () => setInlineHostCount((count) => Math.max(0, count - 1))
  }, [])

  const tone = inferTone(
    current?.title ?? "",
    current?.message,
    current?.options?.tone,
    current?.buttons,
  )
  const alertValue = useMemo(() => ({ alert }), [alert])
  const renderValue = useMemo(
    () => ({
      current,
      tone,
      handleBackdropPress,
      handleButtonPress,
      registerInlineHost,
      inlineHostCount,
    }),
    [current, tone, handleBackdropPress, handleButtonPress, registerInlineHost, inlineHostCount],
  )

  alertHandler = alert

  const showRootAlert = Boolean(current) && inlineHostCount === 0

  return (
    <AppAlertContext.Provider value={alertValue}>
      <AppAlertRenderContext.Provider value={renderValue}>
        {children}
        {showRootAlert ? (
          <AppAlertModal
            visible
            title={current?.title ?? ""}
            message={current?.message}
            tone={tone}
            buttons={current?.buttons ?? []}
            onBackdropPress={handleBackdropPress}
            onButtonPress={handleButtonPress}
          />
        ) : null}
      </AppAlertRenderContext.Provider>
    </AppAlertContext.Provider>
  )
}

export function useAppAlert() {
  const ctx = useContext(AppAlertContext)
  if (!ctx) throw new Error("useAppAlert must be used within AppAlertProvider")
  return ctx
}
