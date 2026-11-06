export type EvaluationsLoadKind = "loading" | "empty" | "data" | "error"

export function evaluationsLoadKind(args: {
  loading: boolean
  error: string
  count: number
}): EvaluationsLoadKind {
  if (args.loading) return "loading"
  if (args.error) return "error"
  if (args.count === 0) return "empty"
  return "data"
}

/** 404 / empty payload is “no evaluations yet”, not a red error. */
export function isEvaluationsEmptySuccess(err: unknown): boolean {
  if (!err || typeof err !== "object") return false
  const status = "status" in err ? Number((err as { status: unknown }).status) : NaN
  const message = "message" in err ? String((err as { message: unknown }).message).toLowerCase() : ""
  if (status === 404) return true
  return message.includes("not found") && message.includes("evaluation")
}
