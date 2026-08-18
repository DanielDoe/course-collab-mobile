export type LegalDocumentId = "privacy" | "terms" | "support" | "ai-and-data"

export type LegalSection = {
  title: string
  paragraphs?: readonly string[]
  bullets?: readonly string[]
}

export type LegalDocument = {
  id?: LegalDocumentId
  title: string
  updated: string
  intro?: string
  sections: readonly LegalSection[]
}

export type LegalContentCatalog = {
  version: string
  updated: string
  documents: Record<LegalDocumentId, LegalDocument>
}

export const LEGAL_DOCUMENT_IDS: readonly LegalDocumentId[] = [
  "privacy",
  "terms",
  "support",
  "ai-and-data",
]

export function isLegalDocumentId(value: string): value is LegalDocumentId {
  return (LEGAL_DOCUMENT_IDS as readonly string[]).includes(value)
}
