/**
 * Student module shell — native structure + appearance theme accents.
 */
export {
  FACULTY_PAGE_BG as STUDENT_PAGE_BG,
  FACULTY_CARD_SHADOW as STUDENT_CARD_SHADOW,
  FacultyAdaptiveSegmentNav as StudentAdaptiveSegmentNav,
  FacultyFilterBar as StudentFilterBar,
  FacultyFilterChip as StudentFilterChip,
  FacultyModuleSearch as StudentModuleSearch,
  FacultyModuleTabBar as StudentModuleTabBar,
  FacultySegmentedControl as StudentSegmentedControl,
  FacultySectionFilterBar as StudentSectionFilterBar,
  FacultyStatCard as StudentStatCard,
  FacultyStatRow as StudentStatRow,
  FacultyUnderlineTabBar as StudentUnderlineTabBar,
} from "../faculty/faculty-module-shell"

export { StudentFilterSheet, StudentGroupedFilterSheet, StudentSearchToolbar } from "./student-search-toolbar"
export type { StudentFilterGroup } from "./student-search-toolbar"

export { StudentThemedHero, StudentThemedLocked } from "./student-themed-hero"
export type { StudentHeroStat } from "./student-themed-hero"

export {
  useThemedStudentNative,
  useStudentSectionTheme,
  sectionThemeFromTokens,
  levelColorForTokens,
} from "../../lib/themed-module-theme"

export {
  CommEmptyState as StudentEmptyState,
  CommGroupedList as StudentGroupedList,
  CommListRow as StudentListRow,
  CommSectionFooter as StudentSectionFooter,
  CommSectionHeader as StudentSectionHeader,
  CommStatusChip as StudentStatusChip,
  CommThreadRow as StudentThreadRow,
  CommTintButton as StudentTintButton,
} from "../faculty/faculty-communication-ui"

export {
  FacultyEmptyState,
  FacultyHero,
  FacultyListRow,
  FacultySectionCard,
  FacultyStatusPill,
  NativeCountBadge,
} from "../faculty/faculty-shared"

export { ModuleListRow, ModuleSection, ModuleSectionHeader, ModuleScreen } from "../modules/ModuleScreen"

/** @deprecated Use useThemedStudentNative() — static PVAMU purple does not follow appearance theme. */
export { STUDENT_BRAND, STUDENT_NATIVE, STUDENT_THEME, studentChrome } from "../../constants/student-theme"
