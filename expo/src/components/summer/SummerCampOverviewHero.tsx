import type { SummerDashboard } from "../../lib/summer-camp-api"
import { StudentThemedHero } from "../student/student-themed-hero"

export function SummerCampOverviewHero({ data }: { data: SummerDashboard }) {
  const activeTrainings = data.enrollments?.length ?? 0
  const rankLabel =
    data.leaderboard_rank != null && data.leaderboard_total ? `#${data.leaderboard_rank}` : "—"
  const modulesLabel = `${data.modules_completed}/${data.progress?.[0]?.total_modules ?? "—"} modules`

  return (
    <StudentThemedHero
      icon="sunny-outline"
      subtitle={`${data.overall_percent}% camp complete · ${modulesLabel}`}
      stats={[
        { icon: "flash-outline", label: "Camp XP", value: String(data.total_xp ?? 0) },
        { icon: "podium-outline", label: "Rank", value: rankLabel },
        { icon: "school-outline", label: "Trainings", value: String(activeTrainings) },
      ]}
    />
  )
}
