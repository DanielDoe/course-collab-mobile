import { useCallback, useEffect, useState } from "react"
import { instructorAdminApi } from "../../../lib/instructor-admin-api"
import type { CourseModuleSettings } from "../../../lib/course-module-settings"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import {
  FacultyAdminCourseGate,
  FacultyAdminScreen,
  FacultyAdminSection,
  FacultyAdminToggleRow,
  useAdminSaveState,
} from "../faculty-admin-ui"

type ModuleToggleKey = keyof CourseModuleSettings

const MODULE_TOGGLES: Array<{ key: ModuleToggleKey; label: string; subtitle?: string }> = [
  { key: "lectures", label: "Lectures", subtitle: "Week-by-week lecture content and materials." },
  { key: "attendance", label: "Attendance", subtitle: "QR check-in and attendance tracking." },
  { key: "practiceHub", label: "Practice Hub", subtitle: "Student practice quizzes and circuits." },
  { key: "codeBench", label: "CodeBench IDE", subtitle: "Multi-language in-browser coding workspace." },
  { key: "aiTutor", label: "AI Tutor", subtitle: "AI-assisted tutoring for students." },
  { key: "questionBank", label: "Question Bank", subtitle: "Shared assessment question library." },
  { key: "announcements", label: "Announcements", subtitle: "Course-wide announcements feed." },
]

export function FacultyCourseSettingsScreen() {
  return (
    <FacultyAdminCourseGate>
      <FacultyCourseSettingsContent />
    </FacultyAdminCourseGate>
  )
}

function FacultyCourseSettingsContent() {
  const { scope } = useFacultyScope()
  const { dirty, saving, error, successMessage, markDirty, resetDirty, setError, clearError, runSave } =
    useAdminSaveState()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [settings, setSettings] = useState<CourseModuleSettings | null>(null)

  const load = useCallback(async () => {
    if (!scope) return
    clearError()
    try {
      const data = await instructorAdminApi.getModuleSettings(scope)
      setSettings(data)
      resetDirty()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load module settings.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [scope, clearError, resetDirty, setError])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    void load()
  }, [load])

  const updateToggle = useCallback(
    (key: ModuleToggleKey, value: boolean) => {
      setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
      markDirty()
    },
    [markDirty],
  )

  const handleSave = useCallback(() => {
    if (!scope || !settings) return
    void runSave(async () => {
      await instructorAdminApi.patchModuleSettings(scope, settings)
    })
  }, [scope, settings, runSave])

  return (
    <FacultyAdminScreen
      title="Course Modules"
      loading={loading}
      saving={saving}
      refreshing={refreshing}
      error={error || null}
      dirty={dirty}
      successMessage={successMessage}
      onSave={handleSave}
      onRefresh={onRefresh}
    >
      <FacultyAdminSection
        title="Enabled Modules"
        footer="Disabled modules are hidden from students and teaching assistants for this course."
      >
        {MODULE_TOGGLES.map(({ key, label, subtitle }) => (
          <FacultyAdminToggleRow
            key={key}
            label={label}
            subtitle={subtitle}
            value={settings?.[key] ?? false}
            onChange={(next) => updateToggle(key, next)}
          />
        ))}
      </FacultyAdminSection>
    </FacultyAdminScreen>
  )
}
