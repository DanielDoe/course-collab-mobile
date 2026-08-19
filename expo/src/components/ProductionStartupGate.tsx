import { useEffect, useState, type ReactNode } from "react"
import * as SplashScreen from "expo-splash-screen"
import { runProductionGuard } from "../config/production-guard"
import { installEarlyStartupErrorCapture, peekStartupError } from "../lib/startup-error-capture"
import { StartupFatalScreen } from "./StartupFatalScreen"

type Props = {
  children: ReactNode
}

function readProductionStartupError(): string | null {
  if (typeof __DEV__ !== "undefined" && __DEV__) return null

  const guard = runProductionGuard()
  if (!guard.ok) {
    return guard.errors.join("\n")
  }

  return peekStartupError()
}

export function ProductionStartupGate({ children }: Props) {
  const [fatalError, setFatalError] = useState<string | null>(readProductionStartupError)

  useEffect(() => {
    installEarlyStartupErrorCapture((message) => {
      setFatalError((current) => current ?? message)
    })
  }, [])

  useEffect(() => {
    const failsafe = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => {})
    }, 15_000)
    return () => clearTimeout(failsafe)
  }, [])

  useEffect(() => {
    if (fatalError) void SplashScreen.hideAsync().catch(() => {})
  }, [fatalError])

  if (fatalError) {
    return (
      <StartupFatalScreen
        message={fatalError}
        onRetry={() => setFatalError(readProductionStartupError())}
      />
    )
  }

  return children
}
