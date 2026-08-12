import { useCallback, useEffect, useMemo, useState } from "react"
import { instructorAdminApi, type AiTutorSettings } from "../../../lib/instructor-admin-api"
import { AI_MODEL_OPTIONS } from "../../../lib/faculty-quiz-editor-config"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import {
  FacultyAdminCourseGate,
  FacultyAdminNumberField,
  FacultyAdminScreen,
  FacultyAdminSection,
  FacultyAdminSelectRow,
  FacultyAdminToggleRow,
  useAdminSaveState,
} from "../faculty-admin-ui"
import { AdminOptionPickerModal, type AdminOption } from "./admin-option-picker"

type ResponseStyle = "helpful" | "concise" | "encouraging"

const RESPONSE_STYLE_OPTIONS: AdminOption<ResponseStyle>[] = [
  { value: "helpful", label: "Helpful" },
  { value: "concise", label: "Concise" },
  { value: "encouraging", label: "Encouraging" },
]

const AI_MODEL_PICKER_OPTIONS: AdminOption<string>[] = AI_MODEL_OPTIONS.map((m) => ({
  value: m.id,
  label: m.label,
}))

const DEFAULT_SETTINGS: Required<AiTutorSettings> = {
  enableAITutor: true,
  allowCodeDebugging: true,
  allowPracticeGeneration: true,
  maxResponseLength: 500,
  responseStyle: "helpful",
  aiModel: "auto",
  enableHints: true,
  enableStepByStep: true,
  enableCodeExamples: true,
}

function normalizeSettings(raw: AiTutorSettings): Required<AiTutorSettings> {
  return {
    enableAITutor: raw.enableAITutor ?? DEFAULT_SETTINGS.enableAITutor,
    allowCodeDebugging: raw.allowCodeDebugging ?? DEFAULT_SETTINGS.allowCodeDebugging,
    allowPracticeGeneration: raw.allowPracticeGeneration ?? DEFAULT_SETTINGS.allowPracticeGeneration,
    maxResponseLength: raw.maxResponseLength ?? DEFAULT_SETTINGS.maxResponseLength,
    responseStyle: (raw.responseStyle as ResponseStyle) ?? DEFAULT_SETTINGS.responseStyle,
    aiModel: raw.aiModel ?? DEFAULT_SETTINGS.aiModel,
    enableHints: raw.enableHints ?? DEFAULT_SETTINGS.enableHints,
    enableStepByStep: raw.enableStepByStep ?? DEFAULT_SETTINGS.enableStepByStep,
    enableCodeExamples: raw.enableCodeExamples ?? DEFAULT_SETTINGS.enableCodeExamples,
  }
}

export function FacultyAiAssistantSettingsScreen() {
  const { scope, ready } = useFacultyScope()
  const { dirty, saving, error, successMessage, markDirty, resetDirty, runSave } = useAdminSaveState()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [settings, setSettings] = useState<Required<AiTutorSettings>>(DEFAULT_SETTINGS)
  const [stylePickerOpen, setStylePickerOpen] = useState(false)
  const [modelPickerOpen, setModelPickerOpen] = useState(false)

  const load = useCallback(async () => {
    if (!scope) return
    const next = normalizeSettings(await instructorAdminApi.getAiTutorSettings(scope))
    setSettings(next)
    resetDirty()
  }, [scope, resetDirty])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [ready, load])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  function patch(partial: Partial<Required<AiTutorSettings>>) {
    setSettings((prev) => ({ ...prev, ...partial }))
    markDirty()
  }

  function handleSave() {
    if (!scope) return
    void runSave(async () => {
      await instructorAdminApi.saveAiTutorSettings(scope, settings)
      await load()
    })
  }

  const styleLabel =
    RESPONSE_STYLE_OPTIONS.find((o) => o.value === settings.responseStyle)?.label ?? settings.responseStyle

  const modelLabel = useMemo(() => {
    const known = AI_MODEL_OPTIONS.find((m) => m.id === settings.aiModel)
    if (known) return known.label
    if (settings.aiModel?.startsWith("gpt-")) return `OpenAI · ${settings.aiModel}`
    if (settings.aiModel?.startsWith("claude")) return `Claude · ${settings.aiModel}`
    return settings.aiModel || "Smart routing"
  }, [settings.aiModel])

  return (
    <FacultyAdminCourseGate>
      <FacultyAdminScreen
        title="AI Assistant"
        loading={loading}
        saving={saving}
        refreshing={refreshing}
        error={error}
        dirty={dirty}
        successMessage={successMessage}
        onSave={handleSave}
        onRefresh={() => void handleRefresh()}
      >
        <FacultyAdminSection title="Availability">
          <FacultyAdminToggleRow
            label="Enable AI Tutor"
            value={settings.enableAITutor}
            onChange={(next) => patch({ enableAITutor: next })}
          />
          <FacultyAdminToggleRow
            label="Allow Code Debugging"
            value={settings.allowCodeDebugging}
            onChange={(next) => patch({ allowCodeDebugging: next })}
          />
          <FacultyAdminToggleRow
            label="Allow Practice Generation"
            value={settings.allowPracticeGeneration}
            onChange={(next) => patch({ allowPracticeGeneration: next })}
          />
        </FacultyAdminSection>

        <FacultyAdminSection title="Response Behavior">
          <FacultyAdminToggleRow
            label="Enable Hints"
            value={settings.enableHints}
            onChange={(next) => patch({ enableHints: next })}
          />
          <FacultyAdminToggleRow
            label="Enable Step-by-Step"
            value={settings.enableStepByStep}
            onChange={(next) => patch({ enableStepByStep: next })}
          />
          <FacultyAdminToggleRow
            label="Enable Code Examples"
            value={settings.enableCodeExamples}
            onChange={(next) => patch({ enableCodeExamples: next })}
          />
          <FacultyAdminNumberField
            label="Max Response Length"
            value={String(settings.maxResponseLength)}
            onChangeText={(text) => {
              const n = parseInt(text, 10)
              patch({ maxResponseLength: Number.isFinite(n) ? n : settings.maxResponseLength })
            }}
          />
          <FacultyAdminSelectRow
            label="Response Style"
            valueLabel={styleLabel}
            onPress={() => setStylePickerOpen(true)}
          />
        </FacultyAdminSection>

        <FacultyAdminSection title="Model">
          <FacultyAdminSelectRow
            label="AI Model"
            valueLabel={modelLabel}
            onPress={() => setModelPickerOpen(true)}
          />
        </FacultyAdminSection>
      </FacultyAdminScreen>

      <AdminOptionPickerModal
        visible={stylePickerOpen}
        title="Response Style"
        options={RESPONSE_STYLE_OPTIONS}
        value={settings.responseStyle as ResponseStyle}
        onSelect={(value) => patch({ responseStyle: value })}
        onClose={() => setStylePickerOpen(false)}
      />

      <AdminOptionPickerModal
        visible={modelPickerOpen}
        title="AI Model"
        options={AI_MODEL_PICKER_OPTIONS}
        value={settings.aiModel}
        onSelect={(value) => patch({ aiModel: value })}
        onClose={() => setModelPickerOpen(false)}
      />
    </FacultyAdminCourseGate>
  )
}
