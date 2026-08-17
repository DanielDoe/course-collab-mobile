import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  formatTradeLogWhen,
  humanizeTradeStatus,
  isTradeCenterDevFixtureId,
  parseTradeCenterRequestRow,
  TRADE_SOURCE_LABELS,
  type TradeCenterRequestKind,
} from "../../lib/faculty-trade-center-utils"
import { studentInitials } from "../../lib/faculty-students-utils"
import {
  FACULTY_TRADE_CENTER_COLOR,
  facultyTradeCenterDonationThumb,
} from "../../lib/faculty-trade-center-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetChrome,
  FacultySheetConfirm,
  FacultySheetContainer,
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetSection,
  FacultySheetWorkflow,
  useCollabSheetStyles,
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"

type Props = {
  visible: boolean
  kind: TradeCenterRequestKind | null
  row: Record<string, unknown> | null
  acting: boolean
  onClose: () => void
  onApprove: () => void
  onReject: (reason?: string) => void
}

function requestStatusTone(status: string): "success" | "warning" | "danger" | "neutral" | "live" {
  const s = status.toLowerCase()
  if (s.includes("pending")) return "warning"
  if (s.includes("approved")) return "live"
  if (s.includes("reject")) return "danger"
  return "neutral"
}

export function FacultyTradeCenterDonationActionSheet({
  visible,
  kind,
  row,
  acting,
  onClose,
  onApprove,
  onReject,
}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const insets = useSafeAreaInsets()
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  useEffect(() => {
    if (!visible) {
      setConfirmApprove(false)
      setRejectOpen(false)
      setRejectReason("")
    }
  }, [visible])

  useEffect(() => {
    if (rejectOpen) setRejectReason("")
  }, [rejectOpen])

  const request = useMemo(() => {
    if (!kind || !row) return null
    return parseTradeCenterRequestRow(kind, row)
  }, [kind, row])

  if (!request) return null

  const thumb = facultyTradeCenterDonationThumb()
  const source =
    TRADE_SOURCE_LABELS[String(request.row.source ?? request.row.point_source ?? "")] ??
    String(request.row.source ?? "Activity")
  const when = formatTradeLogWhen(request.row.created_at ?? request.row.requested_at)
  const isDevFixture = isTradeCenterDevFixtureId(request.id)

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <FacultySheetContainer>
          <FacultySheetChrome
            topInset={insets.top}
            title={request.kind === "donation" ? "Donation request" : "Point request"}
            onClose={onClose}
            accentColor={FACULTY_TRADE_CENTER_COLOR.link}
          />

          <ScrollView
            contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            <FacultySheetHero
              title={request.title}
              subtitle={request.subtitle}
              initials={studentInitials(request.title)}
              thumbColor={thumb.fill}
              pills={
                <>
                  <FacultyStatusPill
                    label={humanizeTradeStatus(request.status)}
                    tone={requestStatusTone(request.status)}
                  />
                  {isDevFixture ? <FacultyStatusPill label="Simulator QA" tone="neutral" /> : null}
                </>
              }
            />

            <FacultySheetSection label="Request details" tone={SHEET_SECTION.roster}>
              <FacultySheetGroupedList>
                <FacultySheetMetricRow icon="sparkles-outline" label="Points" value={String(request.row.points ?? request.row.amount ?? 0)} />
                <FacultySheetMetricRow icon="layers-outline" label="Source" value={source} />
                {request.row.student_number ? (
                  <FacultySheetMetricRow icon="id-card-outline" label="Student number" value={String(request.row.student_number)} />
                ) : null}
                {request.row.section ? (
                  <FacultySheetMetricRow icon="people-outline" label="Section" value={String(request.row.section)} />
                ) : null}
                {request.kind === "donation" && request.row.recipient_name ? (
                  <FacultySheetMetricRow icon="heart-outline" label="Recipient" value={String(request.row.recipient_name)} />
                ) : null}
                <FacultySheetMetricRow icon="time-outline" label="Submitted" value={when} />
                {request.row.reason || request.row.message ? (
                  <FacultySheetMetricRow
                    icon="chatbox-ellipses-outline"
                    label="Note"
                    value={String(request.row.reason ?? request.row.message)}
                    isLast
                    numberOfLines={4}
                  />
                ) : (
                  <FacultySheetMetricRow icon="information-circle-outline" label="Type" value={request.meta ?? "—"} isLast />
                )}
              </FacultySheetGroupedList>
            </FacultySheetSection>

            {request.pending ? (
              <FacultySheetSection label="Your decision" tone={SHEET_SECTION.workflow}>
                <FacultySheetWorkflow
                  title="Pending review"
                  body={
                    request.kind === "donation"
                      ? "Approving transfers donated points to the recipient pool. Declining returns points to the donor."
                      : "Approving grants the requested points. Declining leaves the request unresolved."
                  }
                  acting={acting}
                  approveLabel="Approve"
                  rejectLabel="Decline"
                  onApprove={() => setConfirmApprove(true)}
                  onReject={() => setRejectOpen(true)}
                />
              </FacultySheetSection>
            ) : (
              <FacultySheetSection label="Decision" tone={SHEET_SECTION.workflow}>
                <FacultySheetGroupedList>
                  {request.row.reviewed_at || request.row.instructor_responded_at ? (
                    <FacultySheetMetricRow
                      icon="checkmark-done-outline"
                      label="Reviewed"
                      value={formatTradeLogWhen(request.row.reviewed_at ?? request.row.instructor_responded_at)}
                    />
                  ) : null}
                  {request.row.rejection_reason ? (
                    <FacultySheetMetricRow
                      icon="chatbox-outline"
                      label="Decline reason"
                      value={String(request.row.rejection_reason)}
                      isLast={!request.row.reviewed_at && !request.row.instructor_responded_at}
                      numberOfLines={4}
                    />
                  ) : (
                    <FacultySheetMetricRow
                      icon="information-circle-outline"
                      label="Status"
                      value={humanizeTradeStatus(request.status)}
                      isLast
                    />
                  )}
                </FacultySheetGroupedList>
              </FacultySheetSection>
            )}
          </ScrollView>

          {confirmApprove ? (
            <FacultySheetConfirm
              title={request.kind === "donation" ? "Approve donation?" : "Approve point request?"}
              body={`${request.title} · ${request.subtitle}`}
              confirmLabel="Approve"
              danger={false}
              onCancel={() => setConfirmApprove(false)}
              onConfirm={() => {
                setConfirmApprove(false)
                onApprove()
              }}
            />
          ) : null}

          {rejectOpen ? (
            <View
              style={[
                rejectOverlayStyles.wrap,
                { backgroundColor: tokens.isDark ? "rgba(0,0,0,0.55)" : "rgba(15,23,42,0.45)" },
              ]}
            >
              <View
                style={[
                  rejectOverlayStyles.card,
                  {
                    backgroundColor: native.secondaryGrouped,
                    borderColor: native.separator,
                  },
                ]}
              >
                <Text style={[type.sheetTitle, { color: native.label }]}>Decline request?</Text>
                <Text style={[type.secondary, rejectOverlayStyles.body, { color: native.secondaryLabel }]}>
                  The student will see this decision in their trade center history.
                </Text>
                <TextInput
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder="Reason (optional)"
                  placeholderTextColor={native.tertiaryLabel}
                  multiline
                  editable={!acting}
                  accessibilityLabel="Reason (optional)"
                  style={[
                    localStyles.rejectInput,
                    { color: native.label, borderColor: native.separator, backgroundColor: native.groupedBackground },
                  ]}
                />
                <View style={localStyles.rejectActions}>
                  <Pressable
                    style={({ pressed }) => [
                      localStyles.rejectBtn,
                      { borderColor: native.separator, opacity: pressed || acting ? 0.8 : 1 },
                    ]}
                    disabled={acting}
                    onPress={() => setRejectOpen(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                  >
                    <Text style={[type.caption, { color: native.label, fontWeight: "700" }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      localStyles.rejectBtn,
                      localStyles.rejectBtnPrimary,
                      {
                        backgroundColor: FACULTY_TRADE_CENTER_COLOR.danger,
                        opacity: pressed || acting ? 0.85 : 1,
                      },
                    ]}
                    disabled={acting}
                    onPress={() => {
                      setRejectOpen(false)
                      onReject(rejectReason.trim() || undefined)
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Decline"
                  >
                    {acting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={[type.caption, { color: "#fff", fontWeight: "700" }]}>Decline</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </FacultySheetContainer>
      </Modal>
    </>
  )
}

const localStyles = StyleSheet.create({
  rejectInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 88,
    textAlignVertical: "top",
    fontSize: 15,
  },
  rejectActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  rejectBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 12,
    minHeight: 44,
  },
  rejectBtnPrimary: { borderWidth: 0 },
})

const rejectOverlayStyles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 12,
  },
  body: { lineHeight: 20 },
})
