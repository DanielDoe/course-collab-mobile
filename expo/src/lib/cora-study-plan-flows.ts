export type CoraChatFlow = "study_plan" | "calendar_assistant" | "weekly_review" | "exam_countdown"

export const STUDY_PLAN_GENERATION_PROMPT = `Create a personalized study plan for me based on my CourseCollab learning profile, upcoming assessments, calendar commitments, and mastery gaps.

Structure your response with:
1. **This week overview** — realistic daily focus (30–90 min blocks)
2. **Priority topics** — tied to my weak areas and upcoming due dates (name specific topics for flashcards + Practice Hub)
3. **Daily schedule** — Mon–Sun with specific tasks including:
   - Lecture review
   - **Practice Hub** sessions (topic + question goal)
   - **Flashcard review** blocks for weak topics
4. **Assessment prep** — what to do before each upcoming quiz/homework/exam
5. **Checkpoints** — how I'll know I'm on track

Cora will suggest flashcard decks, Practice Hub quizzes, and calendar sessions — save them yourself in the app.

Keep it achievable for a busy student. Use my actual data — do not invent grades or deadlines. Do NOT ask me to paste or upload anything. Output the plan in chat only.`

export const CALENDAR_ASSISTANT_PROMPT = `You already have my full CourseCollab profile loaded (calendar, assessments, reminders, alerts, missed deadlines).

Give me a detailed schedule briefing now:
1. **This week** — events and due dates with specific titles and dates
2. **Missed deadlines** — anything past due I should address first
3. **Next major due** — nearest exam, homework, or quiz
4. **Study sessions** — what's on my calendar
5. **Alerts** — unread notifications worth acting on
6. **Priority plan** — top 3 actions for the next 48 hours

Use ONLY my CourseCollab data. Do NOT ask me to paste or upload anything. If a section is empty in my data, say "None on record" and suggest where to check in CourseCollab.`

export const WEEKLY_REVIEW_PROMPT = `Run a weekly review using my CourseCollab data already loaded in your context.

Summarize:
- What I completed this week (assessments, lectures, practice)
- Topics that still need work
- What to prioritize next week
- One concrete 30-minute action for tomorrow

Do NOT ask me to provide data manually.`

export const EXAM_COUNTDOWN_PROMPT = `Help me prepare for my next major assessment using my CourseCollab timeline already loaded in your context.

Identify the nearest exam or high-stakes quiz, then build a countdown plan (days remaining → daily tasks). Include recovery steps if I'm behind. Do NOT ask me to paste due dates.`

export const SCHEDULE_STUDY_PLAN_FOLLOWUP_PROMPT = `Based on the study plan above, propose specific calendar study sessions for the next 2 weeks.

For each session list:
- Date and start time (respect my existing calendar commitments)
- Duration (45–90 min)
- Topic and activities

Format as a numbered list. Ask me to confirm before anything is added to my calendar.`

export function flowToChatConfig(flow: CoraChatFlow) {
  return {
    learningGoal: "prepare" as const,
    flow,
  }
}
