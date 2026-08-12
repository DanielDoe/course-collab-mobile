/**
 * Summer camp module shell — same native primitives as student/faculty portals.
 */
export {
  FACULTY_PAGE_BG as SUMMER_PAGE_BG,
  FacultyAdaptiveSegmentNav as SummerSegmentNav,
  FacultyStatCard as SummerStatCard,
  FacultyStatRow as SummerStatRow,
} from "../faculty/faculty-module-shell"

export {
  useThemedStudentNative as useSummerNative,
  useStudentSectionTheme as useSummerSectionTheme,
  semanticSoft,
} from "../../lib/themed-module-theme"

export {
  FacultyEmptyState,
  NativeCountBadge,
} from "../faculty/faculty-shared"

export {
  ModuleListRow,
  ModuleSection,
  ModuleSectionHeader,
  ModuleScreen,
} from "../modules/ModuleScreen"

export {
  StudentFilterSheet as SummerFilterSheet,
  StudentGroupedFilterSheet as SummerGroupedFilterSheet,
  StudentSearchToolbar as SummerSearchToolbar,
  SummerSearchResultsBar,
  matchesSummerSearch,
} from "./summer-module-search"
export { StudentThemedHero } from "../student/student-themed-hero"
export type { StudentFilterGroup as SummerFilterGroup } from "./summer-module-search"
