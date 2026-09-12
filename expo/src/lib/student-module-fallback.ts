/** Faculty-only module slugs that can leak into the student stack after a portal switch or reload. */
export const STUDENT_FACULTY_MODULE_REDIRECTS: Record<string, string> = {
  "cora-insights": "/module/ai-tutor",
  "ai-insights": "/module/ai-tutor",
  "ai-monitoring": "/module/ai-tutor",
}

export function studentModuleRedirect(id: string): string | null {
  return STUDENT_FACULTY_MODULE_REDIRECTS[id] ?? null
}
