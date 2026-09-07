import type { Ionicons } from "@expo/vector-icons"

export type FacultyModuleMeta = {
  id: string
  title: string
  summary: string
  icon: keyof typeof Ionicons.glyphMap
  features: string[]
}

export const FACULTY_MODULE_META: Record<string, FacultyModuleMeta> = {
  syllabus: {
    id: "syllabus",
    title: "Syllabus",
    summary: "Edit course syllabus, policies, and schedule for students.",
    icon: "document-text-outline",
    features: ["Rich syllabus editor", "Policy sections", "Weekly schedule"]},
  lectures: {
    id: "lectures",
    title: "Manage Lectures",
    summary: "Organize weekly lectures, materials, and in-class resources.",
    icon: "easel-outline",
    features: ["Lecture weeks", "Slides & attachments", "Sample practice links"]},
  "course-notes": {
    id: "course-notes",
    title: "Course Notes",
    summary: "Publish typed course notes for students by topic and section.",
    icon: "reader-outline",
    features: ["All notes", "Topic availability", "Soft delete & restore"]},
  "course-exchange": {
    id: "course-exchange",
    title: "Course Exchange",
    summary: "Discover, request, import, and share teaching modules across courses.",
    icon: "repeat-outline",
    features: ["Discover courses", "Request & approve", "Import copies", "Share settings"],
  },
  "academic-terms": {
    id: "academic-terms",
    title: "Academic Terms",
    summary: "Manage terms, sections, and which term students can sign into.",
    icon: "calendar-outline",
    features: ["Term list", "Set active term", "Section roster"]},
  calendar: {
    id: "calendar",
    title: "Calendar",
    summary: "Class meetings, office hours, and open schedule adjustments for this course.",
    icon: "calendar-number-outline",
    features: ["Month view", "Upcoming sessions", "Schedule adjustment banner"]},
  announcements: {
    id: "announcements",
    title: "Announcements",
    summary: "Publish course announcements students see in their feed.",
    icon: "megaphone-outline",
    features: ["Compose & publish", "Pin to top", "AI summary preview"]},
  flashcards: {
    id: "flashcards",
    title: "Flashcards",
    summary: "Manage course flashcard decks, topics, and question-bank generation.",
    icon: "layers-outline",
    features: ["Deck editor", "Topic toggles", "Generate from bank"]},
  practice: {
    id: "practice",
    title: "Manage Practice",
    summary: "Configure topic availability, daily limits, and practice analytics.",
    icon: "bulb-outline",
    features: ["Topic availability", "Daily limits", "Practice analytics"]},
  groups: {
    id: "groups",
    title: "Manage Groups",
    summary: "Create and manage student collaboration groups.",
    icon: "people-circle-outline",
    features: ["Group rosters", "Approve queue", "Section filters"]},
  projects: {
    id: "projects",
    title: "Manage Projects",
    summary: "Team projects, deliverables, and collaboration workflows.",
    icon: "folder-open-outline",
    features: ["Approval queue", "Scoring & board", "Presentation slots"]},
  "summer-camp": {
    id: "summer-camp",
    title: "Summer Camp",
    summary: "Programs, training tracks, campers, and the request inbox.",
    icon: "sunny-outline",
    features: ["Programs & tracks", "Camper accounts", "Request inbox"]},
  "question-bank": {
    id: "question-bank",
    title: "Question Bank",
    summary: "Browse, edit, and import questions for assessments.",
    icon: "library-outline",
    features: ["Topic organization", "Import/export", "Preview & edit"]},
  "deleted-quizzes": {
    id: "deleted-quizzes",
    title: "Deleted Assessments",
    summary: "Restore quizzes and exams moved to trash within 24 hours.",
    icon: "trash-outline",
    features: ["Soft-deleted items", "Restore", "Permanent purge"]},
  "student-progress": {
    id: "student-progress",
    title: "Student Progress",
    summary: "Advanced analytics on student mastery and engagement.",
    icon: "analytics-outline",
    features: ["Mastery trends", "At-risk alerts", "Topic breakdown"]},
  reports: {
    id: "reports",
    title: "Manage Reports",
    summary: "Generate and export course performance reports.",
    icon: "document-attach-outline",
    features: ["PDF exports", "Section comparisons", "Grade summaries"]},
  "progress-reviews": {
    id: "progress-reviews",
    title: "Progress Reviews",
    summary: "Structured progress check-ins and review workflows.",
    icon: "trending-up-outline",
    features: ["Review cycles", "Instructor notes", "Student feedback"]},
  discussions: {
    id: "discussions",
    title: "Course Discussions",
    summary: "Moderate course forums and student discussion threads.",
    icon: "chatbubbles-outline",
    features: ["Board categories", "Moderation tools", "Links to announcements"]},
  "student-support": {
    id: "student-support",
    title: "Student Support",
    summary: "Help queues, password resets, and instructor guides.",
    icon: "help-buoy-outline",
    features: ["Support queues", "Password resets", "Instructor guides"]},
  "course-settings": {
    id: "course-settings",
    title: "Course Settings",
    summary: "Core course configuration and visibility options.",
    icon: "options-outline",
    features: ["Course metadata", "Visibility", "Enrollment rules"]},
  "schedule-adjustment": {
    id: "schedule-adjustment",
    title: "Schedule Adjustment",
    summary: "Poll availability, collect consent, and finalize class time changes.",
    icon: "swap-horizontal-outline",
    features: ["Availability polls", "Department confirmation", "Student consent", "Calendar updates"]},
  "assessment-governance": {
    id: "assessment-governance",
    title: "Assessment Governance",
    summary: "Policies for publishing, retakes, and academic integrity.",
    icon: "lock-closed-outline",
    features: ["Publish rules", "Retake policy", "Integrity settings"]},
  "assessment-defaults": {
    id: "assessment-defaults",
    title: "Assessment Defaults",
    summary: "Default timers, anti-cheat, and AI grading for new assessments.",
    icon: "list-outline",
    features: ["Default timers", "Anti-cheat presets", "AI strictness"]},
  "my-courses": {
    id: "my-courses",
    title: "My Courses",
    summary: "All courses you teach across terms and institutions.",
    icon: "albums-outline",
    features: ["Course list", "Term switching", "Role overview"]},
  "grading-policies": {
    id: "grading-policies",
    title: "Grading Policies",
    summary: "Course grade weights, auto-finalize, and deadline grace.",
    icon: "scale-outline",
    features: ["Category weights", "Auto-finalize", "Grace days"]},
  attendance: {
    id: "attendance",
    title: "Attendance",
    summary: "Roll call, live QR/code, meeting log, and corrections. New meetings are created on web.",
    icon: "calendar-outline",
    features: ["Roll call", "QR and class code", "Meeting log"],
  },
  "attendance-policies": {
    id: "attendance-policies",
    title: "Attendance Policies",
    summary: "Rules for attendance tracking and excused absences.",
    icon: "today-outline",
    features: ["Thresholds", "Excused codes", "Grade impact"]},
  "course-evaluations": {
    id: "course-evaluations",
    title: "Course Evaluations",
    summary: "Review Canvas evaluation proofs and award engagement credits.",
    icon: "thumbs-up-outline",
    features: ["Pending queue", "Approve & return", "50 EC on approval", "Survey analytics"],
  },
  "classroom-points": {
    id: "classroom-points",
    title: "Classroom Points",
    summary: "Review pending awards, leaderboard, and in-class tasks.",
    icon: "star-outline",
    features: ["Pending review", "Manual award", "Leaderboard"],
  },
  "classroom-points-rules": {
    id: "classroom-points-rules",
    title: "Classroom Points Rules",
    summary: "Configure categories, caps, and approval rules for points.",
    icon: "trophy-outline",
    features: ["Category caps", "Auto-approve", "Booster rules"]},
  quizzes: {
    id: "quizzes",
    title: "Manage Quizzes",
    summary: "Create, publish, and manage quizzes with section access and issue tracking.",
    icon: "help-circle-outline",
    features: ["Question bank create", "Section access", "Issues & restore"],
  },
  results: {
    id: "results",
    title: "Manage Results",
    summary: "Review attempts, finalize released scores, and re-evaluate grades.",
    icon: "bar-chart-outline",
    features: ["Attempt reports", "Finalize & email", "Recalculate & re-evaluate"],
  },
  homework: {
    id: "homework",
    title: "Manage Homework",
    summary: "Create, publish, and manage homework with section access and issue tracking.",
    icon: "pencil-outline",
    features: ["Question bank create", "Section access", "Issues & restore"],
  },
  "mid-semester-exams": {
    id: "mid-semester-exams",
    title: "Mid-Semester Exams",
    summary: "Create, publish, and manage mid-semester exams with section access and issue tracking.",
    icon: "clipboard-outline",
    features: ["Question bank create", "Section access", "Issues & restore"],
  },
  "final-exams": {
    id: "final-exams",
    title: "Final Exams",
    summary: "Create, publish, and manage final exams with section access and issue tracking.",
    icon: "school-outline",
    features: ["Question bank create", "Section access", "Issues & restore"],
  },
  playground: {
    id: "playground",
    title: "Playground",
    summary: "Live quiz sessions, passcodes, and in-class leaderboards.",
    icon: "game-controller-outline",
    features: ["Live sessions", "Join passcode", "Leaderboard"],
  },
  "playground-rules": {
    id: "playground-rules",
    title: "Playground Rules",
    summary: "Live session defaults, topics, and scoring for playground.",
    icon: "game-controller-outline",
    features: ["Session defaults", "Topic pools", "Leaderboard rules"]},
  "ai-assistant-settings": {
    id: "ai-assistant-settings",
    title: "Cora Assistant Settings",
    summary: "Course policy for student Cora Assistant — access, teaching style, and routing.",
    icon: "hardware-chip-outline",
    features: ["Model selection", "Tutor access", "Safety filters"]},
  "team-project-policies": {
    id: "team-project-policies",
    title: "Team & Project Policies",
    summary: "Rules for group work, peer review, and project submissions.",
    icon: "git-network-outline",
    features: ["Team size limits", "Peer review", "Late policies"]},
  "submission-issues": {
    id: "submission-issues",
    title: "Submission Issues",
    summary: "Administration view of cross-assessment submission problems.",
    icon: "warning-outline",
    features: ["Issue triage", "Open in Results", "Recent items"]},
  "teaching-assistants": {
    id: "teaching-assistants",
    title: "Teaching Assistants",
    summary: "Manage TA access, permissions, and section assignments.",
    icon: "person-add-outline",
    features: ["TA roster", "Permissions", "Section scope"]},
  students: {
    id: "students",
    title: "Student Directory",
    summary: "Course roster, password-reset inbox, and account requests.",
    icon: "people-outline",
    features: ["Roster list", "Add student", "Password resets", "Account requests"],
  },
  "access-requests": {
    id: "access-requests",
    title: "Access Requests",
    summary: "Review pending student, Career Member, and summer program access within your authority.",
    icon: "shield-checkmark-outline",
    features: ["Students", "Career Members", "Summer Students", "Scoped approval"],
  },
  campers: {
    id: "campers",
    title: "Campers",
    summary: "Summer camper accounts and the request inbox for this course.",
    icon: "walk-outline",
    features: ["Camper roster", "Create account", "Request inbox"],
  },
  "office-hours": {
    id: "office-hours",
    title: "Office Hours",
    summary: "Approve student meeting requests and publish weekly availability.",
    icon: "time-outline",
    features: ["Request inbox", "Approve & decline", "Regular hours"],
  },
  recommendations: {
    id: "recommendations",
    title: "Recommendation Letters",
    summary: "Draft, finalize, and notify students about recommendation letters.",
    icon: "bookmark-outline",
    features: ["Letter workspace", "Guest requests", "AI suggest"],
  },
  "trade-center": {
    id: "trade-center",
    title: "Trade Center",
    summary: "Conversion rules, donation review, analytics, and trade logs.",
    icon: "storefront-outline",
    features: ["Conversion rules", "Donation review", "Analytics & logs"],
  },
  cora: {
    id: "cora",
    title: "Cora Copilot",
    summary: "AI teaching copilot — create, improve, analyze, and automate course work.",
    icon: "sparkles-outline",
    features: ["Create content", "Analyze results", "Course insights", "Assistant chat"]},
}

export function getFacultyModuleMeta(moduleId: string): FacultyModuleMeta {
  return (
    FACULTY_MODULE_META[moduleId] ?? {
      id: moduleId,
      title: moduleId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      summary: "This module is being built for the mobile faculty app.",
      icon: "construct-outline",
      features: ["Course-scoped tools", "Native editing", "Offline-friendly views"]}
  )
}
