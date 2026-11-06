import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { AssessmentQuestion, AssessmentQuizMeta } from "../lib/assessment-quiz/assessment-quiz-types"
import {
  EXAM_SHARED_TIMER_SECTION_KEY,
  canNavigateToQuestionIndex,
  formatTimerMmSs,
  getExamSharedTimerSeconds,
  getSectionConfigForQuestionIndex,
  isUntimedAssessmentType,
  parseCourseTimer,
  questionHasCircuitDiagram,
  resolveQuestionTimeLimitSeconds,
  resolveSectionTotalTimeSeconds,
  syncExamSharedSectionTimers,
  usesExamSharedTimer,
  usesPerQuestionCountdown,
  usesSectionCountdown,
} from "../lib/assessment-quiz/assessment-timer"
import {
  groupQuestionsBySections,
  parseAssessmentSectionConfig,
  type SectionConfig,
} from "../lib/assessment-quiz/student-assessment-sections"

type Options = {
  assessmentType: string
  quiz: AssessmentQuizMeta | null
  questions: AssessmentQuestion[]
  currentIndex: number
  waterBreakActive: boolean
  enabled: boolean
  initialQuestionTimeRemaining?: Record<string, number>
  initialSectionTimeRemaining?: Record<string, number>
  onQuestionTimerExpire: () => void
}

export function useAssessmentQuizTimer({
  assessmentType,
  quiz,
  questions,
  currentIndex,
  waterBreakActive,
  enabled,
  initialQuestionTimeRemaining,
  initialSectionTimeRemaining,
  onQuestionTimerExpire,
}: Options) {
  const parsedSectionConfig = useMemo(
    () => parseAssessmentSectionConfig(quiz?.section_config as SectionConfig[] | string | null),
    [quiz?.section_config],
  )
  const questionSections = useMemo(
    () => groupQuestionsBySections(questions, parsedSectionConfig),
    [questions, parsedSectionConfig],
  )
  const courseTimer = useMemo(() => parseCourseTimer(quiz?.course_timer), [quiz?.course_timer])

  const [timeLeft, setTimeLeft] = useState(-1)
  const [sectionTimeLeft, setSectionTimeLeft] = useState(-1)
  const [timerStarting, setTimerStarting] = useState(false)

  const globalQuestionTimersRef = useRef<Record<number, number>>({})
  const globalSectionTimersRef = useRef<Record<number, number>>({})
  const visitedRef = useRef<Set<number>>(new Set())
  const graceEndsRef = useRef<Record<number, number>>({})
  const expiredQuestionsRef = useRef<Set<number>>(new Set())
  const onExpireRef = useRef(onQuestionTimerExpire)
  const currentIndexRef = useRef(currentIndex)
  const waterBreakRef = useRef(waterBreakActive)

  onExpireRef.current = onQuestionTimerExpire
  currentIndexRef.current = currentIndex
  waterBreakRef.current = waterBreakActive

  const currentQuestion = questions[currentIndex]

  const sectionCfg = useMemo(() => {
    if (!currentQuestion) return null
    return getSectionConfigForQuestionIndex(currentIndex, questionSections, parsedSectionConfig)
  }, [currentIndex, currentQuestion, questionSections, parsedSectionConfig])

  const showQuestionTimer = Boolean(
    currentQuestion &&
      usesPerQuestionCountdown(
        currentQuestion.question_type,
        sectionCfg,
        parsedSectionConfig,
        assessmentType,
      ),
  )

  const examSharedActive = usesExamSharedTimer(parsedSectionConfig)
  const showSectionTimer = Boolean(
    sectionCfg && usesSectionCountdown(sectionCfg, assessmentType) && !examSharedActive,
  )

  const questionTimeLimit = currentQuestion
    ? resolveQuestionTimeLimitSeconds(
        currentQuestion.question_type,
        currentQuestion.time_limit,
        quiz?.time_per_question,
        sectionCfg,
        courseTimer,
        { hasDiagram: questionHasCircuitDiagram(currentQuestion) },
      )
    : 0

  useEffect(() => {
    if (!enabled || !initialQuestionTimeRemaining) return
    for (const [qid, secs] of Object.entries(initialQuestionTimeRemaining)) {
      globalQuestionTimersRef.current[Number(qid)] = Number(secs)
      if (Number(secs) <= 0) expiredQuestionsRef.current.add(Number(qid))
    }
  }, [enabled, initialQuestionTimeRemaining])

  useEffect(() => {
    if (!enabled || !initialSectionTimeRemaining) return
    for (const [idx, secs] of Object.entries(initialSectionTimeRemaining)) {
      globalSectionTimersRef.current[Number(idx)] = Number(secs)
    }
  }, [enabled, initialSectionTimeRemaining])

  useEffect(() => {
    if (!enabled || !currentQuestion || isUntimedAssessmentType(assessmentType)) {
      setTimeLeft(-1)
      setSectionTimeLeft(-1)
      setTimerStarting(false)
      return
    }

    if (showQuestionTimer) {
      if (expiredQuestionsRef.current.has(currentQuestion.id)) {
        setTimeLeft(0)
        setTimerStarting(false)
      } else {
        const existing = globalQuestionTimersRef.current[currentQuestion.id]
        const wasVisited = visitedRef.current.has(currentQuestion.id)
        const initial = wasVisited
          ? existing !== undefined
            ? existing
            : questionTimeLimit
          : questionTimeLimit

        visitedRef.current.add(currentQuestion.id)
        globalQuestionTimersRef.current[currentQuestion.id] = initial
        graceEndsRef.current[currentQuestion.id] = Date.now() + 2000
        setTimeLeft(initial)
        setTimerStarting(true)
        const delay = setTimeout(() => setTimerStarting(false), 2000)
        return () => clearTimeout(delay)
      }
    } else {
      setTimeLeft(-1)
      setTimerStarting(false)
    }
  }, [
    enabled,
    currentIndex,
    currentQuestion?.id,
    showQuestionTimer,
    questionTimeLimit,
    assessmentType,
  ])

  useEffect(() => {
    if (!enabled || !currentQuestion || isUntimedAssessmentType(assessmentType)) {
      setSectionTimeLeft(-1)
      return
    }

    if (showSectionTimer && sectionCfg) {
      const sec = questionSections.find(
        (s) => currentIndex >= s.startIndex && currentIndex <= s.endIndex,
      )
      if (sec) {
        const existing = globalSectionTimersRef.current[sec.sectionIndex]
        const limit =
          existing ??
          resolveSectionTotalTimeSeconds(sectionCfg, {
            allSections: parsedSectionConfig,
            questionCountInSection: sec.questionIndices.length,
          })
        globalSectionTimersRef.current[sec.sectionIndex] = limit
        setSectionTimeLeft(limit)
        return
      }
    }

    if (examSharedActive) {
      const shared = getExamSharedTimerSeconds(parsedSectionConfig)!
      const existing =
        globalSectionTimersRef.current[EXAM_SHARED_TIMER_SECTION_KEY] ?? shared
      globalSectionTimersRef.current[EXAM_SHARED_TIMER_SECTION_KEY] = existing
      syncExamSharedSectionTimers(globalSectionTimersRef.current, parsedSectionConfig, existing)
      setSectionTimeLeft(existing)
      return
    }

    setSectionTimeLeft(-1)
  }, [
    enabled,
    currentIndex,
    currentQuestion?.id,
    showSectionTimer,
    examSharedActive,
    sectionCfg,
    questionSections,
    parsedSectionConfig,
    assessmentType,
  ])

  useEffect(() => {
    if (!enabled || isUntimedAssessmentType(assessmentType)) return

    const id = setInterval(() => {
      if (waterBreakRef.current) return

      const idx = currentIndexRef.current
      const q = questions[idx]
      if (!q) return

      const cfg = getSectionConfigForQuestionIndex(idx, questionSections, parsedSectionConfig)
      const perQuestion = usesPerQuestionCountdown(
        q.question_type,
        cfg,
        parsedSectionConfig,
        assessmentType,
      )

      if (perQuestion && !expiredQuestionsRef.current.has(q.id)) {
        const grace = graceEndsRef.current[q.id] ?? 0
        if (Date.now() >= grace) {
          const cur = globalQuestionTimersRef.current[q.id]
          if (cur !== undefined) {
            if (cur <= 1) {
              globalQuestionTimersRef.current[q.id] = 0
              expiredQuestionsRef.current.add(q.id)
              setTimeLeft(0)
              onExpireRef.current()
            } else {
              const next = cur - 1
              globalQuestionTimersRef.current[q.id] = next
              setTimeLeft(next)
            }
          }
        }
      }

      if (examSharedActive) {
        const key = EXAM_SHARED_TIMER_SECTION_KEY
        const cur = globalSectionTimersRef.current[key]
        if (cur !== undefined && cur > 0) {
          const next = cur - 1
          syncExamSharedSectionTimers(globalSectionTimersRef.current, parsedSectionConfig, next)
          setSectionTimeLeft(next)
        }
      } else if (cfg && usesSectionCountdown(cfg, assessmentType)) {
        const sec = questionSections.find((s) => idx >= s.startIndex && idx <= s.endIndex)
        if (sec) {
          const key = sec.sectionIndex
          const cur = globalSectionTimersRef.current[key]
          if (cur !== undefined && cur > 0) {
            const next = cur - 1
            globalSectionTimersRef.current[key] = next
            setSectionTimeLeft(next)
          }
        }
      }
    }, 1000)

    return () => clearInterval(id)
  }, [
    enabled,
    assessmentType,
    questions,
    questionSections,
    parsedSectionConfig,
    examSharedActive,
  ])

  const getPersistedTimerState = useCallback(() => {
    const questionTimeRemaining: Record<string, number> = {}
    for (const [qid, secs] of Object.entries(globalQuestionTimersRef.current)) {
      questionTimeRemaining[String(qid)] = secs
    }
    return { questionTimeRemaining }
  }, [])

  const canNavigateTo = useCallback(
    (targetIndex: number) =>
      canNavigateToQuestionIndex(
        targetIndex,
        currentIndex,
        questionSections,
        parsedSectionConfig,
        assessmentType,
      ),
    [assessmentType, currentIndex, questionSections, parsedSectionConfig],
  )

  const showTimer =
    !isUntimedAssessmentType(assessmentType) &&
    (showQuestionTimer || showSectionTimer || examSharedActive)

  const timerDisplay = showQuestionTimer
    ? formatTimerMmSs(timeLeft >= 0 ? timeLeft : questionTimeLimit)
    : formatTimerMmSs(sectionTimeLeft >= 0 ? sectionTimeLeft : 0)

  const timerUrgent = showQuestionTimer
    ? timeLeft >= 0 && timeLeft <= 10
    : sectionTimeLeft >= 0 && sectionTimeLeft <= 300

  const timerDrainPercent =
    showQuestionTimer && questionTimeLimit > 0 && timeLeft >= 0
      ? Math.round((timeLeft / questionTimeLimit) * 100)
      : undefined

  return {
    showTimer,
    showQuestionTimer,
    showSectionTimer: showSectionTimer || examSharedActive,
    timeLeft,
    sectionTimeLeft,
    questionTimeLimit,
    timerStarting,
    timerLabel: showQuestionTimer ? "Question" : "Section",
    timerDisplay,
    timerUrgent,
    timerDrainPercent,
    getPersistedTimerState,
    canNavigateTo,
    isQuestionTimerExpired: (questionId: number) => expiredQuestionsRef.current.has(questionId),
  }
}
