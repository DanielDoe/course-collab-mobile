import { useCallback, useEffect, useState } from "react"
import { ApiError } from "../../lib/api"
import { useSession } from "../../context/SessionProvider"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"

export function useSummerStudentId(): string | null {
  const { session } = useSession()
  return session?.portal === "summer" ? session.id : null
}

export function useSummerLoader<T>(fetcher: (studentId: string) => Promise<T>) {
  const studentId = useSummerStudentId()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!studentId) return
    setError("")
    try {
      setData(await fetcher(studentId))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load data.")
    }
  }, [studentId, fetcher])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useNotificationModuleRefresh("summer-camp", refresh)

  return {
    data,
    loading,
    refreshing,
    error,
    refresh,
  }
}
