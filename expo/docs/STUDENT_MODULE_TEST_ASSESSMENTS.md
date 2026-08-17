# Student module test assessments

**Required fixtures for student module-deep-test.** When deep-testing student Quizzes, Homework, Mid-Semester, Finals, or Classroom Points, take / submit / attach on these rows only. Search each module for `STU Test`.

Do **not** delete these. Do **not** submit to closed live course exams (Final Exam 1, Quiz 3, Homework 7, Mid-Semester Exam 2, etc.).

| | |
|---|---|
| Course | **ECE 2202** (instructor `dmdoe`) |
| Student | `coursecollab://dev-student-login` → University of Houston / Daniel Doe / ECE 2202 |
| Faculty | `coursecollab://dev-faculty-login` → `dmdoe` → ECE 2202 |

## Use these titles

| Student drawer | Route | Open this row | Kind | Window / status |
|---|---|---|---|---|
| Finals | `/module/final-exams` | **STU Test Final** | 12 AC Power bank questions, 100 pts, coverage Ch. 1–5 | Live · 3/3 sections · through Jun 30, 2027 |
| Quizzes | `/module/quizzes` | **STU Test Quiz** | 12 AC Power bank questions | Live · 3/3 sections · through Jun 30, 2027 |
| Homework | `/module/homework` | **STU Test Homework** | 12 AC Power bank questions | Live · 3/3 sections · through Jun 30, 2027 |
| Mid-Semester | `/module/mid-semester-exams` | **STU Test Mid** | 12 AC Power bank questions, coverage Ch. 1–5 | Live · 3/3 sections · through Jun 30, 2027 |
| Classroom Points | `/module/classroom-points` | **STU Test Points** | Code submission, All sections, no due date | Open |

Faculty list titles are the same. Classroom Points faculty path: **Tasks** tab.

After a student submit, check **History** (`/module/quiz-history`) and **Grades** (`/module/grades`) for the same `STU Test` title.

## Student deep-test rules

1. Login student → ECE 2202 → open the named module → search `STU Test` → open that row.
2. Run take / resume / attach / camera / submit on **that** assessment only.
3. Leave the row in place when the pass is done so the next student deep-test can reuse it.
4. If a `STU Test` row is missing or closed, recreate it from the faculty bank (AC Power → Select all) or Tasks → Create assignment. Do not invent a different title.

## How they were built

- Final / Quiz / Homework / Mid: faculty create-from-bank → topic **AC Power** → Select all (12). Finals: Q1 points adjusted so the exam totals 100; coverage Ch. 1–5.
- Classroom Points: Tasks → Create assignment → **STU Test Points** → code submission → All sections → no due date.
