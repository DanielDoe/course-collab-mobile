import { useEffect, useState } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { ApiError, api } from "../src/lib/api"
import { setStoredFacultyCourseId } from "../src/lib/faculty-course-storage"
import { instructorApi } from "../src/lib/instructor-api"
import { useSession } from "../src/context/SessionProvider"
import { BRAND } from "../src/constants"
import { replaceAuthRoute } from "../src/lib/navigation-reset"

/** Dev-only helper: faculty login via coursecollab://dev-faculty-login */
export default function DevFacultyLoginScreen() {
  const router = useRouter()
  const { signIn } = useSession()
  const [error, setError] = useState("")

  useEffect(() => {
    if (!__DEV__) {
      replaceAuthRoute(router, "/login")
      return
    }

    let mounted = true

    void (async () => {
      try {
        const data = await api.instructorLogin("dmdoe", "dmdoe123")
        const instructor = data.faculty ?? data.instructor
        if (!instructor) throw new ApiError("Login failed", 500)

        await signIn({
          portal: "faculty",
          id: Number(instructor.id),
          username: instructor.username,
          name: instructor.name ?? instructor.username,
          email: instructor.email,
          role: instructor.role,
          authIdentifier: "dmdoe",
        })

        try {
          const { courses } = await instructorApi.getCourses(instructor.id)
          const preferred =
            courses.find((c) => c.course_code === "ELEG1301") ??
            courses.find((c) => c.course_code === "ECE2202") ??
            courses[0]
          if (preferred?.id) {
            await setStoredFacultyCourseId(instructor.id, preferred.id)
          }
        } catch (courseErr) {
          console.warn("[dev-faculty-login] course prefetch failed", courseErr)
        }

        if (mounted) replaceAuthRoute(router, "/signing-in")
      } catch (err) {
        if (!mounted) return
        setError(err instanceof ApiError ? err.message : "Dev faculty login failed.")
      }
    })()

    return () => {
      mounted = false
    }
  }, [router, signIn])

  return (
    <View style={styles.root}>
      {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator size="large" color={BRAND.purple} />}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BRAND.bg },
  error: { color: "#b91c1c", paddingHorizontal: 24, textAlign: "center" },
})
