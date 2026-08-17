export type GuestPlan = "guest_free" | "cora_career"

export type GuestCapability =
  | "recommendations.request"
  | "recommendations.view"
  | "recommendations.brief"
  | "messages.send"
  | "cora.career.chat"
  | "cora.career.resume"
  | "cora.career.interview"
  | "cora.career.personal_statement"
  | "cora.career.application_plan"

export type GuestEntitlementsFlags = {
  guestWorkspaceEnabled?: boolean
  guestMembershipEnabled?: boolean
  coraCareerEnabled?: boolean
  guestRecommendationBriefEnabled?: boolean
  guestCareerResumeEnabled?: boolean
  guestCareerInterviewEnabled?: boolean
  guestCareerPersonalStatementEnabled?: boolean
  guestCareerApplicationPlanEnabled?: boolean
}

export type GuestEntitlementsNav = {
  recommendations?: boolean
  career?: boolean
  messages?: boolean
}

export type GuestEntitlements = {
  plan: GuestPlan
  capabilities: GuestCapability[]
  coraCareerLifetime: boolean
  coraCredits: {
    available: number
    isLow: boolean
  }
  flags: GuestEntitlementsFlags
  nav: GuestEntitlementsNav
  planConfig?: {
    priceLabel?: string
    coraCreditsIncluded?: number
    upgradePriceLabel?: string
  }
}

export type GuestHomeResponse = {
  greeting?: string
  activeRequestCount?: number
  subtitle?: string
  universityShortName?: string | null
  upcomingDeadline?: string | null
  recentRequests?: Array<{
    id: number
    purpose?: string
    status?: string
    instructor_name?: string
    course_code?: string
    deadline?: string | null
    updated_at?: string
  }>
  coraCredits?: { available: number; isLow: boolean }
  plan?: GuestPlan
}

export type GuestCoraChatMessage = {
  role: "user" | "assistant"
  content: string
}

export type GuestCoraConversation = {
  id: string
  title: string
  updatedAt: string
  requestId?: number | null
  messages: GuestCoraChatMessage[]
}

export type GuestCoraChatResponse = {
  content?: string
  creditsCharged?: number
  creditsRemaining?: number
  creditFree?: boolean
  plan?: GuestPlan
  denied?: boolean
  denialReason?: string
  toolCalls?: Array<{ name: string; args?: Record<string, unknown> }>
  error?: string
  code?: string
  profile?: import("./cora/models").CoraModelProfile
  publicMode?: import("./cora/models").CoraPublicModeLabel
  coraMode?: "lite" | "premium"
  routing?: import("./cora/models").PublicCoraRoutingMeta
  ui?: import("./cora/models").CoraUiPayload
}

export type GuestCreditPack = {
  id: string
  label: string
  credits: number
  priceLabel: string
  priceCents?: number
  description?: string
  popular?: boolean
  highlights?: string[]
}

export type GuestCareerPlan = {
  id: GuestPlan
  label: string
  priceLabel: string
  priceCents?: number
  description?: string
  coraCreditsIncluded?: number
  highlight?: boolean
}

export type GuestPlansResponse = {
  plans: GuestCareerPlan[]
  creditPacks: GuestCreditPack[]
  checkoutEnabled: boolean
}

export type GuestRecommendationBrief = {
  id?: number
  request_id?: number
  highlights?: string
  achievements?: string
  goals?: string
  context?: string
  generated_at?: string | null
  updated_at?: string | null
}

export type GuestCheckoutResponse = {
  url?: string
  sessionId?: string
  needsEmail?: boolean
  error?: string
}
