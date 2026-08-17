/** Hermes-safe timeout abort — `AbortSignal.timeout` is missing on some RN runtimes. */
export function abortTimeout(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms)
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  controller.signal.addEventListener(
    "abort",
    () => {
      clearTimeout(timer)
    },
    { once: true },
  )
  return controller.signal
}
