import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { FACULTY_QUESTION_BANK_COLOR } from "../../../lib/faculty-question-bank-theme"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"

export type QuestionBankFlowStep = {
  id: string
  label: string
}

type Props = {
  steps: QuestionBankFlowStep[]
  currentIndex: number
}

export function QuestionBankFlowStepIndicator({ steps, currentIndex }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()

  return (
    <View style={styles.root}>
      {steps.map((step, idx) => {
        const done = idx < currentIndex
        const active = idx === currentIndex
        const pending = idx > currentIndex

        return (
          <View key={step.id} style={styles.stepCol}>
            {idx < steps.length - 1 ? (
              <View
                style={[
                  styles.connector,
                  { backgroundColor: done ? tokens.success : native.separator },
                ]}
              />
            ) : null}
            <View
              style={[
                styles.circle,
                done && { backgroundColor: tokens.success, borderColor: tokens.success },
                active && {
                  backgroundColor: FACULTY_QUESTION_BANK_COLOR.link,
                  borderColor: FACULTY_QUESTION_BANK_COLOR.link,
                },
                pending && {
                  backgroundColor: native.secondaryGrouped,
                  borderColor: native.separator,
                },
              ]}
            >
              {done ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Text
                  style={[
                    type.caption,
                    {
                      color: active ? "#fff" : native.tertiaryLabel,
                      fontWeight: "700",
                    },
                  ]}
                >
                  {idx + 1}
                </Text>
              )}
            </View>
            <Text
              style={[
                type.caption,
                styles.label,
                done && { color: tokens.success },
                active && { color: FACULTY_QUESTION_BANK_COLOR.link, fontWeight: "700" },
                pending && { color: native.tertiaryLabel },
              ]}
              numberOfLines={2}
            >
              {step.label}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flexDirection: "row", alignItems: "flex-start", justifyContent: "center", paddingHorizontal: 8 },
  stepCol: { flex: 1, alignItems: "center", position: "relative", minWidth: 72 },
  connector: {
    position: "absolute",
    top: 14,
    left: "50%",
    width: "100%",
    height: 2,
    marginLeft: 14,
    zIndex: 0,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  label: { marginTop: 6, textAlign: "center", fontSize: 10, lineHeight: 13 },
})
