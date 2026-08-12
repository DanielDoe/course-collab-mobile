import { useCallback, useEffect, useRef, type RefObject } from "react"
import { AppState, Platform, type TextInput } from "react-native"

/**
 * Focus helpers for login/MFA fields. After switching to another app (e.g. an
 * authenticator), iOS often drops TextInput focus. Refocus only on app return —
 * never blur/refocus on every tap (that breaks paste and jumps the keyboard).
 */
export function useReliableTextInputFocus(
  inputRef: RefObject<TextInput | null>,
  enabled = true,
) {
  const hadFocusRef = useRef(false)
  const pendingRefocusRef = useRef(false)

  const focusInput = useCallback(() => {
    if (!enabled) return
    inputRef.current?.focus()
  }, [enabled, inputRef])

  const refocusAfterAppReturn = useCallback(() => {
    if (!enabled) return
    const input = inputRef.current
    if (!input) return
    if (Platform.OS === "ios") {
      input.blur()
      setTimeout(() => input.focus(), 40)
    } else {
      input.focus()
    }
  }, [enabled, inputRef])

  const onFocus = useCallback(() => {
    hadFocusRef.current = true
  }, [])

  const onBlur = useCallback(() => {
    if (AppState.currentState === "active") {
      hadFocusRef.current = false
      pendingRefocusRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    const appStateRef = { current: AppState.currentState }
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current
      appStateRef.current = next

      if ((next === "background" || next === "inactive") && hadFocusRef.current) {
        pendingRefocusRef.current = true
      }

      if (
        (prev === "background" || prev === "inactive") &&
        next === "active" &&
        pendingRefocusRef.current
      ) {
        pendingRefocusRef.current = false
        setTimeout(() => refocusAfterAppReturn(), 280)
      }
    })
    return () => sub.remove()
  }, [enabled, refocusAfterAppReturn])

  return { focusInput, focusReliably: focusInput, refocusAfterAppReturn, onFocus, onBlur }
}
