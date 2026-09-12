export type SupportGuideEntry = {
  id: string
  category: string
  q: string
  a: string
  /** Optional faculty route hint shown in instructor guides */
  route?: string
}

/** Student-facing articles — mirrored in Help Center (Support → Help Center). */
export const STUDENT_SUPPORT_GUIDES: SupportGuideEntry[] = [
  {
    id: "login",
    category: "Getting started",
    q: "How do I sign in?",
    a: "Use your roster name, course section, and the password from your syllabus. Student IDs are not used on the login screen. If you have multiple courses, pick the correct section after entering your name.",
  },
  {
    id: "password",
    category: "Account",
    q: "How do I reset my password?",
    a: "Open Settings → Password & security to change your password while signed in. If you are locked out, request a reset from the login screen or ask your instructor — they approve resets from Student Support → Resets. After approval, sign in with the temporary password and change it in Settings.",
  },
  {
    id: "membership",
    category: "Membership",
    q: "What does upgrading do?",
    a: "Scholar is the default tier. Explorer unlocks Cora and AI Notetaker. Trailblazer adds CodeBench IDE and Analytics & More. Open Support → View Plans to compare perks. Some courses use instructor-controlled assessment policies instead of membership benefits — check Course Info → Policies.",
  },
  {
    id: "ai-tutor",
    category: "Learning tools",
    q: "Why is Cora or AI Notetaker locked?",
    a: "Both require Explorer or Trailblazer. Locked items in the drawer show a lock icon — tap them to see upgrade options. Lecture slides and Practice Hub remain available on Scholar.",
  },
  {
    id: "lectures",
    category: "Learning tools",
    q: "Where are lecture slides and notes?",
    a: "Open Learning Center → Lectures to browse by week. Tap a lecture to open the slide viewer. AI Notetaker (Explorer+) records and summarizes lectures from the same area on web or mobile.",
  },
  {
    id: "practice",
    category: "Learning tools",
    q: "How does Practice Hub work?",
    a: "Practice Hub offers topic-based questions separate from graded quizzes. Work through topics at your own pace — scores here do not replace quiz grades but help you prepare. Your instructor can see practice activity under Analytics.",
  },
  {
    id: "codebench",
    category: "Learning tools",
    q: "What is CodeBench IDE?",
    a: "CodeBench IDE is an in-browser coding workspace for Trailblazer members. It supports many languages (JavaScript, Python, C++, Java, and more). Open Learning Center → CodeBench IDE to write, run, and submit code. Analytics & More shows your coding activity trends.",
  },
  {
    id: "quizzes",
    category: "Assessments",
    q: "How do I start a quiz or homework?",
    a: "Open Assessments → Quizzes, Homework, Mid-Semester, or Finals. Each card shows availability, attempts remaining, and due dates. Tap Start or Continue to open the assessment. Use History to revisit past attempts and open score reports.",
  },
  {
    id: "grades",
    category: "Assessments",
    q: "Where are my grades?",
    a: "Open Assessments → Grades for your course breakdown by category. Tap a completed attempt in Quiz History to open a detailed question-by-question report. Course Info → Progress Review shows instructor-written feedback when published.",
  },
  {
    id: "quiz-load",
    category: "Assessments",
    q: "A quiz won't load — what should I do?",
    a: "Check your connection, force-close and reopen the app, then try Continue from the assessment list. Do not switch apps during timed attempts. If it persists, open the assessment menu → Report Issue (or Support → Report Bug) with the quiz name, question number, and a screenshot.",
  },
  {
    id: "assessment-issue",
    category: "Assessments",
    q: "How do I report a wrong question or grading issue?",
    a: "From an open assessment or its detail screen, open Report Issue. Select the quiz, enter the question number, and describe the problem. Your instructor reviews open issues under Manage Quizzes → Issues or Administration → Submission Issues. You can track replies in the same sheet.",
  },
  {
    id: "retakes",
    category: "Assessments",
    q: "Can I retake a quiz?",
    a: "Retakes depend on your instructor's assessment policy. If attempts remain, the quiz card shows Retake or Start. When attempts are exhausted, contact your instructor through office hours or the forum — they control extensions and extra attempts.",
  },
  {
    id: "forum",
    category: "Collaboration",
    q: "Forum vs office hours — which should I use?",
    a: "Use Collaboration → Forum Hub for questions classmates can help with (assignments, exam topics, general discussion). Use Course Info → Office Hours to book one-on-one time with your instructor. Forum threads are visible to the class; office-hour requests are private.",
  },
  {
    id: "groups",
    category: "Collaboration",
    q: "How do study groups and projects work?",
    a: "Groups lets you join or create study groups under Collaboration → Groups. Projects lists team assignments with due dates and submission status under Collaboration → Projects. Follow your syllabus for team formation rules and submission links.",
  },
  {
    id: "playground",
    category: "Collaboration",
    q: "What is Playground?",
    a: "Playground is a live competitive quiz game. Join from Collaboration → Playground with a room code from your instructor, wait in the lobby, then answer quickly for leaderboard points. It is practice-style — check with your instructor whether Playground scores affect classroom points.",
  },
  {
    id: "points",
    category: "Rewards",
    q: "How do classroom points work?",
    a: "Earn points from participation, playground, and instructor awards under Performance & Rewards → Classroom Points. Pending awards may need instructor approval. Spend points in Trade Center for perks defined by your course.",
  },
  {
    id: "attendance",
    category: "Rewards",
    q: "Where is my attendance recorded?",
    a: "Open Performance & Rewards → Attendance to see sessions and your status. If a meeting is missing or marked incorrectly, message your instructor — they record attendance from the faculty Attendance module.",
  },
  {
    id: "calendar",
    category: "Course info",
    q: "How do class reminders work?",
    a: "Open Course Info → Calendar for deadlines and class meetings. Enable class reminders on your schedule card and allow notifications when prompted. Adjust timing under Settings → Notifications.",
  },
  {
    id: "announcements",
    category: "Course info",
    q: "Where do I see course announcements?",
    a: "Check Course Info → Announcements and your dashboard for new posts. Announcements may include markdown, links, and attachments. Tap a row to read the full message — time-sensitive exam or policy updates usually appear here first.",
  },
  {
    id: "syllabus",
    category: "Course info",
    q: "Where is the syllabus and schedule?",
    a: "Course Info → Syllabus lists policies, grading weights, and weekly topics. Course Info → Calendar adds due dates and office-hour blocks. If something conflicts, the latest announcement usually overrides printed syllabus dates.",
  },
  {
    id: "progress-review",
    category: "Course info",
    q: "What is Progress Review?",
    a: "Progress Review is personalized instructor feedback on your performance trends. Open Course Info → Progress Review when your instructor publishes a review. Reviews may include markdown summaries and suggested focus areas — they complement but do not replace individual grades.",
  },
  {
    id: "recommendations",
    category: "Course info",
    q: "How do recommendation letters work?",
    a: "Open Course Info → Recommendation Letters to request or track a letter. Submit the form your instructor requires and allow time for processing. Status updates appear in the same module; follow up via office hours for urgent deadlines.",
  },
  {
    id: "course-evaluation",
    category: "Course info",
    q: "What is Course Evaluation?",
    a: "Course Info → Course Evaluation lets you complete the Canvas evaluation, share CourseCollab feedback, and upload completion proof. When your instructor acknowledges it, you earn engagement credits (typically 50). Pending and approved submissions stay locked until returned for revision.",
  },
  {
    id: "mobile-web",
    category: "App & technical",
    q: "Should I use the mobile app or web?",
    a: "Both use the same account. Native screens cover grades, lectures, forum, calendar, assessments, and AI Notetaker (record or upload audio, then get a transcript and AI summary). Playground live games and some faculty editors are smoother on the web dashboard.",
  },
  {
    id: "submit-ticket",
    category: "App & technical",
    q: "When should I submit a ticket vs report a bug?",
    a: "Use Support → Submit Ticket for account help, access problems, or course questions the instructor cannot resolve. Use Report Bug when something is broken (crash, blank screen, wrong behavior) — include steps to reproduce and screenshots. Use Feature Requests to suggest product improvements.",
  },
  {
    id: "offline",
    category: "App & technical",
    q: "Can I work offline?",
    a: "Most CourseCollab features need an internet connection. Downloaded lecture PDFs or notes may be available depending on your instructor. Quizzes and homework require connectivity to save answers — avoid starting timed assessments on unstable networks.",
  },
]

/** Instructor-facing guides — Student Support → Guides tab. */
export const INSTRUCTOR_SUPPORT_GUIDES: SupportGuideEntry[] = [
  {
    id: "login",
    category: "Account & access",
    q: "Students can't sign in",
    a: "Verify they use roster name (not student ID), correct section code, and syllabus password. Check Student Directory for enrollment status. If they forgot the password, they should request a reset — approve it under Student Support → Resets. After approval, share that they must change the temporary password in Settings → Password & security.",
    route: "/module/students",
  },
  {
    id: "password-reset",
    category: "Account & access",
    q: "How do password resets work?",
    a: "Students request a reset from the login flow or Settings. Pending requests appear in Student Support → Resets with section and timestamp. Approve to issue a temporary password, or Reject if the request looks fraudulent. Approved resets do not change their roster name or section.",
    route: "/module/student-support",
  },
  {
    id: "roster",
    category: "Account & access",
    q: "How do I find or verify a student account?",
    a: "Open Students → Student Directory to search by name, section, or student number. Use this to confirm enrollment before approving resets or office-hour requests. Summer Camp and Campers modules list short-course registrations separately.",
    route: "/module/students",
  },
  {
    id: "grades-student",
    category: "Assessments & grading",
    q: "Where do students see grades?",
    a: "Students open Assessments → Grades and Quiz History for category breakdowns and attempt reports. Tell them to tap a completed attempt for question-level detail. You publish formal feedback through Progress Reviews when ready.",
    route: "/module/results",
  },
  {
    id: "results",
    category: "Assessments & grading",
    q: "How do I review attempt details?",
    a: "Open Analytics → Manage Results, filter by assessment, and tap a student attempt to open the full report — scores, each question, integrity metadata, and timestamps. Use this when answering regrade requests or academic integrity questions.",
    route: "/module/results",
  },
  {
    id: "quiz-wont-load",
    category: "Assessments & grading",
    q: "A quiz won't load for students",
    a: "Confirm the assessment is published, within the availability window, and the student has attempts remaining. Ask them to use Continue (not a stale browser tab). Check Manage Quizzes → Issues and Administration → Submission Issues for open reports on that assessment. Verify Assessment Governance and term dates under Academic Terms.",
    route: "/module/submission-issues",
  },
  {
    id: "submission-issues",
    category: "Assessments & grading",
    q: "How do I handle submission issues?",
    a: "Students report problems from the assessment UI with quiz and question numbers. Review open issues under Manage Quizzes (Issues segment) or Administration → Submission Issues. Reply in the issue thread, fix the question in Question Bank if needed, and close the issue when resolved.",
    route: "/module/submission-issues",
  },
  {
    id: "extensions",
    category: "Assessments & grading",
    q: "Can I grant an extension or extra attempt?",
    a: "Edit the assessment's availability, attempt limit, or per-student overrides in Manage Quizzes / Homework / Exams. Assessment Defaults and Grading Policies set course-wide rules. Document exceptions in a private note or announcement so TAs stay aligned.",
    route: "/module/assessment-governance",
  },
  {
    id: "question-bank",
    category: "Assessments & grading",
    q: "How should I fix a bad question?",
    a: "Open Assessments → Question Bank, locate the item, and edit stem, options, or answer key. If the quiz is live, check Submission Issues for affected attempts. For widespread errors, post an Announcement explaining how you will adjust scores.",
    route: "/module/question-bank",
  },
  {
    id: "classroom-points",
    category: "Assessments & grading",
    q: "Students ask about classroom points",
    a: "Award points from Assessments → Classroom Points. Pending awards show a badge until you approve. Point rules live under Administration → Classroom Points Rules. Students spend approved points in Trade Center — configure rewards there if needed.",
    route: "/module/classroom-points",
  },
  {
    id: "office-hours",
    category: "Communication",
    q: "How do office hours work?",
    a: "Students request times from Course Info → Office Hours. Pending requests appear in Students → Office Hours (and the Student Support queue badge). Approve, decline, or add a meeting link. Keep your availability updated in the same module so students see open slots.",
    route: "/module/office-hours",
  },
  {
    id: "discussions",
    category: "Communication",
    q: "When should I use Course Discussions vs announcements?",
    a: "Post Announcements for one-way course updates (exams, policy changes). Use Communication → Course Discussions for threaded Q&A — students categorize posts (General, Assignments, Exams). Pin or moderate threads from the Moderation tab; redirect repetitive questions to existing threads.",
    route: "/module/discussions",
  },
  {
    id: "notifications",
    category: "Communication",
    q: "How do I reach all students quickly?",
    a: "Send an Announcement for email/push visibility. Use Communication → Notifications for targeted system messages when available. Forum replies notify thread participants. For urgent technical outages, combine an announcement with a note in Student Support guides.",
    route: "/module/notifications",
  },
  {
    id: "progress-reviews",
    category: "Analytics & feedback",
    q: "What are Progress Reviews?",
    a: "Progress Reviews are narrative feedback reports per student (trends, strengths, next steps). List and generate them under Analytics → Progress Reviews. Students read published reviews under Course Info → Progress Review. Use Manage Results first when they need question-level regrades.",
    route: "/module/progress-reviews",
  },
  {
    id: "reports",
    category: "Analytics & feedback",
    q: "Where are exportable reports?",
    a: "Analytics → Manage Reports lists generated report runs (results summaries, activity exports). Filter by date and type. Class Analytics shows engagement charts. For a single attempt deep-dive, use Manage Results instead of reports.",
    route: "/module/reports",
  },
  {
    id: "student-progress",
    category: "Analytics & feedback",
    q: "How do I check if a student is falling behind?",
    a: "Open Analytics → Class Analytics for activity and grade trends. Cross-check Practice Hub usage, missing homework, and attendance. Schedule office hours or send a Progress Review for structured feedback.",
    route: "/module/student-progress",
  },
  {
    id: "cora-insights",
    category: "Analytics & feedback",
    q: "Where do I see Cora struggles and early warnings?",
    a: "Analytics → Cora Insights combines usage, predictions, repeated topics, and struggle alerts. The Shared Cora tab only includes students who turned on Share with instructor. Class Analytics remains the place for grades, practice, attendance, and at-risk lists.",
    route: "/module/cora-insights",
  },
  {
    id: "lectures",
    category: "Course content",
    q: "How do I publish or update lectures?",
    a: "Course → Manage Lectures to upload slides, set week numbers, and publish. Preview the slide viewer before students see it. Link practice topics from the lecture editor when you want slides tied to Practice Hub.",
    route: "/module/lectures",
  },
  {
    id: "practice-manage",
    category: "Course content",
    q: "How does Practice Hub differ from quizzes?",
    a: "Manage Practice controls ungraded topic banks for self-study. Manage Quizzes controls graded assessments with attempts and deadlines. Students confused about which counts toward their grade should be directed to Assessments → Grades weights on the syllabus.",
    route: "/module/practice",
  },
  {
    id: "groups-projects",
    category: "Course content",
    q: "How do I manage groups and projects?",
    a: "Course → Manage Groups for rosters and discovery settings. Manage Projects for team assignments, due dates, and submissions. Team & Project Policies under Administration defines formation rules and late policies.",
    route: "/module/projects",
  },
  {
    id: "playground",
    category: "Course content",
    q: "How do I run a Playground session?",
    a: "Course → Manage Playground to create a game and share the join code. Students enter Collaboration → Playground → Join. Use the waiting room to start when ready; leaderboard updates live. Playground Rules under Administration defines scoring if tied to classroom points.",
    route: "/module/playground",
  },
  {
    id: "attendance",
    category: "Course content",
    q: "How is attendance recorded?",
    a: "Open Assessments → Attendance to mark sessions by date and section. Attendance Policies under Administration defines excused absences and penalties. Students view their log under Performance & Rewards → Attendance.",
    route: "/module/attendance",
  },
  {
    id: "syllabus",
    category: "Course content",
    q: "Who edits the syllabus students see?",
    a: "Course → Syllabus mirrors what students read under Course Info. Keep grading weights aligned with Grading Policies. Major changes should also go out as an Announcement.",
    route: "/module/syllabus",
  },
  {
    id: "terms",
    category: "Administration",
    q: "Why can't students see an assessment?",
    a: "Check Course → Academic Terms — assessments inherit active term dates. Confirm the assessment is published, the correct section is selected, and Assessment Governance has not locked the item. Course Settings controls which modules are visible.",
    route: "/module/academic-terms",
  },
  {
    id: "governance",
    category: "Administration",
    q: "What is Assessment Governance?",
    a: "Administration → Assessment Governance centralizes retake rules, proctoring flags, and integrity settings across quiz types. Assessment Defaults saves templates for new quizzes. Change these before the semester starts to avoid mid-term surprises.",
    route: "/module/assessment-governance",
  },
  {
    id: "tas",
    category: "Administration",
    q: "Can teaching assistants help with support?",
    a: "Add TAs under Administration → Teaching Assistants. They can monitor forums, office-hour queues, and classroom points depending on permissions. Document who handles password resets vs grading disputes so students get consistent answers.",
    route: "/module/teaching-assistants",
  },
  {
    id: "recommendations",
    category: "Administration",
    q: "How do recommendation letter requests work?",
    a: "Students request letters under Course Info → Recommendation Letters. Review and update status under Students → Recommendation Letters. Use office hours to gather materials before committing to a deadline.",
    route: "/module/recommendations",
  },
  {
    id: "membership-policies",
    category: "Administration",
    q: "Students ask why AI or CodeBench is locked",
    a: "Membership tiers (Scholar / Explorer / Trailblazer) gate Cora, AI Notetaker, and CodeBench. Course Info → Policies shows whether your course uses instructor-controlled assessment rules instead of membership benefits. Upgrades are handled in the student Membership module, not by faculty overrides.",
  },
  {
    id: "mobile-web",
    category: "App & technical",
    q: "Mobile app vs web dashboard",
    a: "The faculty mobile app covers queues, results, discussions, announcements, and most analytics. Heavy editing (question bank bulk import, lecture workspace, assessment builder) is smoother on the web instructor dashboard. Tell students native mobile works for grades, quizzes, and AI Notetaker (record, transcribe, and summarize lectures).",
  },
  {
    id: "student-help",
    category: "App & technical",
    q: "Where should I point students for self-service help?",
    a: "Students have Support → Help Center with the same topics they ask about most (login, grades, quiz errors, membership). For platform bugs, they should use Report Bug; for course-specific grading disputes, use office hours or forum — not CourseCollab tickets.",
  },
  {
    id: "trade-center",
    category: "Administration",
    q: "How does Trade Center work?",
    a: "Students redeem classroom points for perks you configure. Manage inventory and approvals under Students → Trade Center. Keep Classroom Points Rules updated so point values match what you advertise in class.",
    route: "/module/trade-center",
  },
]

export function filterSupportGuides(entries: SupportGuideEntry[], query: string): SupportGuideEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return entries
  return entries.filter(
    (item) =>
      item.q.toLowerCase().includes(q) ||
      item.a.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q),
  )
}

export function groupSupportGuidesByCategory(entries: SupportGuideEntry[]): string[] {
  const seen = new Set<string>()
  const order: string[] = []
  for (const item of entries) {
    if (!seen.has(item.category)) {
      seen.add(item.category)
      order.push(item.category)
    }
  }
  return order
}
