export function formatSummerRole(role?: string): string {
  if (!role) return "Summer camper"
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}
