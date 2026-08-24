import { useRouter } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { ModuleScreen } from "../modules/ModuleScreen"
import { NATIVE } from "../../constants/faculty-native-theme"
import { hasNavAccess } from "../../constants/student-nav"
import type { MembershipTier } from "../../types/dashboard"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { CoraNavCardList, CoraNavListCard, type CoraNavCardItem } from "./CoraNavListCard"

const DEBUG_PROMPT =
  "Help me debug this code. Ask what language I am using, then walk me through finding and fixing the bug step by step."

const WALKTHROUGH_PROMPT =
  "Walk me through this code step by step. Ask what language I am using if it is not clear, then explain what each part does."

export function CoraCodeTab({
  membershipTier,
  onOpenWorkspacePrompt,
  onClose,
}: {
  membershipTier: MembershipTier
  onOpenWorkspacePrompt?: (prompt: string) => void
  onClose?: () => void
}) {
  const router = useRouter()
  const native = useThemedNative()
  const type = useNativeType()
  const hasCodebench = hasNavAccess(membershipTier, "Trailblazer")

  const actions: CoraNavCardItem[] = [
    {
      id: "codebench",
      title: "Open CodeBench",
      subtitle: hasCodebench ? "Run, trace, and debug C++ and MATLAB" : "Trailblazer membership required",
      meta: hasCodebench ? "IDE workspace" : "Upgrade",
      icon: "code-slash-outline",
    },
    {
      id: "debug",
      title: "Ask Cora to debug",
      subtitle: "Paste code in Chat for guided help",
      meta: "Cora chat",
      icon: "bug-outline",
    },
    {
      id: "walkthrough",
      title: "Walk through code",
      subtitle: "Line-by-line explanation in Chat",
      meta: "Cora chat",
      icon: "list-outline",
    },
    {
      id: "practice",
      title: "Practice Hub",
      subtitle: "Topic quizzes and coding drills",
      meta: "Study module",
      icon: "fitness-outline",
    },
  ]

  const openCodebench = () => {
    onClose?.()
    if (hasCodebench) router.push("/module/codebench" as never)
    else router.push("/membership" as never)
  }

  return (
    <ModuleScreen contentStyle={{ paddingTop: NATIVE.pagePadding, paddingBottom: 24, gap: 16 }}>
      <View style={styles.intro}>
        <Text style={[type.sheetTitle, { color: native.label }]}>Code with Cora</Text>
        <Text style={[type.secondary, { color: native.secondaryLabel }]}>
          Open the IDE, paste a snippet in Chat, or jump into Practice Hub. Cards stay full-width on larger phones.
        </Text>
      </View>
      <CoraNavCardList>
        {actions.map((action, index) => (
          <CoraNavListCard
            key={action.id}
            item={action}
            index={index}
            onPress={() => {
              if (action.id === "codebench") {
                openCodebench()
                return
              }
              if (action.id === "practice") {
                onClose?.()
                router.push("/module/practice" as never)
                return
              }
              if (onOpenWorkspacePrompt) {
                onClose?.()
                onOpenWorkspacePrompt(action.id === "walkthrough" ? WALKTHROUGH_PROMPT : DEBUG_PROMPT)
              }
            }}
          />
        ))}
      </CoraNavCardList>
    </ModuleScreen>
  )
}

const styles = StyleSheet.create({
  intro: { gap: 6, paddingHorizontal: 2 },
})
