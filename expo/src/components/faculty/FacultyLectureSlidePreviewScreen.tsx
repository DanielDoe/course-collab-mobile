import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"
import { useRouter } from "expo-router"
import { ApiError } from "../../lib/api"
import { instructorApi } from "../../lib/instructor-api"
import { buildInstructorLectureViewerPath } from "../../constants/module-web-paths"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useThemedNative } from "../../context/AppearanceProvider"
import { WebModuleScreen } from "../modules/WebModuleScreen"
import { LectureSlidePreviewToolbar } from "../lectures/LectureSlidePreviewToolbar"
import { lectureViewerRootStyle, lectureViewerWebHostStyle } from "../lectures/lecture-viewer-layout"
import { FacultyEmptyState } from "./faculty-shared"

type Props = {
  lectureId: number
}

/** Instructor lecture preview — production web viewer with workspace & sample practice. */
export function FacultyLectureSlidePreviewScreen({ lectureId }: Props) {
  const router = useRouter()
  const native = useThemedNative()
  const { scope, course, ready } = useFacultyScope()
  const [title, setTitle] = useState("Lecture preview")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const webPath = useMemo(() => buildInstructorLectureViewerPath(lectureId), [lectureId])

  const facultyCourse = useMemo(
    () =>
      course
        ? {
            id: course.id,
            course_code: course.course_code,
            course_title: course.course_title,
          }
        : null,
    [course],
  )

  useEffect(() => {
    if (!scope || !Number.isFinite(lectureId) || lectureId <= 0) {
      setLoading(false)
      if (!Number.isFinite(lectureId) || lectureId <= 0) setError("Invalid lecture.")
      return
    }
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError("")
    void instructorApi
      .getLectures(scope)
      .then((lectures) => {
        const match = lectures.find((item) => item.id === lectureId)
        if (match) {
          setTitle(match.title?.trim() || "Lecture preview")
        } else {
          setError("This lecture could not be found.")
        }
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Could not load lecture.")
      })
      .finally(() => setLoading(false))
  }, [scope, ready, lectureId])

  return (
    <View style={[lectureViewerRootStyle, { backgroundColor: native.groupedBackground }]}>
      <LectureSlidePreviewToolbar title={title} onBack={() => router.back()} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={native.label} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <FacultyEmptyState icon="alert-circle-outline" title="Could not load" body={error} />
        </View>
      ) : scope ? (
        <View style={lectureViewerWebHostStyle}>
          <WebModuleScreen
            webPath={webPath}
            facultyCourse={facultyCourse}
            immersive
            immersiveLecture
            insetTop={false}
          />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", padding: 24 },
})
