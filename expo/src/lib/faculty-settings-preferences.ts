import * as SecureStore from "expo-secure-store"

export type FacultyNotificationPrefs = {
  submissionAlerts: boolean
  officeHoursAlerts: boolean
  classroomPointsAlerts: boolean
  studentMessageAlerts: boolean
}

const PREFS_KEY = "course-collab.faculty-notification-prefs"

export const DEFAULT_FACULTY_NOTIFICATION_PREFS: FacultyNotificationPrefs = {
  submissionAlerts: true,
  officeHoursAlerts: true,
  classroomPointsAlerts: true,
  studentMessageAlerts: true,
}

export async function getFacultyNotificationPrefs(): Promise<FacultyNotificationPrefs> {
  try {
    const raw = await SecureStore.getItemAsync(PREFS_KEY)
    if (!raw) return DEFAULT_FACULTY_NOTIFICATION_PREFS
    const parsed = JSON.parse(raw) as Partial<FacultyNotificationPrefs>
    return {
      submissionAlerts: parsed.submissionAlerts ?? DEFAULT_FACULTY_NOTIFICATION_PREFS.submissionAlerts,
      officeHoursAlerts: parsed.officeHoursAlerts ?? DEFAULT_FACULTY_NOTIFICATION_PREFS.officeHoursAlerts,
      classroomPointsAlerts:
        parsed.classroomPointsAlerts ?? DEFAULT_FACULTY_NOTIFICATION_PREFS.classroomPointsAlerts,
      studentMessageAlerts:
        parsed.studentMessageAlerts ?? DEFAULT_FACULTY_NOTIFICATION_PREFS.studentMessageAlerts,
    }
  } catch {
    return DEFAULT_FACULTY_NOTIFICATION_PREFS
  }
}

export async function saveFacultyNotificationPrefs(prefs: FacultyNotificationPrefs): Promise<void> {
  await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(prefs))
}
