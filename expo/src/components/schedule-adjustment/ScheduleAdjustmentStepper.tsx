import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { workflowStepIndex } from "../../lib/schedule-adjustment/workflow-steps"

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

export function ScheduleAdjustmentStepper({ status }: { status: string }) {
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const active = workflowStepIndex(status)

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {STEPS.map((label, index) => {
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
