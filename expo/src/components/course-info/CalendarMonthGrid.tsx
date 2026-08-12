import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  buildMonthGrid,
  dateKey,
  getEventsForDate,
  sameDay,
  CALENDAR_COLOR,
  type CalendarEvent,
} from "../../lib/calendar"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

type CalendarMonthGridProps = {
  month: Date
  events: CalendarEvent[]
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
}

export function CalendarMonthGrid({
  month,
  events,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onToday}: CalendarMonthGridProps) {
  const native = useThemedNative()
  const type = useNativeType()
  const days = buildMonthGrid(month)
  const today = new Date()

  return (
    <View style={[styles.card, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
      <View style={[styles.toolbar, { backgroundColor: CALENDAR_COLOR.monthHeader }]}>
        <Pressable style={styles.navBtn} onPress={onPrevMonth} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color="#ffffff" />
        </Pressable>
        <View style={styles.toolbarCenter}>
          <Text style={styles.monthLabel}>
            {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </Text>
          <Text style={styles.monthSub}>{events.length} events in view</Text>
        </View>
        <Pressable style={styles.navBtn} onPress={onNextMonth} hitSlop={8}>
          <Ionicons name="chevron-forward" size={20} color="#ffffff" />
        </Pressable>
      </View>

      <Pressable
        style={[styles.todayBtn, { backgroundColor: CALENDAR_COLOR.accentSoft, borderColor: CALENDAR_COLOR.accentBorder, borderWidth: StyleSheet.hairlineWidth }]}
        onPress={onToday}
      >
        <Text style={[styles.todayBtnText, { color: CALENDAR_COLOR.accent }]}>Jump to today</Text>
      </Pressable>

      <View style={styles.weekHead}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={[type.caption, styles.weekHeadCell]}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const dayEvents = getEventsForDate(events, day.date)
          const isSelected = sameDay(day.date, selectedDate)
          const isToday = sameDay(day.date, today)
          const hasClass = dayEvents.some((e) => e.event_type === "class_meeting" || e.isClassMeeting)
          const hasOther = dayEvents.some((e) => e.event_type !== "class_meeting" && !e.isClassMeeting)

          return (
            <Pressable
              key={day.key}
              style={[
                styles.cell,
                !day.inMonth && styles.cellOutside,
                isSelected && { backgroundColor: CALENDAR_COLOR.selectedDayFill },
                isToday && !isSelected && { borderWidth: 1, borderColor: CALENDAR_COLOR.todayBorder },
              ]}
              onPress={() => onSelectDate(day.date)}
            >
              <Text
                style={[
                  type.bodyEmphasis,
                  styles.cellDay,
                  !day.inMonth && styles.cellDayOutside,
                  isSelected && { color: CALENDAR_COLOR.selectedDayInk },
                  isToday && !isSelected && { color: CALENDAR_COLOR.todayInk },
                ]}
              >
                {day.date.getDate()}
              </Text>
              {dayEvents.length > 0 ? (
                <View style={styles.dots}>
                  {hasClass ? <View style={[styles.dot, { backgroundColor: CALENDAR_COLOR.classDot }]} /> : null}
                  {hasOther ? <View style={[styles.dot, { backgroundColor: CALENDAR_COLOR.eventDot }]} /> : null}
                </View>
              ) : null}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export function selectedDateLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"})
}

export function eventsForSelectedDay(events: CalendarEvent[], date: Date): CalendarEvent[] {
  return getEventsForDate(events, date)
}

export { dateKey }

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 14},
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)"},
  toolbarCenter: { flex: 1, alignItems: "center", gap: 2 },
  monthLabel: { fontSize: 17, fontWeight: "600", color: "#ffffff" },
  monthSub: { fontSize: 11, color: "rgba(255,255,255,0.85)" },
  todayBtn: {
    alignSelf: "center",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999},
  todayBtnText: { fontSize: 12, fontWeight: "700" },
  weekHead: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 6},
  weekHeadCell: {
    flex: 1,
    textAlign: "center",
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    paddingBottom: 12},
  cell: {
    width: "14.2857%",
    minHeight: 52,
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 4,
    borderRadius: 10},
  cellOutside: { opacity: 0.35 },
  cellDay: { fontSize: 14 },
  cellDayOutside: { opacity: 0.45 },
  dots: { flexDirection: "row", gap: 3, marginTop: 4 },
  dot: { width: 5, height: 5, borderRadius: 999 },
})
