import type { CoraUiPayload } from "./models/types"

/** Confirmation payloads are already shown as signed action cards. */
export function isRedundantCoraUiPayload(
  ui: CoraUiPayload | undefined,
  hasActionCards: boolean,
): boolean {
  return ui?.type === "confirmation" && hasActionCards
}
