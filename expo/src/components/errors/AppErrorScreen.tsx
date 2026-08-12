import { useEffect } from "react"
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { useThemedNative } from "../../context/AppearanceProvider"
import { logAppError } from "../../lib/log-app-error"
import { AppErrorNoticeFromError } from "./AppErrorNotice"

type Props = {
  error: unknown
  feature?: string
  fallbackMessage?: string
  onRetry?: () => void
  onDismiss?: () => void
  style?: StyleProp<ViewStyle>
  logOnMount?: boolean
}

/** Full-screen module error state with expandable details + server logging. */
export function AppErrorScreen({
  error,
  feature,
  fallbackMessage,
  onRetry,
  onDismiss,
  style,
  logOnMount = true,
}: Props) {
  const native = useThemedNative()

  useEffect(() => {
    if (!logOnMount || !error) return
    logAppError(error, { feature, context: "AppErrorScreen" })
  }, [error, feature, logOnMount])

  return (
    <View style={[styles.wrap, { backgroundColor: native.groupedBackground }, style]}>
      <AppErrorNoticeFromError
        error={error}
        feature={feature}
        fallbackMessage={fallbackMessage}
        onRetry={onRetry}
        onDismiss={onDismiss}
        variant="card"
        style={styles.notice}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    alignItems: "stretch",
    justifyContent: "center",
    paddingVertical: 24,
  },
  notice: {
    marginHorizontal: 0,
  },
})
