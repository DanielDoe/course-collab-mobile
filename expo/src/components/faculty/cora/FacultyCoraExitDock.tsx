import { useMemo } from "react"
import { CoraExitDock } from "../../cora/CoraExitDock"
import { useAppThemeTokens } from "../../../context/AppearanceProvider"
import { facultyCoraActionColors } from "../../../lib/faculty-cora-theme"

type Props = {
  onExit: () => void
}

/** Bottom exit control — leaves immersive Cora Copilot (no top header). */
export function FacultyCoraExitDock({ onExit }: Props) {
  const tokens = useAppThemeTokens()
  const action = useMemo(() => facultyCoraActionColors(tokens), [tokens])

  return (
    <CoraExitDock
      label="Exit Cora Copilot"
      onExit={onExit}
      backgroundColor={action.background}
      textColor={action.ink}
    />
  )
}
