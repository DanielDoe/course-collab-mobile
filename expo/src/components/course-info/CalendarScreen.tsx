import { useCallback, useEffect, useMemo, useState } from "react"
import { AppState, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { type CalendarEvent } from "../../lib/course-info-api"
import { useStudentCalendar } from "../../hooks/query/useStudentCalendar"
import { QueryRefreshBanner } from "../query/QueryRefreshBanner"
import { QuerySkeleton } from "../query/QuerySkeleton"
import {
  addMonths,
  calendarEventColors,
  endOfMonth,
  eventTypeConfig,
  filterCalendarEvents,
  filterCalendarEventsByKind,
  type CalendarEventKindFilter,
  formatEventTimeRange,
  isClassMeetingEvent,
  CALENDAR_COLOR,
  mergeCalendarEvents,
  startOfMonth,
  syncClassMeetingReminders,
  syncStudySessionReminders,
  initClassReminderNotifications} from "../../lib/calendar"
import {
  isStudySessionEvent,
  resolveStudySessionRoute,
} from "../../lib/calendar/study-session-navigation"
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
import { useThrottledFocusRefresh } from "../../lib/use-throttled-focus-refresh"
import { StudentFilterSheet, StudentSearchToolbar } from "../student/student-search-toolbar"
import { ModuleAddActionSheet } from "../modules/ModuleAddActionSheet"
import { CalendarPersonalEventSheet } from "../calendar/CalendarPersonalEventSheet"
import { useOptionalStudentActiveCourse } from "../../context/StudentActiveCourseContext"
import { useResetOnScopeChange } from "../../hooks/use-reset-on-scope-change"

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

function AgendaEventRow({
  event,
  onStudy,
}: {
  event: CalendarEvent
  onStudy?: (event: CalendarEvent) => void
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const config = eventTypeConfig(event, calendarEventColors(tokens))
  const showStudyAction = isStudySessionEvent(event)

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
      {showStudyAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start study session"
          onPress={() => onStudy?.(event)}
          style={({ pressed }) => [
            styles.studyBtn,
            {
              backgroundColor: `${config.color}18`,
              borderColor: config.color,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.studyBtnLabel, { color: config.color }]}>Study</Text>
        </Pressable>
      ) : (
        <StatusBadge label={config.label} tone="purple" />
      )}
    </View>
  )
}

export function CalendarScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const scrollPad = useModuleScrollContentPadding()
  const moduleContentStyle = useModuleContentStyle()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [agendaFilter, setAgendaFilter] = useState<AgendaFilter>("all")
  const [search, setSearch] = useState("")
  const [kindFilter, setKindFilter] = useState<CalendarEventKindFilter>("all")
  const [addOpen, setAddOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const courseKey = useOptionalStudentActiveCourse()?.activeCourse?.pickerKey
  useResetOnScopeChange(courseKey, useCallback(() => {
    setSearch("")
    setKindFilter("all")
  }, []))

  const range = useMemo(() => {
    const start = startOfMonth(month)
    const end = new Date(month.getFullYear(), month.getMonth() + 3, 0, 23, 59, 59, 999)
    return { startDate: start, endDate: end }
  }, [month])

  const calendarQuery = useStudentCalendar(session, range)
  const personalEvents = calendarQuery.personalEvents
  const classMeetings = calendarQuery.classMeetings as CalendarEvent[]
  const officeHourEvents = calendarQuery.officeHourEvents
  const classSchedule = calendarQuery.classSchedule
  const loading = calendarQuery.isInitialLoading
  const refreshing = calendarQuery.isRefreshing && !calendarQuery.isInitialLoading
  const error = calendarQuery.error instanceof ApiError
    ? calendarQuery.error.message
    : calendarQuery.error
      ? "Failed to load calendar."
      : ""

  useEffect(() => {
    void initClassReminderNotifications()
  }, [])

  const onRefresh = useCallback(async () => {
    await calendarQuery.refetch()
  }, [calendarQuery.refetch])

  useNotificationModuleRefresh(["calendar", "schedule-adjustment", "office-hours"], onRefresh)
  useThrottledFocusRefresh(onRefresh, Boolean(session))

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
    () => [...mergeCalendarEvents(personalEvents, classMeetings), ...officeHourEvents],
    [personalEvents, classMeetings, officeHourEvents],
  )

  const visibleEvents = useMemo(
    () => filterCalendarEventsByKind(filterCalendarEvents(allEvents, search), kindFilter),
    [allEvents, search, kindFilter],
  )
  const searchActive = Boolean(search.trim())

  const monthEvents = useMemo(() => {
    const monthStart = startOfMonth(month)
    const monthEnd = endOfMonth(month)
    return visibleEvents.filter((event) => {
      const t = event.start_time ? new Date(event.start_time).getTime() : 0
      return t >= monthStart.getTime() && t <= monthEnd.getTime()
    })
  }, [visibleEvents, month])

  const dayEvents = useMemo(
    () => eventsForSelectedDay(visibleEvents, selectedDate),
    [visibleEvents, selectedDate],
  )

  const searchResults = useMemo(() => {
    if (!searchActive) return dayEvents
    return [...visibleEvents].sort(
      (a, b) => new Date(a.start_time ?? 0).getTime() - new Date(b.start_time ?? 0).getTime(),
    )
  }, [dayEvents, searchActive, visibleEvents])

  const addActions = useMemo(
    () => [
      {
        id: "event",
        label: "Add personal event",
        detail: "Save a reminder on this course calendar",
        icon: "calendar-outline" as const,
        onPress: () => setEventOpen(true),
      },
      {
        id: "office-hours",
        label: "Request office hours",
        detail: "Ask your instructor for a session",
        icon: "cafe-outline" as const,
        onPress: () => router.push("/module/office-hours" as never),
      },
      {
        id: "project",
        label: "Submit project",
        detail: "Open the project submission form",
        icon: "folder-open-outline" as const,
        onPress: () => router.push("/collaboration/projects/submit" as never),
      },
    ],
    [router],
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

  const openStudySession = useCallback(
    (event: CalendarEvent) => {
      router.push(resolveStudySessionRoute(event) as never)
    },
    [router],
  )

  function renderAgendaPage(filter: AgendaFilter) {
    const selectedEvents = searchActive ? filterDayEvents(searchResults, filter) : filteredByTab[filter]
    if (selectedEvents.length === 0) {
      return (
        <EmptyBlock
          icon={searchActive ? "search-outline" : "calendar-outline"}
          title={searchActive ? "No matching events" : "Nothing scheduled"}
          body={
            searchActive
              ? `Nothing matched “${search.trim()}”. Try a title, type, or location.`
              : filter === "classes"
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
          <AgendaEventRow key={`${event.id}-${event.start_time}`} event={event} onStudy={openStudySession} />
        ))}
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <StudentSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search events, classes, projects…"
        filterActive={kindFilter !== "all"}
        filterLabel="Filter events"
        onOpenFilter={() => setFilterOpen(true)}
        trailingAction={{
          onPress: () => setAddOpen(true),
          accessibilityLabel: "Open calendar actions",
          icon: "add",
        }}
      />
      <StudentFilterSheet
        visible={filterOpen}
        title="Filter events"
        subtitle="Narrow the calendar without clearing search."
        value={kindFilter}
        onSelect={(value) => {
          setKindFilter(value as CalendarEventKindFilter)
          setFilterOpen(false)
        }}
        onClose={() => setFilterOpen(false)}
        options={[
          { value: "all", label: "All types" },
          { value: "classes", label: "Classes" },
          { value: "exams", label: "Exams & quizzes" },
          { value: "office_hours", label: "Office hours" },
          { value: "study", label: "Study sessions" },
          { value: "projects", label: "Projects" },
          { value: "other", label: "Other" },
        ]}
      />
      <ModuleAddActionSheet
        visible={addOpen}
        title="Calendar"
        subtitle="Add something to this course."
        actions={addActions}
        onClose={() => setAddOpen(false)}
      />
      <CalendarPersonalEventSheet
        visible={eventOpen}
        session={session}
        onClose={() => setEventOpen(false)}
        onCreated={() => void onRefresh()}
      />
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
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={tokens.accent} />
        }
      >
        <QueryRefreshBanner visible={calendarQuery.refreshFailed} onRetry={() => void onRefresh()} />
        {error ? (
          <View style={[styles.errorBox, styles.section, { backgroundColor: `${tokens.danger}18` }]}>
            <Text style={[type.destructive, styles.errorText]}>{error}</Text>
          </View>
        ) : null}

        {loading && !refreshing ? (
          <QuerySkeleton />
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
                <Text style={[styles.agendaDate, { color: CALENDAR_COLOR.agendaDate }]}>
                  {searchActive ? "Search results" : selectedDateLabel(selectedDate)}
                </Text>
                <Text style={[type.caption, styles.agendaCount]}>
                  {searchActive
                    ? `${filterDayEvents(searchResults, agendaFilter).length} match${filterDayEvents(searchResults, agendaFilter).length === 1 ? "" : "es"}`
                    : `${filteredByTab[agendaFilter].length} item${filteredByTab[agendaFilter].length === 1 ? "" : "s"}`}
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
  agendaDesc: { lineHeight: 18, marginTop: 2 },
  studyBtn: {
    alignSelf: "flex-start",
    marginTop: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  studyBtnLabel: { fontSize: 13, fontWeight: "700" },
})
