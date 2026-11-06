export type SupportTicketStatus = "open" | "in_progress" | "resolved" | "closed"

export type SupportTicket = {
  id: string
  subject: string
  description: string
  category: string
  priority: string
  status: SupportTicketStatus | string
  moduleId?: string | null
  moduleLabel?: string | null
  attachments?: Array<{ url: string; name?: string; mime?: string; size?: number }>
  createdAt?: string
  updatedAt?: string
}

export function supportTicketStatusLabel(status: string): string {
  switch (status) {
    case "open":
      return "Open"
    case "in_progress":
      return "In Progress"
    case "resolved":
      return "Resolved"
    case "closed":
      return "Closed"
    default:
      return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  }
}

export function supportTicketStatusTone(
  status: string,
): "open" | "progress" | "resolved" | "muted" {
  switch (status) {
    case "resolved":
    case "closed":
      return "resolved"
    case "in_progress":
      return "progress"
    case "open":
      return "open"
    default:
      return "muted"
  }
}

export function formatSupportTicketWhen(iso?: string): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function supportTicketCategoryLabel(category: string): string {
  switch (category) {
    case "bug":
      return "Bug report"
    case "feature":
      return "Feature request"
    case "support":
      return "Support ticket"
    default:
      return category.replace(/_/g, " ")
  }
}
