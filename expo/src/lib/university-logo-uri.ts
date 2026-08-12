import { getApiBaseUrl } from "../constants"
import type { UniversityRecord } from "./api"

/** Resolve a university logo path from the API into a fetchable URI. */
export function universityLogoUri(logo: string | null | undefined): string | null {
  if (!logo) return null
  if (logo.startsWith("http://") || logo.startsWith("https://")) return logo
  const base = getApiBaseUrl().replace(/\/$/, "")
  return `${base}${logo.startsWith("/") ? logo : `/${logo}`}`
}

export type UniversityAuthLogo = {
  uri: string
  width: number
  height: number
}

/** Logo for auth/MFA headers — prefers transparent wordmarks on grouped canvases. */
export function universityAuthLogo(
  university: Pick<UniversityRecord, "logo" | "short_name" | "name">,
  isDark = false,
): UniversityAuthLogo | null {
  const sn = university.short_name.toUpperCase()

  if (sn === "UH") {
    const path = isDark
      ? "/universities/university-of-houston-mark-transparent.png"
      : "/universities/university-of-houston-logo-transparent.png"
    const uri = universityLogoUri(path)
    if (!uri) return null
    const width = isDark ? 52 : 144
    return { uri, width, height: isDark ? 52 : Math.round((width * 544) / 800) }
  }

  if (sn === "PVAMU") {
    const uri = universityLogoUri(university.logo ?? "/summer-camp/pvamu-logo.png")
    if (!uri) return null
    return { uri, width: 160, height: 44 }
  }

  const uri = universityLogoUri(university.logo)
  if (!uri) return null
  return { uri, width: 56, height: 56 }
}
