import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { instructorAdminApi, type AiTutorSettings } from "../../../lib/instructor-admin-api"
import {
  CORA_COURSE_ROUTING_OPTIONS,
  normalizeCoraCourseRoutingPolicy,
  type CoraCourseRoutingPolicy,
} from "../../../lib/cora/models/course-policy"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { FACULTY_ADMIN_COLOR } from "../../../lib/faculty-admin-theme"
import { FacultyModuleTabBar } from "../faculty-module-shell"
import {
  FacultyAdminCourseGate,
  FacultyAdminChoiceField,
  FacultyAdminScreen,
  FacultyAdminSection,
  FacultyAdminSelectRow,
  FacultyAdminTierGate,
  FacultyAdminToggleRow,
  useAdminSaveState,
  useAdminStyles,
} from "../faculty-admin-ui"
import { AdminOptionPickerModal, type AdminOption } from "./admin-option-picker"
import { CHAR_LIMIT_OPTIONS } from "../FacultyNativePickers"

type ResponseStyle = "helpful" | "concise" | "encouraging"
type SettingsTab = "availability" | "response" | "routing"

const TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: "availability", label: "Availability" },
  { id: "response", label: "Response" },
  { id: "routing", label: "Routing" },
]

const RESPONSE_STYLE_OPTIONS: AdminOption<ResponseStyle>[] = [
  { value: "helpful", label: "Helpful" },
  { value: "concise", label: "Concise" },
  { value: "encouraging", label: "Encouraging" },
]

const ROUTING_PICKER_OPTIONS: AdminOption<CoraCourseRoutingPolicy>[] = CORA_COURSE_ROUTING_OPTIONS.map((m) => ({
  value: m.value,
  label: `${m.label} — ${m.note}`,
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
    aiModel: normalizeCoraCourseRoutingPolicy(raw.aiModel),
    enableHints: raw.enableHints ?? DEFAULT_SETTINGS.enableHints,
    enableStepByStep: raw.enableStepByStep ?? DEFAULT_SETTINGS.enableStepByStep,
    enableCodeExamples: raw.enableCodeExamples ?? DEFAULT_SETTINGS.enableCodeExamples,
  }
}

export function FacultyAiAssistantSettingsScreen() {
  return (
    <FacultyAdminTierGate minTier="Pro" featureLabel="AI Assistant Settings">
      <FacultyAiAssistantSettingsContent />
    </FacultyAdminTierGate>
  )
}

function FacultyAiAssistantSettingsContent() {
  const { scope, ready } = useFacultyScope()
  const { dirty, saving, error, successMessage, markDirty, resetDirty, runSave } = useAdminSaveState()

  const [tab, setTab] = useState<SettingsTab>("availability")
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

  function handleReset() {
    setSettings({ ...DEFAULT_SETTINGS })
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

  const routingPolicy = normalizeCoraCourseRoutingPolicy(settings.aiModel)
  const routingOption =
    CORA_COURSE_ROUTING_OPTIONS.find((o) => o.value === routingPolicy) ?? CORA_COURSE_ROUTING_OPTIONS[0]
  const routingLabel = routingOption.label

  const adminStyles = useAdminStyles()
  const { native, type } = adminStyles
  const styles = useMemo(
    () =>
      StyleSheet.create({
        resetRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minHeight: NATIVE.rowMinHeight,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: native.secondaryGrouped,
        },
        resetRowText: {
          ...type.bodyEmphasis,
          color: FACULTY_ADMIN_COLOR.link,
        },
      }),
    [native, type],
  )

  return (
    <FacultyAdminCourseGate>
      <FacultyAdminScreen
        loading={loading}
        saving={saving}
        refreshing={refreshing}
        error={error}
        dirty={dirty}
        successMessage={successMessage}
        onSave={handleSave}
        onRefresh={() => void handleRefresh()}
      >
        <FacultyModuleTabBar tabs={TABS} tab={tab} onChange={setTab} scrollable />

        {tab === "availability" ? (
          <FacultyAdminSection
            title="Student Access"
            footer="Controls which AI tutor capabilities students can use in this course."
          >
            <FacultyAdminToggleRow
              label="Enable AI Tutor"
              value={settings.enableAITutor}
              onChange={(next) => patch({ enableAITutor: next })}
            />
            <FacultyAdminToggleRow
              label="Allow Code Debugging"
              value={settings.allowCodeDebugging}
              disabled={!settings.enableAITutor}
              onChange={(next) => patch({ allowCodeDebugging: next })}
            />
            <FacultyAdminToggleRow
              label="Allow Practice Generation"
              value={settings.allowPracticeGeneration}
              disabled={!settings.enableAITutor}
              onChange={(next) => patch({ allowPracticeGeneration: next })}
            />
          </FacultyAdminSection>
        ) : null}

        {tab === "response" ? (
          <FacultyAdminSection
            title="Response Behavior"
            footer="Shape how the tutor explains concepts, hints, and example code."
          >
            <FacultyAdminToggleRow
              label="Enable Hints"
              value={settings.enableHints}
              disabled={!settings.enableAITutor}
              onChange={(next) => patch({ enableHints: next })}
            />
            <FacultyAdminToggleRow
              label="Enable Step-by-Step"
              value={settings.enableStepByStep}
              disabled={!settings.enableAITutor}
              onChange={(next) => patch({ enableStepByStep: next })}
            />
            <FacultyAdminToggleRow
              label="Enable Code Examples"
              value={settings.enableCodeExamples}
              disabled={!settings.enableAITutor}
              onChange={(next) => patch({ enableCodeExamples: next })}
            />
            <FacultyAdminChoiceField
              label="Max Response Length"
              value={String(settings.maxResponseLength)}
              options={CHAR_LIMIT_OPTIONS}
              disabled={!settings.enableAITutor}
              onChange={(text) => {
                const n = parseInt(text, 10)
                patch({ maxResponseLength: Number.isFinite(n) ? n : settings.maxResponseLength })
              }}
            />
            <FacultyAdminSelectRow
              label="Response Style"
              valueLabel={styleLabel}
              disabled={!settings.enableAITutor}
              onPress={() => setStylePickerOpen(true)}
            />
          </FacultyAdminSection>
        ) : null}

        {tab === "routing" ? (
          <FacultyAdminSection
            title="Cora routing"
            footer={`${routingOption.note}. Students see Cora, Cora Lite, or Advanced Reasoning — not provider names.`}
          >
            <FacultyAdminSelectRow
              label="Course policy"
              valueLabel={routingLabel}
              onPress={() => setModelPickerOpen(true)}
            />
          </FacultyAdminSection>
        ) : null}

        <FacultyAdminSection
          title="Restore Defaults"
          footer="Resets every tab to platform defaults. Tap Save Changes to persist."
        >
          <Pressable
            style={({ pressed }) => [styles.resetRow, pressed && { opacity: NATIVE.pressedOpacity }]}
            onPress={handleReset}
            accessibilityRole="button"
            accessibilityLabel="Reset to defaults"
          >
            <Ionicons name="refresh-outline" size={18} color={FACULTY_ADMIN_COLOR.link} />
            <Text style={styles.resetRowText}>Reset to Defaults</Text>
          </Pressable>
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
        title="Cora routing"
        options={ROUTING_PICKER_OPTIONS}
        value={routingPolicy}
        onSelect={(value) => patch({ aiModel: value })}
        onClose={() => setModelPickerOpen(false)}
      />
    </FacultyAdminCourseGate>
  )
}
