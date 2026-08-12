import { requireOptionalNativeModule } from "expo-modules-core"

export type SpeechRecognitionResultEvent = {
  isFinal?: boolean
  results: Array<{ transcript?: string }>
}

export type SpeechRecognitionErrorEvent = {
  error?: string
  message?: string
}

export type SpeechRecognitionVolumeEvent = {
  value: number
}

export type SafeSpeechRecognitionModule = {
  isRecognitionAvailable: () => boolean
  requestPermissionsAsync: () => Promise<{ granted: boolean }>
  start: (options: Record<string, unknown>) => void
  stop: () => void
  addListener: (
    event: string,
    listener: (payload: unknown) => void,
  ) => { remove: () => void }
}

let cachedModule: SafeSpeechRecognitionModule | null | undefined

/** Native ExpoSpeechRecognition module, or null when absent (Expo Go / stale dev client). */
export function getExpoSpeechRecognitionModule(): SafeSpeechRecognitionModule | null {
  if (cachedModule !== undefined) return cachedModule
  cachedModule =
    requireOptionalNativeModule<SafeSpeechRecognitionModule>("ExpoSpeechRecognition") ?? null
  return cachedModule
}

export function isExpoSpeechRecognitionAvailable(): boolean {
  return getExpoSpeechRecognitionModule() != null
}
