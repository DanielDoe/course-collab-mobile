import type { ComponentType } from "react"
import {
  SummerRoadmapScreen,
} from "../components/summer/SummerModuleScreens"
import { MessagesInboxScreen } from "../components/messages/MessagesInboxScreen"
import { SummerBrowseTrainingsScreen } from "../components/summer/SummerBrowseTrainingsScreen"
import { SummerAchievementsScreen } from "../components/summer/SummerAchievementsScreen"
import { SummerCheckpointsScreen } from "../components/summer/SummerCheckpointsScreen"
import { SummerDiscussionsScreen } from "../components/summer/SummerDiscussionsScreen"
import { SummerGalleryScreen } from "../components/summer/SummerGalleryScreen"
import { SummerGraduationScreen } from "../components/summer/SummerGraduationScreen"
import { SummerLeaderboardScreen } from "../components/summer/SummerLeaderboardScreen"
import { SummerMyTrainingsScreen } from "../components/summer/SummerMyTrainingsScreen"
import { SummerProjectsScreen } from "../components/summer/SummerProjectsScreen"
import { SummerResourcesScreen } from "../components/summer/SummerResourcesScreen"
import { SummerWebModuleScreen } from "../components/summer/SummerWebModuleScreen"

type ModuleRenderer = ComponentType

function webModule(id: string): ModuleRenderer {
  return function SummerWebModuleWrapper() {
    return <SummerWebModuleScreen moduleId={id} />
  }
}

export const SUMMER_MODULE_RENDERERS: Record<string, ModuleRenderer> = {
  "my-trainings": SummerMyTrainingsScreen,
  "browse-trainings": SummerBrowseTrainingsScreen,
  roadmap: SummerRoadmapScreen,
  checkpoints: SummerCheckpointsScreen,
  resources: SummerResourcesScreen,
  gallery: SummerGalleryScreen,
  graduation: SummerGraduationScreen,
  leaderboard: SummerLeaderboardScreen,
  achievements: SummerAchievementsScreen,
  projects: SummerProjectsScreen,
  discussions: SummerDiscussionsScreen,
  messages: MessagesInboxScreen,
  calendar: webModule("calendar"),
}

export function getSummerModuleRenderer(id: string): ModuleRenderer {
  return SUMMER_MODULE_RENDERERS[id] ?? webModule(id)
}
