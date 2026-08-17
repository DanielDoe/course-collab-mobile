import { useCallback, useState } from "react"
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@/components/icons/AppIcon"
import { ModuleScreen } from "../../modules/ModuleScreen"
import { useSession } from "../../../context/SessionProvider"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import {
  guestCareerApi,
  type CareerGateInfo,
  type CareerOptimizeResponse,
} from "../../../lib/guest-career-api"
import type { GuestSession } from "../../../lib/session"
import {
  CareerCard,
  CareerChip,
  CareerNotice,
  CareerPrimaryButton,
  CareerTextArea,
  ChipRow,
  CopyButton,
  MasterResumeCard,
  matchBandColor,
  toCareerGate,
  useMasterResume,
} from "./career-ui"

export function GuestResumeOptimizeScreen() {
  const router = useRouter()
  const { session } = useSession()
  const guestSession = session?.portal === "guest" ? (session as GuestSession) : null
  const native = useThemedNative()
  const type = useNativeType()

  const { masterResume, loadingResume, uploading, resumeError, refreshResume, pickAndUpload } =
    useMasterResume(guestSession)

  const [description, setDescription] = useState("")
  const [optimizing, setOptimizing] = useState(false)
  const [result, setResult] = useState<CareerOptimizeResponse | null>(null)
  const [gate, setGate] = useState<CareerGateInfo | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refreshResume()
    setRefreshing(false)
  }, [refreshResume])

  const handleOptimize = useCallback(async () => {
    if (!guestSession || optimizing) return
    setGate(null)
    setResult(null)
    setOptimizing(true)
    try {
      const payload = await guestCareerApi.optimizeResume(guestSession, {
        opportunityDescription: description.trim(),
      })
      setResult(payload)
    } catch (err) {
      setGate(toCareerGate(err))
    } finally {
      setOptimizing(false)
    }
  }, [guestSession, optimizing, description])

  if (!guestSession) return null

  const canOptimize = description.trim().length >= 40 && Boolean(masterResume) && !optimizing

  return (
    <View style={[styles.screenRoot, { backgroundColor: native.groupedBackground }]}>
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ModuleScreen refreshing={refreshing} onRefresh={handleRefresh} disableTopInsetAdjustment stackedHeader>
          <MasterResumeCard
            resume={masterResume}
            loading={loadingResume}
            uploading={uploading}
            error={resumeError}
            onUpload={() => void pickAndUpload()}
          />

          <CareerCard title="Target opportunity" icon="rocket-outline">
            <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>
              Cora rewrites your résumé to close the gap with this opportunity — without inventing experience.
            </Text>
            <CareerTextArea
              value={description}
              onChangeText={setDescription}
              placeholder="Paste the opportunity description to optimize against…"
              minHeight={120}
            />
            <CareerPrimaryButton
              label="Optimize résumé"
              icon="color-wand-outline"
              onPress={() => void handleOptimize()}
              loading={optimizing}
              disabled={!canOptimize}
            />
            {!masterResume && !loadingResume ? (
              <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
                A master résumé is required — upload one above first.
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

          {result ? <OptimizeResultSections result={result} /> : null}
        </ModuleScreen>
      </KeyboardAvoidingView>
    </View>
  )
}

function OptimizeResultSections({ result }: { result: CareerOptimizeResponse }) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const data = result.result

  const green = matchBandColor("EXCELLENT_ALIGNMENT", tokens.isDark)
  const violet = matchBandColor("STRONG_MATCH", tokens.isDark)

  return (
    <>
      <CareerCard title="Revised summary" icon="sparkles-outline">
        {result.opportunityTitle ? (
          <Text style={[type.caption, { color: native.secondaryLabel }]}>
            {result.opportunityTitle}
            {result.organization ? ` · ${result.organization}` : ""} · match {Math.round(result.matchScore)}/100
          </Text>
        ) : null}
        <Text style={[type.body, { color: native.label, lineHeight: 22 }]}>{data.revisedSummary}</Text>
        {result.creditsCharged != null ? (
          <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
            {result.creditsCharged} credits used
            {result.creditsRemaining != null ? ` · ${result.creditsRemaining} remaining` : ""}
          </Text>
        ) : null}
      </CareerCard>

      {data.skillsToAdd.length ? (
        <CareerCard title="Skills to add" icon="add-circle-outline">
          <ChipRow>
            {data.skillsToAdd.map((skill) => (
              <CareerChip key={skill} label={skill} color={green} icon="add-outline" />
            ))}
          </ChipRow>
        </CareerCard>
      ) : null}

      {data.keywordAdditions.length ? (
        <CareerCard title="Keyword additions" icon="pricetags-outline">
          <ChipRow>
            {data.keywordAdditions.map((item) => (
              <CareerChip key={item.keyword} label={item.keyword} color={violet} icon="pricetag-outline" />
            ))}
          </ChipRow>
          {data.keywordAdditions.map((item) => (
            <View key={`detail-${item.keyword}`} style={styles.keywordDetail}>
              <Text style={[type.caption, { color: native.label, fontWeight: "700" }]}>
                {item.keyword}
                {item.section ? ` · ${item.section}` : ""}
              </Text>
              <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>{item.suggestion}</Text>
            </View>
          ))}
        </CareerCard>
      ) : null}

      {data.bulletRewrites.length ? (
        <CareerCard title="Bullet rewrites" icon="repeat-outline">
          {data.bulletRewrites.map((rewrite, index) => (
            <View
              key={index}
              style={[styles.rewriteBlock, { backgroundColor: native.fill, borderColor: native.separator }]}
            >
              <View style={styles.rewriteRow}>
                <Ionicons name="remove-circle-outline" size={15} color={native.tertiaryLabel} style={{ marginTop: 2 }} />
                <Text style={[type.caption, styles.rewriteBefore, { color: native.tertiaryLabel }]}>
                  {rewrite.original}
                </Text>
              </View>
              <View style={styles.rewriteRow}>
                <Ionicons name="checkmark-circle-outline" size={15} color={green} style={{ marginTop: 2 }} />
                <Text style={[type.caption, { color: native.label, flex: 1, lineHeight: 18 }]}>{rewrite.revised}</Text>
              </View>
              {rewrite.reason ? (
                <Text style={[type.footnote, { color: native.tertiaryLabel, lineHeight: 16 }]}>{rewrite.reason}</Text>
              ) : null}
            </View>
          ))}
        </CareerCard>
      ) : null}

      {data.atsFixes.length ? (
        <CareerCard title="ATS fixes" icon="construct-outline">
          {data.atsFixes.map((fix, index) => (
            <View key={index} style={styles.fixRow}>
              <Ionicons name="build-outline" size={15} color={violet} style={{ marginTop: 2 }} />
              <Text style={[type.secondary, { color: native.secondaryLabel, flex: 1, lineHeight: 20 }]}>{fix}</Text>
            </View>
          ))}
        </CareerCard>
      ) : null}

      {data.revisedResumeText ? (
        <CareerCard title="Full revised résumé" icon="document-text-outline">
          <View style={[styles.resumeTextBlock, { backgroundColor: native.fill, borderColor: native.separator }]}>
            <Text style={[type.footnote, { color: native.label, lineHeight: 19 }]}>{data.revisedResumeText}</Text>
          </View>
          <CopyButton text={data.revisedResumeText} label="Copy résumé" />
        </CareerCard>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  body: { flex: 1 },
  keywordDetail: { gap: 3 },
  rewriteBlock: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  rewriteRow: { flexDirection: "row", gap: 8 },
  rewriteBefore: { flex: 1, lineHeight: 18, textDecorationLine: "line-through" },
  fixRow: { flexDirection: "row", gap: 8 },
  resumeTextBlock: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
})
