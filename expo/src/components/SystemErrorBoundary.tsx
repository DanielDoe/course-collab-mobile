import { Component, type ErrorInfo, type ReactNode } from "react"
import { reportMobileClientError } from "../lib/system-log-client"
import { AppErrorScreen } from "./errors/AppErrorScreen"

type Props = {
  children: ReactNode
}

type State = {
  error: Error | null
}

export class SystemErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportMobileClientError({
      severity: "critical",
      category: "frontend",
      title: "React render error (mobile)",
      errorMessage: error.message,
      stackTrace: [error.stack, info.componentStack].filter(Boolean).join("\n"),
    })
  }

  render() {
    if (this.state.error) {
      return (
        <AppErrorScreen
          error={this.state.error}
          feature="This screen"
          fallbackMessage="Something went wrong while rendering this screen."
        />
      )
    }
    return this.props.children
  }
}
