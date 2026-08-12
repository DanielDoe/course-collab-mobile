import { useState } from "react"
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { ModuleScreen } from "../modules/ModuleScreen"
import { useSession } from "../../context/SessionProvider"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { ApiError, studentApi } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import type { SupportFormKind } from "../../lib/support-color-theme"
import { SUPPORT_ACTION, SUPPORT_FORM_THUMBS } from "../../lib/support-color-theme"
import { InfoSectionCard } from "../course-info/course-info-shared"
import { SupportBanner, SupportFieldLabel, SupportTip, useSupportTheme } from "./support-shared"

export type { SupportFormKind } from "../../lib/support-color-theme"

const FORM_CONFIG: Record<
  SupportFormKind,
  {
    category: string
    heroTitle: string
    heroSub: string
    heroIcon: keyof typeof Ionicons.glyphMap
    cardTitle: string
    subjectPlaceholder: string
    messagePlaceholder: string
    submitLabel: string
    tips: string[]
  }
> = {
  support: {
    category: "support",
    heroTitle: "Submit Ticket",
    heroSub: "Describe your issue and our team will follow up by email.",
    heroIcon: "send-outline",
    cardTitle: "Support request",
    subjectPlaceholder: "Brief summary of your issue",
    messagePlaceholder: "Tell us what you were trying to do, what happened, and any error messages…",
    submitLabel: "Send ticket",
    tips: [
      "Include your course and section if the issue is class-specific.",
      "Screenshots can be described in the message — we will ask if we need more.",
    ],
  },
  bug: {
    category: "bug",
    heroTitle: "Report a Bug",
    heroSub: "Help us squash issues by sharing steps to reproduce.",
    heroIcon: "bug-outline",
    cardTitle: "Bug report",
    subjectPlaceholder: "What broke? e.g. Quiz timer freezes",
    messagePlaceholder:
      "1. What were you doing?\n2. What did you expect?\n3. What happened instead?\n4. Can you reproduce it?",
    submitLabel: "Submit bug report",
    tips: [
      "Mention the screen (Calendar, Quizzes, etc.) where the bug occurred.",
      "Note whether you are on Wi‑Fi or cellular if the issue is connection-related.",
    ],
  },
  feature: {
    category: "feature",
    heroTitle: "Feature Request",
    heroSub: "Suggest improvements — we review every idea from students.",
    heroIcon: "sparkles-outline",
    cardTitle: "Your idea",
    subjectPlaceholder: "Feature title — keep it short",
    messagePlaceholder: "Describe the feature, who it helps, and how you would use it in class…",
    submitLabel: "Submit idea",
    tips: [
      "Focus on the problem you want solved, not just the solution.",
      "Similar requests are grouped — detailed context helps us prioritize.",
    ],
  },
}

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

export function SupportFormScreen({ kind }: { kind: SupportFormKind }) {
  const session = useStudentSession()
  const theme = useSupportTheme()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const config = FORM_CONFIG[kind]
  const formThumbs = SUPPORT_FORM_THUMBS[kind]
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!session) return
    if (!subject.trim() || !message.trim()) {
      AppAlert.alert("Missing information", "Please add a subject and description.")
      return
    }
    setSubmitting(true)
    setError("")
    setStatus("")
    try {
      await studentApi.submitSupportTicket(session, {
        category: config.category,
        subject: subject.trim(),
        message: message.trim(),
      })
      setStatus("Submitted — we'll review your message and respond soon.")
      setSubject("")
      setMessage("")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = {
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: tokens.text,
    backgroundColor: native.fill,
  }

  return (
    <ModuleScreen error={error}>
      {status ? <SupportBanner tone="success" message={status} /> : null}

      <InfoSectionCard title={config.cardTitle} icon={config.heroIcon} iconThumb={formThumbs.form} theme={theme}>
        <SupportFieldLabel>Subject</SupportFieldLabel>
        <TextInput
          style={inputStyle}
          placeholder={config.subjectPlaceholder}
          placeholderTextColor={tokens.textMuted}
          value={subject}
          onChangeText={setSubject}
        />

        <SupportFieldLabel>Details</SupportFieldLabel>
        <TextInput
          style={[inputStyle, styles.textArea]}
          placeholder={config.messagePlaceholder}
          placeholderTextColor={tokens.textMuted}
          value={message}
          onChangeText={setMessage}
          multiline
          textAlignVertical="top"
        />

        <Pressable
          style={[
            styles.submitBtn,
            { backgroundColor: SUPPORT_ACTION.fill },
            submitting && styles.submitBtnDisabled,
          ]}
          onPress={() => void submit()}
          disabled={submitting}
        >
          <Ionicons name="paper-plane-outline" size={16} color="#ffffff" />
          <Text style={styles.submitText}>{submitting ? "Sending…" : config.submitLabel}</Text>
        </Pressable>
      </InfoSectionCard>

      <InfoSectionCard title="Tips for a faster response" icon="bulb-outline" iconThumb={formThumbs.tips} theme={theme}>
        {config.tips.map((tip) => (
          <View key={tip} style={styles.tipRow}>
            <Ionicons name="checkmark" size={14} color={formThumbs.tips.label} />
            <Text style={[type.secondary, styles.tipText]}>{tip}</Text>
          </View>
        ))}
      </InfoSectionCard>

      <SupportTip>
        Response times vary during peak exam weeks. For urgent course questions, also reach out to your instructor
        via office hours or announcements.
      </SupportTip>
    </ModuleScreen>
  )
}

const styles = StyleSheet.create({
  textArea: { minHeight: 140 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 13,
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  tipText: { flex: 1, lineHeight: 19 },
})
