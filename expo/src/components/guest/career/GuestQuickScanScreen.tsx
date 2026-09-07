import { useCallback, useState } from "react"
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { Ionicons } from "@/components/icons/AppIcon"
import { ModuleScreen } from "../../modules/ModuleScreen"
import { useSession } from "../../../context/SessionProvider"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import {
  guestCareerApi,
  type CareerGateInfo,
  type CareerMatchResponse,
} from "../../../lib/guest-career-api"
import type { GuestSession } from "../../../lib/session"
import {
  CareerCard,
  CareerChip,
  CareerNotice,
  CareerPrimaryButton,
  CareerTextArea,
  ChipRow,
  ScoreHeader,
  matchBandColor,
  toCareerGate,
  useMasterResume,
} from "./career-ui"

export function GuestQuickScanScreen() {
  const router = useRouter()
  const { session } = useSession()
  const guestSession = session?.portal === "guest" ? (session as GuestSession) : null
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const insets = useSafeAreaInsets()

  const { masterResume, loadingResume, uploading, resumeError, refreshResume, pickAndUpload } =
    useMasterResume(guestSession)

  const [description, setDescription] = useState("")
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<CareerMatchResponse | null>(null)
  const [gate, setGate] = useState<CareerGateInfo | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refreshResume()
    setRefreshing(false)
  }, [refreshResume])

  const handleScan = useCallback(async () => {
    if (!guestSession || scanning) return
    setGate(null)
    setResult(null)
    setScanning(true)
    try {
      const payload = await guestCareerApi.runMatch(guestSession, {
        opportunityDescription: description.trim(),
        useMasterResume: true,
      })
      setResult(payload)
    } catch (err) {
      setGate(toCareerGate(err))
    } finally {
      setScanning(false)
    }
  }, [guestSession, scanning, description])

  if (!guestSession) return null

  const hasResume = Boolean(masterResume)
  const canScan = hasResume && description.trim().length >= 40 && !scanning

  return (
    <View style={[styles.screenRoot, { backgroundColor: native.groupedBackground }]}>
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
      >
        <ModuleScreen refreshing={refreshing} onRefresh={handleRefresh} disableTopInsetAdjustment stackedHeader>
          {!hasResume && !loadingResume ? (
            <CareerNotice
              gate={{
                kind: "resume",
                message:
                  resumeError ||
                  "Quick Scan uses your saved master résumé. Add one to start scanning opportunities in seconds.",
              }}
              onAction={() => void pickAndUpload()}
              actionLabel={uploading ? "Uploading…" : "Upload résumé"}
            />
          ) : null}

          <CareerCard title="Paste an opportunity" icon="flash-outline">
            <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>
              Cora scans the description against your master résumé
              {masterResume?.originalFileName ? ` (${masterResume.originalFileName})` : ""} and returns a fit score.
            </Text>
            <CareerTextArea
              value={description}
              onChangeText={setDescription}
              placeholder="Paste the job or program description…"
              minHeight={120}
            />
            <CareerPrimaryButton
              label="Scan fit"
              icon="scan-outline"
              onPress={() => void handleScan()}
              loading={scanning}
              disabled={!canScan}
            />
          </CareerCard>

          {gate ? (
            <CareerNotice
              gate={gate}
              onAction={
                gate.kind === "credits"
                  ? () => router.push("/module/cora-credits" as never)
                  : gate.kind === "upgrade"
                    ? () => router.push("/module/cora-career" as never)
                    : gate.kind === "resume"
                      ? () => void pickAndUpload()
                      : undefined
              }
              actionLabel={gate.kind === "resume" ? "Upload résumé" : undefined}
            />
          ) : null}

          {result ? <QuickScanResult result={result} /> : null}
        </ModuleScreen>
      </KeyboardAvoidingView>
    </View>
  )
}

function QuickScanResult({ result }: { result: CareerMatchResponse }) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const analysis = result.analysis

  const topGaps = analysis.skillEvidence.notDemonstrated
    .filter((item) => !item.locked && item.label)
    .slice(0, 3)
    .map((item) => item.label)
  const fallbackGaps = topGaps.length === 0 ? analysis.topImprovements.slice(0, 3) : []
  const gaps = topGaps.length ? topGaps : fallbackGaps

  const matched = analysis.skillEvidence.matched
    .filter((item) => !item.locked && item.label)
    .slice(0, 8)
    .map((item) => item.label)

  const green = matchBandColor("EXCELLENT_ALIGNMENT", tokens.isDark)
  const red = matchBandColor("NEEDS_ALIGNMENT", tokens.isDark)

  return (
    <CareerCard title="Scan result" icon="sparkles-outline">
      <ScoreHeader score={analysis.overallScore} band={analysis.matchBand} />

      {gaps.length ? (
        <View style={{ gap: 8 }}>
          <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700" }]}>Top gaps</Text>
          {gaps.map((gap, index) => (
            <View key={index} style={styles.gapRow}>
              <Ionicons name="alert-circle-outline" size={15} color={red} style={{ marginTop: 2 }} />
              <Text style={[type.secondary, { color: native.secondaryLabel, flex: 1, lineHeight: 20 }]}>{gap}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {matched.length ? (
        <View style={{ gap: 8 }}>
          <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700" }]}>Matched keywords</Text>
          <ChipRow>
            {matched.map((label) => (
              <CareerChip key={label} label={label} color={green} icon="checkmark-outline" />
            ))}
          </ChipRow>
        </View>
      ) : null}

      {result.complimentaryResumeMatches ? (
        <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
          {result.complimentaryResumeMatches.remaining} of {result.complimentaryResumeMatches.limit} complimentary
          scans remaining
        </Text>
      ) : null}
    </CareerCard>
  )
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  body: { flex: 1 },
  gapRow: { flexDirection: "row", gap: 8 },
})
