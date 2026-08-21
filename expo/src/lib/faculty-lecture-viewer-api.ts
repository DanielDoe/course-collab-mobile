import { ApiError } from "./api"
import { mergeLectureDeckFromContent } from "./lecture-deck-url"
import { parseLectureSamplePractice } from "./lecture-sample-practice-utils"
import { parseLectureWorkspace } from "./lecture-workspace-utils"
import type { LectureSamplePracticeConfig, LectureWorkspaceConfig } from "./lecture-types"
import { instructorApi, type InstructorLecture, type InstructorScope } from "./instructor-api"

export type FacultyLectureViewerData = {
  lecture: InstructorLecture
  samplePractice: LectureSamplePracticeConfig
  workspace: LectureWorkspaceConfig
  deckUrl: string | null
}

function facultyLectureDeckUrl(lecture: InstructorLecture): string | null {
  return lecture.pdf_url || lecture.document_url || lecture.original_file_url || null
}

export async function fetchFacultyLectureViewerData(
  scope: InstructorScope,
  lectureId: number,
): Promise<FacultyLectureViewerData> {
  const [lectures, content, samplePracticeRes, workspaceRes] = await Promise.all([
    instructorApi.getLectures(scope),
    instructorApi.getLectureContent(scope, lectureId).catch(() => null),
    instructorApi.getLectureSamplePractice(scope, lectureId).catch(() => null),
    instructorApi.getLectureWorkspace(scope, lectureId).catch(() => null),
  ])

  const base = lectures.find((item) => item.id === lectureId)
  if (!base) {
    throw new ApiError("This lecture could not be found.", 404)
  }

  const lecture =
    content && typeof content === "object"
      ? mergeLectureDeckFromContent(base, content as Record<string, unknown>)
      : base

  return {
    lecture,
    samplePractice: parseLectureSamplePractice(
      (samplePracticeRes as { config?: unknown } | null)?.config ?? samplePracticeRes,
    ),
    workspace: parseLectureWorkspace(
      (workspaceRes as { config?: unknown } | null)?.config ?? workspaceRes,
    ),
    deckUrl: facultyLectureDeckUrl(lecture),
  }
}
