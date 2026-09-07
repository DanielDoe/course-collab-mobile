import { Component, type ErrorInfo, type ReactNode } from "react"
import { reportMobileClientError } from "../../lib/system-log-client"
import { AppErrorScreen } from "../errors/AppErrorScreen"

type Props = {
  children: ReactNode
  feature?: string
}

type State = {
  error: Error | null
}

/** Isolates one conversation/inbox subtree so a malformed thread cannot blank the app. */
export class MessagesErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportMobileClientError({
      severity: "critical",
      category: "frontend",
      title: "Messages render error",
      errorMessage: error.message,
      stackTrace: [error.stack, info.componentStack].filter(Boolean).join("\n"),
    })
  }

  render() {
    if (this.state.error) {
      return (
        <AppErrorScreen
          error={this.state.error}
          feature={this.props.feature ?? "Messages"}
          fallbackMessage="This conversation could not be shown. Go back and try another thread."
          onRetry={() => this.setState({ error: null })}
        />
      )
    }
    return this.props.children
  }
}
