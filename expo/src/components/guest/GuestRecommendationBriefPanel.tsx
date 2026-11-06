import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { AppAlert } from "../../lib/app-alert"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSession } from "../../context/SessionProvider"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useAppToast } from "../../context/AppToastProvider"
import { ApiError } from "../../lib/api"
import { guestApi } from "../../lib/guest-api"
import type { GuestRecommendationBrief } from "../../lib/guest-types"
import type { GuestSession } from "../../lib/session"
import { useNativeType } from "../../lib/themed-module-theme"
import { InfoSectionCard } from "../course-info/course-info-shared"
import { useCourseInfoTheme } from "../course-info/course-info-shared"
import { NATIVE } from "../../constants/faculty-native-theme"

type Props = {
  requestId: number
}

export function GuestRecommendationBriefPanel({ requestId }: Props) {
  const { session } = useSession()
  const guestSession = session?.portal === "guest" ? (session as GuestSession) : null
  const theme = useCourseInfoTheme()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const { showSuccess, showInfo } = useAppToast()

  const [fields, setFields] = useState({
    highlights: "",
    achievements: "",
    goals: "",
    context: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!guestSession) return
    setError("")
    try {
      const payload = await guestApi.getRecommendationBrief(guestSession, requestId)
      const brief = payload.brief
      if (brief) applyBrief(brief)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load brief.")
    }
  }, [guestSession, requestId])

  function applyBrief(brief: GuestRecommendationBrief) {
    setFields({
      highlights: brief.highlights ?? "",
      achievements: brief.achievements ?? "",
      goals: brief.goals ?? "",
      context: brief.context ?? "",
    })
  }

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load])

  async function save() {
    if (!guestSession) return
    setSaving(true)
    setError("")
    try {
      const payload = await guestApi.saveRecommendationBrief(guestSession, requestId, fields)
      if (payload.brief) applyBrief(payload.brief)
      showSuccess("Recommendation brief saved")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save brief.")
    } finally {
      setSaving(false)
    }
  }

  async function generate() {
    if (!guestSession) return
    setGenerating(true)
    setError("")
    try {
      const payload = await guestApi.generateRecommendationBrief(guestSession, requestId)
      if (payload.brief) applyBrief(payload.brief)
      showInfo(
        payload.creditFree ? "Brief generated — no credits used" : "Brief generated — ready to review",
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate brief.")
    } finally {
      setGenerating(false)
    }
  }

  if (!guestSession) return null

  return (
    <InfoSectionCard title="Recommendation brief" icon="sparkles-outline" theme={theme}>
      <Text style={[type.caption, { color: tokens.success, marginBottom: 8, fontWeight: "600" }]}>
        Free — no Cora credits required
      </Text>
      {loading ? (
        <ActivityIndicator color={theme.primary} />
      ) : (
        <>
          {error ? <Text style={[type.destructive, { marginBottom: 8 }]}>{error}</Text> : null}
          {(["highlights", "achievements", "goals", "context"] as const).map((key) => (
            <View key={key} style={styles.field}>
              <Text style={[type.sectionHeader, { color: native.secondaryLabel, textTransform: "capitalize" }]}>
                {key}
              </Text>
              <TextInput
                style={[styles.input, type.body, { color: native.label, borderColor: native.separator, backgroundColor: native.fill }]}
                value={fields[key]}
                onChangeText={(value) => setFields((prev) => ({ ...prev, [key]: value }))}
                multiline
                placeholder={`${key}…`}
                placeholderTextColor={native.tertiaryLabel}
              />
            </View>
          ))}
          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, { backgroundColor: theme.primary }, saving && styles.btnDisabled]}
              onPress={() => void save()}
              disabled={saving || generating}
            >
              <Ionicons name="save-outline" size={16} color="#ffffff" />
              <Text style={styles.btnText}>{saving ? "Saving…" : "Save brief"}</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: theme.primaryDark }, generating && styles.btnDisabled]}
              onPress={() => void generate()}
              disabled={saving || generating}
            >
              <Ionicons name="sparkles-outline" size={16} color="#ffffff" />
              <Text style={styles.btnText}>{generating ? "Generating…" : "Generate with AI"}</Text>
            </Pressable>
          </View>
        </>
      )}
    </InfoSectionCard>
  )
}

const styles = StyleSheet.create({
  field: { gap: 6, marginBottom: 10 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 72,
    textAlignVertical: "top",
  },
  actions: { gap: 8, marginTop: 4 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 12,
  },
  btnDisabled: { opacity: 0.65 },
  btnText: { color: "#ffffff", fontWeight: "600", fontSize: 15 },
})
