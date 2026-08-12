import { PRESENCE_LABELS } from "../../lib/presence/constants"
import type { PresenceStatus } from "../../lib/presence/types"

export function presenceLabel(status: PresenceStatus): string {
  return PRESENCE_LABELS[status]
}
