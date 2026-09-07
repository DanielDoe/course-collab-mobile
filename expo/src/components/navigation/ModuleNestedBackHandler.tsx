import { useEffect, useLayoutEffect, useRef } from "react"
import { BackHandler } from "react-native"
import { useNavigation } from "expo-router/react-navigation"

/**
 * Blocks native-stack pop (edge swipe / hardware back) while nested module UI is open.
 * Do not use beforeRemove + preventDefault — native-stack can desync and pop the route anyway.
 */
export function useBlockStackBackWhile(active: boolean, onNestedBack: () => void) {
  const navigation = useNavigation()
  const navigationRef = useRef(navigation)
  navigationRef.current = navigation
  const onNestedBackRef = useRef(onNestedBack)
  onNestedBackRef.current = onNestedBack

  useLayoutEffect(() => {
    if (!active) return

    navigationRef.current.setOptions({ gestureEnabled: false })
    return () => {
      navigationRef.current.setOptions({ gestureEnabled: true })
    }
  }, [active])

  useEffect(() => {
    if (!active) return
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onNestedBackRef.current()
      return true
    })
    return () => sub.remove()
  }, [active])
}
