import { useEffect, useState } from "react"
import type { QuizEditorDraft } from "../../lib/faculty-quiz-editor-mapper"
import { instructorAdminApi } from "../../lib/instructor-admin-api"
import {
  DEFAULT_ASSESSMENT_PLATFORM_FLAGS,
  assessmentPlatformFlagsLabel,
  extractAssessmentPlatformAccess,
  resolveAssessmentPlatformKind,
  type AssessmentPlatformFlags,
} from "../../lib/assessment-platform-access"
import { EditorSectionCard, EditorToggleRow } from "./FacultyAssessmentEditorUi"

type Scope = { instructorId: number; courseId: number }

type Props = {
  scope: Scope
  draft: QuizEditorDraft
  assessmentType: string
  onChange: (patch: Partial<QuizEditorDraft>) => void
}

function platformHint(label: string, allowed: boolean) {
  return allowed
    ? `Students can start this assessment on ${label.toLowerCase()}.`
    : `Students cannot start this assessment on ${label.toLowerCase()}.`
}

export function FacultyAssessmentPlatformAccessSection({
  scope,
  draft,
  assessmentType,
  onChange,
}: Props) {
  const [courseFlags, setCourseFlags] = useState<AssessmentPlatformFlags>(
    DEFAULT_ASSESSMENT_PLATFORM_FLAGS,
  )

  useEffect(() => {
    let cancelled = false
    void instructorAdminApi
      .getAssessmentGovernance(scope)
      .then((data) => {
        if (cancelled) return
        const access = extractAssessmentPlatformAccess(data)
        setCourseFlags(access[resolveAssessmentPlatformKind(assessmentType)])
      })
      .catch(() => {
        if (!cancelled) setCourseFlags({ ...DEFAULT_ASSESSMENT_PLATFORM_FLAGS })
      })
    return () => {
      cancelled = true
    }
  }, [scope.instructorId, scope.courseId, assessmentType])

  const inherit = draft.inherit_platform_access
  const effective = inherit ? courseFlags : draft.platform_access
  const courseLabel = assessmentPlatformFlagsLabel(courseFlags)

  return (
    <EditorSectionCard
      icon="phone-portrait-outline"
      title="Where students may take this assessment"
      subtitle={`Course default for this type: ${courseLabel}. Override only this assessment if it should differ.`}
    >
      <EditorToggleRow
        label="Use course default"
        hint={
          inherit
            ? `Inherits ${courseLabel} from Assessment Governance.`
            : "This assessment uses its own platform list."
        }
        value={inherit}
        onValueChange={(v) =>
          onChange({
            inherit_platform_access: v,
            platform_access: v ? draft.platform_access : { ...courseFlags },
          })
        }
      />
      <EditorToggleRow
        label="Website"
        hint={platformHint("website", effective.web)}
        value={effective.web}
        disabled={inherit}
        nested
        onValueChange={(v) => onChange({ platform_access: { ...draft.platform_access, web: v } })}
      />
      <EditorToggleRow
        label="Mobile app"
        hint={platformHint("mobile app", effective.mobile)}
        value={effective.mobile}
        disabled={inherit}
        nested
        onValueChange={(v) => onChange({ platform_access: { ...draft.platform_access, mobile: v } })}
      />
      <EditorToggleRow
        label="Desktop app"
        hint={platformHint("desktop app", effective.desktop)}
        value={effective.desktop}
        disabled={inherit}
        nested
        onValueChange={(v) =>
          onChange({ platform_access: { ...draft.platform_access, desktop: v } })
        }
      />
    </EditorSectionCard>
  )
}
