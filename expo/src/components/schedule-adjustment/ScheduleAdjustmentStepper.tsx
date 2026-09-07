import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { workflowStepIndex } from "../../lib/schedule-adjustment/workflow-steps"
import { isDirectProposal } from "../../lib/schedule-adjustment/arrangement"

const STEPS = [
  "Current",
  "Availability",
  "Analysis",
  "Department",
  "Consent",
  "Finalize",
  "Calendar",
  "Complete",
]

const DIRECT_STEPS = ["Current", "Consent", "Finalize", "Calendar", "Complete"]

export function ScheduleAdjustmentStepper({
  status,
  adjustmentMode,
}: {
  status: string
  adjustmentMode?: unknown
}) {
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const direct = isDirectProposal(adjustmentMode)
  const labels = direct ? DIRECT_STEPS : STEPS
  const active = workflowStepIndex(status, adjustmentMode)

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {labels.map((label, index) => {
        const step = index + 1
        const reached = step <= active
        return (
          <View key={label} style={styles.step}>
            <View
              style={[
                styles.bar,
                { backgroundColor: reached ? tokens.accent : tokens.border },
              ]}
            />
            <Text
              style={[
                type.caption,
                styles.label,
                { color: reached ? tokens.accent : tokens.textMuted },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4 },
  step: { width: 72 },
  bar: { height: 4, borderRadius: 999 },
  label: { marginTop: 6, fontSize: 10 },
})
