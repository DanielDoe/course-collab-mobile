import { useLocalSearchParams } from "expo-router"
import { useSession } from "../../../src/context/SessionProvider"
import { getFacultyModuleRenderer } from "../../../src/modules/faculty-registry"
import { getModuleRenderer } from "../../../src/modules/registry"
import { getGuestModuleRenderer } from "../../../src/modules/guest-registry"
import { getSummerModuleRenderer } from "../../../src/modules/summer-registry"

export default function ModuleScreen() {
  const { session } = useSession()
  const { id } = useLocalSearchParams<{ id: string }>()
  const slug = typeof id === "string" ? id : "dashboard"
  const Renderer =
    session?.portal === "faculty"
      ? getFacultyModuleRenderer(slug)
      : session?.portal === "summer"
        ? getSummerModuleRenderer(slug)
        : session?.portal === "guest"
          ? getGuestModuleRenderer(slug)
          : getModuleRenderer(slug)
  return <Renderer />
}
