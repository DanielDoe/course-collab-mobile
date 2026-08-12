import { Ionicons } from "@/components/icons/AppIcon"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { hexToRgba } from "../constants/app-themes"
import { useAppThemeTokens } from "../context/AppearanceProvider"

type Mode = "offline" | "slow" | "error" | "loading"

type Props = {
  mode: Mode
  onRetry?: () => void
}

const COPY: Record<Mode, { title: string; body: string; icon: keyof typeof Ionicons.glyphMap }> = {
  offline: {
    title: "You're offline",
    body: "CourseCollab needs an internet connection for lectures, quizzes, and grades. Check Wi‑Fi or cellular data, then try again.",
    icon: "cloud-offline-outline"},
  slow: {
    title: "Still loading…",
    body: "Your connection is slow. The page should appear shortly — you can keep waiting or try again.",
    icon: "cellular-outline"},
  error: {
    title: "Couldn't load CourseCollab",
    body: "Something went wrong reaching our servers. Tap Try again to reload.",
    icon: "alert-circle-outline"},
  loading: {
    title: "Loading CourseCollab",
    body: "Getting your courses and dashboard ready…",
    icon: "hourglass-outline"}}

/** Thin strip below the native header for loading states. */
export function ConnectivityBanner({
  mode,
  onRetry}: {
  mode: "loading" | "slow"
  onRetry?: () => void
}) {
  const tokens = useAppThemeTokens()
  const copy = COPY[mode]
  return (
    <View style={[bannerStyles.root, { backgroundColor: hexToRgba(tokens.accentDark, 0.96) }]}>
      <ActivityIndicator size="small" color={tokens.warning} />
      <View style={bannerStyles.textWrap}>
        <Text style={bannerStyles.title}>{copy.title}</Text>
        {mode === "slow" ? <Text style={bannerStyles.body}>{copy.body}</Text> : null}
      </View>
      {mode === "slow" && onRetry ? (
        <Pressable onPress={onRetry} hitSlop={8} style={bannerStyles.retry}>
          <Text style={[bannerStyles.retryText, { color: tokens.warning }]}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

/** Full-screen blocker — offline / hard errors only. */
export function ConnectivityOverlay({ mode, onRetry }: Props) {
  const tokens = useAppThemeTokens()
  const copy = COPY[mode]
  const showRetry = onRetry

  return (
    <View style={[styles.root, { backgroundColor: hexToRgba(tokens.accentDark, 0.94) }]}>
      <View style={[styles.card, { backgroundColor: tokens.surface }]}>
        <View style={[styles.iconWrap, { backgroundColor: tokens.accentSoft }]}>
          <Ionicons name={copy.icon} size={32} color={tokens.accent} />
        </View>
        <Text style={[styles.title, { color: tokens.accent }]}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>
        {showRetry ? (
          <Pressable style={[styles.retryBtn, { backgroundColor: tokens.accent }]} onPress={onRetry}>
            <Ionicons name="refresh" size={18} color="#ffffff" />
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const bannerStyles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.12)",
    zIndex: 40},
  textWrap: { flex: 1, gap: 2 },
  title: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  body: { color: "rgba(255,255,255,0.75)", fontSize: 12, lineHeight: 17 },
  retry: { paddingVertical: 4, paddingHorizontal: 2 },
  retryText: { fontSize: 13, fontWeight: "600" }})

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 50},
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8},
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16},
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8},
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: "#64748b",
    textAlign: "center"},
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999},
  retryText: { color: "#ffffff", fontWeight: "600", fontSize: 15 }})
