import type { SummerCheckpointSubmission, SummerModuleBlock, SummerModuleProgressRecord } from "./summer-camp-api"

const PASSIVE_BLOCK_TYPES = new Set([
  "hero",
  "callout",
  "text",
  "video",
  "image_gallery",
  "faculty_cards",
  "mission_objectives",
])

const INTERACTIVE_BLOCK_TYPES = new Set([
  "activity",
  "interactive",
  "reflection",
  "quiz",
  "feedback",
  "profile_form",
  "checkpoint",
  "step",
  "code",
  "module_completion",
])

export function isSummerPassiveBlock(blockType: string): boolean {
  return PASSIVE_BLOCK_TYPES.has(blockType)
}

export function isSummerInteractiveBlock(blockType: string): boolean {
  return INTERACTIVE_BLOCK_TYPES.has(blockType)
}

export function getBlockProgressRecords(
  blockId: number,
  progress: SummerModuleProgressRecord[],
): SummerModuleProgressRecord[] {
  return progress.filter((record) => record.block_id === blockId)
}

export function getBlockSubmission(
  blockId: number,
  submissions: SummerCheckpointSubmission[],
): SummerCheckpointSubmission | undefined {
  return submissions.find((submission) => submission.block_id === blockId)
}

export function isSummerBlockComplete(
  block: SummerModuleBlock,
  progress: SummerModuleProgressRecord[],
  submissions: SummerCheckpointSubmission[] = [],
): boolean {
  const records = getBlockProgressRecords(block.id, progress)
  if (block.block_type === "checkpoint") {
    const submission = getBlockSubmission(block.id, submissions)
    return submission?.status === "submitted" || submission?.status === "approved"
  }
  if (block.block_type === "step") {
    return records.some((record) => record.progress_type === "step_complete")
  }
  if (block.block_type === "quiz") {
    return records.some((record) => record.progress_type === "quiz_response")
  }
  if (block.block_type === "activity") {
    return records.some((record) => record.progress_type === "engagement")
  }
  if (block.block_type === "reflection") {
    return records.some((record) => record.progress_type === "reflection")
  }
  if (block.block_type === "feedback") {
    return records.some((record) => record.progress_type === "feedback")
  }
  if (block.block_type === "interactive" || block.block_type === "profile_form") {
    return records.some(
      (record) => record.progress_type === "step_complete" || record.progress_type === "interactive",
    )
  }
  if (PASSIVE_BLOCK_TYPES.has(block.block_type)) {
    return records.some((record) => record.progress_type === "step_complete")
  }
  if (block.block_type === "module_completion") {
    return progress.some((record) => record.progress_type === "module_complete")
  }
  return records.length > 0
}

export function countModuleProgress(
  blocks: SummerModuleBlock[],
  progress: SummerModuleProgressRecord[],
  submissions: SummerCheckpointSubmission[] = [],
): { completed: number; total: number } {
  const actionable = blocks.filter(
    (block) => block.block_type !== "module_completion" && block.block_type !== "hero",
  )
  const completed = actionable.filter((block) => isSummerBlockComplete(block, progress, submissions)).length
  return { completed, total: actionable.length }
}

export function isSummerModuleComplete(progress: SummerModuleProgressRecord[]): boolean {
  return progress.some((record) => record.progress_type === "module_complete")
}

export function mergeProgressRecord(
  progress: SummerModuleProgressRecord[],
  next: SummerModuleProgressRecord,
): SummerModuleProgressRecord[] {
  const filtered = progress.filter(
    (record) =>
      !(
        record.block_id === next.block_id &&
        record.progress_type === next.progress_type
      ),
  )
  return [...filtered, next]
}
