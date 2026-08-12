import { useCallback, useEffect, useState } from "react"
import { useFocusEffect } from "expo-router"
import {
  formatFacultyDisplayName,
  getFacultyProfilePrefs,
  type FacultyTitle,
} from "../lib/faculty-profile-preferences"
import type { FacultySession } from "../lib/session"

export function useFacultyDisplayName(session: FacultySession | null | undefined) {
  const [title, setTitle] = useState<FacultyTitle>("")
  const [ready, setReady] = useState(false)

  const reload = useCallback(async () => {
    if (!session) {
      setTitle("")
      setReady(true)
      return
    }
    const prefs = await getFacultyProfilePrefs(session.id)
    setTitle(prefs.title)
    setReady(true)
  }, [session])

  useEffect(() => {
    setReady(false)
    void reload()
  }, [reload])

  useFocusEffect(
    useCallback(() => {
      void reload()
    }, [reload]),
  )

  const displayName = session ? formatFacultyDisplayName(session.name, title) : "there"

  return { displayName, title, ready, reload }
}
