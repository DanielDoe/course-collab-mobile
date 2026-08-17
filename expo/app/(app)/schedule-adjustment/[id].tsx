import { useLocalSearchParams } from "expo-router"
import { ScheduleAdjustmentDetailScreen } from "../../../src/components/course-info/ScheduleAdjustmentDetailScreen"

export default function ScheduleAdjustmentDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const requestId = Number(id)
  if (!Number.isFinite(requestId) || requestId <= 0) {
    return null
  }
  return <ScheduleAdjustmentDetailScreen requestId={requestId} />
}
