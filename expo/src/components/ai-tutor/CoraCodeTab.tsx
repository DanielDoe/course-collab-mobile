import { useRouter } from "expo-router"
import { ModuleScreen } from "../modules/ModuleScreen"
import { NATIVE } from "../../constants/faculty-native-theme"
import { hasNavAccess } from "../../constants/student-nav"
import type { MembershipTier } from "../../types/dashboard"
import { CoraNavCardList, CoraNavListCard, type CoraNavCardItem } from "./CoraNavListCard"

const DEBUG_PROMPT =
  "Help me debug this code. Ask what language I am using, then walk me through finding and fixing the bug step by step."

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
  ]

  const openCodebench = () => {
    onClose?.()
    if (hasCodebench) router.push("/module/codebench" as never)
    else router.push("/membership" as never)
  }

  return (
    <ModuleScreen contentStyle={{ paddingTop: NATIVE.pagePadding, paddingBottom: 8 }}>
      <CoraNavCardList>
        {actions.map((action, index) => (
          <CoraNavListCard
            key={action.id}
            item={action}
            index={index}
            onPress={() => {
              if (action.id === "codebench") openCodebench()
              else if (onOpenWorkspacePrompt) {
                onClose?.()
                onOpenWorkspacePrompt(DEBUG_PROMPT)
              }
            }}
          />
        ))}
      </CoraNavCardList>
    </ModuleScreen>
  )
}
