import { useMemo } from "react"
import { CoraExitDock } from "../cora/CoraExitDock"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { studentCoraActionColors } from "../../lib/student-cora-theme"

type Props = {
  onExit: () => void
}

/** Bottom exit control — leaves immersive student Cora (no top header). */
export function StudentCoraExitDock({ onExit }: Props) {
  const tokens = useAppThemeTokens()
  const action = useMemo(() => studentCoraActionColors(tokens), [tokens])

  return (
    <CoraExitDock
      label="Exit Cora"
      onExit={onExit}
      backgroundColor={action.background}
      textColor={action.ink}
    />
  )
}
