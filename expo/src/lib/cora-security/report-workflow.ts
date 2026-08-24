/**
 * Responsible security-issue reporting.
 * Do not verify exploits against live systems. Do not encourage further probing.
 */

export const CORA_SECURITY_REPORT_ROUTE = "/module/report-bug"

export const CORA_SECURITY_REPORT_REPLY = [
  "Thank you for reporting a possible security issue. I will not test or confirm exploits.",
  "Please submit a responsible report with:",
  "• what you observed",
  "• the feature or screen involved",
  "• a safe, high-level description of the steps (no further probing)",
  "• when it happened",
  "• screenshots if you have them",
  `You can send this through Report a bug (${CORA_SECURITY_REPORT_ROUTE}).`,
].join("\n")

export function buildCoraSecurityReportReply(): string {
  return CORA_SECURITY_REPORT_REPLY
}
