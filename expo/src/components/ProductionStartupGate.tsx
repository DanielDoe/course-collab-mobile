import { useEffect, useState, type ReactNode } from "react"
import { runProductionGuard } from "../config/production-guard"
import { bootLog } from "../lib/boot-diagnostics"
import { hideAppSplashFireAndForget } from "../lib/app-splash"
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
    bootLog("ProductionStartupGate mounted")
  }, [])

  useEffect(() => {
    installEarlyStartupErrorCapture((message) => {
      setFatalError((current) => current ?? message)
    })
  }, [])

  useEffect(() => {
    if (fatalError) hideAppSplashFireAndForget()
  }, [fatalError])

  useEffect(() => {
    if (fatalError) {
      bootLog(`Production startup gate blocked: ${fatalError}`, "error")
    }
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
