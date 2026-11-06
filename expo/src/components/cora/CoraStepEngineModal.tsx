import { useMemo } from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSession } from "../../context/SessionProvider"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { hexToRgba } from "../../constants/app-themes"
import {
  CORA_DOMAIN_GRADIENT,
  CORA_HINT_LABELS,
  CORA_LOADING_LABEL,
  CORA_NAME,
  CORA_SUBTITLE,
  CORA_TAGLINE,
} from "../../lib/cora-constants"
import type { CoraHintLevel, CoraMode, CoraProblem } from "../../lib/cora-types"
import type { StudentSession } from "../../lib/session"
import { QuestionContentWebView, QuestionMediaView } from "../rewards/QuestionContent"
import { useCoraStepEngine } from "../../hooks/useCoraStepEngine"
import { CoraBrand } from "../cora/CoraBrand"

type Props = {
  visible: boolean
  problem: CoraProblem | null
  onClose: () => void
}

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

export function CoraStepEngineModal({ visible, problem, onClose }: Props) {
  const session = useStudentSession()
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const engine = useCoraStepEngine(session, problem, visible)

  const domain = problem?.domain ?? engine.coraSession?.domain ?? "circuit"
  const headerGradient = CORA_DOMAIN_GRADIENT[domain]

  const media = useMemo(() => {
    if (!problem?.mediaUrl) return null
    return {
      media_url: problem.mediaUrl,
      media_type: "image" as const,
      media_caption: "",
      media_alt_text: problem.title,
    }
  }, [problem])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
        <LinearGradient
          colors={headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.headerEyebrow}>{CORA_TAGLINE}</Text>
              <CoraBrand size="lg" variant="solid" color="#ffffff" style={styles.headerBrand} />
              <Text style={styles.headerSubtitle} numberOfLines={2}>
                {problem?.title ?? CORA_SUBTITLE}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close Cora"
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.8 }]}
            >
              <Ionicons name="close" size={22} color="#ffffff" />
            </Pressable>
          </View>

          <ModeToggle mode={engine.mode} onChange={engine.changeMode} disabled={engine.loading} />
        </LinearGradient>

        {engine.loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={tokens.accent} />
            <Text style={[type.body, { color: native.secondaryLabel }]}>{CORA_LOADING_LABEL}</Text>
          </View>
        ) : engine.error ? (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={36} color={native.secondaryLabel} />
            <Text style={[type.bodyEmphasis, { color: native.label, textAlign: "center" }]}>{engine.error}</Text>
            <Pressable
              style={[styles.retryBtn, { backgroundColor: tokens.accent }]}
              onPress={() => engine.reset()}
            >
              <Text style={styles.retryBtnText}>Try again</Text>
            </Pressable>
          </View>
        ) : engine.finished && engine.coraSession ? (
          <FinishedView session={engine.coraSession} onClose={onClose} onRestart={engine.reset} />
        ) : engine.currentStep && engine.coraSession ? (
          <KeyboardAvoidingView
            style={styles.stepShell}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            <StepRail
              steps={engine.steps}
              activeIndex={engine.stepIndex}
              onSelect={engine.goTo}
            />

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              {media ? <QuestionMediaView media={media} embedded /> : null}

              {problem?.questionText?.trim() && engine.stepIndex === 0 ? (
                <View style={[styles.promptCard, { backgroundColor: native.secondaryGrouped, borderColor: tokens.border }]}>
                  <Text style={[type.caption, styles.sectionLabel, { color: native.secondaryLabel }]}>Problem</Text>
                  <QuestionContentWebView text={problem.questionText} embedded />
                </View>
              ) : null}

              <View style={[styles.stepCard, tokens.cardShadow, { backgroundColor: native.secondaryGrouped, borderColor: tokens.border }]}>
                <View style={styles.stepCardHeader}>
                  <Text style={[type.caption, { color: native.secondaryLabel }]}>
                    Step {engine.stepIndex + 1} of {engine.steps.length}
                  </Text>
                  {engine.coraSession.dataSource === "reference" ? (
                    <View style={[styles.sourceBadge, { backgroundColor: hexToRgba("#10b981", 0.12) }]}>
                      <Text style={[type.caption, { color: "#047857", fontWeight: "600" }]}>Instructor steps</Text>
                    </View>
                  ) : (
                    <View style={[styles.sourceBadge, { backgroundColor: hexToRgba("#6366f1", 0.12) }]}>
                      <Text style={[type.caption, { color: "#4338ca", fontWeight: "600" }]}>Cora AI</Text>
                    </View>
                  )}
                </View>

                <Text style={[type.bodyEmphasis, styles.stepTitle, { color: native.label }]}>{engine.currentStep.title}</Text>
                <QuestionContentWebView text={engine.currentStep.explanation} embedded />

                {engine.mode === "guided" ? (
                  <StepInteraction
                    interaction={engine.currentStep.interaction}
                    reflection={engine.reflections[engine.currentStep.id] ?? ""}
                    onReflectionChange={(value) => engine.setReflection(engine.currentStep!.id, value)}
                    checkpointSelections={engine.checkpointSelections}
                    onCheckpoint={engine.submitCheckpoint}
                    confidence={engine.confidence}
                    onConfidenceChange={engine.setConfidence}
                    nativeLabel={native.label}
                    secondaryLabel={native.secondaryLabel}
                    borderColor={tokens.border}
                    fillColor={native.fill}
                  />
                ) : null}

                {engine.currentStep.hints && engine.currentStep.hints.length > 0 ? (
                  <View style={styles.hintsBlock}>
                    <Text style={[type.caption, styles.sectionLabel, { color: native.secondaryLabel }]}>Hints</Text>
                    <View style={styles.hintButtons}>
                      {engine.currentStep.hints.map((hint) => (
                        <Pressable
                          key={hint.level}
                          style={[
                            styles.hintBtn,
                            { borderColor: tokens.border, backgroundColor: native.groupedBackground },
                            engine.isHintRevealed(hint.level) && {
                              borderColor: tokens.accent,
                              backgroundColor: tokens.accentSoft,
                            },
                          ]}
                          onPress={() => engine.useHint(hint.level)}
                        >
                          <Text style={[type.caption, { color: tokens.accentDark, fontWeight: "600" }]}>
                            {CORA_HINT_LABELS[hint.level]}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    {engine.currentStep.hints
                      .filter((hint) => engine.isHintRevealed(hint.level))
                      .map((hint) => (
                        <View
                          key={`revealed-${hint.level}`}
                          style={[styles.hintReveal, { backgroundColor: native.fill, borderColor: tokens.border }]}
                        >
                          <QuestionContentWebView text={hint.text} embedded compact />
                        </View>
                      ))}
                  </View>
                ) : null}
              </View>
            </ScrollView>

            <View
              style={[
                styles.footer,
                {
                  paddingBottom: Math.max(insets.bottom, 12),
                  backgroundColor: native.secondaryGrouped,
                  borderTopColor: native.separator,
                },
              ]}
            >
              <Pressable
                style={[styles.footerBtn, { borderColor: tokens.border }]}
                disabled={engine.stepIndex === 0}
                onPress={engine.prev}
              >
                <Text style={[type.body, { color: engine.stepIndex === 0 ? native.tertiaryLabel : native.label }]}>
                  Previous
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.footerBtnPrimary,
                  { backgroundColor: tokens.accent },
                  !engine.canAdvance && styles.footerBtnDisabled,
                ]}
                disabled={!engine.canAdvance}
                onPress={engine.next}
              >
                <Text style={styles.footerBtnPrimaryText}>
                  {engine.stepIndex >= engine.steps.length - 1 ? "Finish" : "Next step"}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        ) : null}
      </View>
    </Modal>
  )
}

function ModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: CoraMode
  onChange: (mode: CoraMode) => void
  disabled?: boolean
}) {
  return (
    <View style={styles.modeRow}>
      {(["guided", "explain"] as const).map((value) => {
        const active = mode === value
        return (
          <Pressable
            key={value}
            disabled={disabled}
            onPress={() => onChange(value)}
            style={[styles.modeChip, active && styles.modeChipActive, disabled && styles.modeChipDisabled]}
          >
            <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>
              {value === "guided" ? "Guided" : "Explain"}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function StepRail({
  steps,
  activeIndex,
  onSelect,
}: {
  steps: Array<{ id: string; title: string }>
  activeIndex: number
  onSelect: (index: number) => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.railContent}
      style={[styles.rail, { borderBottomColor: native.separator, backgroundColor: native.secondaryGrouped }]}
    >
      {steps.map((step, index) => {
        const active = index === activeIndex
        const done = index < activeIndex
        return (
          <Pressable
            key={step.id}
            onPress={() => onSelect(index)}
            style={[
              styles.railChip,
              { borderColor: tokens.border, backgroundColor: native.groupedBackground },
              active && { borderColor: tokens.accent, backgroundColor: tokens.accentSoft },
              done && !active && { borderColor: hexToRgba(tokens.accent, 0.35) },
            ]}
          >
            <Text style={[type.caption, { color: active ? tokens.accentDark : native.secondaryLabel, fontWeight: "600" }]}>
              {index + 1}. {step.title}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

function StepInteraction({
  interaction,
  reflection,
  onReflectionChange,
  checkpointSelections,
  onCheckpoint,
  confidence,
  onConfidenceChange,
  nativeLabel,
  secondaryLabel,
  borderColor,
  fillColor,
}: {
  interaction?: import("../../lib/cora-types").CoraStep["interaction"]
  reflection: string
  onReflectionChange: (value: string) => void
  checkpointSelections: Record<string, string>
  onCheckpoint: (checkpointId: string, optionId: string) => void
  confidence: number | null
  onConfidenceChange: (value: number | null) => void
  nativeLabel: string
  secondaryLabel: string
  borderColor: string
  fillColor: string
}) {
  const type = useNativeType()
  if (!interaction) return null

  if (interaction.type === "reflect") {
    return (
      <View style={[styles.interactionCard, { borderColor, backgroundColor: fillColor }]}>
        <QuestionContentWebView text={interaction.prompt} embedded />
        <TextInput
          value={reflection}
          onChangeText={onReflectionChange}
          placeholder={interaction.placeholder ?? "Write your reflection…"}
          placeholderTextColor={secondaryLabel}
          multiline
          style={[styles.reflectInput, { color: nativeLabel, borderColor }]}
        />
      </View>
    )
  }

  if (interaction.type === "checkpoint") {
    const checkpoint = interaction.checkpoint
    const selectedOptionId = checkpointSelections[checkpoint.id]
    return (
      <View style={[styles.interactionCard, { borderColor, backgroundColor: fillColor }]}>
        <QuestionContentWebView text={checkpoint.prompt} embedded />
        <View style={styles.checkpointStack}>
          {checkpoint.options.map((option) => {
            const isSelected = selectedOptionId === option.id
            const showCorrect = isSelected && option.correct
            const showWrong = isSelected && !option.correct
            return (
              <Pressable
                key={option.id}
                style={[
                  styles.checkpointOption,
                  { borderColor },
                  showCorrect && { borderColor: "#059669", backgroundColor: hexToRgba("#059669", 0.08) },
                  showWrong && { borderColor: "#ea580c", backgroundColor: hexToRgba("#ea580c", 0.06) },
                ]}
                onPress={() => onCheckpoint(checkpoint.id, option.id)}
              >
                <QuestionContentWebView text={option.label} embedded compact />
                {isSelected && option.feedback ? (
                  <QuestionContentWebView text={option.feedback} embedded compact />
                ) : null}
              </Pressable>
            )
          })}
        </View>
        {checkpoint.misconception ? (
          <QuestionContentWebView text={checkpoint.misconception} embedded compact />
        ) : null}
      </View>
    )
  }

  if (interaction.type === "confidence") {
    const options =
      interaction.options ??
      [
        { id: "1", label: "Not yet" },
        { id: "2", label: "Getting there" },
        { id: "3", label: "Confident" },
      ]
    return (
      <View style={[styles.interactionCard, { borderColor, backgroundColor: fillColor }]}>
        <QuestionContentWebView text={interaction.prompt} embedded />
        <View style={styles.confidenceRow}>
          {options.map((option, index) => {
            const value = index + 1
            const active = confidence === value
            return (
              <Pressable
                key={option.id}
                style={[styles.confidenceChip, { borderColor }, active && { backgroundColor: hexToRgba("#6366f1", 0.12), borderColor: "#6366f1" }]}
                onPress={() => onConfidenceChange(value)}
              >
                <Text style={[type.caption, { color: active ? "#4338ca" : secondaryLabel, fontWeight: "600" }]}>
                  {option.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    )
  }

  return null
}

function FinishedView({
  session,
  onClose,
  onRestart,
}: {
  session: NonNullable<ReturnType<typeof useCoraStepEngine>["coraSession"]>
  onClose: () => void
  onRestart: () => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const summary = session.summary

  const sections = [
    { title: "Concepts learned", items: summary?.conceptsLearned ?? [] },
    { title: "Skills practiced", items: summary?.skillsPracticed ?? [] },
    { title: "Try next", items: summary?.recommendedNext ?? [] },
  ]

  return (
    <ScrollView contentContainerStyle={styles.finishedContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.finishedHero, tokens.cardShadow, { backgroundColor: native.secondaryGrouped, borderColor: tokens.border }]}>
        <Ionicons name="checkmark-circle" size={42} color={tokens.accent} />
        <Text style={[type.sheetTitle, { color: native.label, textAlign: "center" }]}>Workspace complete</Text>
        <Text style={[type.secondary, { color: native.secondaryLabel, textAlign: "center" }]}>
          You worked through every step with {CORA_NAME}. Review the summary below or restart if you want another pass.
        </Text>
      </View>

      {sections.map((section) =>
        section.items.length > 0 ? (
          <View key={section.title} style={[styles.summarySection, { backgroundColor: native.secondaryGrouped, borderColor: tokens.border }]}>
            <Text style={[type.bodyEmphasis, { color: native.label }]}>{section.title}</Text>
            {section.items.map((item) => (
              <View key={item} style={styles.summaryRow}>
                <Ionicons name="ellipse" size={6} color={tokens.accent} />
                <Text style={[type.secondary, { color: native.secondaryLabel, flex: 1 }]}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null,
      )}

      <View style={styles.finishedActions}>
        <Pressable style={[styles.retryBtn, { backgroundColor: tokens.accent }]} onPress={onRestart}>
          <Text style={styles.retryBtnText}>Restart</Text>
        </Pressable>
        <Pressable style={[styles.footerBtn, { borderColor: tokens.border, flex: 1 }]} onPress={onClose}>
          <Text style={[type.bodyEmphasis, { color: native.label, textAlign: "center" }]}>Done</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stepShell: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  headerEyebrow: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    fontWeight: "600",
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerBrand: {
    marginTop: 2,
    marginBottom: 2,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    lineHeight: 20,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
  },
  modeChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  modeChipActive: {
    backgroundColor: "#ffffff",
  },
  modeChipDisabled: {
    opacity: 0.6,
  },
  modeChipText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontWeight: "700",
  },
  modeChipTextActive: {
    color: "#047857",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  retryBtn: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  rail: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  railContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  railChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 220,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  promptCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  stepCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  stepCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  stepTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  sourceBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sectionLabel: {
    fontWeight: "600",
    textTransform: "none",
  },
  interactionCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 10,
  },
  reflectInput: {
    minHeight: 88,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
    fontSize: 15,
    lineHeight: 21,
  },
  checkpointStack: { gap: 8 },
  checkpointOption: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  confidenceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  confidenceChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hintsBlock: { gap: 8 },
  hintButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  hintBtn: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hintReveal: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 8,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  footerBtn: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  footerBtnPrimary: {
    flex: 1.4,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  footerBtnPrimaryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  footerBtnDisabled: {
    opacity: 0.45,
  },
  finishedContent: {
    padding: 16,
    gap: 12,
  },
  finishedHero: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  summarySection: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingTop: 2,
  },
  finishedActions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 4,
  },
})
