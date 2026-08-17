/** Human-readable labels for TA permission keys (matches backend ta-permissions.ts). */

export const TA_PERMISSION_LABELS: Record<string, string> = {
  canPublishAnnouncements: "Publish Announcements",
  canEditQuizzes: "Edit Quizzes",
  canEditHomework: "Edit Homework",
  canPublishQuizzes: "Publish Quizzes",
  canPublishHomework: "Publish Homework",
  canPublishClassroomPoints: "Publish Classroom Points",
  canGradeAssignments: "Grade Assignments",
  canGradeExams: "Grade Exams",
  canManageGroups: "Manage Groups",
  canManageAttendance: "Manage Attendance",
  canHoldOfficeHours: "Hold Office Hours",
  canViewAnalytics: "View Analytics",
  canManagePracticeContent: "Manage Practice Content",
  canDraftAnnouncements: "Draft Announcements",
  canTakeAttendance: "Take Attendance",
  canModerateDiscussions: "Moderate Discussions",
  canViewAssessments: "View Assessments",
  canManageLectures: "Manage Lectures",
  canManagePlayground: "Manage Playground",
  canManageProjects: "Manage Projects",
  canManageClassroomPoints: "Manage Classroom Points",
  canManageSyllabus: "Manage Syllabus",
}

export const TA_PERMISSION_GROUPS: Array<{ title: string; keys: string[] }> = [
  {
    title: "Publishing",
    keys: [
      "canPublishAnnouncements",
      "canPublishQuizzes",
      "canPublishHomework",
      "canPublishClassroomPoints",
    ],
  },
  {
    title: "Grading & Review",
    keys: ["canGradeAssignments", "canGradeExams", "canViewAssessments", "canViewAnalytics"],
  },
  {
    title: "Course Content",
    keys: [
      "canEditQuizzes",
      "canEditHomework",
      "canDraftAnnouncements",
      "canManageLectures",
      "canManageSyllabus",
      "canManagePracticeContent",
      "canManagePlayground",
    ],
  },
  {
    title: "Students & Operations",
    keys: [
      "canManageGroups",
      "canManageProjects",
      "canManageAttendance",
      "canTakeAttendance",
      "canManageClassroomPoints",
      "canHoldOfficeHours",
      "canModerateDiscussions",
    ],
  },
]

export function formatTaPermissionLabel(key: string): string {
  return (
    TA_PERMISSION_LABELS[key] ??
    key
      .replace(/^can/, "")
      .replace(/([A-Z])/g, " $1")
      .trim()
  )
}
