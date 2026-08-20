import { Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { BRAND } from "../constants"
import { startupBootDiagnosticId } from "../lib/startup-boot-id"

type Props = {
  message: string
  onRetry?: () => void
}

/** Minimal fatal screen — no theme providers (may run before app boot). */
export function StartupFatalScreen({ message, onRetry }: Props) {
  const diagnosticId = startupBootDiagnosticId(message)
  const showDetails = true

  return (
    <View style={styles.root}>
      <Text style={styles.brand}>CourseCollab</Text>
      <Text style={styles.title}>We couldn&apos;t start CourseCollab.</Text>
      <Text style={styles.body}>
        Something went wrong during startup. Try again, or contact support with the diagnostic ID
        below.
      </Text>
      <Text style={styles.diagnosticLabel}>Diagnostic ID</Text>
      <Text selectable style={styles.diagnosticId}>
        {diagnosticId}
      </Text>
      {showDetails ? (
        <View style={styles.detailsPanel}>
          <Text selectable style={styles.details}>
            {message}
          </Text>
        </View>
      ) : null}
      {onRetry ? (
        <Pressable style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND.bg,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 32,
    gap: 10,
  },
  brand: {
    fontSize: 14,
    fontWeight: "600",
    color: BRAND.purple,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: BRAND.purpleDark,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: BRAND.slate,
  },
  diagnosticLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: BRAND.slate,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  diagnosticId: {
    fontSize: 16,
    fontWeight: "700",
    color: BRAND.purpleDark,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: undefined }),
  },
  detailsPanel: {
    flex: 1,
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BRAND.border,
    padding: 14,
  },
  details: {
    fontSize: 12,
    lineHeight: 18,
    color: "#334155",
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: undefined }),
  },
  retryBtn: {
    alignSelf: "center",
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: BRAND.purple,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
})
