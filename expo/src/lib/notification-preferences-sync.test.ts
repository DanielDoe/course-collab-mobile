import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  applyMobilePushPrefsToServer,
  mergeNotificationPrefs,
  mobilePushPrefsFromServer,
} from "./notification-preferences-sync"

describe("notification-preferences-sync", () => {
  it("reads quiz reminders off when any assessment push pref is false", () => {
    assert.deepEqual(
      mobilePushPrefsFromServer({
        quiz_reminders: true,
        deadline_alerts: false,
        homework_alerts: true,
        exam_alerts: true,
        announcement_alerts: true,
      }),
      { quizReminders: false, announcementAlerts: true },
    )
  })

  it("writes mobile quiz toggle to all assessment push columns", () => {
    const next = applyMobilePushPrefsToServer(
      { forum_replies: true, lecture_updates: false },
      { quizReminders: false, announcementAlerts: true },
    )
    assert.equal(next.quiz_reminders, false)
    assert.equal(next.deadline_alerts, false)
    assert.equal(next.homework_alerts, false)
    assert.equal(next.exam_alerts, false)
    assert.equal(next.announcement_alerts, true)
    assert.equal(next.forum_replies, true)
    assert.equal(next.lecture_updates, false)
  })

  it("merges server push prefs over local cached values", () => {
    assert.deepEqual(
      mergeNotificationPrefs(
        {
          quizReminders: true,
          announcementAlerts: true,
          classReminders: true,
          classReminderMinutes: 30,
        },
        { quiz_reminders: false, deadline_alerts: false, homework_alerts: false, exam_alerts: false, announcement_alerts: false },
      ),
      {
        quizReminders: false,
        announcementAlerts: false,
        classReminders: true,
        classReminderMinutes: 30,
      },
    )
  })
})
