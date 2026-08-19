import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
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
import type { StudentSession } from "../../lib/session"
import { ApiError } from "../../lib/student-api"
import { notetakerNoteSegment, processNotetakerAudio } from "../../lib/notetaker-api"
import { defaultNoteTitle } from "../../lib/notetaker-export"
import { NotetakerTitleSheet } from "./NotetakerTitleSheet"
import { NotetakerLiveCaptions } from "./NotetakerLiveCaptions"
import { NotetakerScreenHeader } from "./NotetakerScreenHeader"
import {
  NotetakerProcessingOverlay,
  type NotetakerProcessingStep,
} from "./NotetakerProcessingOverlay"
import { safeRouterBack } from "../../lib/safe-router-back"
import { useNotetakerLiveCaptions } from "../../hooks/use-notetaker-live-captions"

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

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const recorderState = useAudioRecorderState(recorder, 250)
  const maxSecondsRef = useRef(90 * 60)

  const [permissionReady, setPermissionReady] = useState(false)
  const [recordingActive, setRecordingActive] = useState(false)
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

  const liveCaptions = useNotetakerLiveCaptions(recordingActive)

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
    if (!permissionReady || processing) return
    try {
      await recorder.prepareToRecordAsync()
      recorder.record()
      setRecordingActive(true)
    } catch (err) {
      AppAlert.alert("Recording failed", err instanceof Error ? err.message : "Could not start recording.")
    }
  }, [permissionReady, processing, recorder])

  const finishRecording = useCallback(async () => {
    if (!recordingActive) return
    try {
      await recorder.stop()
      setRecordingActive(false)
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
      AppAlert.alert("Recording failed", err instanceof Error ? err.message : "Could not stop recording.")
    }
  }, [recordingActive, recorder, durationSeconds])

  useEffect(() => {
    if (!recordingActive) return
    if (durationSeconds >= maxSecondsRef.current) {
      void finishRecording()
    }
  }, [durationSeconds, recordingActive, finishRecording])

  const submitRecording = useCallback(
    async (title: string) => {
      if (!session || !pendingRecording) return
      setProcessing(true)
      setProcessingStep("upload")
      setProcessingLabel("Uploading audio…")
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
              setRecordingActive(false)
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
  }, [processing, recordingActive, pendingRecording, router])

  if (!session) {
    return (
      <ModuleScreen loading={false} empty={false}>
        <Text style={[type.secondary, { padding: 16 }]}>Student session required.</Text>
      </ModuleScreen>
    )
  }

  return (
    <>
      <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
        <NotetakerScreenHeader title="Record" onBackPress={handleBack} />

        <ModuleScreen loading={false} empty={false} disableTopInsetAdjustment contentStyle={{ paddingTop: 8 }}>
          <ModuleSection title="Capture audio">
            <View style={styles.sectionBody}>
              {!recordingActive ? (
                <>
                  <Text style={type.bodyEmphasis}>Up to 90 min · name it when you finish</Text>
                  <Text style={[type.caption, styles.lead]}>
                    Tap start when you're ready. Live captions appear as you speak — when you're done, stop and we'll
                    run a full AI transcript and summary on CourseCollab servers using the same data minimization
                    principles as Cora.
                  </Text>
                </>
              ) : null}

              <NotetakerLiveCaptions
                active={recordingActive}
                finalText={liveCaptions.finalText}
                interimText={liveCaptions.interimText}
                error={liveCaptions.error}
                listening={liveCaptions.listening}
                volume={liveCaptions.volume}
              />

              <View style={[styles.timerCard, tokens.cardShadow, { backgroundColor: native.secondaryGrouped }]}>
                <Text style={[styles.timerValue, { color: native.label }]}>
                  {formatDuration(recordingActive ? durationSeconds : 0)}
                </Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>
                  {recordingActive ? "Recording in progress" : "Ready to capture"}
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: recordingActive ? tokens.danger : SN.accent,
                    borderRadius: tokens.button.radius,
                  },
                  pressed && { opacity: 0.9 },
                ]}
                onPress={recordingActive ? finishRecording : startRecording}
                disabled={!permissionReady || processing}
                accessibilityRole="button"
                accessibilityLabel={recordingActive ? "Stop recording" : "Start recording"}
              >
                <Ionicons name={recordingActive ? "stop" : "mic"} size={18} color="#ffffff" />
                <Text style={styles.primaryBtnText}>{recordingActive ? "Stop recording" : "Start recording"}</Text>
              </Pressable>
            </View>
          </ModuleSection>

          <ModuleSectionHeader title="How it works" />
          <ModuleSection>
            <ModuleListRow
              title="Capture"
              subtitle="Record live audio from your microphone."
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
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 4,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
})
