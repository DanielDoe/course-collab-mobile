import { createContext, useContext, type ReactNode } from "react"
import { STUDENT_CORA_CAPABILITIES, type StudentCoraCapability } from "../lib/student-cora-config"
import type { StudentCoraContext } from "../lib/student-cora-context"

type StudentCoraContextValue = {
  context: StudentCoraContext | null
  capabilities: StudentCoraCapability[]
}

const StudentCoraContextReact = createContext<StudentCoraContextValue>({
  context: null,
  capabilities: STUDENT_CORA_CAPABILITIES,
})

export function StudentCoraContextProvider({
  context,
  capabilities,
  children,
}: {
  context: StudentCoraContext | null
  capabilities: StudentCoraCapability[]
  children: ReactNode
}) {
  return (
    <StudentCoraContextReact.Provider value={{ context, capabilities }}>
      {children}
    </StudentCoraContextReact.Provider>
  )
}

export function useStudentCoraContextValue(): StudentCoraContextValue {
  return useContext(StudentCoraContextReact)
}
