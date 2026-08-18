import type { LegalContentCatalog, LegalDocumentId } from "./types"
import { PRIVACY_POLICY } from "./privacy-policy"
import { TERMS_OF_SERVICE } from "./terms-of-service"
import { SUPPORT_INFO } from "./support"
import { AI_AND_DATA } from "./ai-and-data"

/** Must match v0-coursecollabv3 LEGAL_CONTENT_VERSION when content is in sync. */
export const LEGAL_CONTENT_FALLBACK_VERSION = "2026-08-17.3"

export const LEGAL_CONTENT_FALLBACK: LegalContentCatalog = {
  version: LEGAL_CONTENT_FALLBACK_VERSION,
  updated: "August 17, 2026",
  documents: {
    privacy: { ...PRIVACY_POLICY, id: "privacy", title: "Privacy Policy" },
    terms: { ...TERMS_OF_SERVICE, id: "terms", title: "Terms of Service" },
    support: { ...SUPPORT_INFO, id: "support", title: "Support" },
    "ai-and-data": { ...AI_AND_DATA, id: "ai-and-data", title: "AI & Data" },
  },
}

export function getFallbackLegalDocument(id: LegalDocumentId) {
  return LEGAL_CONTENT_FALLBACK.documents[id]
}
