import { useMemo } from "react"
import { useIsTabletLayout } from "./responsive-layout"

/** Notes box — quiz / practice circuit submission. */
export const CIRCUIT_NOTES_HEIGHT_TABLET = 360
export const CIRCUIT_NOTES_HEIGHT_PHONE = 180

/** Code editor — practice quiz & classroom code assignments. */
export const CODE_FIELD_HEIGHT_TABLET = 320
export const CODE_FIELD_HEIGHT_PHONE = 200

/** Short-answer / fill-in fields in quiz takers. */
export const TEXT_FIELD_HEIGHT_TABLET = 120
export const TEXT_FIELD_HEIGHT_PHONE = 80

/** Multi-part text sub-question fields. */
export const MULTIPART_TEXT_HEIGHT_TABLET = 100
export const MULTIPART_TEXT_HEIGHT_PHONE = 72

/** Classroom plot / image preview after pick. */
export const PLOT_PREVIEW_HEIGHT_TABLET = 240
export const PLOT_PREVIEW_HEIGHT_PHONE = 180

export function useStudentSubmissionLayout() {
  const isTabletLayout = useIsTabletLayout()
  return useMemo(
    () => ({
      isTabletLayout,
      notesHeight: isTabletLayout ? CIRCUIT_NOTES_HEIGHT_TABLET : CIRCUIT_NOTES_HEIGHT_PHONE,
      largeUpload: isTabletLayout,
      codeFieldHeight: isTabletLayout ? CODE_FIELD_HEIGHT_TABLET : CODE_FIELD_HEIGHT_PHONE,
      textFieldHeight: isTabletLayout ? TEXT_FIELD_HEIGHT_TABLET : TEXT_FIELD_HEIGHT_PHONE,
      multipartTextHeight: isTabletLayout ? MULTIPART_TEXT_HEIGHT_TABLET : MULTIPART_TEXT_HEIGHT_PHONE,
      plotPreviewHeight: isTabletLayout ? PLOT_PREVIEW_HEIGHT_TABLET : PLOT_PREVIEW_HEIGHT_PHONE,
    }),
    [isTabletLayout],
  )
}
