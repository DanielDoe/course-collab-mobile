import { useRouter } from "expo-router"
import { ModuleScreen } from "../modules/ModuleScreen"
import { NATIVE } from "../../constants/faculty-native-theme"
import { CoraNavCardList, CoraNavListCard, type CoraNavCardItem } from "./CoraNavListCard"

const STUDY_PLAN_ACTIONS: CoraNavCardItem[] = [
  {
    id: "generate",
    title: "Generate my plan",
    subtitle: "Auto-creates notes, calendar, flashcards & Practice Hub",
    meta: "New Cora chat",
    icon: "sparkles-outline",
  },
  {
    id: "flashcards",
    title: "Flashcards",
    subtitle: "Decks Cora builds from your weak topics",
    meta: "Study module",
    icon: "layers-outline",
  },
  {
    id: "practice",
    title: "Practice Hub",
    subtitle: "Topic quizzes queued with your study plan",
    meta: "Study module",
    icon: "fitness-outline",
  },
  {
    id: "calendar",
    title: "Calendar assistant",
    subtitle: "Ask Cora about events, reminders, and deadlines",
    meta: "Cora chat",
    icon: "calendar-outline",
  },
  {
    id: "weekly",
    title: "Weekly review",
    subtitle: "Progress recap and next-week priorities",
    meta: "Cora chat",
    icon: "time-outline",
  },
  {
    id: "exam",
    title: "Exam countdown",
    subtitle: "Countdown plan for your next major assessment",
    meta: "Cora chat",
    icon: "flag-outline",
  },
  {
    id: "quizzes",
    title: "Quizzes",
    subtitle: "Open quizzes and check what's due",
    meta: "Assessments",
    icon: "clipboard-outline",
  },
]

export function CoraStudyPlanTab({
  onGeneratePlan,
  onOpenCalendarAssistant,
  onWeeklyReview,
  onExamCountdown,
  onClose,
}: {
  onGeneratePlan: () => void
  onOpenCalendarAssistant: () => void
  onWeeklyReview: () => void
  onExamCountdown: () => void
  onClose?: () => void
}) {
  const router = useRouter()

  const goToModule = (route: string) => {
    onClose?.()
    router.push(route as never)
  }

  return (
    <ModuleScreen contentStyle={{ paddingTop: NATIVE.pagePadding, paddingBottom: 8 }}>
      <CoraNavCardList>
        {STUDY_PLAN_ACTIONS.map((action, index) => (
          <CoraNavListCard
            key={action.id}
            item={action}
            index={index}
            onPress={() => {
              onClose?.()
              if (action.id === "generate") onGeneratePlan()
              else if (action.id === "calendar") onOpenCalendarAssistant()
              else if (action.id === "weekly") onWeeklyReview()
              else if (action.id === "exam") onExamCountdown()
              else if (action.id === "flashcards") goToModule("/module/flashcards")
              else if (action.id === "practice") goToModule("/module/practice")
              else goToModule("/module/quizzes")
            }}
          />
        ))}
      </CoraNavCardList>
    </ModuleScreen>
  )
}
