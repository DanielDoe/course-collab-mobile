import type { IoniconName } from "../components/icons/ion-to-lucide-map"

/** Attachment actions in the Cora + menu (top section). */
export type FacultyCoraAttachmentActionId =
  | "upload-files"
  | "upload-photos"
  | "paste-content"
  | "import-from-course"

export type FacultyCoraAttachmentMenuItem = {
  id: FacultyCoraAttachmentActionId
  label: string
  icon: IoniconName
  opensSheet?: "paste-content" | "import-course"
}

export const FACULTY_CORA_ATTACHMENT_ACTIONS: FacultyCoraAttachmentMenuItem[] = [
  { id: "import-from-course", label: "Import from course", icon: "library-outline", opensSheet: "import-course" },
  { id: "upload-files", label: "Upload files", icon: "document-attach-outline" },
  { id: "upload-photos", label: "Upload photos", icon: "image-outline" },
  {
    id: "paste-content",
    label: "Paste content",
    icon: "clipboard-outline",
    opensSheet: "paste-content",
  },
]

export function findFacultyAttachmentAction(
  id: FacultyCoraAttachmentActionId,
): FacultyCoraAttachmentMenuItem | undefined {
  return FACULTY_CORA_ATTACHMENT_ACTIONS.find((item) => item.id === id)
}

/** @deprecated Use FacultyCoraAttachmentActionId + CoraIntentId instead. */
export type FacultyCoraComposerActionId = FacultyCoraAttachmentActionId

/** @deprecated Use findFacultyAttachmentAction instead. */
export function findFacultyComposerAction(id: FacultyCoraComposerActionId) {
  return findFacultyAttachmentAction(id)
}
