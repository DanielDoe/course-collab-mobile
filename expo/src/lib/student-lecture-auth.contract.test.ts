import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import { LECTURE_STUDENT_API_PATHS } from "./student-session-proof"

const here = dirname(fileURLToPath(import.meta.url))

describe("student lecture client auth contract", () => {
  it("builds lecture list/detail through studentRequest", () => {
    const source = readFileSync(join(here, "student-api.ts"), "utf8")
    assert.match(source, /getLectures:\s*(?:async\s*)?\(session/)
    assert.match(source, /studentRequest/)
    assert.match(source, /updateLectureProgress/)
    for (const path of LECTURE_STUDENT_API_PATHS) {
      assert.match(source, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    }
  })

  it("refuses lecture fetches without session proof", () => {
    const lectureApi = readFileSync(join(here, "student-lecture-api.ts"), "utf8")
    assert.match(lectureApi, /studentAuthenticatedHeaders/)
    assert.doesNotMatch(lectureApi, /mfaTrustRequestHeadersForStudent/)

    const deck = readFileSync(join(here, "lecture-deck-url.ts"), "utf8")
    assert.match(deck, /studentAuthenticatedHeaders/)
    assert.doesNotMatch(deck, /"x-student-id":\s*session\.databaseId/)
  })

  it("loads viewer bundle then dedicated sample-practice and workspace configs", () => {
    const lectureApi = readFileSync(join(here, "student-lecture-api.ts"), "utf8")
    const viewerFn = lectureApi.slice(lectureApi.indexOf("export async function fetchStudentLectureViewerData"))
    assert.match(viewerFn, /getLectureViewer/)
    assert.match(viewerFn, /fetchStudentLectureSamplePracticeConfig/)
    assert.match(viewerFn, /fetchStudentLectureWorkspaceConfig/)
    assert.match(viewerFn, /Promise\.all/)
  })

  it("keeps workspace when content payload also includes sample practice", () => {
    const lectureApi = readFileSync(join(here, "student-lecture-api.ts"), "utf8")
    const fn = lectureApi.slice(
      lectureApi.indexOf("function isSamplePracticeOnlyPayload"),
      lectureApi.indexOf("function bundledWorkspaceSource"),
    )
    assert.match(fn, /workspacePayloadHasQuestions\(body\)/)
    assert.match(fn, /"workspace" in record/)
    assert.match(fn, /return samplePracticePayloadHasQuestions\(body\)/)
    assert.match(lectureApi, /appendWorkspacePayloadSources/)
  })

  it("renders the lecture viewer with native PDF deck and react-native-pdf", () => {
    const viewer = readFileSync(
      join(here, "../components/lectures/StudentLectureViewerScreen.tsx"),
      "utf8",
    )
    const pdfViewer = readFileSync(
      join(here, "../components/lectures/LectureDeckPdfViewer.tsx"),
      "utf8",
    )
    assert.match(viewer, /LectureDeckPdfViewer/)
    assert.match(viewer, /StudentLectureToolsSheet/)
    assert.match(viewer, /showWorkspace/)
    assert.doesNotMatch(viewer, /WebModuleScreen/)
    assert.match(pdfViewer, /react-native-pdf/)
    assert.match(pdfViewer, /loadLectureDeckPdf|useResolvedLectureDeckSource/)
    assert.doesNotMatch(pdfViewer, /import Pdf from ["']react-native-pdf["']/)
    assert.doesNotMatch(pdfViewer, /WebView/)
  })
})
