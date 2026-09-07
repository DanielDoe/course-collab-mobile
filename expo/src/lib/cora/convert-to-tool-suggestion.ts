export type ConvertToToolRole = "student" | "faculty"

export type ConvertToToolKind =
  | "flashcards"
  | "calendar"
  | "notes"
  | "practice"
  | "study_plan"
  | "announcement"
  | "question_bank"

export type FacultySuggestionContext =
  | "create"
  | "improve"
  | "analyze"
  | "explain"
  | "automate"
  | "review"
  | "assistant"
  | "insights"

export type StudentSuggestionContext =
  | "understand"
  | "solve_together"
  | "review"
  | "prepare"
  | "create"

export type ConvertToToolSuggestion = {
  id: ConvertToToolKind
  label: string
  prompt: string
  icon:
    | "albums-outline"
    | "calendar-outline"
    | "document-text-outline"
    | "school-outline"
    | "map-outline"
    | "megaphone-outline"
    | "help-circle-outline"
}

const FLASHCARD_RE = /\b(flash\s*cards?|anki|spaced repetition|q\s*&\s*a cards?)\b/i
const CALENDAR_RE =
  /\b(calendar|study session|study sessions|reminder|reminders|due (this|next)|missing assessment|overdue|due soon)\b/i
const NOTES_RE = /\b(study (guide|note|notes)|save (this|it) (as )?a note|course notes?|my notes|checklist)\b/i
const PRACTICE_RE = /\b(practice (quiz|questions?|set)|quiz me|sample (questions?|problems?))\b/i
const STUDY_PLAN_RE = /\b(study plan|revision plan|exam prep plan|study checklist)\b/i
const ANNOUNCEMENT_RE = /\b(announcement|announce|tell (the |my )?class|post to (the )?class)\b/i
const QUESTION_BANK_RE = /\b(question bank|bank questions?|mcqs?|true\/false|draft questions?)\b/i
const ASSESSMENT_RE = /\b(quiz|homework|exam|midterm|final|assessment|overdue|due soon)\b/i
const QUESTION_ITEM_RE = /\b(which of the following|true or false|multiple choice|mcq)\b/i
const ALREADY_TOOL_PROMPT_RE =
  /propose_personal_flashcards|propose_calendar_study_sessions|propose_personal_note|propose_practice_quiz|propose_study_plan|propose_announcement|propose_question_bank|propose_faculty_capability|create_faculty_flashcard_deck|propose_assessment_from_bank/
const CREATEISH_RE = /\b(create|make|add|save|schedule|generate|build|set up|draft|post)\b/i
const EXAMPLEISH_RE = /\b(example|examples|sample|samples|some|list|ideas|what are)\b/i
const STRUCTURED_LIST_RE = /(^|\n)\s*(?:[-*•]|\d+[.)])\s+\S+/
const FLASHCARD_SHAPE_RE = /\b(front|back|term|definition)\s*[:—-]/i

const STUDENT_CATALOG: readonly ConvertToToolKind[] = [
  "flashcards",
  "calendar",
  "study_plan",
  "practice",
  "notes",
]
const FACULTY_CATALOG: readonly ConvertToToolKind[] = [
  "announcement",
  "question_bank",
  "flashcards",
  "notes",
  "practice",
]

const STUDENT_CONTEXT_KINDS: Record<StudentSuggestionContext, readonly ConvertToToolKind[]> = {
  understand: ["notes", "flashcards"],
  solve_together: ["practice", "notes"],
  review: ["notes", "practice", "flashcards"],
  prepare: ["calendar", "study_plan", "practice", "notes"],
  create: ["notes", "flashcards", "practice", "study_plan"],
}

const FACULTY_CONTEXT_KINDS: Record<FacultySuggestionContext, readonly ConvertToToolKind[]> = {
  create: ["question_bank", "notes", "flashcards", "announcement"],
  improve: ["question_bank", "practice"],
  analyze: ["practice", "announcement"],
  explain: ["notes", "announcement"],
  automate: ["announcement", "notes", "flashcards"],
  review: ["notes", "question_bank"],
  assistant: ["announcement", "question_bank", "notes", "flashcards"],
  insights: ["announcement", "notes"],
}

function looksStructured(assistantText: string): boolean {
  return STRUCTURED_LIST_RE.test(assistantText) || FLASHCARD_SHAPE_RE.test(assistantText) || assistantText.length > 220
}

function promptFor(kind: ConvertToToolKind, role: ConvertToToolRole): string {
  if (role === "faculty") {
    switch (kind) {
      case "flashcards":
        return "Turn the flashcards you just listed into a course deck. Call create_faculty_flashcard_deck with a topic from that material. Do not only repeat them in chat."
      case "notes":
      case "study_plan":
        return "Save the material you just wrote as a course note. Call propose_faculty_capability with capability_id courseNote.create and arguments { title, bodyText, topic }. Do not only repeat it in chat."
      case "practice":
        return "Turn the questions you just listed into an assessment from the question bank. Call propose_assessment_from_bank. Do not only repeat the questions."
      case "announcement":
        return "Turn the announcement you just drafted into a confirmation card. Call propose_announcement with that body. Do not only repeat the draft."
      case "question_bank":
        return "Turn the questions you just drafted into a Question Bank confirmation card. Call propose_question_bank_create. Do not only repeat the questions."
      case "calendar":
        return "Turn the schedule you just drafted into office hours. Call propose_faculty_capability with capability_id officeHours.create. Do not only repeat the list."
    }
  }
  switch (kind) {
    case "flashcards":
      return "Turn the flashcards you just listed into a confirmation card. Call propose_personal_flashcards using those exact cards. Do not only repeat them in chat."
    case "calendar":
      return "Turn the due, missing, and study items you just listed into calendar study sessions. Call propose_calendar_study_sessions with specific start times. Do not only repeat the list."
    case "notes":
      return "Save the study material you just wrote as a note. Call propose_personal_note with that content. Do not only repeat it in chat."
    case "practice":
      return "Turn the practice questions you just listed into a practice quiz confirmation card. Call propose_practice_quiz. Do not only repeat the questions."
    case "study_plan":
      return "Save the study plan you just outlined. Call propose_study_plan and propose any matching calendar sessions. Do not only repeat the outline."
    case "announcement":
      return "Turn the announcement you just drafted into a confirmation card. Call propose_announcement with that body. Do not only repeat the draft."
    case "question_bank":
      return "Turn the questions you just drafted into a Question Bank confirmation card. Call propose_question_bank_create. Do not only repeat the questions."
  }
}

function labelFor(kind: ConvertToToolKind, role: ConvertToToolRole): string {
  if (role === "faculty") {
    switch (kind) {
      case "flashcards":
        return "Create a course flashcard deck"
      case "notes":
      case "study_plan":
        return "Save as Course Notes"
      case "practice":
        return "Create an assessment"
      case "calendar":
        return "Create office hours"
      case "announcement":
        return "Create this announcement"
      case "question_bank":
        return "Add these to Question Bank"
    }
  }
  switch (kind) {
    case "flashcards":
      return "Create these flashcards"
    case "calendar":
      return "Add these to my calendar"
    case "notes":
      return "Save this to My Notes"
    case "practice":
      return "Create a practice quiz"
    case "study_plan":
      return "Save this study plan"
    case "announcement":
      return "Create this announcement"
    case "question_bank":
      return "Add these to Question Bank"
  }
}

function iconFor(kind: ConvertToToolKind): ConvertToToolSuggestion["icon"] {
  switch (kind) {
    case "flashcards":
      return "albums-outline"
    case "calendar":
      return "calendar-outline"
    case "notes":
      return "document-text-outline"
    case "practice":
      return "school-outline"
    case "study_plan":
      return "map-outline"
    case "announcement":
      return "megaphone-outline"
    case "question_bank":
      return "help-circle-outline"
  }
}

function suggestionFor(kind: ConvertToToolKind, role: ConvertToToolRole): ConvertToToolSuggestion {
  return { id: kind, label: labelFor(kind, role), prompt: promptFor(kind, role), icon: iconFor(kind) }
}

function inCatalog(kind: ConvertToToolKind, catalog: readonly ConvertToToolKind[]): boolean {
  return catalog.includes(kind)
}

function detectStudentKinds(
  userText: string,
  assistantText: string,
  context?: StudentSuggestionContext,
): ConvertToToolKind[] {
  const blob = `${userText}\n${assistantText}`
  const primary = new Set<ConvertToToolKind>()
  const extra = new Set<ConvertToToolKind>()

  if (FLASHCARD_RE.test(blob) || FLASHCARD_SHAPE_RE.test(assistantText)) primary.add("flashcards")
  if (CALENDAR_RE.test(blob)) primary.add("calendar")
  if (STUDY_PLAN_RE.test(blob)) primary.add("study_plan")
  if (PRACTICE_RE.test(blob)) primary.add("practice")
  if (NOTES_RE.test(blob)) primary.add("notes")

  if (primary.has("calendar") || (ASSESSMENT_RE.test(blob) && looksStructured(assistantText))) {
    extra.add("calendar")
    extra.add("study_plan")
    extra.add("notes")
    if (ASSESSMENT_RE.test(blob)) extra.add("practice")
  }
  if (primary.has("flashcards")) {
    extra.add("notes")
    extra.add("practice")
  }
  if (primary.has("practice")) {
    extra.add("flashcards")
    extra.add("notes")
  }
  if (primary.has("study_plan")) {
    extra.add("calendar")
    extra.add("notes")
  }

  const matched = [...primary, ...extra].filter((kind) => inCatalog(kind, STUDENT_CATALOG))
  const order = context ? [...STUDENT_CONTEXT_KINDS[context], ...STUDENT_CATALOG] : STUDENT_CATALOG
  const unique = new Set<ConvertToToolKind>()
  for (const kind of order) {
    if (matched.includes(kind)) unique.add(kind)
  }
  return [...unique].slice(0, 4)
}

function detectFacultyKinds(
  userText: string,
  assistantText: string,
  context?: FacultySuggestionContext,
): ConvertToToolKind[] {
  const blob = `${userText}\n${assistantText}`
  const primary = new Set<ConvertToToolKind>()
  const extra = new Set<ConvertToToolKind>()
  const allow = context ? FACULTY_CONTEXT_KINDS[context] : FACULTY_CATALOG

  if (ANNOUNCEMENT_RE.test(blob)) primary.add("announcement")
  if (QUESTION_BANK_RE.test(blob) || QUESTION_ITEM_RE.test(blob)) primary.add("question_bank")
  if (FLASHCARD_RE.test(blob) || FLASHCARD_SHAPE_RE.test(assistantText)) primary.add("flashcards")
  if (PRACTICE_RE.test(blob) || ASSESSMENT_RE.test(blob)) primary.add("practice")
  if (NOTES_RE.test(blob) || STUDY_PLAN_RE.test(blob)) primary.add("notes")

  if (looksStructured(assistantText) && !primary.size) {
    if (allow.includes("notes")) primary.add("notes")
    if (QUESTION_ITEM_RE.test(assistantText) && allow.includes("question_bank")) primary.add("question_bank")
  }

  if (primary.has("question_bank") && allow.includes("practice")) extra.add("practice")
  if (primary.has("notes") && allow.includes("question_bank") && QUESTION_ITEM_RE.test(blob)) {
    extra.add("question_bank")
  }
  if (primary.has("flashcards") && allow.includes("notes")) extra.add("notes")
  if (primary.has("announcement") && allow.includes("notes")) extra.add("notes")
  if (primary.has("practice") && allow.includes("question_bank")) extra.add("question_bank")

  const explicit = [...primary].filter((kind) => inCatalog(kind, FACULTY_CATALOG))
  const extras = [...extra].filter((kind) => inCatalog(kind, FACULTY_CATALOG) && allow.includes(kind))
  const matched = [...explicit, ...extras]
  const order = [...allow, ...FACULTY_CATALOG]
  const unique = new Set<ConvertToToolKind>()
  for (const kind of order) {
    if (matched.includes(kind)) unique.add(kind)
  }
  return [...unique].slice(0, 4)
}

function detectKinds(
  userText: string,
  assistantText: string,
  role: ConvertToToolRole,
  context?: FacultySuggestionContext | StudentSuggestionContext,
): ConvertToToolKind[] {
  if (role === "faculty") {
    return detectFacultyKinds(userText, assistantText, context as FacultySuggestionContext | undefined)
  }
  return detectStudentKinds(userText, assistantText, context as StudentSuggestionContext | undefined)
}

/** After a summary-only Cora reply, offer role-specific propose_* tool calls. */
export function convertToToolSuggestions(input: {
  userText: string
  assistantText: string
  hasProposals?: boolean
  role: ConvertToToolRole
  facultyContext?: FacultySuggestionContext
  studentContext?: StudentSuggestionContext
}): ConvertToToolSuggestion[] {
  if (input.hasProposals) return []
  const userText = input.userText.trim()
  const assistantText = input.assistantText.trim()
  if (!userText || assistantText.length < 40) return []
  if (ALREADY_TOOL_PROMPT_RE.test(userText)) return []

  const context = input.role === "faculty" ? input.facultyContext : input.studentContext
  const kinds = detectKinds(userText, assistantText, input.role, context)
  if (!kinds.length) return []

  const invited =
    CREATEISH_RE.test(userText) ||
    EXAMPLEISH_RE.test(userText) ||
    FLASHCARD_SHAPE_RE.test(assistantText) ||
    looksStructured(assistantText)
  if (!invited) return []

  return kinds.map((kind) => suggestionFor(kind, input.role))
}

/** First matching suggestion, or null. Prefer `convertToToolSuggestions` for the chip row. */
export function convertToToolSuggestion(input: {
  userText: string
  assistantText: string
  hasProposals?: boolean
  role: ConvertToToolRole
  facultyContext?: FacultySuggestionContext
  studentContext?: StudentSuggestionContext
}): ConvertToToolSuggestion | null {
  return convertToToolSuggestions(input)[0] ?? null
}
