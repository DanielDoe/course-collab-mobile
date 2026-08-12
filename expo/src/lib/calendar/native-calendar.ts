import { requireOptionalNativeModule } from "expo-modules-core"
import { Platform, Share } from "react-native"
import { buildClassScheduleEvent, buildClassScheduleIcs } from "./class-schedule-export"
import { getSavedNativeCalendarEventId, saveNativeCalendarEventId } from "./reminder-preferences"
import type { ClassScheduleContext, ParsedClassSchedule } from "./types"

function getNativeCalendarModule() {
  return requireOptionalNativeModule("ExpoCalendar")
}

const DAY_CODE_TO_EXPO: Record<string, number> = {
  SU: 1,
  MO: 2,
  TU: 3,
  WE: 4,
  TH: 5,
  FR: 6,
  SA: 7}

export type NativeCalendarResult =
  | { ok: true; eventId: string; alreadyAdded: boolean; method: "native" | "ics" }
  | { ok: false; reason: "permission_denied" | "no_calendar" | "unsupported" | "error"; message: string }

export function nativeCalendarButtonLabel(): string {
  return Platform.OS === "ios" ? "Add to Apple Calendar" : "Add to Calendar"
}

export function isNativeCalendarAvailable(): boolean {
  return Platform.OS !== "web" && getNativeCalendarModule() != null
}

async function loadCalendarApi() {
  if (!getNativeCalendarModule()) return null
  try {
    return await import("expo-calendar")
  } catch {
    return null
  }
}

async function writeIcsToCache(filename: string, ics: string): Promise<string | null> {
  try {
    const { cacheDirectory, writeAsStringAsync } = await import("expo-file-system/legacy")
    if (!cacheDirectory) return null
    const uri = `${cacheDirectory}${filename}`
    await writeAsStringAsync(uri, ics, { encoding: "utf8" })
    return uri
  } catch {
    return null
  }
}

async function addViaIcsShare(
  schedule: ParsedClassSchedule,
  context: ClassScheduleContext,
): Promise<NativeCalendarResult> {
  const ics = buildClassScheduleIcs(schedule, context)
  if (!ics) {
    return { ok: false, reason: "error", message: "Could not build calendar file for this schedule." }
  }

  const filename = `${context.courseTitle.replace(/[^\w.-]+/g, "-")}-class-schedule.ics`

  try {
    const uri = await writeIcsToCache(filename, ics)
    if (!uri) {
      return { ok: false, reason: "error", message: "Could not save calendar file on this device." }
    }
    await Share.share({
      url: uri,
      title: "Add class schedule to Calendar",
      message: Platform.OS === "ios" ? undefined : "Add this class schedule to your calendar"})
    await saveNativeCalendarEventId(schedule.raw, context.courseTitle, `ics:${filename}`)
    return { ok: true, eventId: `ics:${filename}`, alreadyAdded: false, method: "ics" }
  } catch (err) {
    return {
      ok: false,
      reason: "error",
      message: err instanceof Error ? err.message : "Could not open calendar export."}
  }
}

async function addViaNativeModule(
  schedule: ParsedClassSchedule,
  context: ClassScheduleContext,
): Promise<NativeCalendarResult> {
  const Calendar = await loadCalendarApi()
  if (!Calendar) {
    return addViaIcsShare(schedule, context)
  }

  const current = await Calendar.getCalendarPermissionsAsync()
  if (current.status !== "granted") {
    const requested = await Calendar.requestCalendarPermissionsAsync()
    if (requested.status !== "granted") {
      return {
        ok: false,
        reason: "permission_denied",
        message: "Calendar access is required to add your class schedule."}
    }
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)
  const writable = calendars.filter((c) => c.allowsModifications)
  const calendarId =
    (Platform.OS === "ios"
      ? writable.find((c) => c.source?.name === "Default" || c.source?.type === "local")?.id
      : undefined) ?? writable[0]?.id

  if (!calendarId) {
    return { ok: false, reason: "no_calendar", message: "No writable calendar found on this device." }
  }

  const existingId = await getSavedNativeCalendarEventId(schedule.raw, context.courseTitle)
  if (existingId && !existingId.startsWith("ics:")) {
    try {
      const event = await Calendar.getEventAsync(existingId)
      if (event) {
        return { ok: true, eventId: existingId, alreadyAdded: true, method: "native" }
      }
    } catch {
      // recreate below
    }
  }

  const eventMeta = buildClassScheduleEvent(schedule, context)
  const daysOfTheWeek = schedule.dayCodes
    .map((code) => DAY_CODE_TO_EXPO[code])
    .filter(Boolean)
    .map((dayOfTheWeek) => ({ dayOfTheWeek }))

  try {
    const eventId = await Calendar.createEventAsync(calendarId, {
      title: eventMeta.title,
      location: eventMeta.location || undefined,
      notes: eventMeta.description,
      startDate: eventMeta.start,
      endDate: eventMeta.end,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      recurrenceRule: {
        frequency: Calendar.Frequency.WEEKLY,
        interval: 1,
        daysOfTheWeek,
        endDate: eventMeta.until}})

    await saveNativeCalendarEventId(schedule.raw, context.courseTitle, eventId)
    return { ok: true, eventId, alreadyAdded: false, method: "native" }
  } catch (err) {
    return addViaIcsShare(schedule, context)
  }
}

export async function addClassScheduleToNativeCalendar(
  schedule: ParsedClassSchedule,
  context: ClassScheduleContext,
): Promise<NativeCalendarResult> {
  if (Platform.OS === "web") {
    return { ok: false, reason: "unsupported", message: "Use the web calendar export on desktop." }
  }

  if (!getNativeCalendarModule()) {
    return addViaIcsShare(schedule, context)
  }

  return addViaNativeModule(schedule, context)
}
