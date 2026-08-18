import type { CodebenchSubmissions } from "./codebench-api"

type RawSubmission = {
  code?: string
  solution?: string
  points_awarded?: number
  pointsAwarded?: number
  submitted_at?: string
  submittedAt?: string
}

export type NormalizedSubmission = {
  code?: string
  pointsAwarded: number
  submittedAt?: string
}

/** Human-readable message for the core CodeBench requests that failed to load. */
export function codebenchFailureMessage(failed: string[]): string {
  if (failed.length === 0) return ""
  const list =
    failed.length === 1
      ? failed[0]
      : `${failed.slice(0, -1).join(", ")} and ${failed[failed.length - 1]}`
  return `Couldn't load your CodeBench ${list}. Check your connection and try again.`
}

function normalizeSubmission(raw: RawSubmission): NormalizedSubmission {
  return {
    code: raw.code ?? raw.solution,
    pointsAwarded: Number(raw.points_awarded ?? raw.pointsAwarded ?? 0),
    submittedAt: raw.submitted_at ?? raw.submittedAt,
  }
}

export function flattenSubmissions(subs: CodebenchSubmissions): NormalizedSubmission[] {
  const buckets: RawSubmission[][] = [
    subs.codeSubmissions ?? [],
    (subs.practiceSubmissions as RawSubmission[] | undefined) ?? [],
    (subs.dailyChallengeSubmissions as RawSubmission[] | undefined) ?? [],
  ]
  return buckets.flatMap((bucket) => bucket.map(normalizeSubmission))
}

export function submissionXpTotal(rows: NormalizedSubmission[]): number {
  return Math.round(rows.reduce((sum, row) => sum + row.pointsAwarded, 0))
}

export function latestSubmissionCode(rows: NormalizedSubmission[]): string {
  const sorted = [...rows].sort((a, b) => {
    const ta = a.submittedAt ? Date.parse(a.submittedAt) : 0
    const tb = b.submittedAt ? Date.parse(b.submittedAt) : 0
    return tb - ta
  })
  return sorted.find((row) => row.code?.trim())?.code?.trim() ?? ""
}
