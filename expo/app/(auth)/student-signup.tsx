import { useCallback, useMemo, useRef } from "react"
import { View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { StudentSignupScreen } from "../../src/components/login/StudentSignupScreen"
import { type RegisterAuthPanelBack } from "../../src/components/login/login-chrome"
import { useAuthNestedBack } from "../../src/components/navigation/useAuthNestedBack"
import { type UniversityRecord } from "../../src/lib/api"

export default function StudentSignupRoute() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{
    universityId?: string | string[]
    universityName?: string | string[]
    universityShortName?: string | string[]
    universityDomain?: string | string[]
    universityColor?: string | string[]
  }>()

  const panelBackRef = useRef<(() => boolean) | null>(null)
  const registerPanelBack = useCallback<RegisterAuthPanelBack>((handler) => {
    panelBackRef.current = handler
  }, [])

  const handleNestedBack = useCallback(() => {
    if (panelBackRef.current?.()) return
    router.back()
  }, [router])

  const nestedBackSwipe = useAuthNestedBack(true, handleNestedBack, insets.top)

  const initialUniversity = useMemo((): UniversityRecord | null => {
    const rawId = Array.isArray(params.universityId) ? params.universityId[0] : params.universityId
    const id = Number(rawId)
    if (!Number.isFinite(id) || id <= 0) return null
    const name = Array.isArray(params.universityName) ? params.universityName[0] : params.universityName
    const shortName = Array.isArray(params.universityShortName)
      ? params.universityShortName[0]
      : params.universityShortName
    if (!name || !shortName) return null
    const domain = Array.isArray(params.universityDomain) ? params.universityDomain[0] : params.universityDomain
    const color = Array.isArray(params.universityColor) ? params.universityColor[0] : params.universityColor
    const accent = color?.trim() || "#582c83"
    return {
      id,
      name,
      short_name: shortName,
      domain: domain?.trim() ? domain.trim() : null,
      primary_color: accent,
      secondary_color: accent,
      logo: null,
      authentication_type: "local",
      is_active: true,
    }
  }, [params])

  return (
    <View style={{ flex: 1 }}>
      {nestedBackSwipe}
      <StudentSignupScreen
        initialUniversity={initialUniversity}
        onBack={() => router.back()}
        registerPanelBack={registerPanelBack}
      />
    </View>
  )
}
