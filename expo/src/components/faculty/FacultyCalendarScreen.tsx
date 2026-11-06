import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons, type IoniconName } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { ApiError } from "../../lib/api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useFacultyCalendar } from "../../hooks/query/useFacultyCalendar"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { QueryRefreshBanner } from "../query/QueryRefreshBanner"
import { QuerySkeleton } from "../query/QuerySkeleton"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { useThrottledFocusRefresh } from "../../lib/use-throttled-focus-refresh"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FacultyFilterSheet, FacultyModuleStickyHeader, FacultySearchToolbar, useFacultyStickyHeaderScrollLayout } from "./faculty-module-shell"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { FacultyListPagerFooter } from "./FacultyListPagerFooter"
import { ModuleAddActionSheet } from "../modules/ModuleAddActionSheet"
import { useResetOnScopeChange } from "../../hooks/use-reset-on-scope-change"
import { FacultyAdminCourseGate } from "./faculty-admin-ui"
import { FacultyEmptyState, FacultyStatusPill } from "./faculty-shared"
import { CalendarMonthGrid, selectedDateLabel } from "../course-info/CalendarMonthGrid"
import { MobbinPillSegmentControl } from "../theme/MobbinPillSegmentControl"
import {
  addMonths,
  CALENDAR_COLOR,
  getFacultyCalendarPrefs,
  saveFacultyCalendarPrefs,
  startOfMonth,
  type CalendarEvent,
  type FacultyCalendarPrefs,
} from "../../lib/calendar"
import {
  filterInstructorCalendarEvents,
  formatInstructorEventRange,
  instructorEventCourseLabel,
  instructorEventKindLabel,
  instructorEventNumericId,
  instructorEventShortLabel,
  mergeInstructorCalendarAnnouncements,
  parseInstructorWallClock,
  toLocalWallClockIso,
  type InstructorCalendarEvent,
  type InstructorCalendarView,
} from "../../lib/instructor-calendar"
import { useFacultyAnnouncements } from "../../hooks/query/useFacultyAnnouncements"
import { NATIVE } from "../../constants/faculty-native-theme"

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function toGridEvent(event: InstructorCalendarEvent): CalendarEvent {
  const start = parseInstructorWallClock(event.startTime)
  const end = parseInstructorWallClock(event.endTime)
  return {
    id: instructorEventNumericId(event.id),
    title: event.title,
    description: event.description,
    event_type:
      event.eventType === "class_meeting"
        ? "class_meeting"
        : event.eventType === "announcement"
          ? "exam"
          : "office_hours",
    start_time: toLocalWallClockIso(start),
    end_time: toLocalWallClockIso(end),
    location: event.location || null,
    color: event.color,
    isClassMeeting: event.eventType === "class_meeting",
  }
}

function eventIcon(event: InstructorCalendarEvent): IoniconName {
  if (event.eventType === "announcement") return "megaphone-outline"
  if (event.eventType === "regular_office_hours") return "time-outline"
  if (event.eventType === "booked_office_hours") return "people-outline"
  if (event.meetingType === "laboratory") return "layers-outline"
  if (event.meetingType === "structured") return "sparkles-outline"
  if (event.meetingType === "instructor_led") return "easel-outline"
  return "school-outline"
}

function eventAccent(event: InstructorCalendarEvent, fallback: string) {
  return event.pendingScheduleChange ? "#d97706" : event.color || fallback
}

function eventsForDay(events: InstructorCalendarEvent[], date: Date) {
  return events
    .filter((event) => sameDay(parseInstructorWallClock(event.startTime), date))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

function AgendaRow({
  event,
  accent,
  onPress,
}: {
  event: InstructorCalendarEvent
  accent: string
  onPress: () => void
}) {
  const { native, type } = useModuleTheme()
  const color = eventAccent(event, accent)
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.agendaRow,
        { borderBottomColor: native.separator, opacity: pressed ? 0.82 : 1 },
      ]}
    >
      <View style={[styles.agendaStripe, { backgroundColor: color }]} />
      <View style={styles.agendaBody}>
        <View style={styles.agendaTop}>
          <Ionicons name={eventIcon(event)} size={16} color={color} />
          <Text style={[type.bodyEmphasis, styles.agendaTitle]} numberOfLines={1}>
            {instructorEventShortLabel(event)}
          </Text>
          {event.pendingScheduleChange ? <FacultyStatusPill label="Pending" tone="warning" /> : null}
        </View>
        <Text style={type.caption}>
          {formatInstructorEventRange(event.startTime, event.endTime)}
          {event.location ? ` · ${event.location}` : ""}
        </Text>
        <Text style={type.secondary} numberOfLines={1}>
          {instructorEventCourseLabel(event) ? `${instructorEventCourseLabel(event)} · ` : ""}
          {instructorEventKindLabel(event)}
          {event.studentName ? ` · ${event.studentName}` : ""}
        </Text>
      </View>
    </Pressable>
  )
}

function FacultyCalendarContent() {
  const router = useRouter()
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>()
  const { scope, ready, course } = useFacultyScope()
  const { courses } = useFacultyShell()
  const { styles: moduleStyles, native, type, tokens } = useModuleTheme()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout({ extraBottom: 24 })
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [search, setSearch] = useState("")
  const [kindFilter, setKindFilter] = useState("all")
  const [addOpen, setAddOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  useResetOnScopeChange(course?.id, useCallback(() => {
    setSearch("")
    setKindFilter("all")
  }, []))
  const [viewing, setViewing] = useState<InstructorCalendarEvent | null>(null)
  const [prefsReady, setPrefsReady] = useState(false)
  const [prefs, setPrefs] = useState<FacultyCalendarPrefs>({
    enabled: true,
    calendarView: "all",
    notifyBefore: true,
    notifyAtStart: true,
  })

  const calendarView: InstructorCalendarView = prefs.calendarView
  const showScopeToggle = courses.length > 1

  const range = useMemo(() => {
    const start = startOfMonth(month)
    const end = new Date(month.getFullYear(), month.getMonth() + 3, 0, 23, 59, 59, 999)
    return { startDate: start, endDate: end }
  }, [month])

  const calendarQuery = useFacultyCalendar(ready && prefsReady ? scope : null, range, calendarView)
  const announcementsQuery = useFacultyAnnouncements(ready ? scope : null)
  const events = useMemo(
    () => mergeInstructorCalendarAnnouncements(calendarQuery.events, announcementsQuery.announcements),
    [announcementsQuery.announcements, calendarQuery.events],
  )
  const loading = calendarQuery.isInitialLoading
  const refreshing = calendarQuery.isRefreshing && !calendarQuery.isInitialLoading
  const error = calendarQuery.error instanceof ApiError
    ? calendarQuery.error.message
    : calendarQuery.error
      ? "Failed to load calendar."
      : ""

  const onRefresh = useCallback(async () => {
    await Promise.all([calendarQuery.refetch(), announcementsQuery.refetch()])
  }, [announcementsQuery.refetch, calendarQuery.refetch])

  useNotificationModuleRefresh(["calendar", "schedule-adjustment", "office-hours"], onRefresh)
  useThrottledFocusRefresh(onRefresh, ready)

  useEffect(() => {
    void getFacultyCalendarPrefs().then((next) => {
      setPrefs(next)
      setPrefsReady(true)
    })
  }, [])

  useEffect(() => {
    const raw = typeof dateParam === "string" ? dateParam.slice(0, 10) : ""
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return
    const focused = new Date(`${raw}T12:00:00`)
    if (Number.isNaN(focused.getTime())) return
    setMonth(startOfMonth(focused))
    setSelectedDate(focused)
  }, [dateParam])

  async function changeCalendarView(view: InstructorCalendarView) {
    const next = { ...prefs, calendarView: view }
    setPrefs(next)
    await saveFacultyCalendarPrefs(next)
  }

  function openCourseSettings() {
    setViewing(null)
    router.push({ pathname: "/module/course-settings", params: { from: "calendar" } } as never)
  }

  const visibleEvents = useMemo(() => {
    const searched = filterInstructorCalendarEvents(events, search)
    if (kindFilter === "all") return searched
    if (kindFilter === "office") {
      return searched.filter((event) => String(event.eventType).includes("office"))
    }
    return searched.filter((event) => event.eventType === kindFilter)
  }, [events, search, kindFilter])
  const searchActive = Boolean(search.trim())
  const gridEvents = useMemo(() => visibleEvents.map(toGridEvent), [visibleEvents])
  const dayEvents = useMemo(() => eventsForDay(visibleEvents, selectedDate), [visibleEvents, selectedDate])
  const searchResults = useMemo(() => {
    if (!searchActive) return dayEvents
    return [...visibleEvents].sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [dayEvents, searchActive, visibleEvents])
  const upcoming = useMemo(() => {
    const now = new Date()
    return visibleEvents
      .filter((event) => parseInstructorWallClock(event.startTime) > now)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [visibleEvents])

  const agendaPager = useFacultyListPager(
    searchResults,
    `${search}:${kindFilter}:${calendarView}:${selectedDate.toDateString()}`,
    "events",
  )
  const upcomingPager = useFacultyListPager(upcoming, `${search}:${kindFilter}:${calendarView}`, "events")
  const primaryAdjustment = calendarQuery.openAdjustments[0] ?? null
  const isTodaySelected = sameDay(selectedDate, new Date())

  function goToday() {
    const today = new Date()
    setMonth(startOfMonth(today))
    setSelectedDate(today)
  }

  function openAdjustment(id?: number | null) {
    const params: Record<string, string> = { from: "calendar" }
    if (id != null && id > 0) params.requestId = String(id)
    router.push({ pathname: "/module/schedule-adjustment", params } as never)
  }

  function openEvent(event: InstructorCalendarEvent) {
    setViewing(event)
  }

  return (
    <View style={[moduleStyles.root, { backgroundColor: native.groupedBackground }]}>
      <FacultySearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search classes, office hours, announcements…"
        filterActive={kindFilter !== "all"}
        filterLabel="Filter calendar"
        onOpenFilter={() => setFilterOpen(true)}
        trailingAction={{
          onPress: () => setAddOpen(true),
          accessibilityLabel: "Open calendar actions",
          icon: "add",
        }}
      />
      <FacultyFilterSheet
        visible={filterOpen}
        title="Filter events"
        value={kindFilter}
        onSelect={(value) => {
          setKindFilter(value)
          setFilterOpen(false)
        }}
        onClose={() => setFilterOpen(false)}
        options={[
          { value: "all", label: "All types" },
          { value: "class_meeting", label: "Classes" },
          { value: "announcement", label: "Announcements" },
          { value: "office", label: "Office hours" },
        ]}
      />
      <ModuleAddActionSheet
        visible={addOpen}
        title="Calendar"
        subtitle="Create something for the active course."
        onClose={() => setAddOpen(false)}
        actions={[
          {
            id: "announcement",
            label: "New announcement",
            detail: "Exam or alert with an optional calendar date",
            icon: "megaphone-outline",
            onPress: () => router.push("/module/announcements" as never),
          },
          {
            id: "office-hours",
            label: "Office hours",
            detail: "Create a request or edit regular hours",
            icon: "time-outline",
            onPress: () => router.push("/module/office-hours" as never),
          },
          {
            id: "schedule",
            label: "Schedule adjustment",
            detail: "Propose a class time change",
            icon: "swap-horizontal-outline",
            onPress: () => openAdjustment(),
          },
        ]}
      />
      <FacultyModuleStickyHeader>
        <View style={styles.headerRow}>
          {showScopeToggle ? (
            <View style={styles.headerTabs}>
              <MobbinPillSegmentControl
                options={[
                  { id: "all", label: "All courses" },
                  { id: "selected", label: course?.session_code || course?.course_code || "This course" },
                ]}
                value={calendarView}
                onChange={(value) => void changeCalendarView(value)}
              />
            </View>
          ) : (
            <Text style={[type.bodyEmphasis, styles.headerTitle]}>Calendar</Text>
          )}
          <Pressable
            onPress={openCourseSettings}
            style={styles.bellBtn}
            testID="calendar-alerts-button"
            accessibilityLabel="Calendar alerts"
          >
            <Ionicons name="notifications-outline" size={20} color={CALENDAR_COLOR.accent} />
          </Pressable>
        </View>
      </FacultyModuleStickyHeader>
      <ScrollView
        style={moduleStyles.scroll}
        contentContainerStyle={[styles.scrollContent, listScrollPad]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={tokens.accent} />
        }
      >
        <QueryRefreshBanner visible={calendarQuery.refreshFailed} onRetry={() => void onRefresh()} />
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: `${tokens.danger}18` }]}>
            <Text style={[type.destructive, styles.errorText]}>{error}</Text>
          </View>
        ) : null}

        {loading && !refreshing ? (
          <QuerySkeleton />
        ) : (
          <>
            {calendarView === "selected" && calendarQuery.scheduleText ? (
              <View style={[styles.card, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
                <Text style={[type.caption, styles.kicker]}>Class times</Text>
                <Text style={type.bodyEmphasis}>{calendarQuery.scheduleText}</Text>
                {calendarQuery.location ? <Text style={type.caption}>{calendarQuery.location}</Text> : null}
              </View>
            ) : null}

            {primaryAdjustment ? (
              <Pressable
                onPress={() => openAdjustment(primaryAdjustment.id)}
                style={[styles.banner, { backgroundColor: CALENDAR_COLOR.accentSoft, borderColor: CALENDAR_COLOR.accentBorder }]}
              >
                <Ionicons name="swap-horizontal-outline" size={18} color={CALENDAR_COLOR.accent} />
                <View style={styles.bannerCopy}>
                  <Text style={[type.bodyEmphasis, { color: CALENDAR_COLOR.accent }]}>
                    Schedule adjustment is open
                    {primaryAdjustment.sessionCode || primaryAdjustment.courseCode
                      ? ` · ${primaryAdjustment.sessionCode || primaryAdjustment.courseCode}`
                      : ""}
                  </Text>
                  <Text style={type.caption} numberOfLines={3}>
                    {primaryAdjustment.reason || "A class-time change is in progress."}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={CALENDAR_COLOR.accent} />
              </Pressable>
            ) : null}

            <CalendarMonthGrid
              month={month}
              events={gridEvents}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onPrevMonth={() => setMonth((prev) => addMonths(prev, -1))}
              onNextMonth={() => setMonth((prev) => addMonths(prev, 1))}
              onToday={goToday}
            />

            <View style={styles.agendaHead}>
              <Text style={[styles.agendaDate, { color: CALENDAR_COLOR.agendaDate }]}>
                {searchActive ? "Search results" : selectedDateLabel(selectedDate)}
              </Text>
              <Text style={[type.caption, styles.agendaCount]}>
                {agendaPager.label}
              </Text>
            </View>

            {searchResults.length === 0 ? (
              <FacultyEmptyState
                icon={searchActive ? "search-outline" : "calendar-outline"}
                title={searchActive ? "No matching events" : "Nothing scheduled"}
                body={
                  searchActive
                    ? `Nothing matched “${search.trim()}”. Try a title, course, student, or location.`
                    : "No class meetings or office hours on this day."
                }
              />
            ) : (
              <View style={[styles.agendaCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
                {agendaPager.items.map((event) => (
                  <AgendaRow
                    key={event.id}
                    event={event}
                    accent={tokens.accent}
                    onPress={() => openEvent(event)}
                  />
                ))}
                <FacultyListPagerFooter pager={agendaPager} />
              </View>
            )}

            {!searchActive && isTodaySelected && upcoming.length > 0 ? (
              <View style={[styles.card, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
                <View style={styles.upcomingHead}>
                  <Text style={[type.caption, styles.kicker]}>Coming up</Text>
                  <Text style={type.caption}>{upcomingPager.label}</Text>
                </View>
                {upcomingPager.items.map((event) => (
                  <AgendaRow
                    key={`up-${event.id}`}
                    event={event}
                    accent={tokens.accent}
                    onPress={() => openEvent(event)}
                  />
                ))}
                <FacultyListPagerFooter pager={upcomingPager} />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <Modal visible={viewing != null} animationType="slide" transparent onRequestClose={() => setViewing(null)}>
        <Pressable style={styles.modalScrim} onPress={() => setViewing(null)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: native.secondaryGrouped }]}
            onPress={(event) => event.stopPropagation()}
          >
            {viewing ? (
              <>
                <View style={styles.sheetHandle} />
                <Text style={type.sheetTitle}>{instructorEventKindLabel(viewing)}</Text>
                {instructorEventCourseLabel(viewing) ? (
                  <Text style={type.bodyEmphasis}>{instructorEventCourseLabel(viewing)}</Text>
                ) : null}
                <Text style={type.caption}>
                  {formatInstructorEventRange(viewing.startTime, viewing.endTime)}
                </Text>
                {viewing.location ? <Text style={type.body}>{viewing.location}</Text> : null}
                {viewing.studentName ? <Text style={type.body}>With {viewing.studentName}</Text> : null}
                {viewing.topic ? <Text style={type.secondary}>{viewing.topic}</Text> : null}
                {viewing.pendingScheduleChange ? (
                  <Text style={type.secondary}>This time may change after the class votes.</Text>
                ) : null}
                <View style={styles.sheetActions}>
                  {viewing.eventType === "announcement" ? (
                    <Pressable
                      style={[styles.sheetCta, { backgroundColor: CALENDAR_COLOR.accent }]}
                      onPress={() => {
                        setViewing(null)
                        router.push((viewing.href ?? "/module/announcements") as never)
                      }}
                    >
                      <Text style={styles.sheetCtaLabel}>Open announcement</Text>
                    </Pressable>
                  ) : viewing.scheduleAdjustmentId || viewing.pendingScheduleChange ? (
                    <Pressable
                      style={[styles.sheetCta, { backgroundColor: CALENDAR_COLOR.accent }]}
                      onPress={() => {
                        const id = viewing.scheduleAdjustmentId
                        setViewing(null)
                        openAdjustment(id)
                      }}
                    >
                      <Text style={styles.sheetCtaLabel}>Adjust schedule</Text>
                    </Pressable>
                  ) : viewing.eventType !== "class_meeting" ? (
                    <Pressable
                      style={[styles.sheetCta, { backgroundColor: CALENDAR_COLOR.accent }]}
                      onPress={() => {
                        setViewing(null)
                        router.push("/module/office-hours" as never)
                      }}
                    >
                      <Text style={styles.sheetCtaLabel}>Office hours</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.sheetCta, { backgroundColor: CALENDAR_COLOR.accent }]}
                      onPress={openCourseSettings}
                    >
                      <Text style={styles.sheetCtaLabel}>Calendar alerts</Text>
                    </Pressable>
                  )}
                  {viewing.eventType === "class_meeting" &&
                  (viewing.scheduleAdjustmentId || viewing.pendingScheduleChange) ? (
                    <Pressable style={styles.sheetClose} onPress={openCourseSettings}>
                      <Text style={type.bodyEmphasis}>Calendar alerts</Text>
                    </Pressable>
                  ) : null}
                  <Pressable style={styles.sheetClose} onPress={() => setViewing(null)}>
                    <Text style={type.bodyEmphasis}>Close</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

export function FacultyCalendarScreen() {
  return (
    <FacultyAdminCourseGate>
      <FacultyCalendarContent />
    </FacultyAdminCourseGate>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 12,
    flexGrow: 1,
    paddingHorizontal: NATIVE.pagePadding,
  },
  errorBox: { padding: 12, borderRadius: NATIVE.sectionRadius },
  errorText: { fontSize: 14, lineHeight: 20 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    padding: 14,
    gap: 8,
  },
  kicker: { fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  headerTabs: { flex: 1, minWidth: 0 },
  headerTitle: { flex: 1, paddingHorizontal: 16, paddingVertical: 10 },
  bellBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  bannerCopy: { flex: 1, gap: 2 },
  agendaHead: { gap: 2, paddingHorizontal: 4 },
  agendaDate: { fontSize: 16, fontWeight: "600" },
  agendaCount: { fontWeight: "600" },
  agendaCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  agendaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  agendaStripe: { width: 4, alignSelf: "stretch", borderRadius: 999 },
  agendaBody: { flex: 1, gap: 3 },
  agendaTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  agendaTitle: { flex: 1 },
  upcomingHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalScrim: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,0.35)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 8,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.8)",
    marginBottom: 8,
  },
  sheetActions: { gap: 10, marginTop: 8 },
  sheetCta: { borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  sheetCtaLabel: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  sheetClose: { alignItems: "center", paddingVertical: 8 },
})
