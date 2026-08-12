import * as SecureStore from "expo-secure-store"

/** Honorific shown before the instructor display name (e.g. Dr Daniel Doe). */
export type FacultyTitle = "" | "Dr" | "Prof" | "Mr" | "Ms" | "Mrs" | "Mx"

export type FacultyProfilePrefs = {
  title: FacultyTitle
}

export const FACULTY_TITLE_OPTIONS: { value: FacultyTitle; label: string }[] = [
  { value: "", label: "No title" },
  { value: "Dr", label: "Dr" },
  { value: "Prof", label: "Prof" },
  { value: "Mr", label: "Mr" },
  { value: "Ms", label: "Ms" },
  { value: "Mrs", label: "Mrs" },
  { value: "Mx", label: "Mx" },
]

const PREFS_PREFIX = "course-collab.faculty-profile-prefs"

export const DEFAULT_FACULTY_PROFILE_PREFS: FacultyProfilePrefs = {
  title: "",
}

function prefsKey(instructorId: number): string {
  return `${PREFS_PREFIX}:${instructorId}`
}

function normalizeTitle(raw: unknown): FacultyTitle {
  const value = typeof raw === "string" ? raw.trim() : ""
  return FACULTY_TITLE_OPTIONS.some((opt) => opt.value === value) ? (value as FacultyTitle) : ""
}

export function formatFacultyDisplayName(name: string, title?: FacultyTitle | string | null): string {
  const trimmed = name.trim()
  if (!trimmed) return "there"
  const honorific = normalizeTitle(title)
  if (!honorific) return trimmed
  if (trimmed.toLowerCase().startsWith(`${honorific.toLowerCase()} `)) return trimmed
  return `${honorific} ${trimmed}`
}

export async function getFacultyProfilePrefs(instructorId: number): Promise<FacultyProfilePrefs> {
  try {
    const raw = await SecureStore.getItemAsync(prefsKey(instructorId))
    if (!raw) return DEFAULT_FACULTY_PROFILE_PREFS
    const parsed = JSON.parse(raw) as Partial<FacultyProfilePrefs>
    return { title: normalizeTitle(parsed.title) }
  } catch {
    return DEFAULT_FACULTY_PROFILE_PREFS
  }
}

export async function saveFacultyProfilePrefs(
  instructorId: number,
  prefs: FacultyProfilePrefs,
): Promise<void> {
  await SecureStore.setItemAsync(
    prefsKey(instructorId),
    JSON.stringify({ title: normalizeTitle(prefs.title) } satisfies FacultyProfilePrefs),
  )
}
