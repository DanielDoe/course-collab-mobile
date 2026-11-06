import { useCallback, useEffect, useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { ModuleScreen, ModuleSectionHeader } from "../../modules/ModuleScreen"
import { useSession } from "../../../context/SessionProvider"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { hexToRgba } from "../../../constants/app-themes"
import { useNativeType, semanticSoft } from "../../../lib/themed-module-theme"
import {
  guestCareerApi,
  type CareerCoverLetterResponse,
  type CareerGateInfo,
  type CoverLetterHistoryItem,
  type CoverLetterTone,
} from "../../../lib/guest-career-api"
import type { GuestSession } from "../../../lib/session"
import {
  CAREER_ACCENT,
  CareerCard,
  CareerNotice,
  CareerPrimaryButton,
  CareerTextArea,
  CopyButton,
  MasterResumeCard,
  formatCareerDate,
  toCareerGate,
  useMasterResume,
} from "./career-ui"

const TONES: Array<{ id: CoverLetterTone; label: string }> = [
  { id: "professional", label: "Professional" },
  { id: "warm", label: "Warm" },
]

export function GuestCoverLetterScreen() {
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
  const [tone, setTone] = useState<CoverLetterTone>("professional")
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<CareerCoverLetterResponse | null>(null)
  const [gate, setGate] = useState<CareerGateInfo | null>(null)

  const [history, setHistory] = useState<CoverLetterHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadHistory = useCallback(async () => {
    if (!guestSession) return
    try {
      const payload = await guestCareerApi.getHistory(guestSession)
      setHistory(payload.coverLetters ?? [])
    } catch {
      // Non-critical — the generator still works without history.
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

  const handleGenerate = useCallback(async () => {
    if (!guestSession || generating) return
    setGate(null)
    setResult(null)
    setGenerating(true)
    try {
      const payload = await guestCareerApi.generateCoverLetter(guestSession, {
        opportunityDescription: description.trim(),
        tone,
      })
      setResult(payload)
      void loadHistory()
    } catch (err) {
      setGate(toCareerGate(err))
    } finally {
      setGenerating(false)
    }
  }, [guestSession, generating, description, tone, loadHistory])

  if (!guestSession) return null

  const canGenerate = description.trim().length >= 40 && Boolean(masterResume) && !generating
  const accent = tokens.isDark ? "#a78bfa" : CAREER_ACCENT

  return (
    <View style={[styles.screenRoot, { backgroundColor: native.groupedBackground }]}>
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
      >
        <ModuleScreen refreshing={refreshing} onRefresh={handleRefresh} disableTopInsetAdjustment stackedHeader>
          <MasterResumeCard
            resume={masterResume}
            loading={loadingResume}
            uploading={uploading}
            error={resumeError}
            onUpload={() => void pickAndUpload()}
          />

          <CareerCard title="Opportunity description" icon="mail-outline">
            <CareerTextArea
              value={description}
              onChangeText={setDescription}
              placeholder="Paste the opportunity description — Cora tailors the letter to it…"
              minHeight={120}
            />
            <View style={styles.toneRow}>
              {TONES.map((item) => {
                const selected = tone === item.id
                return (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.toneChip,
                      {
                        backgroundColor: selected
                          ? semanticSoft(CAREER_ACCENT, tokens.isDark, 0.18)
                          : native.fill,
                        borderColor: selected
                          ? hexToRgba(CAREER_ACCENT, tokens.isDark ? 0.44 : 0.3)
                          : native.separator,
                      },
                    ]}
                    onPress={() => setTone(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.label} tone`}
                  >
                    <Text
                      style={[
                        type.footnote,
                        { color: selected ? accent : native.secondaryLabel, fontWeight: "700" },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            <CareerPrimaryButton
              label="Generate cover letter"
              icon="create-outline"
              onPress={() => void handleGenerate()}
              loading={generating}
              disabled={!canGenerate}
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

          {result ? (
            <CoverLetterResult result={result} onUpgrade={() => router.push("/module/cora-career" as never)} />
          ) : null}

          <View>
            <ModuleSectionHeader title="Recent letters" />
            <CareerCard>
              {loadingHistory ? (
                <Text style={[type.caption, { color: native.secondaryLabel }]}>Loading history…</Text>
              ) : history.length === 0 ? (
                <Text style={[type.caption, { color: native.secondaryLabel }]}>
                  No cover letters yet — generated letters will appear here.
                </Text>
              ) : (
                history.slice(0, 8).map((letter, index) => (
                  <View
                    key={letter.id}
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
                        {letter.opportunityTitle || letter.organization || "Cover letter"}
                      </Text>
                      <Text style={[type.footnote, { color: native.tertiaryLabel }]} numberOfLines={2}>
                        {letter.preview}
                      </Text>
                      <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
                        {formatCareerDate(letter.updatedAt)} · {letter.tone}
                      </Text>
                    </View>
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

function CoverLetterResult({
  result,
  onUpgrade,
}: {
  result: CareerCoverLetterResponse
  onUpgrade: () => void
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const letter = result.coverLetter
  const isPreview = result.accessTier === "preview"
  const lockedParagraphs = letter.lockedParagraphCount ?? 0

  return (
    <CareerCard title="Your cover letter" icon="document-text-outline">
      {result.opportunity?.title ? (
        <Text style={[type.caption, { color: native.secondaryLabel }]}>
          {result.opportunity.title}
          {result.opportunity.organization ? ` · ${result.opportunity.organization}` : ""}
        </Text>
      ) : null}
      <Text style={[type.body, styles.letterBody, { color: native.label }]}>{letter.body}</Text>
      <CopyButton text={letter.body} label="Copy letter" />
      {isPreview && lockedParagraphs > 0 ? (
        <CareerNotice
          gate={{
            kind: "upgrade",
            message:
              result.previewNote ??
              `${lockedParagraphs} of ${letter.totalParagraphCount ?? lockedParagraphs} paragraphs are locked. Unlock Cora Career to read and copy the full letter.`,
          }}
          onAction={onUpgrade}
        />
      ) : null}
    </CareerCard>
  )
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  body: { flex: 1 },
  toneRow: { flexDirection: "row", gap: 8 },
  toneChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  letterBody: { lineHeight: 22 },
  historyRow: { paddingVertical: 10 },
})
