import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { CoraProblem } from "../../lib/cora-types"
import type { CoraSectionId } from "../../lib/cora-nav-config"
import { CoraStepEngineModal } from "./CoraStepEngineModal"

type CoraContextValue = {
  openCora: (problem: CoraProblem) => void
  closeCora: () => void
  problem: CoraProblem | null
  workspaceImmersive: boolean
  setWorkspaceImmersive: (active: boolean) => void
  overlaySection: CoraSectionId | null
  setOverlaySection: (section: CoraSectionId | null) => void
}

const CoraContext = createContext<CoraContextValue | null>(null)

export function CoraProvider({ children }: { children: ReactNode }) {
  const [problem, setProblem] = useState<CoraProblem | null>(null)
  const [workspaceImmersive, setWorkspaceImmersive] = useState(false)
  const [overlaySection, setOverlaySection] = useState<CoraSectionId | null>(null)

  const openCora = useCallback((next: CoraProblem) => {
    setProblem(next)
  }, [])

  const closeCora = useCallback(() => {
    setProblem(null)
  }, [])

  const value = useMemo(
    () => ({
      openCora,
      closeCora,
      problem,
      workspaceImmersive,
      setWorkspaceImmersive,
      overlaySection,
      setOverlaySection,
    }),
    [closeCora, openCora, overlaySection, problem, workspaceImmersive],
  )

  return (
    <CoraContext.Provider value={value}>
      {children}
      <CoraStepEngineModal visible={Boolean(problem)} problem={problem} onClose={closeCora} />
    </CoraContext.Provider>
  )
}

export function useCora() {
  const context = useContext(CoraContext)
  if (!context) {
    throw new Error("useCora must be used within CoraProvider")
  }
  return context
}
