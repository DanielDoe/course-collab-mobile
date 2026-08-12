import { useState } from "react"
import { ModuleScreen } from "../modules/ModuleScreen"
import { NATIVE } from "../../constants/faculty-native-theme"
import type { CoraToolFlowId, CoraToolLaunchPayload } from "../../lib/cora-tool-flows"
import {
  learnActionMeta,
  learnActionToToolId,
  type LearnActionId,
} from "../../lib/cora-tool-threads"
import type { StudentSession } from "../../lib/session"
import { CORA_LEARN_THUMBS } from "../../lib/cora-learn-theme"
import { CoraNavCardList, CoraNavListCard, type CoraNavCardItem } from "./CoraNavListCard"
import { CoraToolFlowSheet } from "./CoraToolFlowSheet"

const LEARN_ACTIONS: Array<CoraNavCardItem & { id: LearnActionId }> = [
  {
    id: "lectures",
    title: "Lectures",
    subtitle: "Summarize slides, notes, and sample problems with Cora",
    meta: learnActionMeta("lectures"),
    icon: "play-outline",
    solidThumb: CORA_LEARN_THUMBS.lectures,
  },
  {
    id: "practice",
    title: "Practice",
    subtitle: "Guided quizzes on course topics — one question at a time",
    meta: learnActionMeta("practice"),
    icon: "help-circle-outline",
    solidThumb: CORA_LEARN_THUMBS.practice,
  },
  {
    id: "flashcards",
    title: "Flashcards",
    subtitle: "Explain, memorize, or break down any card in your decks",
    meta: learnActionMeta("flashcards"),
    icon: "layers-outline",
    solidThumb: CORA_LEARN_THUMBS.flashcards,
  },
  {
    id: "summarize",
    title: "Summarize with Cora",
    subtitle: "Condense a lecture into exam-ready bullet points",
    meta: learnActionMeta("summarize"),
    icon: "document-text-outline",
    solidThumb: CORA_LEARN_THUMBS.summarize,
  },
]

export function CoraLearnTab({
  session,
  onLaunchToolFlow,
}: {
  session: StudentSession
  onLaunchToolFlow: (payload: CoraToolLaunchPayload) => void
}) {
  const [activeFlow, setActiveFlow] = useState<CoraToolFlowId | null>(null)

  return (
    <>
      <ModuleScreen contentStyle={{ paddingTop: NATIVE.pagePadding, paddingBottom: 8 }}>
        <CoraNavCardList>
          {LEARN_ACTIONS.map((action, index) => (
            <CoraNavListCard
              key={action.id}
              item={action}
              index={index}
              onPress={() => {
                const toolId = learnActionToToolId(action.id)
                if (toolId) setActiveFlow(toolId)
              }}
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
