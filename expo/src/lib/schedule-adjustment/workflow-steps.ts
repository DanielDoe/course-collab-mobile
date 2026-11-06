export const INSTITUTIONAL_SAFEGUARD_NOTICE =
  "CourseCollab facilitates schedule adjustment coordination and documentation. A schedule change should only be finalized after all applicable departmental and institutional requirements have been satisfied."

export function workflowStepIndex(status: string, adjustmentMode?: unknown): number {
  if (String(adjustmentMode ?? "").toUpperCase() === "DIRECT_PROPOSAL") {
    switch (status) {
      case "DRAFT":
        return 1
      case "COLLECTING_CONSENT":
      case "CONSENT_COMPLETE":
        return 2
      case "READY_TO_FINALIZE":
        return 3
      case "FINALIZED":
        return 4
      case "COMPLETED":
        return 5
      default:
        return 1
    }
  }
  switch (status) {
    case "DRAFT":
      return 1
    case "COLLECTING_AVAILABILITY":
      return 2
    case "AVAILABILITY_CLOSED":
    case "REVIEWING_RESULTS":
      return 3
    case "AWAITING_DEPARTMENT_APPROVAL":
    case "DEPARTMENT_APPROVED":
      return 4
    case "COLLECTING_CONSENT":
    case "CONSENT_COMPLETE":
      return 5
    case "READY_TO_FINALIZE":
      return 6
    case "FINALIZED":
      return 7
    case "COMPLETED":
      return 8
    default:
      return 1
  }
}
