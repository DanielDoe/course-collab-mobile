import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native"
import { NotetakerScreenHeader } from "../../../src/components/notetaker/NotetakerScreenHeader"
import { useAppThemeTokens } from "../../../src/context/AppearanceProvider"
import { nativeType } from "../../../src/constants/faculty-native-theme"
import { fetchInstitutionAnalyticsTab, fetchInstitutionCoraModule, fetchInstitutionMe } from "../../../src/lib/institution-api"
import { ApiError } from "../../../src/lib/api"

function metric(raw: unknown, suffix = ""): string {
  if (raw == null) return "Insufficient data"
  return `${raw}${suffix}`
}

export default function InstitutionCoraScreen() {
  const tokens = useAppThemeTokens()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kpis, setKpis] = useState<Array<{ label: string; value: string }>>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const me = await fetchInstitutionMe()
      if (!me) {
        setError("Institution admin access required.")
        return
      }
      const [coraMod, analytics] = await Promise.all([
        fetchInstitutionCoraModule(),
        fetchInstitutionAnalyticsTab("cora"),
      ])
      const k = (coraMod as { kpis?: Record<string, number> }).kpis
      const cora = (analytics as { cora?: Record<string, unknown> }).cora as Record<string, unknown> | undefined
      const reliance = cora?.reliance as Record<string, unknown> | undefined
      setKpis([
        { label: "Workflows", value: metric(k?.workflows) },
        { label: "Active users", value: metric(k?.activeUsers) },
        { label: "Credits used", value: metric(k?.creditsUsed) },
        { label: "AI assisted share", value: metric(reliance?.aiAssistedTaskShare, "%") },
        { label: "Median assistance depth", value: metric(reliance?.medianAssistanceDepth) },
        { label: "Attempt before AI", value: metric(reliance?.attemptBeforeAiRate, "%") },
      ])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load Cora usage")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <View style={[styles.root, { backgroundColor: tokens.native.groupedBackground }]}>
      <NotetakerScreenHeader title="Cora Usage" fallbackHref="/institution/analytics" />
      <Text style={[styles.note, { color: tokens.native.textMuted }]}>
        Credits are operational metrics, not educational outcomes. Open the web dashboard for full assistance taxonomy and learning-connection charts.
      </Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={tokens.accent} />
      ) : error ? (
        <Text style={[styles.error, { color: tokens.native.text }]}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.grid}>
          {kpis.map((item) => (
            <View
              key={item.label}
              style={[styles.card, { backgroundColor: tokens.native.card, borderColor: tokens.native.separator }]}
            >
              <Text style={[styles.label, { color: tokens.native.textMuted }]}>{item.label}</Text>
              <Text style={[styles.value, nativeType.semibold, { color: tokens.native.text }]}>{item.value}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  note: { paddingHorizontal: 16, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  error: { padding: 16, textAlign: "center" },
  grid: { padding: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "47%",
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    minWidth: 150,
  },
  label: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  value: { fontSize: 22, marginTop: 6 },
})
