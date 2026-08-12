import { useEffect, useMemo, useState } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { COLOR_HUNT } from "../../lib/flashcard-difficulty-theme"
import type { RecommendationGuestAccountRequest } from "../../lib/instructor-api"
import {
  formatGuestAccountDate,
  formatGuestAccountRelative,
  guestAccountStatusLabel,
} from "../../lib/faculty-guest-account-requests-utils"
import {
  FACULTY_RECOMMENDATIONS_COLOR,
  facultyGuestRequestStatusColor,
  facultyRecommendationGuestThumb,
} from "../../lib/faculty-recommendations-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultyStatusPill } from "./faculty-shared"
import { FacultyStatCard } from "./faculty-module-shell"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetConfirm,
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetSection,
  FacultySheetWorkflow,
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import { GlassSheetBackground } from "../theme/GlassSurface"
import { GlassSheetHandle } from "../theme/GlassActionSheetMenu"

type GuestSheetProps = {
  visible: boolean
  row: RecommendationGuestAccountRequest | null
  acting: boolean
  onClose: () => void
  onApprove: () => void
  onReject: (reason?: string) => void
  onOpenPendingLetters: () => void
}

function GuestRejectReasonSheet({
  visible,
  submitting,
  onClose,
  onSubmit,
}: {
  visible: boolean
  submitting: boolean
  onClose: () => void
  onSubmit: (reason: string) => void
}) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const type = useNativeType()
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (visible) setReason("")
  }, [visible])

  return (
    <GlassBottomSheetModal visible={visible} onClose={onClose} scrollable={false} accessibilityLabel="Close decline guest request">
      <GlassSheetBackground style={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 12) }}>
        <GlassSheetHandle />
        <Text style={[type.sheetTitle, { color: native.label, marginTop: 4 }]}>Decline guest request?</Text>
        <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18, marginBottom: 12 }]}>
          They will not gain guest access unless they apply again.
        </Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Reason (optional)"
          placeholderTextColor={native.tertiaryLabel}
          multiline
          style={[
            localStyles.rejectInput,
            { color: native.label, borderColor: native.separator, backgroundColor: native.secondaryGrouped },
          ]}
        />
        <View style={localStyles.rejectActions}>
          <Pressable
            style={({ pressed }) => [localStyles.rejectBtn, { borderColor: native.separator, opacity: pressed ? 0.8 : 1 }]}
            disabled={submitting}
            onPress={onClose}
          >
            <Text style={[type.caption, { color: native.label, fontWeight: "700" }]}>Cancel</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              localStyles.rejectBtn,
              localStyles.rejectBtnPrimary,
              { backgroundColor: FACULTY_RECOMMENDATIONS_COLOR.danger, opacity: pressed || submitting ? 0.85 : 1 },
            ]}
            disabled={submitting}
            onPress={() => onSubmit(reason.trim())}
          >
            <Text style={[type.caption, { color: "#fff", fontWeight: "700" }]}>Decline</Text>
          </Pressable>
        </View>
      </GlassSheetBackground>
    </GlassBottomSheetModal>
  )
}

export function FacultyGuestRecommendationRequestActionSheet({
  visible,
  row,
  acting,
  onClose,
  onApprove,
  onReject,
  onOpenPendingLetters,
}: GuestSheetProps) {
  const collabSheetStyles = useCollabSheetStyles()
  const native = useThemedNative()
  const type = useNativeType()
  const insets = useSafeAreaInsets()
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  useEffect(() => {
    if (!visible) {
      setConfirmApprove(false)
      setRejectOpen(false)
    }
  }, [visible])

  const pending = row ? String(row.status).toLowerCase() === "pending" : false
  const thumb = useMemo(() => (row ? facultyRecommendationGuestThumb(row.id) : null), [row])

  if (!row || !thumb) return null

  const nr = Number(row.rec_letter_total) || 0
  const done = Number(row.rec_letter_completed) || 0
  const pipe = Number(row.rec_pipeline) || 0
  const awaitInstr = Number(row.rec_pending_your_review) || 0
  const awaitStudent = Number(row.rec_awaiting_student) || 0
  const statusColor = facultyGuestRequestStatusColor(row.status)
  const letterSolid = facultyRecommendationGuestThumb("letters")
  const doneSolid = facultyRecommendationGuestThumb("done")

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <FacultySheetContainer>
          <FacultySheetChrome
            topInset={insets.top}
            title="Guest request"
            onClose={onClose}
            accentColor={FACULTY_RECOMMENDATIONS_COLOR.link}
          />

          <ScrollView
            contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            <FacultySheetHero
              title={row.full_name}
              subtitle={row.email}
              initials={(row.full_name?.[0] ?? "?").toUpperCase()}
              thumbColor={thumb.fill}
              pills={
                <>
                  <FacultyStatusPill label={guestAccountStatusLabel(row.status)} tone={pending ? "warning" : "neutral"} />
                  {row.matching_student_found ? (
                    <FacultyStatusPill label="Profile linked" tone="live" />
                  ) : (
                    <FacultyStatusPill label="Awaiting signup" tone="warning" />
                  )}
                </>
              }
            />

            <FacultySheetSection label="Application" tone={SHEET_SECTION.roster}>
              <FacultySheetGroupedList>
                <FacultySheetMetricRow icon="mail-outline" label="Email" value={row.email} />
                {row.organization ? (
                  <FacultySheetMetricRow icon="business-outline" label="Organization" value={row.organization} />
                ) : null}
                <FacultySheetMetricRow
                  icon="calendar-outline"
                  label="Applied"
                  value={`${formatGuestAccountDate(row.created_at)} · ${formatGuestAccountRelative(row.created_at)}`}
                  isLast={!row.guest_purpose_detail}
                />
                {row.guest_purpose_detail ? (
                  <FacultySheetMetricRow
                    icon="chatbox-ellipses-outline"
                    label="Purpose"
                    value={row.guest_purpose_detail}
                    isLast
                    numberOfLines={4}
                  />
                ) : null}
              </FacultySheetGroupedList>
            </FacultySheetSection>

            <FacultySheetSection
              label="Letter metrics"
              hint="Counts for this guest email in your course only"
              tone={SHEET_SECTION.review}
            >
              {nr <= 0 && pipe <= 0 && awaitInstr <= 0 && awaitStudent <= 0 ? (
                <Text style={[type.caption, { color: native.tertiaryLabel, lineHeight: 18, fontStyle: "italic" }]}>
                  Letter activity appears after they submit a request with this email in your course.
                </Text>
              ) : (
                <>
                  <View style={localStyles.kpiGrid}>
                    <FacultyStatCard
                      icon="document-text-outline"
                      iconBg={letterSolid.fill}
                      iconColor={letterSolid.icon}
                      value={String(nr)}
                      label="Letters"
                      badgeTone="violet"
                    />
                    <FacultyStatCard
                      icon="checkmark-done-outline"
                      iconBg={doneSolid.fill}
                      iconColor={doneSolid.icon}
                      value={String(done)}
                      label="Done"
                      badgeTone="violet"
                    />
                    <FacultyStatCard
                      icon="pulse-outline"
                      iconBg={FACULTY_RECOMMENDATIONS_COLOR.letter}
                      iconColor="#FFFFFF"
                      value={String(pipe)}
                      label="Pipeline"
                      badgeTone="amber"
                    />
                  </View>
                  <View style={[localStyles.awaitRow, { borderTopColor: native.separator }]}>
                    <View style={localStyles.awaitCol}>
                      <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700" }]}>Awaiting you</Text>
                      <Text style={[type.bodyEmphasis, { color: awaitInstr > 0 ? COLOR_HUNT.amber : FACULTY_RECOMMENDATIONS_COLOR.link }]}>
                        {awaitInstr}
                      </Text>
                    </View>
                    <View style={[localStyles.awaitCol, localStyles.awaitDivider, { borderLeftColor: native.separator }]}>
                      <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700" }]}>Awaiting them</Text>
                      <Text style={[type.bodyEmphasis, { color: FACULTY_RECOMMENDATIONS_COLOR.journey }]}>{awaitStudent}</Text>
                    </View>
                  </View>
                </>
              )}
            </FacultySheetSection>

            {awaitInstr > 0 ? (
              <FacultySheetSection label="Related queue" tone={SHEET_SECTION.tools}>
                <Pressable style={localStyles.linkRow} onPress={onOpenPendingLetters}>
                  <Text style={[type.caption, { color: FACULTY_RECOMMENDATIONS_COLOR.link, fontWeight: "700" }]}>
                    Open pending letters queue
                  </Text>
                </Pressable>
              </FacultySheetSection>
            ) : null}

            {pending ? (
              <FacultySheetSection label="Your decision" tone={SHEET_SECTION.workflow}>
                <FacultySheetWorkflow
                  title="Pending guest access"
                  body="Approving lets them sign in on the guest page with their email and password to request recommendation letters."
                  acting={acting}
                  approveLabel="Approve guest"
                  rejectLabel="Decline"
                  onApprove={() => setConfirmApprove(true)}
                  onReject={() => setRejectOpen(true)}
                />
              </FacultySheetSection>
            ) : (
              <FacultySheetSection label="Status" tone={SHEET_SECTION.roster}>
                <Text style={[type.secondary, { color: statusColor, fontWeight: "600" }]}>
                  {guestAccountStatusLabel(row.status)}
                </Text>
              </FacultySheetSection>
            )}
          </ScrollView>

          {confirmApprove ? (
            <FacultySheetConfirm
              title="Approve guest request?"
              body={`${row.full_name} will be able to sign in and request recommendation letters.`}
              confirmLabel="Approve"
              danger={false}
              onCancel={() => setConfirmApprove(false)}
              onConfirm={() => {
                setConfirmApprove(false)
                onApprove()
              }}
            />
          ) : null}
        </FacultySheetContainer>
      </Modal>

      <GuestRejectReasonSheet
        visible={rejectOpen}
        submitting={acting}
        onClose={() => setRejectOpen(false)}
        onSubmit={(reason) => {
          setRejectOpen(false)
          onReject(reason || undefined)
        }}
      />
    </>
  )
}

const localStyles = StyleSheet.create({
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  awaitRow: { flexDirection: "row", marginTop: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  awaitCol: { flex: 1, gap: 2 },
  awaitDivider: { borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: 12 },
  linkRow: { paddingVertical: 4 },
  rejectInput: {
    minHeight: 88,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
    fontSize: 15,
    lineHeight: 20,
  },
  rejectActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  rejectBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rejectBtnPrimary: { borderWidth: 0 },
})
