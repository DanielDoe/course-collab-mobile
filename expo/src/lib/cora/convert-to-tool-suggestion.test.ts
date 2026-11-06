import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { convertToToolSuggestion, convertToToolSuggestions } from "./convert-to-tool-suggestion"

describe("convertToToolSuggestions", () => {
  it("offers to create flashcards after example cards in chat", () => {
    const suggestions = convertToToolSuggestions({
      role: "student",
      userText: "What are some examples of flashcards on Node analysis",
      assistantText:
        "Here are a few cards:\n- Front: KCL — Back: Current into a node equals current out\n- Front: supernode — Back: Voltage source between two non-reference nodes",
    })
    assert.equal(suggestions[0]?.id, "flashcards")
    assert.match(suggestions[0]?.prompt ?? "", /propose_personal_flashcards/)
    assert.ok(suggestions.some((item) => item.id === "notes"))
    assert.ok(suggestions.some((item) => item.id === "practice"))
  })

  it("offers several tools after a due-or-missing summary", () => {
    const suggestions = convertToToolSuggestions({
      role: "student",
      userText: "What is due overdue briefly?",
      assistantText:
        "Here's a reminder list of what's due or missing:\n- Quiz due Wed, Jun 30\n- Homework 5 missed\nNo study events are on your calendar.",
    })
    const ids = suggestions.map((item) => item.id)
    assert.ok(ids.includes("calendar"))
    assert.ok(ids.includes("study_plan"))
    assert.ok(ids.includes("notes"))
    assert.ok(ids.length > 1)
  })

  it("does not suggest when a confirmation card already exists", () => {
    assert.deepEqual(
      convertToToolSuggestions({
        role: "student",
        userText: "Create flashcards on Node analysis",
        assistantText: "Ready to save 8 cards.",
        hasProposals: true,
      }),
      [],
    )
  })

  it("does not suggest on a short unrelated explanation", () => {
    assert.deepEqual(
      convertToToolSuggestions({
        role: "student",
        userText: "What is Ohm's law?",
        assistantText: "Ohm's law states that V = IR.",
      }),
      [],
    )
  })

  it("does not loop after the student already asked for the tool call", () => {
    assert.deepEqual(
      convertToToolSuggestions({
        role: "student",
        userText:
          "Turn the flashcards you just listed into a confirmation card. Call propose_personal_flashcards using those exact cards.",
        assistantText: "I'll prepare the deck confirmation next with the cards from above.",
      }),
      [],
    )
  })

  it("offers faculty announcement create after a drafted post", () => {
    const suggestion = convertToToolSuggestion({
      role: "faculty",
      userText: "Draft an announcement that lab is cancelled Friday",
      assistantText:
        "Here's a draft for the class:\n\nLab is cancelled this Friday. We will make up the session next week. Bring your lab notebooks on Monday.",
    })
    assert.equal(suggestion?.id, "announcement")
    assert.match(suggestion?.prompt ?? "", /propose_announcement/)
  })

  it("maps faculty notes to course notes, not student personal notes", () => {
    const suggestions = convertToToolSuggestions({
      role: "faculty",
      userText: "Save the study material you just wrote as a note",
      assistantText:
        "Here is a study guide for node analysis:\n- KCL: current in equals current out\n- Supernode: treat a voltage source between two nodes as one",
    })
    const notes = suggestions.find((item) => item.id === "notes")
    assert.ok(notes)
    assert.match(notes?.prompt ?? "", /propose_faculty_capability/)
    assert.match(notes?.prompt ?? "", /courseNote\.create/)
    assert.doesNotMatch(notes?.prompt ?? "", /propose_personal_note/)
    assert.equal(notes?.label, "Save as Course Notes")
    assert.equal(
      suggestions.some((item) => /propose_personal_note|propose_personal_flashcards|propose_practice_quiz/.test(item.prompt)),
      false,
    )
  })

  it("maps faculty flashcards to the course deck tool", () => {
    const suggestions = convertToToolSuggestions({
      role: "faculty",
      userText: "What are some examples of flashcards on Node analysis",
      assistantText:
        "Here are a few cards:\n- Front: KCL — Back: Current into a node equals current out\n- Front: supernode — Back: Voltage source between two non-reference nodes",
    })
    const flashcards = suggestions.find((item) => item.id === "flashcards")
    assert.ok(flashcards)
    assert.match(flashcards?.prompt ?? "", /create_faculty_flashcard_deck/)
    assert.doesNotMatch(flashcards?.prompt ?? "", /propose_personal_flashcards/)
  })

  it("uses different tools for the same study-guide reply by role and context", () => {
    const userText = "Save the study material you just wrote as a note"
    const assistantText =
      "Here is a study guide for node analysis:\n- KCL: current in equals current out\n- Supernode: treat a voltage source between two nodes as one"
    const student = convertToToolSuggestions({
      role: "student",
      studentContext: "create",
      userText,
      assistantText,
    })
    const faculty = convertToToolSuggestions({
      role: "faculty",
      facultyContext: "create",
      userText,
      assistantText,
    })
    assert.ok(student.some((item) => item.label === "Save this to My Notes"))
    assert.ok(faculty.some((item) => item.label === "Save as Course Notes"))
    assert.equal(
      student.some((item) => /propose_faculty_capability|propose_announcement|propose_question_bank/.test(item.prompt)),
      false,
    )
    assert.equal(
      faculty.some((item) => /propose_personal_note|propose_personal_flashcards|propose_practice_quiz/.test(item.prompt)),
      false,
    )
  })

  it("does not offer student calendar or study-plan chips in faculty Assistant", () => {
    const suggestions = convertToToolSuggestions({
      role: "faculty",
      facultyContext: "assistant",
      userText: "What is due overdue briefly?",
      assistantText:
        "Here's a reminder list of what's due or missing:\n- Quiz due Wed, Jun 30\n- Homework 5 missed\nNo study events are on your calendar.",
    })
    const ids = suggestions.map((item) => item.id)
    assert.equal(ids.includes("calendar"), false)
    assert.equal(ids.includes("study_plan"), false)
    assert.equal(
      suggestions.some((item) => /propose_calendar_study_sessions|propose_study_plan/.test(item.prompt)),
      false,
    )
  })
})
