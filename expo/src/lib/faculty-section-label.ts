/** Pure section label helper — safe for node tests (no React Native imports). */
export function facultySectionDisplayLabel(courseCodeRaw: string, sectionCodeRaw: string): string {
  const sectionCode = sectionCodeRaw.trim()
  if (!sectionCode) return sectionCodeRaw
  const courseCompact = courseCodeRaw.replace(/\s+/g, "").toUpperCase()
  const sectionNorm = sectionCode.toUpperCase().replace(/\s+/g, "")
  if (sectionNorm.startsWith(courseCompact) && sectionNorm.length >= courseCompact.length) {
    return sectionCode
  }
  if (sectionNorm.includes(courseCompact) && sectionNorm !== courseCompact) {
    return sectionCode
  }
  if (/^P\d+/i.test(sectionCode)) {
    return `${courseCompact}${sectionCode.toUpperCase()}`
  }
  return `${courseCodeRaw.trim()} · ${sectionCode}`
}
