import { useCallback, useEffect, useState } from "react"
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { Ionicons } from "@/components/icons/AppIcon"
import { ModuleScreen, ModuleSectionHeader } from "../../modules/ModuleScreen"
import { useSession } from "../../../context/SessionProvider"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import {
  guestCareerApi,
  type CareerGateInfo,
  type CareerMatchResponse,
  type CareerScanHistoryItem,
  type SkillEvidenceItem,
} from "../../../lib/guest-career-api"
import type { GuestSession } from "../../../lib/session"
import {
  CareerCard,
  CareerChip,
  CareerNotice,
  CareerPrimaryButton,
  CareerTextArea,
  ChipRow,
  MasterResumeCard,
  ScoreBarRow,
  ScoreHeader,
  formatCareerDate,
  matchBandColor,
  matchBandLabel,
  toCareerGate,
  useMasterResume,
} from "./career-ui"

const DIMENSION_LABELS: Array<{ key: keyof CareerMatchResponse["analysis"]["dimensionScores"]; label: string }> = [
  { key: "skillsMatch", label: "Skills match" },
  { key: "experienceAlignment", label: "Experience alignment" },
  { key: "roleTitleAlignment", label: "Role & title alignment" },
  { key: "educationQualifications", label: "Education & qualifications" },
  { key: "keywordCoverage", label: "Keyword coverage" },
  { key: "resumeImpact", label: "Résumé impact" },
  { key: "atsReadability", label: "ATS readability" },
]

export function GuestResumeMatchScreen() {
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
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<CareerMatchResponse | null>(null)
  const [gate, setGate] = useState<CareerGateInfo | null>(null)

  const [history, setHistory] = useState<CareerScanHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadHistory = useCallback(async () => {
    if (!guestSession) return
    try {
      const payload = await guestCareerApi.getHistory(guestSession)
      setHistory(payload.scans ?? [])
    } catch {
      // History is non-critical — the form still works without it.
    }
  }, [guestSession])

  useEffect(() => {
    setLoadingHistory(true)
    void loadHistory().finally(() => setLoadingHistory(false))
  }, [loadHistory])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([loadHistory(), refreshResume()])
    setRefreshing(false)
  }, [loadHistory, refreshResume])

  const handleRunMatch = useCallback(async () => {
    if (!guestSession || running) return
    setGate(null)
    setResult(null)
    setRunning(true)
    try {
      const payload = await guestCareerApi.runMatch(guestSession, {
        opportunityDescription: description.trim(),
        useMasterResume: true,
      })
      setResult(payload)
      void loadHistory()
    } catch (err) {
      setGate(toCareerGate(err))
    } finally {
      setRunning(false)
    }
  }, [guestSession, running, description, loadHistory])

  if (!guestSession) return null

  const canRun = description.trim().length >= 40 && Boolean(masterResume) && !running

  return (
    <View style={[styles.screenRoot, { backgroundColor: native.groupedBackground }]}>
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
      >
        <ModuleScreen
          refreshing={refreshing}
          onRefresh={handleRefresh}
          disableTopInsetAdjustment
          stackedHeader
        >
          <MasterResumeCard
            resume={masterResume}
            loading={loadingResume}
            uploading={uploading}
            error={resumeError}
            onUpload={() => void pickAndUpload()}
          />

          <CareerCard title="Opportunity description" icon="briefcase-outline">
            <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>
              Paste the full job, internship, or program description (at least 40 characters).
            </Text>
            <CareerTextArea
              value={description}
              onChangeText={setDescription}
              placeholder="Paste the opportunity description here…"
            />
            <CareerPrimaryButton
              label="Run match"
              icon="analytics-outline"
              onPress={() => void handleRunMatch()}
              loading={running}
              disabled={!canRun}
            />
            {!masterResume && !loadingResume ? (
              <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
                Add your master résumé above to run a match.
              </Text>
            ) : null}
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

          {result ? <MatchResultSections result={result} onUpgrade={() => router.push("/module/cora-career" as never)} /> : null}

          <View>
            <ModuleSectionHeader title="Recent scans" />
            <CareerCard>
              {loadingHistory ? (
                <Text style={[type.caption, { color: native.secondaryLabel }]}>Loading history…</Text>
              ) : history.length === 0 ? (
                <Text style={[type.caption, { color: native.secondaryLabel }]}>
                  No scans yet — your match history will appear here.
                </Text>
              ) : (
                history.slice(0, 8).map((scan, index) => (
                  <View
                    key={scan.id}
                    style={[
                      styles.historyRow,
                      index < Math.min(history.length, 8) - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: native.separator,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[type.body, { color: native.label }]} numberOfLines={1}>
                        {scan.opportunityTitle || scan.organization || "Opportunity scan"}
                      </Text>
                      <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
                        {formatCareerDate(scan.createdAt)} · {matchBandLabel(scan.matchBand, scan.overallScore)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.historyScore,
                        { color: matchBandColor(scan.matchBand, tokens.isDark) },
                      ]}
                    >
                      {Math.round(scan.overallScore)}
                    </Text>
                  </View>
                ))
              )}
            </CareerCard>
          </View>
        </ModuleScreen>
      </KeyboardAvoidingView>
    </View>
  )
}

function MatchResultSections({
  result,
  onUpgrade,
}: {
  result: CareerMatchResponse
  onUpgrade: () => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const analysis = result.analysis

  const matchedChips = visibleLabels(analysis.skillEvidence.matched)
  const missingChips = visibleLabels(analysis.skillEvidence.notDemonstrated)
  const partialChips = visibleLabels(analysis.skillEvidence.partial)
  const lockedCount =
    countLocked(analysis.skillEvidence.matched) +
    countLocked(analysis.skillEvidence.partial) +
    countLocked(analysis.skillEvidence.notDemonstrated)

  const green = matchBandColor("EXCELLENT_ALIGNMENT", tokens.isDark)
  const amber = matchBandColor("DEVELOPING_MATCH", tokens.isDark)
  const red = matchBandColor("NEEDS_ALIGNMENT", tokens.isDark)

  return (
    <>
      <CareerCard title="Match result" icon="sparkles-outline">
        <ScoreHeader score={analysis.overallScore} band={analysis.matchBand} />
        {analysis.summary ? (
          <Text style={[type.secondary, { color: native.secondaryLabel, lineHeight: 21 }]}>{analysis.summary}</Text>
        ) : null}
        {result.creditsCharged != null ? (
          <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
            {result.creditsCharged} credits used
            {result.creditsRemaining != null ? ` · ${result.creditsRemaining} remaining` : ""}
          </Text>
        ) : null}
        {result.complimentaryResumeMatches ? (
          <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
            {result.complimentaryResumeMatches.remaining} of {result.complimentaryResumeMatches.limit} complimentary
            scans remaining
          </Text>
        ) : null}
      </CareerCard>

      <CareerCard title="Section scores" icon="stats-chart-outline">
        {DIMENSION_LABELS.map(({ key, label }) => (
          <ScoreBarRow key={key} label={label} score={analysis.dimensionScores[key] ?? 0} />
        ))}
      </CareerCard>

      <CareerCard title="Keywords & skills" icon="pricetags-outline">
        {matchedChips.length ? (
          <View style={{ gap: 8 }}>
            <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700" }]}>Matched</Text>
            <ChipRow>
              {matchedChips.map((label) => (
                <CareerChip key={`m-${label}`} label={label} color={green} icon="checkmark-outline" />
              ))}
            </ChipRow>
          </View>
        ) : null}
        {partialChips.length ? (
          <View style={{ gap: 8 }}>
            <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700" }]}>Partially shown</Text>
            <ChipRow>
              {partialChips.map((label) => (
                <CareerChip key={`p-${label}`} label={label} color={amber} icon="remove-outline" />
              ))}
            </ChipRow>
          </View>
        ) : null}
        {missingChips.length ? (
          <View style={{ gap: 8 }}>
            <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700" }]}>Missing</Text>
            <ChipRow>
              {missingChips.map((label) => (
                <CareerChip key={`x-${label}`} label={label} color={red} icon="close-outline" />
              ))}
            </ChipRow>
          </View>
        ) : null}
        {lockedCount > 0 ? (
          <CareerNotice
            gate={{
              kind: "upgrade",
              message:
                result.previewNote ??
                `${lockedCount} more insights are locked. Unlock Cora Career to see everything.`,
            }}
            onAction={onUpgrade}
          />
        ) : null}
      </CareerCard>

      {analysis.topImprovements.length ? (
        <CareerCard title="Top improvements" icon="trending-up-outline">
          {analysis.topImprovements.map((item, index) => (
            <View key={index} style={styles.bulletRow}>
              <Ionicons name="arrow-forward-circle-outline" size={16} color={amber} style={{ marginTop: 2 }} />
              <Text style={[type.secondary, { color: native.secondaryLabel, flex: 1, lineHeight: 20 }]}>{item}</Text>
            </View>
          ))}
        </CareerCard>
      ) : null}
    </>
  )
}

function visibleLabels(items: SkillEvidenceItem[]): string[] {
  return items.filter((item) => !item.locked && item.label).map((item) => item.label)
}

function countLocked(items: SkillEvidenceItem[]): number {
  return items.filter((item) => item.locked).length
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  body: { flex: 1 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  historyScore: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  bulletRow: { flexDirection: "row", gap: 8 },
})
