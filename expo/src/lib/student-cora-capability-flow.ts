import type { CoraChatFlow } from "./cora-study-plan-flows"
import {
  EXAM_COUNTDOWN_PROMPT,
  STUDY_PLAN_GENERATION_PROMPT,
} from "./cora-study-plan-flows"
import type { CoraToolFlowId } from "./cora-tool-flows"
import type { StudentCoraCapability, StudentCoraCapabilityId } from "./student-cora-config"

const CAPABILITY_TOOL_FLOWS: Partial<Record<StudentCoraCapabilityId, CoraToolFlowId>> = {
  "generate-flashcards": "flashcards",
  "summarize-lecture": "summarize",
  "review-homework": "review-work",
}

const CAPABILITY_CHAT_FLOWS: Partial<
  Record<StudentCoraCapabilityId, { prompt: string; flow: CoraChatFlow }>
> = {
  "prepare-exam": { prompt: EXAM_COUNTDOWN_PROMPT, flow: "exam_countdown" },
  "create-study-plan": { prompt: STUDY_PLAN_GENERATION_PROMPT, flow: "study_plan" },
}

export function studentCapabilityToolFlowId(
  capabilityId: StudentCoraCapabilityId,
): CoraToolFlowId | null {
  return CAPABILITY_TOOL_FLOWS[capabilityId] ?? null
}

export function studentCapabilityChatFlow(
  capabilityId: StudentCoraCapabilityId,
): { prompt: string; flow: CoraChatFlow } | null {
  return CAPABILITY_CHAT_FLOWS[capabilityId] ?? null
}

export function studentCapabilityDefaultPrompt(capability: StudentCoraCapability): string {
  const first = capability.examplePrompts.find((prompt) => prompt.trim())
  if (first) return first
  return `Help me with ${capability.label.toLowerCase()}`
}
