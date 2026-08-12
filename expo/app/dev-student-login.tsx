import { useEffect, useRef, useState, type ComponentType } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { ApiError, api, type UniversityRecord, type UniversityStudentLoginResponse } from "../src/lib/api"
import { primeMembershipTierCache } from "../src/lib/membership-tier-cache"
import { persistMfaDeviceTrustFromLogin, studentMfaLoginKey, studentMfaAliasKeys } from "../src/lib/mfa-device-trust"
import { parseMfaCompletePayload, parseMfaLoginResponse, type MfaLoginState } from "../src/lib/mfa-types"
import { useSession } from "../src/context/SessionProvider"
import { BrandLoadingMark } from "../src/components/login/BrandLoadingMark"
import { replaceAuthRoute } from "../src/lib/navigation-reset"

type MfaLoginStepProps = {
  state: MfaLoginState
  portalLabel?: string
  showChrome?: boolean
  university?: Pick<UniversityRecord, "logo" | "name" | "short_name" | "primary_color"> | null
  onComplete: (data: Record<string, unknown>) => void
  onBack: () => void
}

/**
 * Dev-only helper: university-first student login via coursecollab://dev-student-login
 * Uses UH + known test credentials against /api/auth/student/login.
 */
export default function DevStudentLoginScreen() {
  const router = useRouter()
  const { signIn } = useSession()
  const [error, setError] = useState("")
  const [mfaState, setMfaState] = useState<MfaLoginState | null>(null)
  const [university, setUniversity] = useState<UniversityRecord | null>(null)
  const [MfaLoginStep, setMfaLoginStep] = useState<ComponentType<MfaLoginStepProps> | null>(null)
  const autoLoginStarted = useRef(false)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (!mfaState) return
    let mounted = true
    void import("../src/components/auth/MfaLoginStep").then((mod) => {
      if (mounted) setMfaLoginStep(() => mod.MfaLoginStep)
    })
    return () => {
      mounted = false
    }
  }, [mfaState])

  useEffect(() => {
    if (!__DEV__ || cancelledRef.current || mfaState || autoLoginStarted.current) return

    autoLoginStarted.current = true
    let mounted = true

    void (async () => {
      try {
        const universityId = 2
        const identifier = "665322590"
        const password = "ECE2202!"

        const [uniData, data] = await Promise.all([
          api.getUniversities(),
          api.universityStudentLogin({
            universityId,
            identifier,
            password,
            rememberMe: false,
            courseId: 7,
          }),
        ])

        if (!mounted || cancelledRef.current) return

        setUniversity(uniData.universities.find((entry) => entry.id === universityId) ?? null)

        const mfa = parseMfaLoginResponse(data as Record<string, unknown>)
        if (mfa) {
          if (mounted && !cancelledRef.current) setMfaState(mfa)
          return
        }

        if ("requiresCourseSelection" in data && data.requiresCourseSelection) {
          throw new ApiError(
            "Dev login needs a courseId — multi-enrollment returned. Update courseId in dev-student-login.",
            409,
          )
        }

        await completeDevLogin(data, { signIn, router, mounted, universityId, cancelled: cancelledRef })
      } catch (err) {
        if (!mounted || cancelledRef.current) return
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Dev login failed."
        setError(message)
      }
    })()

    return () => {
      mounted = false
    }
  }, [mfaState, router, signIn])

  async function handleMfaComplete(payload: Record<string, unknown>) {
    const normalized = parseMfaCompletePayload(payload)
    if (!normalized || !("student" in normalized) || !normalized.student) {
      throw new ApiError("Login failed after MFA verification.", 500)
    }
    await persistMfaDeviceTrustFromLogin({
      userType: "student",
      loginKey: studentMfaLoginKey(2, "665322590"),
      payload: { ...payload, ...normalized },
      aliasKeys: studentMfaAliasKeys(2, "665322590", normalized.student as { student_id?: string; email?: string }),
    })
    await completeDevLogin(
      normalized as Extract<UniversityStudentLoginResponse, { student: unknown }>,
      { signIn, router, mounted: true, universityId: 2, cancelled: cancelledRef },
    )
  }

  if (!__DEV__) {
    return null
  }

  if (mfaState) {
    return MfaLoginStep ? (
      <MfaLoginStep
        state={mfaState}
        university={university}
        portalLabel={university?.short_name ?? "UH"}
        onComplete={(payload) => handleMfaComplete(payload)}
        onBack={() => {
          cancelledRef.current = true
          setMfaState(null)
          replaceAuthRoute(router, "/login")
        }}
      />
    ) : (
      <View style={styles.boot}>
        <BrandLoadingMark />
      </View>
    )
  }

  return (
    <View style={styles.boot}>
      {error ? <Text style={styles.error}>{error}</Text> : <BrandLoadingMark />}
    </View>
  )
}

async function completeDevLogin(
  data: Extract<UniversityStudentLoginResponse, { student: unknown }>,
  ctx: {
    signIn: ReturnType<typeof useSession>["signIn"]
    router: ReturnType<typeof useRouter>
    mounted: boolean
    universityId: number
    cancelled?: { current: boolean }
  },
) {
  if (ctx.cancelled?.current) return

  const student = data.student
  const enrollment = data.enrollment
  const university = data.university

  const loginIdentifier = "665322590"
  const universityId = university?.id ?? ctx.universityId
  if (universityId && loginIdentifier.trim()) {
    await persistMfaDeviceTrustFromLogin({
      userType: "student",
      loginKey: studentMfaLoginKey(universityId, loginIdentifier),
      payload: data as Record<string, unknown>,
      aliasKeys: studentMfaAliasKeys(universityId, loginIdentifier, {
        student_id: student.student_id,
        email: student.email,
      }),
    })
  }

  await primeMembershipTierCache(String(student.id), data.effectiveMembershipTier)
  await ctx.signIn({
    portal: "student",
    id: student.student_id,
    authIdentifier: loginIdentifier,
    email: student.email,
    name: student.full_name,
    section: student.section ?? enrollment?.section ?? "",
    databaseId: String(student.id),
    courseId: enrollment?.courseId ?? (student.course_id != null ? Number(student.course_id) : 7),
    courseCode: enrollment?.courseCode ?? "ECE2202",
    courseTitle: enrollment?.courseTitle ?? "ECE 2202",
    universityId: university?.id ?? ctx.universityId,
    universityName: university?.name,
    universityShortName: university?.short_name,
  })

  if (ctx.mounted && !ctx.cancelled?.current) replaceAuthRoute(ctx.router, "/signing-in")
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  error: { color: "#b91c1c", paddingHorizontal: 24, textAlign: "center" },
})
