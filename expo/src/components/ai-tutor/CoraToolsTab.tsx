import { AppAlert } from '../../lib/app-alert'

import { useState } from "react"
import { useRouter } from "expo-router"
import { ModuleScreen } from "../modules/ModuleScreen"
import { NATIVE } from "../../constants/faculty-native-theme"
import { CORA_TOOLS, filterCoraToolsForRole, resolveCoraToolPress } from "../../lib/cora-nav-config"
import type { CoraToolFlowId, CoraToolLaunchPayload } from "../../lib/cora-tool-flows"
import type { StudentSession } from "../../lib/session"
import type { ChatMessage } from "../../lib/ai-tutor-api"
import { exportWorkspaceToNotes } from "../../lib/cora-api"
import { CoraNavCardList, CoraNavListCard, type CoraNavCardItem } from "./CoraNavListCard"
import { CoraToolFlowSheet } from "./CoraToolFlowSheet"

function toolMeta(toolId: string): string {
  const tool = CORA_TOOLS.find((item) => item.id === toolId)
  if (!tool) return "Cora"
  switch (resolveCoraToolPress(tool)) {
    case "module":
      return "Choose item"
    case "workspace":
      return "Start Cora chat"
    case "export":
      return "Save to Notes"
    default:
      return "Cora section"
  }
}

export function CoraToolsTab({
  session,
  messages,
  onLaunchToolFlow,
}: {
  session: StudentSession
  messages: ChatMessage[]
  onLaunchToolFlow: (payload: CoraToolLaunchPayload) => void
}) {
  const router = useRouter()
  const [activeFlow, setActiveFlow] = useState<CoraToolFlowId | null>(null)

  const visibleTools = filterCoraToolsForRole("student", CORA_TOOLS)

  const onToolPress = async (toolId: string) => {
    const tool = visibleTools.find((item) => item.id === toolId)
    if (!tool) return

    if (tool.id === "export-notes") {
      if (messages.length === 0) {
        AppAlert.alert("Nothing to export", "Start a workspace conversation first, then export it to My Notes.")
        return
      }
      try {
        const result = await exportWorkspaceToNotes(
          session,
          messages.map((m) => ({ role: m.role, content: m.content })),
        )
        AppAlert.alert("Saved to My Notes", result.message ?? "Your workspace conversation was exported.", [
          ...(result.noteId
            ? [{ text: "Open note", onPress: () => router.push(`/notes/${result.noteId}` as never) }]
            : [{ text: "Open Notes", onPress: () => router.push("/module/notes" as never) }]),
          { text: "OK", style: "cancel" as const },
        ])
      } catch {
        AppAlert.alert("Export failed", "Could not save to My Notes right now.")
      }
      return
    }

    setActiveFlow(toolId as CoraToolFlowId)
  }

  const tools: CoraNavCardItem[] = visibleTools.map((tool) => ({
    id: tool.id,
    title: tool.title,
    subtitle: tool.description,
    meta: toolMeta(tool.id),
    icon: tool.icon,
  }))

  return (
    <>
      <ModuleScreen contentStyle={{ paddingTop: NATIVE.pagePadding, paddingBottom: 8 }}>
        <CoraNavCardList>
          {tools.map((tool, index) => (
            <CoraNavListCard
              key={tool.id}
              item={tool}
              index={index}
              onPress={() => void onToolPress(tool.id)}
            />
          ))}
        </CoraNavCardList>
      </ModuleScreen>

      <CoraToolFlowSheet
        visible={activeFlow != null}
        toolId={activeFlow}
        session={session}
        onClose={() => setActiveFlow(null)}
        onLaunch={onLaunchToolFlow}
      />
    </>
  )
}
