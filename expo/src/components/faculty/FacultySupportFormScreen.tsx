import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { AppAlert } from "../../lib/app-alert"
import { instructorAdminApi } from "../../lib/instructor-admin-api"
import type { SupportFormKind } from "../../lib/support-color-theme"
import { SUPPORT_ACTION } from "../../lib/support-color-theme"
import type { SupportTicket } from "../../lib/support-tickets"
import {
  FACULTY_SUPPORT_MODULE_OPTIONS,
  findSupportModule,
  supportModulePickerLabel,
} from "../../constants/support-modules"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { NATIVE } from "../../constants/faculty-native-theme"
import { FACULTY_ADMIN_COLOR } from "../../lib/faculty-admin-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import {
  FacultyAdminScreen,
  FacultyAdminSection,
  FacultyAdminSelectRow,
  FacultyAdminTextField,
} from "./faculty-admin-ui"
import { FacultySheetAcknowledge } from "./faculty-collab-sheet-ui"
import { AdminOptionPickerModal } from "./admin/admin-option-picker"
import { SupportTabBar, SupportTicketHistoryPanel } from "../support/SupportTicketHistoryPanel"
import { SupportTicketAttachmentField } from "../support/SupportTicketAttachmentField"

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
    sectionTitle: string
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
    sectionTitle: "Support Request",
    subjectPlaceholder: "Brief summary of your issue",
    messagePlaceholder: "Tell us what you were trying to do, what happened, and any error messages…",
    submitLabel: "Send Ticket",
    tips: [
      "Include your course code if the issue is class-specific.",
      "Mention whether the problem is on mobile, web, or both.",
    ],
    historyEmptyTitle: "No tickets yet",
    historyEmptyBody: "Submitted support tickets appear here with Open, In Progress, or Resolved status.",
    successTitle: "Ticket submitted",
    successBody: "We'll review your message and respond soon. Track status anytime in History.",
  },
  bug: {
    category: "bug",
    heroSub: "Help us fix issues by sharing steps to reproduce.",
    heroIcon: "bug-outline",
    sectionTitle: "Bug Report",
    subjectPlaceholder: "What broke? e.g. Attendance QR won't scan",
    messagePlaceholder:
      "1. What were you doing?\n2. What did you expect?\n3. What happened instead?\n4. Can you reproduce it?",
    submitLabel: "Submit Bug Report",
    tips: [
      "Name the module (Assessments, Attendance, Cora, etc.) where the bug occurred.",
      "Note your device model and iOS version if the issue is mobile-specific.",
    ],
    historyEmptyTitle: "No bug reports yet",
    historyEmptyBody: "Your bug reports appear here with live status from admin system logs.",
    successTitle: "Bug report submitted",
    successBody: "Your report was sent to admin system logs for triage. Track status in History.",
  },
  feature: {
    category: "feature",
    heroSub: "Suggest improvements for the faculty mobile app and platform.",
    heroIcon: "sparkles-outline",
    sectionTitle: "Your Idea",
    subjectPlaceholder: "Feature title — keep it short",
    messagePlaceholder: "Describe the feature, who it helps, and how you would use it while teaching…",
    submitLabel: "Submit Idea",
    tips: [
      "Focus on the problem you want solved, not just the solution.",
      "Explain how the feature would fit into your weekly teaching workflow.",
    ],
    historyEmptyTitle: "No feature requests yet",
    historyEmptyBody: "Feature ideas you submit appear here so you can track review status.",
    successTitle: "Feature request submitted",
    successBody: "Thanks for the idea — we'll review it soon. Track status in History.",
  },
}

export function FacultySupportFormScreen({ kind }: { kind: SupportFormKind }) {
  const { session, course } = useFacultyScope()
  const { native, tokens, type } = useModuleTheme()
  const config = FORM_CONFIG[kind]

  const [tab, setTab] = useState<SupportTab>("submit")
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyRefreshing, setHistoryRefreshing] = useState(false)
  const [moduleId, setModuleId] = useState("")
  const [modulePickerOpen, setModulePickerOpen] = useState(false)
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [attachments, setAttachments] = useState<
    Array<{ id: string; url: string; name: string; mime?: string; size?: number; uploading?: boolean }>
  >([])

  const moduleOptions = useMemo(
    () =>
      FACULTY_SUPPORT_MODULE_OPTIONS.map((option) => ({
        value: option.id,
        label: supportModulePickerLabel(option),
      })),
    [],
  )
  const selectedModule = findSupportModule(FACULTY_SUPPORT_MODULE_OPTIONS, moduleId)
  const moduleRequired = kind === "bug"

  const styles = useMemo(
    () =>
      StyleSheet.create({
        hero: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 14,
          paddingHorizontal: 4,
          paddingBottom: 4,
        },
        iconWrap: {
          width: 52,
          height: 52,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: `${FACULTY_ADMIN_COLOR.link}18`,
        },
        heroCopy: { flex: 1, gap: 6 },
        heroSub: { ...type.secondary, color: native.secondaryLabel, lineHeight: 21 },
        tipRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: native.secondaryGrouped,
        },
        tipBorder: {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: native.separator,
        },
        tipText: { ...type.secondary, flex: 1, color: native.label, lineHeight: 20 },
        submitBtn: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minHeight: 48,
          marginHorizontal: NATIVE.pagePadding,
          borderRadius: NATIVE.sectionRadius,
          backgroundColor: SUPPORT_ACTION.fill,
        },
        submitBtnDisabled: { opacity: 0.6 },
        submitText: { ...type.bodyEmphasis, color: "#ffffff" },
      }),
    [native, type],
  )

  const loadHistory = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!session) return
      if (mode === "refresh") setHistoryRefreshing(true)
      else setHistoryLoading(true)
      setError("")
      try {
        const response = await instructorAdminApi.listSupportTickets(session.id, config.category)
        setTickets(response.tickets ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load history.")
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
      await instructorAdminApi.submitSupportTicket(session.id, {
        category: config.category,
        subject: subject.trim(),
        message: message.trim(),
        courseId: course?.id,
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
      setError(err instanceof Error ? err.message : "Could not submit. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FacultyAdminScreen
      error={error || null}
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
          <View style={styles.hero}>
            <View style={styles.iconWrap}>
              <Ionicons name={config.heroIcon} size={26} color={FACULTY_ADMIN_COLOR.link} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroSub}>{config.heroSub}</Text>
            </View>
          </View>

          <FacultyAdminSection
            title={config.sectionTitle}
            footer={
              moduleRequired
                ? "Bug reports are routed to admin system logs for triage. We typically respond within one business day."
                : "We typically respond within one business day."
            }
          >
            <FacultyAdminSelectRow
              label={moduleRequired ? "Affected module" : "Related module (optional)"}
              valueLabel={
                selectedModule
                  ? supportModulePickerLabel(selectedModule)
                  : moduleRequired
                    ? "Select a module"
                    : "None selected"
              }
              onPress={() => setModulePickerOpen(true)}
            />
            <FacultyAdminTextField
              label="Subject"
              value={subject}
              onChangeText={setSubject}
              placeholder={config.subjectPlaceholder}
            />
            <FacultyAdminTextField
              label="Details"
              value={message}
              onChangeText={setMessage}
              placeholder={config.messagePlaceholder}
              multiline
              isLast
            />
          </FacultyAdminSection>

          <FacultyAdminSection title="Attachments" footer="Screenshots help us reproduce UI bugs.">
            <SupportTicketAttachmentField
              attachments={attachments}
              onChange={setAttachments}
              uploadFile={(file) => {
                if (!session) return Promise.reject(new Error("Not signed in"))
                return instructorAdminApi.uploadSupportTicketAttachment(session.id, file)
              }}
              disabled={submitting || !session}
            />
          </FacultyAdminSection>

          <AdminOptionPickerModal
            visible={modulePickerOpen}
            title={moduleRequired ? "Affected module" : "Related module"}
            options={moduleOptions}
            value={moduleId}
            onSelect={setModuleId}
            onClose={() => setModulePickerOpen(false)}
          />

          <Pressable
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={() => void submit()}
            disabled={submitting || attachments.some((file) => file.uploading)}
            accessibilityRole="button"
            accessibilityLabel={config.submitLabel}
          >
            <Ionicons name="paper-plane-outline" size={18} color="#ffffff" />
            <Text style={styles.submitText}>{submitting ? "Sending…" : config.submitLabel}</Text>
          </Pressable>

          <FacultyAdminSection title="Tips for a Faster Response">
            <View style={{ borderRadius: NATIVE.sectionRadius, overflow: "hidden" }}>
              {config.tips.map((tip, index) => (
                <View
                  key={tip}
                  style={[styles.tipRow, index < config.tips.length - 1 && styles.tipBorder]}
                >
                  <Ionicons name="checkmark-circle" size={18} color={tokens.success} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </FacultyAdminSection>
        </>
      ) : (
        <FacultyAdminSection
          title="Your Submissions"
          footer="Status updates when admins resolve items in System Logs."
        >
          <SupportTicketHistoryPanel
            tickets={tickets}
            emptyTitle={config.historyEmptyTitle}
            emptyBody={config.historyEmptyBody}
          />
        </FacultyAdminSection>
      )}
    </FacultyAdminScreen>
  )
}
