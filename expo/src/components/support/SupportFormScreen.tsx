import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { AppAlert } from "../../lib/app-alert"
import { Ionicons } from "@/components/icons/AppIcon"
import { ModuleScreen } from "../modules/ModuleScreen"
import { useSession } from "../../context/SessionProvider"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { ApiError, studentApi } from "../../lib/student-api"
import { guestAsStudentSession } from "../../lib/guest-entitlements-production"
import type { StudentSession } from "../../lib/session"
import type { SupportFormKind } from "../../lib/support-color-theme"
import { SUPPORT_ACTION, SUPPORT_FORM_THUMBS } from "../../lib/support-color-theme"
import type { SupportTicket } from "../../lib/support-tickets"
import {
  findSupportModule,
  STUDENT_SUPPORT_MODULE_OPTIONS,
  supportModulePickerLabel,
} from "../../constants/support-modules"
import { InfoSectionCard } from "../course-info/course-info-shared"
import { SupportFieldLabel, SupportTip, useSupportTheme } from "./support-shared"
import { FacultySheetAcknowledge } from "../faculty/faculty-collab-sheet-ui"
import { SupportTicketAttachmentField } from "./SupportTicketAttachmentField"
import { AdminOptionPickerModal } from "../faculty/admin/admin-option-picker"
import { SupportTabBar, SupportTicketHistoryPanel } from "./SupportTicketHistoryPanel"

export type { SupportFormKind } from "../../lib/support-color-theme"

type SupportTab = "submit" | "history"

const TABS: Array<{ id: SupportTab; label: string; icon: "create-outline" | "time-outline" }> = [
  { id: "submit", label: "New", icon: "create-outline" },
  { id: "history", label: "History", icon: "time-outline" },
]

const FORM_CONFIG: Record<
  SupportFormKind,
  {
    category: string
    heroSub: string
    heroIcon: keyof typeof Ionicons.glyphMap
    cardTitle: string
    subjectPlaceholder: string
    messagePlaceholder: string
    submitLabel: string
    tips: string[]
    historyEmptyTitle: string
    historyEmptyBody: string
    successTitle: string
    successBody: string
  }
> = {
  support: {
    category: "support",
    heroSub: "Describe your issue and our team will follow up by email.",
    heroIcon: "send-outline",
    cardTitle: "Support request",
    subjectPlaceholder: "Brief summary of your issue",
    messagePlaceholder: "Tell us what you were trying to do, what happened, and any error messages…",
    submitLabel: "Send ticket",
    tips: [
      "Include your course and section if the issue is class-specific.",
      "Attach a screenshot or PDF when it helps explain the issue.",
    ],
    historyEmptyTitle: "No tickets yet",
    historyEmptyBody: "Submitted support tickets appear here with Open, In Progress, or Resolved status.",
    successTitle: "Ticket submitted",
    successBody: "We'll review your message and respond soon. Track status anytime in History.",
  },
  bug: {
    category: "bug",
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
    historyEmptyTitle: "No bug reports yet",
    historyEmptyBody: "Your bug reports appear here with live status from admin system logs.",
    successTitle: "Bug report submitted",
    successBody: "Your report was sent for triage. Track status in History.",
  },
  feature: {
    category: "feature",
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
    historyEmptyTitle: "No feature requests yet",
    historyEmptyBody: "Feature ideas you submit appear here so you can track review status.",
    successTitle: "Feature request submitted",
    successBody: "Thanks for the idea — we'll review it soon. Track status in History.",
  },
}

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  if (session?.portal === "student") return session
  if (session?.portal === "guest") return guestAsStudentSession(session)
  return null
}

export function SupportFormScreen({ kind }: { kind: SupportFormKind }) {
  const session = useStudentSession()
  const theme = useSupportTheme()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const config = FORM_CONFIG[kind]
  const formThumbs = SUPPORT_FORM_THUMBS[kind]

  const [tab, setTab] = useState<SupportTab>("submit")
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyRefreshing, setHistoryRefreshing] = useState(false)
  const [moduleId, setModuleId] = useState("")
  const [modulePickerOpen, setModulePickerOpen] = useState(false)
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [attachments, setAttachments] = useState<
    Array<{ id: string; url: string; name: string; mime?: string; size?: number; uploading?: boolean }>
  >([])
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const moduleOptions = useMemo(
    () =>
      STUDENT_SUPPORT_MODULE_OPTIONS.map((option) => ({
        value: option.id,
        label: supportModulePickerLabel(option),
      })),
    [],
  )
  const selectedModule = findSupportModule(STUDENT_SUPPORT_MODULE_OPTIONS, moduleId)
  const moduleRequired = kind === "bug"

  const loadHistory = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!session) return
      if (mode === "refresh") setHistoryRefreshing(true)
      else setHistoryLoading(true)
      setError("")
      try {
        const response = await studentApi.listSupportTickets(session, config.category)
        setTickets(response.tickets ?? [])
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load history.")
      } finally {
        setHistoryLoading(false)
        setHistoryRefreshing(false)
      }
    },
    [session, config.category],
  )

  useEffect(() => {
    if (tab === "history") void loadHistory("initial")
  }, [tab, loadHistory])

  async function submit() {
    if (!session) return
    if (moduleRequired && !moduleId) {
      AppAlert.alert("Select a module", "Choose which module the bug occurred in.")
      return
    }
    if (!subject.trim() || !message.trim()) {
      AppAlert.alert("Missing information", "Please add a subject and description.")
      return
    }
    setSubmitting(true)
    setError("")
    setShowSuccess(false)
    try {
      await studentApi.submitSupportTicket(session, {
        category: config.category,
        subject: subject.trim(),
        message: message.trim(),
        moduleId: moduleId || undefined,
        moduleName: selectedModule?.label,
        attachments: attachments
          .filter((file) => file.url && !file.uploading)
          .map((file) => ({ url: file.url, name: file.name, mime: file.mime, size: file.size })),
      })
      setShowSuccess(true)
      setModuleId("")
      setSubject("")
      setMessage("")
      setAttachments([])
      await loadHistory("refresh")
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
    <ModuleScreen
      error={error}
      loading={tab === "history" && historyLoading && tickets.length === 0}
      refreshing={tab === "history" && historyRefreshing}
      onRefresh={tab === "history" ? () => void loadHistory("refresh") : undefined}
    >
      <FacultySheetAcknowledge
        visible={showSuccess}
        title={config.successTitle}
        body={config.successBody}
        primaryLabel="View History"
        onPrimary={() => {
          setShowSuccess(false)
          setTab("history")
        }}
        onSecondary={() => setShowSuccess(false)}
      />

      <SupportTabBar tabs={TABS} tab={tab} onChange={setTab} />

      {tab === "submit" ? (
        <>
          <InfoSectionCard title={config.cardTitle} icon={config.heroIcon} iconThumb={formThumbs.form} theme={theme}>
            <Text style={[type.secondary, { lineHeight: 20, marginBottom: 8 }]}>{config.heroSub}</Text>

            <SupportFieldLabel>{moduleRequired ? "Affected module" : "Related module (optional)"}</SupportFieldLabel>
            <Pressable
              style={[inputStyle, styles.selectRow]}
              onPress={() => setModulePickerOpen(true)}
              accessibilityRole="button"
            >
              <Text style={{ color: selectedModule || !moduleRequired ? tokens.text : tokens.textMuted, flex: 1 }}>
                {selectedModule
                  ? supportModulePickerLabel(selectedModule)
                  : moduleRequired
                    ? "Select a module"
                    : "None selected"}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={tokens.textMuted} />
            </Pressable>

            <SupportFieldLabel>Subject</SupportFieldLabel>
            <TextInput
              style={inputStyle}
              placeholder={config.subjectPlaceholder}
              accessibilityLabel="Subject"
              placeholderTextColor={tokens.textMuted}
              value={subject}
              onChangeText={setSubject}
            />

            <SupportFieldLabel>Attachments</SupportFieldLabel>
            <SupportTicketAttachmentField
              attachments={attachments}
              onChange={setAttachments}
              uploadFile={(file) => studentApi.uploadSupportTicketAttachment(session!, file)}
              disabled={submitting || !session}
            />

            <SupportFieldLabel>Details</SupportFieldLabel>
            <TextInput
              style={[inputStyle, styles.textArea]}
              placeholder={config.messagePlaceholder}
              accessibilityLabel="Details"
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
              disabled={submitting || attachments.some((file) => file.uploading)}
            >
              <Ionicons name="paper-plane-outline" size={16} color="#ffffff" />
              <Text style={styles.submitText}>{submitting ? "Sending…" : config.submitLabel}</Text>
            </Pressable>
          </InfoSectionCard>

          <AdminOptionPickerModal
            visible={modulePickerOpen}
            title={moduleRequired ? "Affected module" : "Related module"}
            options={moduleOptions}
            value={moduleId}
            onSelect={setModuleId}
            onClose={() => setModulePickerOpen(false)}
          />

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
        </>
      ) : (
        <InfoSectionCard
          title="Your submissions"
          icon="time-outline"
          iconThumb={formThumbs.form}
          theme={theme}
        >
          <SupportTicketHistoryPanel
            tickets={tickets}
            emptyTitle={config.historyEmptyTitle}
            emptyBody={config.historyEmptyBody}
          />
        </InfoSectionCard>
      )}
    </ModuleScreen>
  )
}

const styles = StyleSheet.create({
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
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
  attachRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 40,
  },
  attachChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
})
