import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../../lib/api"
import { instructorAdminApi, type AiTutorSettings } from "../../../lib/instructor-admin-api"
import {
  CORA_COURSE_ROUTING_OPTIONS,
  normalizeCoraCourseRoutingPolicy,
  type CoraCourseRoutingPolicy,
} from "../../../lib/cora/models/course-policy"
import {
  AI_ASSISTANT_ACCESS_TOGGLES,
  AI_ASSISTANT_PEDAGOGY_TOGGLES,
  AI_ASSISTANT_PUBLIC_MODES,
  AI_ASSISTANT_RESPONSE_STYLES,
  STUDENT_CORA_SETTING_CAPABILITIES,
  STUDENT_WRITE_POLICY,
  WORD_LIMIT_MAX,
  WORD_LIMIT_MIN,
  WORD_LIMIT_STEP,
  aiAssistantSettingsMatchQuery,
  clampAiAssistantWordLimit,
  type AiAssistantResponseStyle,
} from "../../../lib/faculty-ai-assistant-settings"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { FACULTY_ADMIN_COLOR } from "../../../lib/faculty-admin-theme"
import { FacultyModuleTabBar, FacultySearchToolbar } from "../faculty-module-shell"
import {
  FacultyAdminCourseGate,
  FacultyAdminScreen,
  FacultyAdminSection,
  FacultyAdminTierGate,
  FacultyAdminToggleRow,
  useAdminSaveState,
  useAdminStyles,
} from "../faculty-admin-ui"

type SettingsTab = "access" | "teaching" | "capabilities" | "routing"

const SETTINGS_TABS: Array<{ id: SettingsTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "access", label: "Access", icon: "lock-open-outline" },
  { id: "teaching", label: "Teaching", icon: "school-outline" },
  { id: "capabilities", label: "Capabilities", icon: "sparkles-outline" },
  { id: "routing", label: "Routing", icon: "git-branch-outline" },
]

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
    maxResponseLength: clampAiAssistantWordLimit(raw.maxResponseLength ?? DEFAULT_SETTINGS.maxResponseLength),
    responseStyle: (raw.responseStyle as AiAssistantResponseStyle) ?? DEFAULT_SETTINGS.responseStyle,
    aiModel: normalizeCoraCourseRoutingPolicy(raw.aiModel),
    enableHints: raw.enableHints ?? DEFAULT_SETTINGS.enableHints,
    enableStepByStep: raw.enableStepByStep ?? DEFAULT_SETTINGS.enableStepByStep,
    enableCodeExamples: raw.enableCodeExamples ?? DEFAULT_SETTINGS.enableCodeExamples,
  }
}

export function FacultyAiAssistantSettingsScreen() {
  return (
    <FacultyAdminTierGate minTier="Pro" featureLabel="Cora Assistant Settings">
      <FacultyAiAssistantSettingsContent />
    </FacultyAdminTierGate>
  )
}

function FacultyAiAssistantSettingsContent() {
  const { scope, ready } = useFacultyScope()
  const { dirty, saving, error, successMessage, markDirty, resetDirty, runSave } = useAdminSaveState()
  const adminStyles = useAdminStyles()
  const { native, type } = adminStyles

  const [tab, setTab] = useState<SettingsTab>("access")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [search, setSearch] = useState("")
  const [settings, setSettings] = useState<Required<AiTutorSettings>>(DEFAULT_SETTINGS)

  const load = useCallback(async () => {
    if (!scope) return
    setLoadError("")
    try {
      const next = normalizeSettings(await instructorAdminApi.getAiTutorSettings(scope))
      setSettings(next)
      resetDirty()
    } catch (err) {
      setSettings(DEFAULT_SETTINGS)
      setLoadError(err instanceof ApiError ? err.message : "Could not load Cora Assistant settings.")
    }
  }, [scope, resetDirty])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    void load().finally(() => setLoading(false))
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

  const routingPolicy = normalizeCoraCourseRoutingPolicy(settings.aiModel)
  const q = search.trim()

  const accessToggles = AI_ASSISTANT_ACCESS_TOGGLES.filter((item) =>
    aiAssistantSettingsMatchQuery(q, [item.label, item.description]),
  )
  const pedagogyToggles = AI_ASSISTANT_PEDAGOGY_TOGGLES.filter((item) =>
    aiAssistantSettingsMatchQuery(q, [item.label, item.description]),
  )
  const capabilities = STUDENT_CORA_SETTING_CAPABILITIES.filter((item) =>
    aiAssistantSettingsMatchQuery(q, [item.title, item.description, "what cora can do"]),
  )
  const showWrites = aiAssistantSettingsMatchQuery(q, ["student writes", "confirm", STUDENT_WRITE_POLICY])
  const showRouting = aiAssistantSettingsMatchQuery(q, [
    "routing",
    "model",
    "cora",
    "reasoning",
    "lite",
    "response",
    "style",
    "length",
    "words",
    ...CORA_COURSE_ROUTING_OPTIONS.flatMap((o) => [o.label, o.note]),
    ...AI_ASSISTANT_RESPONSE_STYLES.flatMap((o) => [o.label, o.description]),
  ])
  const tabHasMatches =
    (tab === "access" && accessToggles.length > 0) ||
    (tab === "teaching" && pedagogyToggles.length > 0) ||
    (tab === "capabilities" && (capabilities.length > 0 || showWrites)) ||
    (tab === "routing" && showRouting)

  const styles = useMemo(
    () =>
      StyleSheet.create({
        optionRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 12,
          minHeight: NATIVE.rowMinHeight,
          paddingHorizontal: 14,
          paddingVertical: 12,
        },
        optionCopy: { flex: 1, gap: 3 },
        optionLabel: { ...type.bodyEmphasis, color: native.label },
        optionNote: { ...type.caption, color: native.secondaryLabel, lineHeight: 18 },
        infoIcon: {
          width: 36,
          height: 36,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: native.fill,
        },
        stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
        stepBtn: {
          width: 36,
          height: 36,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: native.fill,
        },
        wordValue: { ...type.bodyEmphasis, color: native.label, minWidth: 84, textAlign: "right" },
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
        resetRowText: { ...type.bodyEmphasis, color: FACULTY_ADMIN_COLOR.link },
      }),
    [native, type],
  )

  return (
    <FacultyAdminCourseGate>
      <FacultySearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Filter Cora Assistant settings…"
        showFilter={false}
      />
      <FacultyAdminScreen
        loading={loading}
        saving={saving}
        refreshing={refreshing}
        error={error || loadError || null}
        dirty={dirty}
        successMessage={successMessage}
        onSave={handleSave}
        onRefresh={() => void handleRefresh()}
        suppressSearchDock={false}
      >
        <FacultyModuleTabBar tabs={SETTINGS_TABS} tab={tab} onChange={setTab} scrollable />

        {tab === "access" && accessToggles.length > 0 ? (
          <FacultyAdminSection
            title="Cora Assistant Access"
            footer="Course-level gates for the student Cora Assistant — the same product students open from Cora Assistant."
          >
            {accessToggles.map((item, index) => (
              <FacultyAdminToggleRow
                key={item.key}
                label={item.label}
                subtitle={item.description}
                value={Boolean(settings[item.key])}
                disabled={item.key !== "enableAITutor" && !settings.enableAITutor}
                onChange={(next) => patch({ [item.key]: next })}
                isLast={index === accessToggles.length - 1}
              />
            ))}
          </FacultyAdminSection>
        ) : null}

        {tab === "teaching" && pedagogyToggles.length > 0 ? (
          <FacultyAdminSection
            title="Cora Teaching Style"
            footer="How student Cora guides work. These map to Cora Assistant preferences (hints, steps, examples)."
          >
            {pedagogyToggles.map((item, index) => (
              <FacultyAdminToggleRow
                key={item.key}
                label={item.label}
                subtitle={item.description}
                value={Boolean(settings[item.key])}
                disabled={!settings.enableAITutor}
                onChange={(next) => patch({ [item.key]: next })}
                isLast={index === pedagogyToggles.length - 1}
              />
            ))}
          </FacultyAdminSection>
        ) : null}

        {tab === "capabilities" && capabilities.length > 0 ? (
          <FacultyAdminSection
            title="What Cora Can Do"
            footer="Student Cora capabilities — the same actions on the student Cora Assistant home."
          >
            {capabilities.map((cap, index) => (
              <InfoRow
                key={cap.id}
                icon="sparkles-outline"
                label={cap.title}
                note={cap.description}
                isLast={index === capabilities.length - 1}
                styles={styles}
                native={native}
              />
            ))}
          </FacultyAdminSection>
        ) : null}

        {tab === "capabilities" && showWrites ? (
          <FacultyAdminSection
            title="Student Writes"
            footer="Consequential student actions never execute from a chat yes. Cora shows a Confirm card first."
          >
            <InfoRow
              icon="shield-checkmark-outline"
              label="Confirm before save"
              note={STUDENT_WRITE_POLICY}
              isLast
              styles={styles}
              native={native}
            />
          </FacultyAdminSection>
        ) : null}

        {tab === "routing" && showRouting ? (
          <>
            <FacultyAdminSection
              title="Cora Routing"
              footer="Course policy for how Cora selects intelligence. The server still owns the model. Students see Cora, Cora Lite, or Advanced Reasoning — not provider names."
            >
              {CORA_COURSE_ROUTING_OPTIONS.map((option, index) => (
                <ChoiceRow
                  key={option.value}
                  label={option.label}
                  note={option.note}
                  selected={routingPolicy === option.value}
                  onPress={() => patch({ aiModel: option.value as CoraCourseRoutingPolicy })}
                  isLast={index === CORA_COURSE_ROUTING_OPTIONS.length - 1}
                  styles={styles}
                  native={native}
                />
              ))}
            </FacultyAdminSection>

            <FacultyAdminSection title="What Students See" footer="Public Cora modes — never provider or model names.">
              {AI_ASSISTANT_PUBLIC_MODES.map((mode, index) => (
                <InfoRow
                  key={mode.label}
                  icon="eye-outline"
                  label={mode.label}
                  note={mode.note}
                  isLast={index === AI_ASSISTANT_PUBLIC_MODES.length - 1}
                  styles={styles}
                  native={native}
                />
              ))}
            </FacultyAdminSection>

            <FacultyAdminSection
              title="Response Style"
              footer="How Cora Assistant phrases answers for students."
            >
              {AI_ASSISTANT_RESPONSE_STYLES.map((style, index) => (
                <ChoiceRow
                  key={style.value}
                  label={style.label}
                  note={style.description}
                  selected={settings.responseStyle === style.value}
                  disabled={!settings.enableAITutor}
                  onPress={() => patch({ responseStyle: style.value })}
                  isLast={index === AI_ASSISTANT_RESPONSE_STYLES.length - 1}
                  styles={styles}
                  native={native}
                />
              ))}
            </FacultyAdminSection>

            <FacultyAdminSection
              title="Max Response Length"
              footer="Cap reply size in words. Recommended 300–500."
            >
              <View style={styles.optionRow}>
                <View style={styles.optionCopy}>
                  <Text style={styles.optionLabel}>Word cap</Text>
                  <Text style={styles.optionNote}>
                    {WORD_LIMIT_MIN}–{WORD_LIMIT_MAX} words · steps of {WORD_LIMIT_STEP}
                  </Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Decrease word limit"
                    disabled={!settings.enableAITutor || settings.maxResponseLength <= WORD_LIMIT_MIN}
                    onPress={() =>
                      patch({
                        maxResponseLength: clampAiAssistantWordLimit(settings.maxResponseLength - WORD_LIMIT_STEP),
                      })
                    }
                    style={[
                      styles.stepBtn,
                      (!settings.enableAITutor || settings.maxResponseLength <= WORD_LIMIT_MIN) && { opacity: 0.4 },
                    ]}
                  >
                    <Ionicons name="remove" size={18} color={native.label} />
                  </Pressable>
                  <Text style={styles.wordValue}>{settings.maxResponseLength} words</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Increase word limit"
                    disabled={!settings.enableAITutor || settings.maxResponseLength >= WORD_LIMIT_MAX}
                    onPress={() =>
                      patch({
                        maxResponseLength: clampAiAssistantWordLimit(settings.maxResponseLength + WORD_LIMIT_STEP),
                      })
                    }
                    style={[
                      styles.stepBtn,
                      (!settings.enableAITutor || settings.maxResponseLength >= WORD_LIMIT_MAX) && { opacity: 0.4 },
                    ]}
                  >
                    <Ionicons name="add" size={18} color={native.label} />
                  </Pressable>
                </View>
              </View>
            </FacultyAdminSection>
          </>
        ) : null}

        {!tabHasMatches ? (
          <FacultyAdminSection title="No Matches" footer="Try another tab or a different search term.">
            <InfoRow
              icon="search-outline"
              label="No settings match"
              note="This tab has no rows for the current filter."
              isLast
              styles={styles}
              native={native}
            />
          </FacultyAdminSection>
        ) : null}

        <FacultyAdminSection
          title="Restore Defaults"
          footer="Resets every setting to platform defaults. Tap Save Changes to persist."
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
    </FacultyAdminCourseGate>
  )
}

function ChoiceRow({
  label,
  note,
  selected,
  onPress,
  disabled,
  isLast,
  styles,
  native,
}: {
  label: string
  note: string
  selected: boolean
  onPress: () => void
  disabled?: boolean
  isLast?: boolean
  styles: ReturnType<typeof StyleSheet.create>
  native: { label: string; secondaryLabel: string; separator: string; fill: string }
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: native.fill }}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
      accessibilityLabel={`${label}. ${note}`}
      style={({ pressed }) => [
        styles.optionRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: native.separator },
        pressed && !disabled && { opacity: NATIVE.pressedOpacity },
        disabled && { opacity: 0.45 },
      ]}
    >
      <View style={styles.optionCopy}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionNote}>{note}</Text>
      </View>
      <Ionicons
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={22}
        color={selected ? FACULTY_ADMIN_COLOR.link : native.secondaryLabel}
      />
    </Pressable>
  )
}

function InfoRow({
  icon,
  label,
  note,
  isLast,
  styles,
  native,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  note: string
  isLast?: boolean
  styles: ReturnType<typeof StyleSheet.create>
  native: { label: string; secondaryLabel: string; separator: string }
}) {
  return (
    <View
      style={[
        styles.optionRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: native.separator },
      ]}
    >
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={FACULTY_ADMIN_COLOR.link} />
      </View>
      <View style={styles.optionCopy}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionNote}>{note}</Text>
      </View>
    </View>
  )
}
