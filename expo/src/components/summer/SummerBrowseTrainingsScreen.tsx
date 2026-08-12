import { AppAlert } from '../../lib/app-alert'
import { useMemo, useState } from "react"

import { useRouter } from "expo-router"
import { summerCampApi, type SummerBrowseCamp, type SummerBrowseTraining } from "../../lib/summer-camp-api"
import { ApiError } from "../../lib/api"
import { FacultyEmptyState } from "../faculty/faculty-shared"
import { useSummerStudentId } from "./summer-module-hooks"
import { summerTrainingDetailRoute } from "./summer-training-routes"
import { openSummerTrainingResume } from "./summer-training-navigation"
import {
  ModuleScreen,
  ModuleSection,
  SummerSearchResultsBar,
  SummerSearchToolbar,
  matchesSummerSearch,
} from "./summer-module-shell"
import {
  SummerBrowseTrainingActionSheet,
  type BrowseTrainingSelection,
} from "./SummerBrowseTrainingActionSheet"
import { SummerBrowseTrainingListCard } from "./SummerBrowseTrainingListCard"
import { useSummerLoader } from "./summer-module-hooks"

type CampSection = {
  camp: SummerBrowseCamp
  trainings: SummerBrowseTraining[]
}

export function SummerBrowseTrainingsScreen() {
  const router = useRouter()
  const studentId = useSummerStudentId()
  const { data, loading, refreshing, error, refresh } = useSummerLoader(summerCampApi.getBrowseTrainings)
  const [search, setSearch] = useState("")
  const [selection, setSelection] = useState<BrowseTrainingSelection | null>(null)
  const [enrollingId, setEnrollingId] = useState<number | null>(null)

  const camps = data?.camps ?? []
  const totalTrainings = useMemo(
    () => camps.reduce((count, camp) => count + camp.trainings.length, 0),
    [camps],
  )

  const sections = useMemo(() => {
    const q = search.trim()
    return camps
      .map((camp): CampSection | null => {
        const campMatches = matchesSummerSearch(q, camp.title, camp.description, camp.status)
        const trainings = camp.trainings.filter((training) =>
          matchesSummerSearch(
            q,
            training.title,
            training.description,
            training.meta.summary,
            training.meta.overview,
            training.meta.duration,
            training.meta.difficulty,
            training.meta.audience,
            training.meta.format,
            training.meta.tags.join(" "),
            camp.title,
            ...training.faculty.map((member) => [member.name, member.job_title, member.institution].join(" ")),
          ),
        )
        if (!campMatches && !trainings.length) return null
        return { camp, trainings: campMatches ? camp.trainings : trainings }
      })
      .filter((section): section is CampSection => section !== null && section.trainings.length > 0)
  }, [camps, search])

  const shownTrainings = useMemo(
    () => sections.reduce((count, section) => count + section.trainings.length, 0),
    [sections],
  )

  const queryActive = search.trim().length > 0

  function openTrainingDetail({ training }: BrowseTrainingSelection) {
    setSelection(null)
    router.push(summerTrainingDetailRoute(training.id) as never)
  }

  async function handleEnroll({ training }: BrowseTrainingSelection) {
    if (!studentId || enrollingId != null) return
    setEnrollingId(training.id)
    try {
      await summerCampApi.enrollInTraining(studentId, training.id)
      setSelection(null)
      await refresh()
      await openSummerTrainingResume({
        router,
        studentId,
        trainingId: training.id,
      })
    } catch (err) {
      AppAlert.alert(
        "Enrollment failed",
        err instanceof ApiError ? err.message : "Could not enroll in this training.",
      )
    } finally {
      setEnrollingId(null)
    }
  }

  async function handleContinueTraining({ training }: BrowseTrainingSelection) {
    if (!studentId) return
    setSelection(null)
    await openSummerTrainingResume({
      router,
      studentId,
      trainingId: training.id,
    })
  }

  return (
    <ModuleScreen loading={loading} refreshing={refreshing} onRefresh={() => void refresh()} error={error}>
      <SummerSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search camps and trainings…"
        showFilter={false}
      />

      <SummerSearchResultsBar
        visible={queryActive && totalTrainings > 0}
        shown={shownTrainings}
        total={totalTrainings}
        query={search}
        onClear={() => setSearch("")}
      />

      {!camps.length || totalTrainings === 0 ? (
        <FacultyEmptyState
          icon="search-outline"
          title="No trainings available"
          body="Check back when new camp tracks are published."
        />
      ) : sections.length === 0 ? (
        <FacultyEmptyState icon="search-outline" title="No matches" body="Try a different search term." />
      ) : (
        sections.map((section) => (
          <ModuleSection key={section.camp.id} title={section.camp.title}>
            {section.trainings.map((training, index) => (
              <SummerBrowseTrainingListCard
                key={training.id}
                training={training}
                last={index === section.trainings.length - 1}
                onPress={() => setSelection({ camp: section.camp, training })}
              />
            ))}
          </ModuleSection>
        ))
      )}

      <SummerBrowseTrainingActionSheet
        visible={selection != null}
        selection={selection}
        onClose={() => setSelection(null)}
        onOpenDetail={openTrainingDetail}
        onContinueTraining={(item) => void handleContinueTraining(item)}
        onEnroll={(item) => void handleEnroll(item)}
        enrolling={selection != null && enrollingId === selection.training.id}
      />
    </ModuleScreen>
  )
}
