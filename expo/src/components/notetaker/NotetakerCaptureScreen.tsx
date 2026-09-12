import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { AppAlert } from "../../lib/app-alert"
import { Ionicons } from "@/components/icons/AppIcon"
import { useRouter } from "expo-router"
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio"
import {
  ModuleListRow,
  ModuleScreen,
  ModuleSection,
  ModuleSectionHeader,
} from "../modules/ModuleScreen"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { useSession } from "../../context/SessionProvider"
import { useStudentShell } from "../../context/StudentShellContext"
import type { StudentSession } from "../../lib/session"
import { ApiError } from "../../lib/student-api"
import { hasNavAccess } from "../../constants/student-nav"
import {
  notetakerApi,
  notetakerNoteSegment,
  NotetakerTierError,
  processNotetakerAudio,
  type NotetakerLimits,
} from "../../lib/notetaker-api"
import { defaultNoteTitle } from "../../lib/notetaker-export"
import { NotetakerTitleSheet } from "./NotetakerTitleSheet"
import { NotetakerLiveCaptions } from "./NotetakerLiveCaptions"
import { NotetakerLiveCaptionChat } from "./NotetakerLiveCaptionChat"
import { NotetakerScreenHeader } from "./NotetakerScreenHeader"
import {
  NotetakerProcessingOverlay,
  type NotetakerProcessingStep,
} from "./NotetakerProcessingOverlay"
import { safeRouterBack } from "../../lib/safe-router-back"
import { useNotetakerLiveCaptions } from "../../hooks/use-notetaker-live-captions"
import { CommEmptyState, CommTintButton } from "../faculty/faculty-communication-ui"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function NotetakerCaptureScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const { membershipTier, membershipTierLoaded } = useStudentShell()

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const recorderState = useAudioRecorderState(recorder, 250)

  const [limits, setLimits] = useState<NotetakerLimits | null>(null)
  const [tierBlocked, setTierBlocked] = useState<string | null>(null)
  const [limitsReady, setLimitsReady] = useState(false)
  const maxSecondsRef = useRef(90 * 60)

  const [permissionReady, setPermissionReady] = useState(false)
  const [recordingActive, setRecordingActive] = useState(false)
  const [paused, setPaused] = useState(false)
  const [pendingRecording, setPendingRecording] = useState<{
    uri: string
    durationSeconds: number
    fileName: string
    mimeType: string
  } | null>(null)
  const [titleSheetOpen, setTitleSheetOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processingLabel, setProcessingLabel] = useState("")
  const [processingStep, setProcessingStep] = useState<NotetakerProcessingStep>("upload")

  const durationSeconds = useMemo(
    () => Math.max(0, Math.round(recorderState.durationMillis / 1000)),
    [recorderState.durationMillis],
  )

  const liveCaptions = useNotetakerLiveCaptions(recordingActive && !paused)
  const maxMinutes = limits?.maxNoteDurationMinutes ?? 90
  const chatEnabled = Boolean(limits?.chatEnabled)
  const membershipBlocked =
    membershipTierLoaded && !hasNavAccess(membershipTier, "Explorer") && !limits
      ? "AI Notetaker requires Explorer or Trailblazer."
      : null
  const blockedMessage = tierBlocked ?? membershipBlocked

  useEffect(() => {
    if (!session) return
    let cancelled = false
    void notetakerApi
      .list(session)
      .then((data) => {
        if (cancelled) return
        setLimits(data.limits)
        setTierBlocked(null)
        maxSecondsRef.current = Math.max(60, (data.limits.maxNoteDurationMinutes || 90) * 60)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof NotetakerTierError) {
          setTierBlocked(err.message)
          setLimits(null)
          return
        }
        maxSecondsRef.current = 90 * 60
      })
      .finally(() => {
        if (!cancelled) setLimitsReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [session])

  useEffect(() => {
    void (async () => {
      const { granted } = await requestRecordingPermissionsAsync()
      if (!granted) {
        AppAlert.alert("Microphone access needed", "Enable microphone access to record audio.")
        return
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      setPermissionReady(true)
    })()
  }, [])

  const startRecording = useCallback(async () => {
    if (!permissionReady || processing || blockedMessage) return
    try {
      liveCaptions.reset()
      await recorder.prepareToRecordAsync()
      recorder.record()
      setPaused(false)
      setRecordingActive(true)
    } catch (err) {
      AppAlert.alert("Recording failed", err instanceof Error ? err.message : "Could not start recording.")
    }
  }, [blockedMessage, liveCaptions, permissionReady, processing, recorder])

  const pauseRecording = useCallback(() => {
    if (!recordingActive || paused) return
    try {
      recorder.pause()
      setPaused(true)
    } catch (err) {
      AppAlert.alert("Pause failed", err instanceof Error ? err.message : "Could not pause recording.")
    }
  }, [paused, recorder, recordingActive])

  const resumeRecording = useCallback(() => {
    if (!recordingActive || !paused) return
    try {
      recorder.record()
      setPaused(false)
    } catch (err) {
      AppAlert.alert("Resume failed", err instanceof Error ? err.message : "Could not resume recording.")
    }
  }, [paused, recorder, recordingActive])

  const finishRecording = useCallback(async () => {
    if (!recordingActive) return
    try {
      await recorder.stop()
      setRecordingActive(false)
      setPaused(false)
      const uri = recorder.uri
      if (!uri) {
        AppAlert.alert("Recording failed", "No audio file was saved.")
        return
      }
      setPendingRecording({
        uri,
        durationSeconds: Math.max(1, durationSeconds),
        fileName: `note-${Date.now()}.m4a`,
        mimeType: "audio/mp4",
      })
      setTitleSheetOpen(true)
    } catch (err) {
      setRecordingActive(false)
      setPaused(false)
      AppAlert.alert("Recording failed", err instanceof Error ? err.message : "Could not stop recording.")
    }
  }, [recordingActive, recorder, durationSeconds])

  useEffect(() => {
    if (!recordingActive || paused) return
    if (durationSeconds >= maxSecondsRef.current) {
      void finishRecording()
    }
  }, [durationSeconds, recordingActive, paused, finishRecording])

  const submitRecording = useCallback(
    async (title: string) => {
      if (!session || !pendingRecording) return
      setProcessing(true)
      setProcessingStep("upload")
      setProcessingLabel("Uploading audio…")
      const summarizeTimer = setTimeout(() => {
        setProcessingStep("summarize")
        setProcessingLabel("Writing your AI summary…")
      }, 12_000)
      try {
        setProcessingStep("transcribe")
        setProcessingLabel("Transcribing with AI…")
        const note = await processNotetakerAudio(session, {
          uri: pendingRecording.uri,
          fileName: pendingRecording.fileName,
          mimeType: pendingRecording.mimeType,
          durationSeconds: pendingRecording.durationSeconds,
          title,
        })
        setTitleSheetOpen(false)
        setPendingRecording(null)
        router.replace(`/notetaker/${notetakerNoteSegment(note)}` as never)
      } catch (err) {
        AppAlert.alert(
          "Processing failed",
          err instanceof ApiError ? err.message : "Could not process your recording.",
        )
      } finally {
        clearTimeout(summarizeTimer)
        setProcessing(false)
        setProcessingLabel("")
      }
    },
    [session, pendingRecording, router],
  )

  const handleBack = useCallback(() => {
    if (processing) return
    if (recordingActive || pendingRecording) {
      AppAlert.alert(
        "Discard recording?",
        "Your audio has not been transcribed yet. Leave without saving?",
        [
          { text: "Keep recording", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              if (recordingActive) {
                void recorder.stop().catch(() => {})
              }
              setRecordingActive(false)
              setPaused(false)
              setPendingRecording(null)
              setTitleSheetOpen(false)
              safeRouterBack(router, "/module/ai-notetaker")
            },
          },
        ],
      )
      return
    }
    safeRouterBack(router, "/module/ai-notetaker")
  }, [processing, recordingActive, pendingRecording, recorder, router])

  if (!session) {
    return (
      <ModuleScreen loading={false} empty={false}>
        <Text style={[type.secondary, { padding: 16 }]}>Student session required.</Text>
      </ModuleScreen>
    )
  }

  const timerStatus = !recordingActive
    ? "Ready to capture"
    : paused
      ? "Paused — tap resume to continue"
      : "Recording in progress"

  return (
    <>
      <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
        <NotetakerScreenHeader title="Record" onBackPress={handleBack} />

        <ModuleScreen loading={!limitsReady} empty={false} disableTopInsetAdjustment contentStyle={{ paddingTop: 8 }}>
          {blockedMessage ? (
            <ModuleSection>
              <CommEmptyState
                icon="lock-closed-outline"
                title="Upgrade required"
                body={blockedMessage}
              />
              <CommTintButton
                label="View membership"
                onPress={() => router.push("/membership" as never)}
                icon="arrow-forward-outline"
              />
            </ModuleSection>
          ) : (
            <>
          <ModuleSection title="Capture audio">
            <View style={styles.sectionBody}>
              {!recordingActive ? (
                <>
                  <Text style={type.bodyEmphasis}>
                    Up to {maxMinutes} min · name it when you finish
                  </Text>
                  <Text style={[type.caption, styles.lead]}>
                    Tap start when you're ready. Pause anytime. Live captions appear as you speak —
                    when you're done, stop and we'll run a full AI transcript and summary.
                  </Text>
                </>
              ) : null}

              <NotetakerLiveCaptions
                active={recordingActive}
                finalText={liveCaptions.finalText}
                interimText={liveCaptions.interimText}
                error={paused ? "Recording paused — live preview will resume with the lecture." : liveCaptions.error}
                listening={liveCaptions.listening && !paused}
                volume={paused ? 0 : liveCaptions.volume}
              />

              {recordingActive ? (
                <NotetakerLiveCaptionChat
                  session={session}
                  captionContext={liveCaptions.combinedText}
                  enabled={chatEnabled}
                />
              ) : null}

              <View style={[styles.timerCard, tokens.cardShadow, { backgroundColor: native.secondaryGrouped }]}>
                <Text style={[styles.timerValue, { color: native.label }]}>
                  {formatDuration(recordingActive ? durationSeconds : 0)}
                </Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>{timerStatus}</Text>
              </View>

              {!recordingActive ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: SN.accent, borderRadius: tokens.button.radius },
                    pressed && { opacity: 0.9 },
                  ]}
                  onPress={() => void startRecording()}
                  disabled={!permissionReady || processing}
                  accessibilityRole="button"
                  accessibilityLabel="Start recording"
                >
                  <Ionicons name="mic" size={18} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>Start recording</Text>
                </Pressable>
              ) : (
                <View style={styles.controlRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.secondaryBtn,
                      { borderColor: native.separator, backgroundColor: native.fill },
                      pressed && { opacity: 0.9 },
                    ]}
                    onPress={paused ? resumeRecording : pauseRecording}
                    disabled={processing}
                    accessibilityRole="button"
                    accessibilityLabel={paused ? "Resume recording" : "Pause recording"}
                  >
                    <Ionicons
                      name={paused ? "play" : "pause"}
                      size={18}
                      color={native.label}
                    />
                    <Text style={[styles.secondaryBtnText, { color: native.label }]}>
                      {paused ? "Resume" : "Pause"}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      styles.stopBtn,
                      { backgroundColor: tokens.danger, borderRadius: tokens.button.radius },
                      pressed && { opacity: 0.9 },
                    ]}
                    onPress={() => void finishRecording()}
                    disabled={processing}
                    accessibilityRole="button"
                    accessibilityLabel="Stop recording"
                  >
                    <Ionicons name="stop" size={18} color="#ffffff" />
                    <Text style={styles.primaryBtnText}>Stop</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </ModuleSection>

          <ModuleSectionHeader title="How it works" />
          <ModuleSection>
            <ModuleListRow
              title="Capture"
              subtitle="Record live audio. Pause and resume without losing the lecture."
              icon="mic-outline"
              iconBg={SN.accentSoft}
              iconColor={SN.accent}
            />
            <ModuleListRow
              title="Transcribe"
              subtitle="Live preview while recording; full AI transcript after you stop."
              icon="text-outline"
              iconBg={native.fill}
              iconColor={native.secondaryLabel}
            />
            <ModuleListRow
              title="AI notes"
              subtitle="Cora summarizes key concepts, definitions, and review points."
              icon="sparkles-outline"
              iconBg={native.fill}
              iconColor={native.secondaryLabel}
              last
            />
          </ModuleSection>
            </>
          )}
        </ModuleScreen>
      </View>

      <NotetakerTitleSheet
        visible={titleSheetOpen}
        initialTitle={defaultNoteTitle()}
        saving={processing}
        onCancel={() => {
          if (processing) return
          setTitleSheetOpen(false)
          setPendingRecording(null)
        }}
        onSave={(title) => void submitRecording(title)}
      />

      <NotetakerProcessingOverlay visible={processing} label={processingLabel} step={processingStep} />
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sectionBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10,
  },
  lead: {
    lineHeight: 18,
  },
  timerCard: {
    alignItems: "center",
    paddingVertical: 20,
    borderRadius: 16,
    gap: 4,
    marginVertical: 4,
  },
  timerValue: {
    fontSize: 40,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  controlRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
  },
  stopBtn: {
    flex: 1,
    marginTop: 0,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
})
