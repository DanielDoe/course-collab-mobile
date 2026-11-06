import { useEffect, useState } from "react"
import { useNavigation } from "expo-router/react-navigation"

/** Safe alternative to `router.canGoBack()` — never call canGoBack during render. */
export function useStackHasHistory(): boolean {
  const navigation = useNavigation()
  const [hasHistory, setHasHistory] = useState(false)

  useEffect(() => {
    const sync = () => {
      let current: { getState?: () => { index?: number } | undefined; getParent?: () => unknown } | undefined =
        navigation
      while (current) {
        if ((current.getState?.()?.index ?? 0) > 0) {
          setHasHistory(true)
          return
        }
        current = current.getParent?.() as typeof current
      }
      setHasHistory(false)
    }

    sync()
    return navigation.addListener("state", sync)
  }, [navigation])

  return hasHistory
}
