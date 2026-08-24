import { useCallback } from "react"
import { Platform } from "react-native"
import { useBlockStackBackWhile } from "./ModuleNestedBackHandler"
import { IosEdgeBackSwipe } from "./IosEdgeBackSwipe"

/** Block stack pop + Android back while nested auth UI is active; add iOS edge swipe. */
export function useAuthNestedBack(active: boolean, onNestedBack: () => void, topInset = 0) {
  const stableBack = useCallback(() => {
    onNestedBack()
  }, [onNestedBack])

  useBlockStackBackWhile(active, stableBack)

  if (!active || Platform.OS !== "ios") return null
  return <IosEdgeBackSwipe onBack={stableBack} topInset={topInset} />
}
