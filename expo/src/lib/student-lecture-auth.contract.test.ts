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
    assert.match(source, /getLectures:\s*\(session/)
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

  it("opens the viewer through a single /viewer bundle", () => {
    const lectureApi = readFileSync(join(here, "student-lecture-api.ts"), "utf8")
    const viewerFn = lectureApi.slice(lectureApi.indexOf("export async function fetchStudentLectureViewerData"))
    assert.match(viewerFn, /getLectureViewer/)
    assert.doesNotMatch(viewerFn, /getLectures\(/)
    assert.doesNotMatch(viewerFn, /getLectureContent\(/)
    assert.doesNotMatch(viewerFn, /Promise\.all/)
  })

  it("does not allow every WebView origin on the student lecture viewer", () => {
    const viewer = readFileSync(
      join(here, "../components/lectures/StudentLectureViewerScreen.tsx"),
      "utf8",
    )
    assert.match(viewer, /getAllowedWebViewOriginPrefixes/)
    assert.doesNotMatch(viewer, /originWhitelist=\{\["\*"\]\}/)
  })
})
