import { ApiError } from "./api"
import { presentApiError } from "./present-api-error"
import { reportMobileApiError, reportMobileClientError } from "./system-log-client"

type LogAppErrorOptions = {
  feature?: string
  title?: string
  context?: string
  apiPath?: string
  httpMethod?: string
  silent?: boolean
}

/** Log a user-visible or caught error to CourseCollab system logs. */
export function logAppError(error: unknown, options: LogAppErrorOptions = {}): void {
  if (options.silent) return

  const presentation = presentApiError(error, {
    feature: options.feature,
    fallbackMessage: options.title,
  })

  if (error instanceof ApiError && error.status >= 400) {
    reportMobileApiError({
      path: options.apiPath ?? presentation.detail ?? "unknown",
      method: options.httpMethod,
      status: error.status,
      message: error.message,
      body: error.details,
    })
    return
  }

  reportMobileClientError({
    severity: "error",
    category: "frontend",
    title: options.title ?? presentation.title,
    description: options.context,
    errorMessage: presentation.message,
    stackTrace: error instanceof Error ? error.stack : undefined,
    featureName: options.feature,
    apiEndpoint: options.apiPath,
    httpMethod: options.httpMethod,
    metadata: {
      kind: presentation.kind,
      status: presentation.status,
      detail: presentation.detail,
    },
  })
}
