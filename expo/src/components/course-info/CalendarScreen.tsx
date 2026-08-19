import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, AppState, RefreshControl, StyleSheet, Text, View } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { courseInfoApi, type CalendarEvent } from "../../lib/course-info-api"
import {
  addMonths,
  calendarEventColors,
  endOfMonth,
  eventTypeConfig,
  formatEventTimeRange,
  isClassMeetingEvent,
  CALENDAR_COLOR,
  mergeCalendarEvents,
  startOfMonth,
  syncClassMeetingReminders,
  syncStudySessionReminders,
  initClassReminderNotifications,
  type ClassSchedulePayload} from "../../lib/calendar"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { useModuleContentStyle } from "../../lib/responsive-layout"
import { NATIVE } from "../../constants/faculty-native-theme"
import { EmptyBlock } from "../rewards/rewards-shared"
import { MobbinPillSegmentControl } from "../theme/MobbinPillSegmentControl"
import { StatusBadge } from "./course-info-shared"
import { ClassScheduleCard } from "./ClassScheduleCard"
import { CalendarMonthGrid, eventsForSelectedDay, selectedDateLabel } from "./CalendarMonthGrid"
import { useNativeType } from "../../lib/themed-module-theme"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

type AgendaFilter = "all" | "classes" | "events"

function filterDayEvents(events: CalendarEvent[], filter: AgendaFilter): CalendarEvent[] {
  if (filter === "classes") return events.filter(isClassMeetingEvent)
  if (filter === "events") return events.filter((event) => !isClassMeetingEvent(event))
  return events
}

function AgendaEventRow({ event }: { event: CalendarEvent }) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const config = eventTypeConfig(event, calendarEventColors(tokens))

  return (
    <View style={[styles.agendaRow, { borderBottomColor: native.separator }]}>
      <View style={[styles.agendaStripe, { backgroundColor: config.color }]} />
      <View style={styles.agendaBody}>
        <View style={styles.agendaTop}>
          <Ionicons name={config.icon} size={16} color={config.color} />
          <Text style={[type.bodyEmphasis, styles.agendaTitle]}>{event.title}</Text>
        </View>
        <Text style={type.caption}>
          {formatEventTimeRange(event)}
          {event.location ? ` · ${event.location}` : ""}
        </Text>
        {event.description && !isClassMeetingEvent(event) ? (
          <Text style={[type.secondary, styles.agendaDesc]} numberOfLines={2}>
            {event.description}
          </Text>
        ) : null}
      </View>
      <StatusBadge label={config.label} tone="purple" />
    </View>
  )
}

export function CalendarScreen() {
  const session = useStudentSession()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const scrollPad = useModuleScrollContentPadding()
  const moduleContentStyle = useModuleContentStyle()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [personalEvents, setPersonalEvents] = useState<CalendarEvent[]>([])
  const [classMeetings, setClassMeetings] = useState<CalendarEvent[]>([])
  const [classSchedule, setClassSchedule] = useState<ClassSchedulePayload>({ hasSchedule: false })
  const [agendaFilter, setAgendaFilter] = useState<AgendaFilter>("all")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const range = useMemo(() => {
    const start = startOfMonth(month)
    const end = new Date(month.getFullYear(), month.getMonth() + 3, 0, 23, 59, 59, 999)
    return { startDate: start, endDate: end }
  }, [month])

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const [eventsData, scheduleData] = await Promise.all([
        courseInfoApi.getCalendarEvents(session, range),
        courseInfoApi.getClassSchedule(session, range),
      ])
      setPersonalEvents(eventsData)
      setClassMeetings((scheduleData.events ?? []) as CalendarEvent[])
      setClassSchedule(scheduleData)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load calendar.")
    }
  }, [session, range])

  useEffect(() => {
    void initClassReminderNotifications()
  }, [])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useNotificationModuleRefresh("calendar", onRefresh)

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (classMeetings.length > 0) {
          void syncClassMeetingReminders(classMeetings)
        }
        const studyEvents = personalEvents.filter(
          (e) =>
            e.event_type === "study_session" ||
            e.event_type === "ai_reminder" ||
            e.title?.startsWith("Practice Hub:") ||
            e.title?.startsWith("Flashcards:"),
        )
        if (studyEvents.length > 0) {
          void syncStudySessionReminders(studyEvents)
        }
      }
    })
    return () => sub.remove()
  }, [classMeetings, personalEvents])

  useEffect(() => {
    const studyEvents = personalEvents.filter((e) => e.event_type === "study_session")
    if (studyEvents.length > 0) {
      void syncStudySessionReminders(studyEvents)
    }
  }, [personalEvents])

  const allEvents = useMemo(
    () => mergeCalendarEvents(personalEvents, classMeetings),
    [personalEvents, classMeetings],
  )

  const monthEvents = useMemo(() => {
    const monthStart = startOfMonth(month)
    const monthEnd = endOfMonth(month)
    return allEvents.filter((event) => {
      const t = event.start_time ? new Date(event.start_time).getTime() : 0
      return t >= monthStart.getTime() && t <= monthEnd.getTime()
    })
  }, [allEvents, month])

  const dayEvents = useMemo(
    () => eventsForSelectedDay(allEvents, selectedDate),
    [allEvents, selectedDate],
  )

  const filteredByTab = useMemo(
    () => ({
      all: filterDayEvents(dayEvents, "all"),
      classes: filterDayEvents(dayEvents, "classes"),
      events: filterDayEvents(dayEvents, "events"),
    }),
    [dayEvents],
  )

  const tabs = useMemo(
    () => [
      { id: "all" as const, label: "All", icon: "layers-outline" as const },
      { id: "classes" as const, label: "Classes", icon: "school-outline" as const },
      { id: "events" as const, label: "My events", icon: "calendar-outline" as const },
    ],
    [],
  )

  function renderAgendaPage(filter: AgendaFilter) {
    const selectedEvents = filteredByTab[filter]
    if (selectedEvents.length === 0) {
      return (
        <EmptyBlock
          icon="calendar-outline"
          title="Nothing scheduled"
          body={
            filter === "classes"
              ? "No class meetings on this day."
              : filter === "events"
                ? "No personal events on this day. Add events on web to sync here."
                : "No events on this day."
          }
        />
      )
    }

    return (
      <View style={[styles.agendaCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
        {selectedEvents.map((event) => (
          <AgendaEventRow key={`${event.id}-${event.start_time}`} event={event} />
        ))}
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          moduleContentStyle,
          {
            paddingTop: scrollPad.paddingTop ?? NATIVE.pagePadding,
            paddingBottom: scrollPad.paddingBottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={tokens.accent} />
        }
      >
        {error ? (
          <View style={[styles.errorBox, styles.section, { backgroundColor: `${tokens.danger}18` }]}>
            <Text style={[type.destructive, styles.errorText]}>{error}</Text>
          </View>
        ) : null}

        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={tokens.accent} />
            <Text style={[type.caption, { color: native.secondaryLabel }]}>Loading calendar…</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <ClassScheduleCard
                hasSchedule={classSchedule.hasSchedule}
                scheduleText={classSchedule.scheduleText}
                location={classSchedule.location}
                meetingCount={classMeetings.length}
                schedule={classSchedule.schedule ?? null}
                context={classSchedule.context ?? null}
                classMeetings={classMeetings}
              />

              <CalendarMonthGrid
                month={month}
                events={monthEvents}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onPrevMonth={() => setMonth((prev) => addMonths(prev, -1))}
                onNextMonth={() => setMonth((prev) => addMonths(prev, 1))}
                onToday={() => {
                  const today = new Date()
                  setMonth(startOfMonth(today))
                  setSelectedDate(today)
                }}
              />
            </View>

            <MobbinPillSegmentControl
              options={tabs}
              value={agendaFilter}
              onChange={setAgendaFilter}
            />

            <View style={styles.section}>
              <View style={styles.agendaHead}>
                <Text style={[styles.agendaDate, { color: CALENDAR_COLOR.agendaDate }]}>{selectedDateLabel(selectedDate)}</Text>
                <Text style={[type.caption, styles.agendaCount]}>
                  {filteredByTab[agendaFilter].length} item{filteredByTab[agendaFilter].length === 1 ? "" : "s"}
                </Text>
              </View>

              {renderAgendaPage(agendaFilter)}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    gap: 12,
    flexGrow: 1,
  },
  section: {
    gap: 12,
    paddingHorizontal: NATIVE.pagePadding,
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 48,
  },
  errorBox: { padding: 12, borderRadius: NATIVE.sectionRadius },
  errorText: { fontSize: 14, lineHeight: 20 },
  agendaHead: { gap: 2 },
  agendaDate: { fontSize: 16, fontWeight: "600" },
  agendaCount: { fontWeight: "600" },
  agendaCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden"},
  agendaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
  },
  agendaStripe: { width: 4, alignSelf: "stretch", borderRadius: 999 },
  agendaBody: { flex: 1, gap: 3 },
  agendaTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  agendaTitle: { flex: 1 },
  agendaDesc: { lineHeight: 18, marginTop: 2 }})
