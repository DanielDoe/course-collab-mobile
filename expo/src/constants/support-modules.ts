import { FACULTY_CORA_LINK, FACULTY_DASHBOARD_LINK, FACULTY_NAV_GROUPS, FACULTY_SUPPORT_GROUP } from "./faculty-nav"
import { STUDENT_DASHBOARD_LINK, STUDENT_NAV_GROUPS, STUDENT_SUPPORT_GROUP } from "./student-nav"

export type SupportModuleOption = {
  id: string
  label: string
  group: string
}

const GENERAL_MODULES: SupportModuleOption[] = [
  { id: "other", label: "Other / Not listed", group: "General" },
]

function fromNavGroups(
  groups: Array<{ label: string; items: Array<{ id: string; label: string }> }>,
  extras: SupportModuleOption[] = [],
): SupportModuleOption[] {
  const seen = new Set<string>()
  const options: SupportModuleOption[] = []

  for (const extra of extras) {
    if (seen.has(extra.id)) continue
    seen.add(extra.id)
    options.push(extra)
  }

  for (const group of groups) {
    for (const item of group.items) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      options.push({ id: item.id, label: item.label, group: group.label })
    }
  }

  for (const fallback of GENERAL_MODULES) {
    if (seen.has(fallback.id)) continue
    seen.add(fallback.id)
    options.push(fallback)
  }

  return options.sort((a, b) => {
    const byGroup = a.group.localeCompare(b.group, undefined, { sensitivity: "base" })
    if (byGroup !== 0) return byGroup
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
  })
}

export const FACULTY_SUPPORT_MODULE_OPTIONS: SupportModuleOption[] = fromNavGroups(
  [...FACULTY_NAV_GROUPS, FACULTY_SUPPORT_GROUP],
  [
    { id: FACULTY_DASHBOARD_LINK.id, label: FACULTY_DASHBOARD_LINK.label, group: "General" },
    { id: FACULTY_CORA_LINK.id, label: FACULTY_CORA_LINK.label, group: "General" },
    { id: "profile-settings", label: "Profile & Settings", group: "General" },
  ],
)

export const STUDENT_SUPPORT_MODULE_OPTIONS: SupportModuleOption[] = fromNavGroups(
  [...STUDENT_NAV_GROUPS, STUDENT_SUPPORT_GROUP],
  [
    { id: STUDENT_DASHBOARD_LINK.id, label: STUDENT_DASHBOARD_LINK.label, group: "General" },
    { id: "settings", label: "Settings", group: "General" },
  ],
)

export function supportModulePickerLabel(option: SupportModuleOption): string {
  return `${option.label} · ${option.group}`
}

export function findSupportModule(
  options: SupportModuleOption[],
  id: string | null | undefined,
): SupportModuleOption | undefined {
  if (!id) return undefined
  return options.find((item) => item.id === id)
}
