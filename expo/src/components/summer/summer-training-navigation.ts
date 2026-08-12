import type { Router } from "expo-router"
import {
  findFirstCurriculumModule,
  findNextIncompleteModule,
  isCurriculumComplete,
  isSummerProjectModule,
  summerCampApi,
  type SummerModuleProgress,
} from "../../lib/summer-camp-api"
import { summerModuleRoute, summerTrainingDetailRoute } from "./summer-training-routes"

export type SummerTrainingModuleSummary = {
  curriculumTotal: number
  curriculumCompleted: number
  curriculumPercent: number
  curriculumComplete: boolean
  capstoneTotal: number
  capstoneCompleted: number
  capstonePercent: number
  nextCurriculumModule: SummerModuleProgress | null
  nextCapstoneModule: SummerModuleProgress | null
  resumeModule: SummerModuleProgress | null
  actionLabel: string
  actionSubtitle: string
  progressLabel: string
  progressPercent: number
}

function stripModulePrefix(title: string): string {
  return title.replace(/^(Module|Project)\s+\d+\s*[—–-]\s*/i, "").trim() || title
}

export function summarizeSummerTrainingModules(
  modules: SummerModuleProgress[] | undefined,
): SummerTrainingModuleSummary {
  const visible = (modules ?? []).filter((module) => module.is_visible)
  const curriculum = visible
    .filter((module) => !isSummerProjectModule(module.title))
    .sort((a, b) => a.sort_order - b.sort_order)
  const capstones = visible
    .filter((module) => isSummerProjectModule(module.title))
    .sort((a, b) => a.sort_order - b.sort_order)

  const curriculumCompleted = curriculum.filter((module) => module.is_complete).length
  const capstoneCompleted = capstones.filter((module) => module.is_complete).length
  const curriculumComplete = curriculum.length > 0 && curriculum.every((module) => module.is_complete)
  const nextCurriculumModule = curriculum.find((module) => !module.is_complete) ?? null
  const nextCapstoneModule = capstones.find((module) => !module.is_complete) ?? null

  const curriculumPercent =
    curriculum.length > 0 ? Math.round((curriculumCompleted / curriculum.length) * 100) : 0
  const capstonePercent =
    capstones.length > 0 ? Math.round((capstoneCompleted / capstones.length) * 100) : 0

  let actionLabel = "Start training"
  let actionSubtitle = nextCurriculumModule
    ? stripModulePrefix(nextCurriculumModule.title)
    : "Begin with Module 0"
  let resumeModule = nextCurriculumModule ?? findFirstCurriculumModule(curriculum)

  if (!curriculumComplete) {
    actionLabel = curriculumCompleted > 0 ? "Continue training" : "Start training"
  } else if (nextCapstoneModule) {
    actionLabel = capstoneCompleted > 0 ? "Continue capstone project" : "Start capstone projects"
    actionSubtitle = stripModulePrefix(nextCapstoneModule.title)
    resumeModule = nextCapstoneModule
  } else {
    actionLabel = "Review training"
    actionSubtitle = "Core modules and capstone projects complete"
    resumeModule = curriculum[curriculum.length - 1] ?? null
  }

  const progressLabel = !curriculumComplete
    ? `Core modules ${curriculumCompleted}/${curriculum.length}`
    : capstones.length > 0
      ? `Capstone projects ${capstoneCompleted}/${capstones.length}`
      : `Core modules ${curriculumCompleted}/${curriculum.length}`

  const progressPercent = !curriculumComplete ? curriculumPercent : capstonePercent || 100

  return {
    curriculumTotal: curriculum.length,
    curriculumCompleted,
    curriculumPercent,
    curriculumComplete,
    capstoneTotal: capstones.length,
    capstoneCompleted,
    capstonePercent,
    nextCurriculumModule,
    nextCapstoneModule,
    resumeModule,
    actionLabel,
    actionSubtitle,
    progressLabel,
    progressPercent,
  }
}

export function getSummerTrainingResumeModule(
  modules: SummerModuleProgress[] | undefined,
): SummerModuleProgress | null {
  return summarizeSummerTrainingModules(modules).resumeModule
}

export function getSummerTrainingPrimaryLabel(
  modules: SummerModuleProgress[] | undefined,
  options?: { enrolled?: boolean },
): string {
  if (options?.enrolled === false) return "Enroll in this training"
  return summarizeSummerTrainingModules(modules).actionLabel
}

export async function openSummerTrainingResume(options: {
  router: Router
  studentId: string
  trainingId: number
  modules?: SummerModuleProgress[]
}): Promise<void> {
  const { router, studentId, trainingId } = options
  let modules = options.modules

  if (!modules?.length) {
    try {
      const detail = await summerCampApi.getTrainingDetail(studentId, trainingId)
      modules = detail.modules
    } catch {
      router.push(summerTrainingDetailRoute(trainingId) as never)
      return
    }
  }

  const summary = summarizeSummerTrainingModules(modules)

  if (summary.resumeModule) {
    router.push(summerModuleRoute(trainingId, summary.resumeModule.id) as never)
    return
  }

  if (summary.curriculumComplete && summary.capstoneTotal > 0) {
    router.push("/module/projects" as never)
    return
  }

  router.push(summerTrainingDetailRoute(trainingId) as never)
}
