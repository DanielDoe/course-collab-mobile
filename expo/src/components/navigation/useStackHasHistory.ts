import { useEffect, useState } from "react"
import { useNavigation } from "expo-router/react-navigation"

/** Safe alternative to `router.canGoBack()` — never call canGoBack during render. */
export function useStackHasHistory(): boolean {
  const navigation = useNavigation()
  const [hasHistory, setHasHistory] = useState(false)

  useEffect(() => {
    const sync = () => {
      const state = navigation.getState()
      setHasHistory((state?.index ?? 0) > 0)
    }

    sync()
    return navigation.addListener("state", sync)
  }, [navigation])

  return hasHistory
}
