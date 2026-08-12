import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Platform } from "react-native"
import {
  getExpoSpeechRecognitionModule,
  type SpeechRecognitionErrorEvent,
  type SpeechRecognitionResultEvent,
  type SpeechRecognitionVolumeEvent,
  type SafeSpeechRecognitionModule,
} from "../lib/expo-speech-recognition-safe"

export type NotetakerLiveCaptionState = {
  finalText: string
  interimText: string
  combinedText: string
  error: string | null
  listening: boolean
  volume: number
  available: boolean
  reset: () => void
}

function normalizeVolume(raw: number): number {
  return Math.min(1, Math.max(0, (raw + 2) / 12))
}

const MODULE_UNAVAILABLE_MESSAGE =
  "Live preview unavailable — rebuild the app to enable speech recognition. Your lecture is still recording."

export function useNotetakerLiveCaptions(active: boolean): NotetakerLiveCaptionState {
  const [finalText, setFinalText] = useState("")
  const [interimText, setInterimText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [volume, setVolume] = useState(0)
  const [available, setAvailable] = useState(true)

  const activeRef = useRef(active)
  const startingRef = useRef(false)
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const moduleRef = useRef<SafeSpeechRecognitionModule | null>(null)
  const listenersRef = useRef<Array<{ remove: () => void }>>([])
  const startListeningRef = useRef<(() => Promise<void>) | null>(null)

  activeRef.current = active

  const reset = useCallback(() => {
    setFinalText("")
    setInterimText("")
    setError(null)
    setVolume(0)
  }, [])

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
  }, [])

  const detachListeners = useCallback(() => {
    listenersRef.current.forEach((sub) => sub.remove())
    listenersRef.current = []
  }, [])

  const ensureSpeechModule = useCallback((): SafeSpeechRecognitionModule | null => {
    if (moduleRef.current) return moduleRef.current
    const mod = getExpoSpeechRecognitionModule()
    if (!mod) return null

    moduleRef.current = mod
    detachListeners()
    listenersRef.current = [
      mod.addListener("start", () => {
        if (!activeRef.current) return
        setListening(true)
        setError(null)
      }),
      mod.addListener("result", (event) => {
        if (!activeRef.current) return
        const payload = event as SpeechRecognitionResultEvent
        const piece = payload.results[0]?.transcript?.trim() ?? ""
        if (!piece) return
        if (payload.isFinal) {
          setFinalText((prev) => (prev ? `${prev} ${piece}` : piece))
          setInterimText("")
        } else {
          setInterimText(piece)
        }
      }),
      mod.addListener("volumechange", (event) => {
        if (!activeRef.current) return
        const payload = event as SpeechRecognitionVolumeEvent
        setVolume(normalizeVolume(payload.value))
      }),
      mod.addListener("error", (event) => {
        if (!activeRef.current) return
        const payload = event as SpeechRecognitionErrorEvent
        if (payload.error === "no-speech" || payload.error === "aborted") return
        if (payload.error === "audio-capture" || payload.error === "interrupted") {
          setError("Live preview paused — recording continues. Full transcript after you stop.")
          return
        }
        setError(payload.message || "Live captions paused.")
      }),
      mod.addListener("end", () => {
        setListening(false)
        if (!activeRef.current) return
        clearRestartTimer()
        restartTimerRef.current = setTimeout(() => {
          void startListeningRef.current?.()
        }, 450)
      }),
    ]
    return mod
  }, [clearRestartTimer, detachListeners])

  const stopListening = useCallback(() => {
    clearRestartTimer()
    try {
      moduleRef.current?.stop()
    } catch {
      // ignore — module may not be started
    }
    setListening(false)
  }, [clearRestartTimer])

  const startListening = useCallback(async () => {
    if (!activeRef.current || startingRef.current) return
    startingRef.current = true
    try {
      const mod = ensureSpeechModule()
      if (!mod) {
        setAvailable(false)
        setError(MODULE_UNAVAILABLE_MESSAGE)
        return
      }

      if (!mod.isRecognitionAvailable()) {
        setAvailable(false)
        setError("Live captions aren't available on this device.")
        return
      }

      const permission = await mod.requestPermissionsAsync()
      if (!permission.granted) {
        setAvailable(false)
        setError("Allow speech recognition for live captions while recording.")
        return
      }

      mod.start({
        lang: "en-US",
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 120 },
        ...(Platform.OS === "ios"
          ? {
              iosTaskHint: "dictation",
              iosCategory: {
                category: "playAndRecord",
                categoryOptions: ["defaultToSpeaker", "allowBluetooth", "mixWithOthers"],
                mode: "measurement",
              },
            }
          : {
              androidIntentOptions: {
                EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 15000,
              },
            }),
      })
    } catch {
      setAvailable(false)
      setError("Live preview unavailable — your lecture is still recording.")
    } finally {
      startingRef.current = false
    }
  }, [ensureSpeechModule])

  startListeningRef.current = startListening

  useEffect(() => {
    if (!active) {
      stopListening()
      return
    }

    reset()
    const startDelay = setTimeout(() => {
      void startListening()
    }, 900)

    return () => {
      clearTimeout(startDelay)
      stopListening()
    }
  }, [active, reset, startListening, stopListening])

  useEffect(() => {
    return () => {
      clearRestartTimer()
      detachListeners()
      moduleRef.current = null
    }
  }, [clearRestartTimer, detachListeners])

  const combinedText = useMemo(
    () => [finalText.trim(), interimText.trim()].filter(Boolean).join(" ").trim(),
    [finalText, interimText],
  )

  return {
    finalText,
    interimText,
    combinedText,
    error,
    listening,
    volume,
    available,
    reset,
  }
}
