import type { ReactNode } from "react"
import type {
  FacultyModuleSearchProps,
  FacultySearchToolbarProps,
} from "../components/faculty/faculty-module-shell"
import type { StudentSearchToolbarProps } from "../components/student/student-search-toolbar"

export type ModuleSearchDockEntry =
  | { kind: "student"; props: StudentSearchToolbarProps }
  | { kind: "faculty-toolbar"; props: FacultySearchToolbarProps }
  | { kind: "faculty-search"; props: FacultyModuleSearchProps }
  | { kind: "custom"; node: ReactNode }
