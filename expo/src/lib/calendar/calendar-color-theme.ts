import { hexToRgba } from "../../constants/app-themes"
import { COLOR_HUNT_COOL } from "../codebench-badge-theme"
import { COLOR_HUNT } from "../flashcard-difficulty-theme"
import { GRADES_WARM } from "../grades-theme"
import type { CalendarEventTypeConfig } from "./calendar-utils"

/**
 * Calendar accents — Color Hunt palette.
 * Card containers stay neutral; color applies to headers, icons, bars, and chips.
 */
export const CALENDAR_COLOR = {
  scheduleHeader: COLOR_HUNT_COOL.indigo,
  monthHeader: COLOR_HUNT_COOL.cyan,
  primaryAction: GRADES_WARM.orange,
  primaryActionInk: "#FFFFFF",
  secondaryActionFill: hexToRgba(COLOR_HUNT_COOL.cyan, 0.14),
  secondaryActionBorder: hexToRgba(COLOR_HUNT_COOL.cyan, 0.32),
  secondaryActionInk: COLOR_HUNT_COOL.indigo,
  accent: GRADES_WARM.orange,
  accentSoft: hexToRgba(GRADES_WARM.orange, 0.14),
  accentBorder: hexToRgba(GRADES_WARM.orange, 0.28),
  classDot: GRADES_WARM.orange,
  eventDot: COLOR_HUNT.pink,
  selectedDayFill: hexToRgba(GRADES_WARM.orange, 0.14),
  selectedDayInk: GRADES_WARM.orange,
  todayBorder: hexToRgba(GRADES_WARM.gold, 0.65),
  todayInk: COLOR_HUNT.orangeDeep,
  reminderActive: GRADES_WARM.orange,
  infoIcon: GRADES_WARM.orange,
  agendaDate: COLOR_HUNT_COOL.indigo,
} as const

export function calendarColorHuntEventColors(): Record<string, CalendarEventTypeConfig> {
  return {
    class_meeting: { color: GRADES_WARM.orange, label: "Class", icon: "school-outline" },
    study_session: { color: COLOR_HUNT_COOL.cyan, label: "Study", icon: "book-outline" },
    quiz: { color: GRADES_WARM.gold, label: "Quiz", icon: "document-text-outline" },
    exam: { color: GRADES_WARM.red, label: "Exam", icon: "alarm-outline" },
    assignment: { color: COLOR_HUNT_COOL.indigo, label: "Assignment", icon: "document-text-outline" },
    office_hours: { color: COLOR_HUNT.pink, label: "Office hours", icon: "location-outline" },
    group_study: { color: COLOR_HUNT_COOL.gold, label: "Group study", icon: "people-outline" },
    ai_reminder: { color: COLOR_HUNT.amber, label: "Reminder", icon: "sparkles-outline" },
  }
}
