import { createContext, useContext, type ReactNode } from "react"
import { FACULTY_CORA_CAPABILITIES, type FacultyCoraCapability } from "../lib/faculty-cora-config"
import type { FacultyCoraInstructorContext } from "../lib/faculty-cora-instructor-context"

type FacultyCoraContextValue = {
  context: FacultyCoraInstructorContext | null
  capabilities: FacultyCoraCapability[]
}

const FacultyCoraContext = createContext<FacultyCoraContextValue>({
  context: null,
  capabilities: FACULTY_CORA_CAPABILITIES,
})

export function FacultyCoraContextProvider({
  context,
  capabilities,
  children,
}: {
  context: FacultyCoraInstructorContext | null
  capabilities: FacultyCoraCapability[]
  children: ReactNode
}) {
  return (
    <FacultyCoraContext.Provider value={{ context, capabilities }}>{children}</FacultyCoraContext.Provider>
  )
}

export function useFacultyCoraContext(): FacultyCoraContextValue {
  return useContext(FacultyCoraContext)
}
