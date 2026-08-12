import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { BrandLoadingMark } from "../login/BrandLoadingMark"
import type { QuestionPrepareStep } from "../../lib/question-prepare"

type Props = {
  visible: boolean
  title: string
  subtitle?: string
  steps: QuestionPrepareStep[]
  questionCount?: number
}

function StepIcon({ status, accent }: { status: QuestionPrepareStep["status"]; accent: string }) {
  if (status === "done") {
    return <Ionicons name="checkmark-circle" size={20} color={accent} />
  }
  if (status === "active") {
    return <ActivityIndicator size="small" color={accent} />
  }
  return <View style={[styles.stepDot, { borderColor: accent }]} />
}

export function QuestionPrepareLoadingOverlay({
  visible,
  title,
  subtitle,
  steps,
  questionCount = 0,
}: Props) {
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const doneCount = steps.filter((step) => step.status === "done").length
  const progress = steps.length > 0 ? doneCount / steps.length : 0
  const allDone = steps.length > 0 && doneCount === steps.length

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={() => {}}>
      <View style={[styles.backdrop, { backgroundColor: native.groupedBackground }]}>
        <View style={[styles.content, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
          {allDone ? (
            <View style={styles.doneMark}>
              <Ionicons name="checkmark-circle" size={56} color={tokens.accent} />
            </View>
          ) : (
            <BrandLoadingMark color={tokens.accent} />
          )}

          <View style={styles.copy}>
            <Text style={[styles.title, { color: native.label }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: native.secondaryLabel }]}>
              {subtitle ??
                (questionCount > 0
                  ? `Getting ${questionCount} question${questionCount === 1 ? "" : "s"} ready for you`
                  : "Preparing question content")}
            </Text>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: native.fill }]}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: tokens.accent }]} />
          </View>

          <View style={[styles.stepsCard, tokens.cardShadow, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
            {steps.map((step) => (
              <View key={step.id} style={styles.stepRow}>
                <StepIcon status={step.status} accent={tokens.accent} />
                <Text
                  style={[
                    styles.stepLabel,
                    { color: step.status === "pending" ? native.tertiaryLabel : native.label },
                    step.status === "active" && styles.stepLabelActive,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            ))}
          </View>

          {!allDone ? (
            <Text style={[styles.waitHint, { color: native.secondaryLabel }]}>
              This usually takes a few seconds for math-heavy sets.
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 18,
  },
  copy: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  stepsCard: {
    width: "100%",
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 2,
    opacity: 0.35,
  },
  stepLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  stepLabelActive: {
    fontWeight: "600",
  },
  doneMark: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
  },
  waitHint: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 16,
  },
})
