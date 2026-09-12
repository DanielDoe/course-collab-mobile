import { Pressable, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useSession } from "../../context/SessionProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { hexToRgba } from "../../constants/app-themes"
import { pushStudentAppHref } from "../../lib/student-app-href"
import type { TargetedPracticeMessage } from "../../lib/targeted-practice-message"

export function TargetedPracticeMessageCard({ plan }: { plan: TargetedPracticeMessage }) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const router = useRouter()
  const { session } = useSession()
  const student = session?.portal === "student" || session?.portal === "guest"

  const openReview = () => {
    if (student) {
      pushStudentAppHref(router, "/module/progress-review")
      return
    }
    if (session?.portal === "faculty") {
      router.push("/module/progress-reviews" as never)
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: hexToRgba(tokens.accent, 0.14) }]}>
          <Ionicons name="sparkles" size={16} color={tokens.accent} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[type.caption, styles.kicker, { color: tokens.accent }]}>From Cora Insights</Text>
          <Text style={[type.bodyEmphasis, { color: native.label }]}>Targeted practice</Text>
        </View>
      </View>

      {plan.greeting ? (
        <Text style={[type.body, styles.body, { color: native.label }]}>{plan.greeting}</Text>
      ) : null}
      {plan.summary ? (
        <Text style={[type.body, styles.body, { color: native.label }]}>{plan.summary}</Text>
      ) : null}

      {plan.topics.length ? (
        <View style={styles.block}>
          <Text style={[type.caption, styles.sectionLabel, { color: native.secondaryLabel }]}>Focus topics</Text>
          <View style={styles.chips}>
            {plan.topics.map((topic) => (
              <View
                key={topic}
                style={[
                  styles.chip,
                  {
                    backgroundColor: hexToRgba(tokens.accent, 0.12),
                    borderColor: hexToRgba(tokens.accent, 0.22),
                  },
                ]}
              >
                <Text style={[type.caption, styles.chipText, { color: tokens.accent }]}>{topic}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {plan.tasks.length ? (
        <View style={styles.block}>
          <Text style={[type.caption, styles.sectionLabel, { color: native.secondaryLabel }]}>What to do next</Text>
          {plan.tasks.map((task, index) => (
            <View key={`${index}-${task.slice(0, 24)}`} style={styles.step}>
              <View style={[styles.stepIndex, { backgroundColor: tokens.accent }]}>
                <Text style={styles.stepIndexText}>{index + 1}</Text>
              </View>
              <Text style={[type.body, styles.stepText, { color: native.label }]}>{task}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {plan.encouragement ? (
        <Text style={[type.body, styles.body, { color: native.secondaryLabel }]}>{plan.encouragement}</Text>
      ) : null}

      {plan.hasProgressReviewNote ? (
        student || session?.portal === "faculty" ? (
          <Pressable
            onPress={openReview}
            style={[styles.cta, { backgroundColor: hexToRgba(tokens.accent, 0.12) }]}
          >
            <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>Open Progress Review</Text>
            <Ionicons name="chevron-forward" size={16} color={tokens.accent} />
          </Pressable>
        ) : (
          <Text style={[type.caption, { color: native.tertiaryLabel }]}>
            A copy is also in Progress Review.
          </Text>
        )
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, gap: 1 },
  kicker: { fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  body: { lineHeight: 22 },
  block: { gap: 8 },
  sectionLabel: { fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { fontWeight: "700" },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepIndexText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  stepText: { flex: 1, lineHeight: 21 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 2,
  },
})
