import { useCallback, useRef, useState } from "react"
import { Platform } from "react-native";
import { AppAlert } from '../lib/app-alert'
import {
  getExpoSpeechRecognitionModule,
  type SpeechRecognitionResultEvent,
  type SafeSpeechRecognitionModule,
} from "../lib/expo-speech-recognition-safe"

export function useCoraVoiceDictation(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const baseRef = useRef("")
  const moduleRef = useRef<SafeSpeechRecognitionModule | null>(null)
  const listenersRef = useRef<Array<{ remove: () => void }>>([])

  const ensureSpeechModule = useCallback(() => {
    if (moduleRef.current) return moduleRef.current
    const mod = getExpoSpeechRecognitionModule()
    if (!mod) return null

    moduleRef.current = mod
    listenersRef.current.forEach((sub) => sub.remove())
    listenersRef.current = [
      mod.addListener("result", (event) => {
        const payload = event as SpeechRecognitionResultEvent
        const transcript = payload.results[0]?.transcript?.trim()
        if (!transcript) return
        const merged = baseRef.current ? `${baseRef.current} ${transcript}` : transcript
        onTranscript(merged)
      }),
      mod.addListener("end", () => setListening(false)),
      mod.addListener("error", () => setListening(false)),
    ]
    return mod
  }, [onTranscript])

  const toggleListening = useCallback(
    async (currentInput: string) => {
      const mod = ensureSpeechModule()
      if (!mod) {
        AppAlert.alert(
          "Voice dictation unavailable",
          Platform.OS === "ios"
            ? "Rebuild the app to enable microphone dictation in Cora."
            : "Voice dictation requires a development build with speech recognition enabled.",
        )
        return
      }

      if (listening) {
        mod.stop()
        setListening(false)
        return
      }

      const permission = await mod.requestPermissionsAsync()
      if (!permission.granted) {
        AppAlert.alert(
          "Microphone access needed",
          "Allow microphone and speech recognition so Cora can transcribe your voice.",
        )
        return
      }

      baseRef.current = currentInput.trim()
      mod.start({
        lang: "en-US",
        interimResults: true,
        continuous: false,
      })
      setListening(true)
    },
    [ensureSpeechModule, listening],
  )

  return { listening, toggleListening }
}
