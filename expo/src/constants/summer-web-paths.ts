/** Web dashboard-v2 paths for summer camper modules. */
export const SUMMER_WEB_PATHS: Record<string, string> = {
  dashboard: "/student/dashboard-v2/summer-camp",
  "my-trainings": "/student/dashboard-v2/summer-camp/my-trainings",
  "browse-trainings": "/student/dashboard-v2/summer-camp/browse",
  roadmap: "/student/dashboard-v2/summer-camp/roadmap",
  projects: "/student/dashboard-v2/summer-camp/projects",
  checkpoints: "/student/dashboard-v2/summer-camp/checkpoints",
  discussions: "/student/dashboard-v2/summer-camp/discussions",
  messages: "/student/dashboard-v2/summer-camp/messages",
  resources: "/student/dashboard-v2/summer-camp/resources",
  gallery: "/student/dashboard-v2/summer-camp/gallery",
  graduation: "/student/dashboard-v2/summer-camp/graduation",
  leaderboard: "/student/dashboard-v2/summer-camp/leaderboard",
  achievements: "/student/dashboard-v2/summer-camp/achievements",
  calendar: "/student/dashboard-v2/summer-camp/calendar",
}

export function getSummerWebPath(id: string): string {
  return SUMMER_WEB_PATHS[id] ?? `/student/dashboard-v2/summer-camp/${id}`
}
