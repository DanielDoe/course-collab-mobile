import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@/components/icons/AppIcon"
import { CoraBrand } from "../cora/CoraBrand"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAuthFlowContentStyle, useIsTabletLayout } from "../../lib/responsive-layout"
import { STUDENT_CORA_COLOR, studentCoraCanvas } from "../../lib/student-cora-theme"
import {
  STUDENT_CORA_SETUP_STEPS,
  type StudentCoraSetupStepId,
} from "../../lib/student-cora-context"

type Props = {
  visible: boolean
  activeStep: StudentCoraSetupStepId
  courseLabel?: string
  focusLabel?: string
}

function stepIndex(step: StudentCoraSetupStepId): number {
  return STUDENT_CORA_SETUP_STEPS.findIndex((row) => row.id === step)
}

export function StudentCoraSetupOverlay({ visible, activeStep, courseLabel, focusLabel }: Props) {
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const canvas = studentCoraCanvas(tokens.isDark, native.groupedBackground)
  const activeIndex = Math.max(0, stepIndex(activeStep))
  const isTablet = useIsTabletLayout()
  const contentStyle = useAuthFlowContentStyle()

  if (!visible) return null

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: canvas,
          paddingTop: insets.top + (isTablet ? 40 : 24),
          paddingBottom: insets.bottom + (isTablet ? 40 : 24),
        },
      ]}
    >
      <View style={[styles.inner, contentStyle]}>
      <View style={styles.hero}>
        <CoraBrand size="md" />
        <Text style={[type.bodyEmphasis, { color: native.label, textAlign: "center", fontSize: 20 }]}>
          Preparing your study assistant
        </Text>
        <Text style={[type.secondary, { color: native.secondaryLabel, textAlign: "center", lineHeight: 22 }]}>
          {courseLabel
            ? `Reading ${courseLabel} so suggestions match what you're working on.`
            : "Reading your course context so suggestions stay relevant."}
        </Text>
        {focusLabel ? (
          <Text style={[type.caption, { color: STUDENT_CORA_COLOR.link, textAlign: "center" }]}>
            Current focus: {focusLabel}
          </Text>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: native.secondaryGrouped }]}>
        {STUDENT_CORA_SETUP_STEPS.map((step, index) => {
          const done = index < activeIndex
          const active = index === activeIndex
          return (
            <View key={step.id} style={styles.stepRow}>
              <View
                style={[
                  styles.stepIcon,
                  {
                    backgroundColor: done
                      ? `${STUDENT_CORA_COLOR.link}20`
                      : active
                        ? `${STUDENT_CORA_COLOR.action}20`
                        : `${native.separator}55`,
                  },
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={16} color={STUDENT_CORA_COLOR.link} />
                ) : active ? (
                  <ActivityIndicator size="small" color={STUDENT_CORA_COLOR.action} />
                ) : (
                  <Ionicons name="ellipse-outline" size={14} color={native.tertiaryLabel} />
                )}
              </View>
              <Text
                style={[
                  type.body,
                  {
                    color: active ? native.label : done ? native.secondaryLabel : native.tertiaryLabel,
                    fontWeight: active ? "600" : "400",
                  },
                ]}
              >
                {step.label}
                {active && step.id === "generating" ? "…" : ""}
              </Text>
            </View>
          )
        })}
      </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    paddingHorizontal: NATIVE.pagePadding,
    justifyContent: "center",
  },
  inner: {
    width: "100%",
    gap: 24,
  },
  hero: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    gap: 14,
    width: "100%",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
})
