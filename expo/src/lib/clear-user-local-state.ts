import { resetAppBootstrapState } from "./post-login-bootstrap"
import { clearCachedMembershipTier } from "./membership-tier-cache"
import { clearCachedFacultyMembershipTier } from "./faculty-membership-tier-cache"
import { clearStudentHttpCookies } from "./student-http-cookies"
import { clearGuestCoraConversations } from "./guest-cora-storage"
import { clearStudentCoraContext } from "./student-cora-context-store"
import { clearFacultyCoraContextMemory, clearFacultyCoraInstructorContext } from "./faculty-cora-context-store"
import { clearFacultyCoraPending } from "./faculty-cora-pending"
import { clearCoraActivity } from "./cora/activity-store"
import { clearPlaygroundSessionLock, clearLastPlaygroundClassroomSession } from "./playground-session-lock"
import * as SecureStore from "./secure-store-client"
import { clearStoredPushToken } from "./notifications/notification-service"
import { unregisterPushTokenForSession } from "./notifications/push-registration"
import { clearStoredFacultyCourseId, getStoredFacultyCourseId } from "./faculty-course-storage"
import { setStoredDrawerExpandedGroup } from "./drawer-nav-memory"
import { setStoredFacultyDrawerExpandedGroup } from "./faculty-drawer-memory"
import { clearNotificationInboxPrefs } from "./notification-inbox-prefs"
import type { AppSession } from "./session"

async function settle(task: Promise<unknown>): Promise<void> {
  try {
    await task
  } catch {
    /* best-effort local cleanup */
  }
}

function sessionKey(session: AppSession): string {
  return `${session.portal}:${session.portal === "faculty" || session.portal === "admin" ? session.id : session.databaseId}`
}

/**
 * Clears user-specific local state on logout, account switch, and account deletion.
 * Keeps remembered login identifiers and MFA device trust (login convenience, not academic data).
 */
export async function clearUserLocalState(session: AppSession | null): Promise<void> {
  resetAppBootstrapState()

  const tasks: Promise<unknown>[] = [
    clearStudentHttpCookies(),
    clearGuestCoraConversations(),
    clearCoraActivity(),
    clearPlaygroundSessionLock(),
    clearLastPlaygroundClassroomSession(),
    SecureStore.deleteItemAsync("guest_checkout_pending_v1"),
  ]
  clearFacultyCoraContextMemory()

  if (session) {
    tasks.push(unregisterPushTokenForSession(sessionKey(session)))

    if (session.portal === "student") {
      tasks.push(clearCachedMembershipTier(session.databaseId))
      tasks.push(clearStudentCoraContext(session.databaseId))
      tasks.push(setStoredDrawerExpandedGroup(session.databaseId, null))
      tasks.push(clearNotificationInboxPrefs("student", session.databaseId))
    } else if (session.portal === "guest" || session.portal === "summer") {
      tasks.push(clearCachedMembershipTier(session.databaseId))
      tasks.push(clearStudentCoraContext(session.databaseId))
    } else if (session.portal === "faculty") {
      tasks.push(clearCachedFacultyMembershipTier(session.id))
      tasks.push(setStoredFacultyDrawerExpandedGroup(session.id, null))
      tasks.push(clearNotificationInboxPrefs("faculty", session.id))
      tasks.push(
        getStoredFacultyCourseId(session.id).then(async (courseId) => {
          if (courseId != null) {
            await clearFacultyCoraInstructorContext(session.id, courseId)
            await clearFacultyCoraPending(session.id, courseId)
          }
          await clearStoredFacultyCourseId(session.id)
        }),
      )
    }
  }

  await Promise.all(tasks.map(settle))
  await settle(clearStoredPushToken())
}
