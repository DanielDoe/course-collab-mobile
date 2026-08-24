import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  lectureDisplayTitle,
  lectureListDisplayTitle,
  parseLectureSyllabusReference,
  stripSharedLectureSeriesPrefix,
} from "./lecture-display-title"

const fallLectures = [
  {
    week: 1,
    title: "ELEG 130X: Lecture 1 — Course Introduction",
    description:
      "Course overview, expectations, tooling, and how programming fits engineering problem solving. Orientation session — see syllabus semester schedule for the matching class meeting.",
  },
  {
    week: 3,
    title: "ELEG 130X: Lecture 3 — First Program",
    description:
      "Writing, compiling, and running your first C++ programs with correct syntax. Syllabus reference (Fall 2026): Week 2 — C++ Basics. See the course syllabus for exact dates in your term.",
  },
  {
    week: 4,
    title: "ELEG 130X: Lecture 4 — Modular Programming & Program Structure",
    description:
      "Breaking programs into modules, headers, scope, and function prototypes. Syllabus reference (Fall 2026): Week 2 — C++ Basics. See the course syllabus for exact dates in your term.",
  },
  {
    week: 5,
    title: "ELEG 130X: Lecture 5 — Conditional Logic & Branching (if/else, switch)",
    description:
      "Decision structures only. Syllabus reference (Fall 2026): Week 3 — Control Structures in C++ Part 1 — conditional statements. See the course syllabus for exact dates in your term.",
  },
]

describe("lecture Fall 2026 display titles", () => {
  it("reads the syllabus reference from production descriptions", () => {
    assert.deepEqual(parseLectureSyllabusReference(fallLectures[1].description), {
      term: "Fall 2026",
      label: "Week 2 — C++ Basics",
    })
    assert.equal(parseLectureSyllabusReference(fallLectures[0].description), null)
  })

  it("uses Fall 2026 syllabus names instead of ELEG 130X catalog titles", () => {
    assert.equal(lectureDisplayTitle(fallLectures[1]), "Week 2 — C++ Basics")
    assert.equal(
      lectureDisplayTitle(fallLectures[3]),
      "Week 3 — Control Structures in C++ Part 1 — conditional statements",
    )
    assert.equal(lectureDisplayTitle(fallLectures[0]), "Lecture 1 — Course Introduction")
  })

  it("strips the shared series prefix when there is no syllabus reference", () => {
    assert.equal(
      stripSharedLectureSeriesPrefix("ELEG 130X: Lecture 1 — Course Introduction"),
      "Lecture 1 — Course Introduction",
    )
  })

  it("disambiguates two decks that share a Fall 2026 week title", () => {
    assert.equal(
      lectureListDisplayTitle(fallLectures[1], fallLectures),
      "Week 2 — C++ Basics · First Program",
    )
    assert.equal(
      lectureListDisplayTitle(fallLectures[2], fallLectures),
      "Week 2 — C++ Basics · Modular Programming & Program Structure",
    )
  })
})
