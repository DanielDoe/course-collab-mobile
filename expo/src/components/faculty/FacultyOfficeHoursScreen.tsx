import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { AppAlertHost } from "../../context/AppAlertProvider"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi, type OfficeHourRequest, type RegularOfficeHourSlot } from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { NATIVE, SYSTEM } from "../../constants/faculty-native-theme"
import { FacultyEmptyState, FacultyStatusPill } from "./faculty-shared"
import { FacultyOfficeHourCreateModal } from "./FacultyOfficeHourCreateModal"
import { FacultyOfficeHoursActionSheet } from "./FacultyOfficeHoursActionSheet"
import { FacultyRegularOfficeHoursSheet } from "./FacultyRegularOfficeHoursSheet"
import { useFacultyStickyHeaderScrollLayout,
  FacultyModuleStickyHeader,
  FacultyModuleTabBar,
  FacultySearchToolbar} from "./faculty-module-shell"
import {
  FacultySheetContainer,
  useCollabSheetStyles,
  FacultySheetChrome,
  FacultySheetField,
  FacultySheetNotice,
  FacultySheetSection,
  useSheetPlaceholderColor,
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"
import { useModuleTheme } from "../../lib/themed-module-shell"
import {
  FACULTY_OFFICE_HOURS_COLOR,
  facultyOfficeHoursRequestStatus,
  isPendingOfficeHourStatus,
} from "../../lib/faculty-office-hours-theme"
import {
  FacultyOfficeHoursRequestCard,
  FacultyOfficeHoursScheduleCard,
} from "./FacultyOfficeHoursListCards"

type OfficeHoursTab = "requests" | "schedule"

export function FacultyOfficeHoursScreen() {
  const { styles: moduleStyles, native, type } = useModuleTheme()
  const collabSheetStyles = useCollabSheetStyles()
  const sheetPlaceholder = useSheetPlaceholderColor()
  const insets = useSafeAreaInsets()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const { scope, ready } = useFacultyScope()
  const { refreshFacultyData } = useFacultyShell()

  const [tab, setTab] = useState<OfficeHoursTab>("requests")
  const [requests, setRequests] = useState<OfficeHourRequest[]>([])
  const [regularHours, setRegularHours] = useState<RegularOfficeHourSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingSchedule, setLoadingSchedule] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<OfficeHourRequest | null>(null)
  const [meetingLink, setMeetingLink] = useState("")
  const [meetingVenue, setMeetingVenue] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [actionSheetOpen, setActionSheetOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [regularHoursOpen, setRegularHoursOpen] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    setRequests(await instructorApi.getOfficeHours(scope))
  }, [scope])

  const loadRegularHours = useCallback(async () => {
    if (!scope) return
    try {
      setRegularHours(await instructorApi.getRegularOfficeHours(scope))
    } catch {
      setRegularHours([])
    }
  }, [scope])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadingSchedule(true)
    Promise.all([load(), loadRegularHours()])
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load office hours."))
      .finally(() => {
        setLoading(false)
        setLoadingSchedule(false)
      })
  }, [ready, load, loadRegularHours])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([load(), loadRegularHours(), refreshFacultyData?.(undefined, { force: true })])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not refresh office hours.")
    } finally {
      setRefreshing(false)
    }
  }, [load, loadRegularHours, refreshFacultyData])

  useNotificationModuleRefresh("office-hours", handleRefresh)

  const pending = useMemo(
    () => requests.filter((r) => r.status === "pending" || r.status === "requested"),
    [requests],
  )
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return requests
    return requests.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.topic.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q),
    )
  }, [requests, search])

  const filteredRegularHours = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return regularHours
    return regularHours.filter((slot) =>
      [slot.dayName, slot.startTime, slot.endTime].join(" ").toLowerCase().includes(q),
    )
  }, [regularHours, search])

  const searchPlaceholder =
    tab === "schedule" ? "Search regular hours…" : "Search student, topic, or notes…"

  function openCreateMenu() {
    setActionSheetOpen(true)
  }

  async function updateStatus(request: OfficeHourRequest, status: string, extra?: Record<string, unknown>) {
    if (!scope) return
    setSubmitting(true)
    try {
      await instructorApi.updateOfficeHourRequest(scope, request.id, { status, ...extra })
      setSelected(null)
      await handleRefresh()
      const approved = status === "approved"
      AppAlert.alert(
        approved ? "Request approved" : "Request declined",
        approved
          ? `${request.full_name} will see the approved office hours.`
          : `${request.full_name} will see the declined status.`,
        undefined,
        { tone: approved ? "success" : "info" },
      )
    } catch (err) {
      AppAlert.alert("Update failed", err instanceof ApiError ? err.message : "Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  function confirmDecline(request: OfficeHourRequest, extra?: Record<string, unknown>) {
    AppAlert.alert(
      "Decline this request?",
      "The student will see the declined status.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: () => void updateStatus(request, "declined", extra),
        },
      ],
    )
  }

  function confirmApprove(request: OfficeHourRequest, extra?: Record<string, unknown>) {
    const hasDetails = Boolean(
      (typeof extra?.meetingLink === "string" && extra.meetingLink) ||
        (typeof extra?.meetingVenue === "string" && extra.meetingVenue),
    )
    AppAlert.alert(
      "Approve this request?",
      hasDetails
        ? `${request.full_name} will be notified with the meeting details you entered.`
        : `${request.full_name} will see the approved office hours.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: () => void updateStatus(request, "approved", extra),
        },
      ],
    )
  }

  function openDetail(request: OfficeHourRequest) {
    setSelected(request)
    setMeetingLink("")
    setMeetingVenue("")
    setNotes("")
  }

  if (!ready) {
    return (
      <View style={[moduleStyles.center, styles.center]}>
        <FacultyEmptyState
          icon="book-outline"
          title="Select a course"
          body="Office hour requests are scoped to your active course."
        />
      </View>
    )
  }

  return (
    <View style={[moduleStyles.root, styles.root]}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar
          tabs={[
            { id: "requests", label: "Requests", icon: "mail-outline", count: pending.length > 0 ? pending.length : undefined },
            { id: "schedule", label: "Regular hours", icon: "calendar-outline", count: regularHours.length > 0 ? regularHours.length : undefined },
          ]}
          tab={tab}
          onChange={setTab}
        />

        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder={searchPlaceholder}
          showFilter={false}
          trailingAction={{
            onPress: openCreateMenu,
            accessibilityLabel: "Office hours actions",
          }}
        />
      </FacultyModuleStickyHeader>

      <ScrollView
        contentContainerStyle={[styles.content, listScrollPad]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_OFFICE_HOURS_COLOR.link} />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {tab === "schedule" ? (
          loadingSchedule ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={FACULTY_OFFICE_HOURS_COLOR.link} size="large" />
            </View>
          ) : filteredRegularHours.length === 0 ? (
            <FacultyEmptyState
              icon="calendar-outline"
              title={regularHours.length === 0 ? "No regular hours yet" : "No matches"}
              body={
                regularHours.length === 0
                  ? "Tap + in the search bar to set your weekly office hour availability."
                  : "Try a different search term."
              }
            />
          ) : (
            <View style={styles.scheduleList}>
              {filteredRegularHours.map((slot) => (
                <FacultyOfficeHoursScheduleCard
                  key={slot.id}
                  slot={slot}
                  onPress={() => setRegularHoursOpen(true)}
                />
              ))}
              <Pressable
                style={({ pressed }) => [
                  styles.editAllBtn,
                  {
                    backgroundColor: native.fill,
                    borderColor: native.separator,
                  },
                  pressed && { opacity: NATIVE.pressedOpacity },
                ]}
                onPress={() => setRegularHoursOpen(true)}
              >
                <Ionicons name="create-outline" size={18} color={FACULTY_OFFICE_HOURS_COLOR.link} />
                <Text style={[type.caption, { color: FACULTY_OFFICE_HOURS_COLOR.link, fontWeight: "700" }]}>
                  Edit all regular hours
                </Text>
              </Pressable>
            </View>
          )
        ) : (
          <>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={NATIVE.tint} size="large" />
              </View>
            ) : filtered.length === 0 ? (
              <FacultyEmptyState
                icon="time-outline"
                title={requests.length === 0 ? "No requests yet" : "No matches"}
                body={
                  requests.length === 0
                    ? "Students request office hours from Course Info → Office Hours."
                    : "Try a different search term."
                }
              />
            ) : (
              <View style={styles.requestList}>
                {filtered.map((request) => (
                  <FacultyOfficeHoursRequestCard
                    key={request.id}
                    request={request}
                    onPress={() => openDetail(request)}
                    onDecline={() => confirmDecline(request)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={selected != null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        <View style={styles.sheetHost}>
        {selected ? (
          <FacultySheetContainer>
            <FacultySheetChrome
              topInset={insets.top}
              title={selected.full_name}
              onClose={() => setSelected(null)}
              accentColor={FACULTY_OFFICE_HOURS_COLOR.link}
            />
            <ScrollView
              contentContainerStyle={[
                collabSheetStyles.scroll,
                { paddingTop: 8, gap: 12, paddingBottom: insets.bottom + 20 },
              ]}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.sheetTopicRow}>
                <Text style={[styles.sheetTopic, { color: native.label }]}>{selected.topic}</Text>
                <FacultyStatusPill
                  label={facultyOfficeHoursRequestStatus(selected.status).label}
                  tone={
                    isPendingOfficeHourStatus(selected.status)
                      ? "warning"
                      : selected.status.toLowerCase() === "declined" ||
                          selected.status.toLowerCase() === "rejected" ||
                          selected.status.toLowerCase() === "cancelled"
                        ? "danger"
                        : "success"
                  }
                />
              </View>
              {selected.description ? <Text style={collabSheetStyles.bodyText}>{selected.description}</Text> : null}
              {selected.preferredDates?.length ? (
                <FacultySheetSection label="Preferred times" tone={SHEET_SECTION.highlight}>
                  {selected.preferredDates.map((d) => (
                    <Text key={d} style={[styles.prefItem, { color: native.label }]}>
                      {d}
                    </Text>
                  ))}
                </FacultySheetSection>
              ) : null}
              {isPendingOfficeHourStatus(selected.status) ? (
                <>
                  <FacultySheetSection label="Approval details" tone={SHEET_SECTION.edit}>
                    <FacultySheetField label="Meeting link (optional)">
                      <TextInput
                        style={collabSheetStyles.fieldInput}
                        value={meetingLink}
                        onChangeText={setMeetingLink}
                        placeholder="Zoom / Teams URL"
                        placeholderTextColor={sheetPlaceholder}
                        autoCapitalize="none"
                      />
                    </FacultySheetField>
                    <FacultySheetField label="Venue (optional)">
                      <TextInput
                        style={collabSheetStyles.fieldInput}
                        value={meetingVenue}
                        onChangeText={setMeetingVenue}
                        placeholder="Room or location"
                        placeholderTextColor={sheetPlaceholder}
                      />
                    </FacultySheetField>
                    <FacultySheetField label="Notes for student">
                      <TextInput
                        style={[collabSheetStyles.fieldInput, collabSheetStyles.textArea]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Optional message"
                        placeholderTextColor={sheetPlaceholder}
                        multiline
                      />
                    </FacultySheetField>
                  </FacultySheetSection>
                  <View style={styles.sheetActions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.btn,
                        styles.secondaryBtn,
                        { backgroundColor: native.fill, borderColor: native.separator },
                        pressed && { opacity: NATIVE.pressedOpacity },
                      ]}
                      disabled={submitting}
                      onPress={() =>
                        confirmDecline(selected, { instructorNotes: notes.trim() || undefined })
                      }
                    >
                      <Text style={[type.caption, styles.secondaryText, { color: native.label }]}>Decline</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.btn,
                        styles.primaryBtn,
                        { backgroundColor: FACULTY_OFFICE_HOURS_COLOR.action },
                        pressed && { opacity: NATIVE.pressedOpacity },
                      ]}
                      disabled={submitting}
                      onPress={() =>
                        confirmApprove(selected, {
                          meetingLink: meetingLink.trim() || undefined,
                          meetingVenue: meetingVenue.trim() || undefined,
                          instructorNotes: notes.trim() || undefined,
                        })
                      }
                    >
                      <Text style={[type.caption, styles.primaryText]}>{submitting ? "Saving…" : "Approve"}</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <FacultySheetNotice
                  message={
                    selected.status.toLowerCase() === "declined" ||
                    selected.status.toLowerCase() === "rejected"
                      ? "This request was already declined."
                      : "This request is already approved."
                  }
                />
              )}
            </ScrollView>
          </FacultySheetContainer>
        ) : null}
        <AppAlertHost enabled={selected != null} />
        </View>
      </Modal>

      <FacultyOfficeHoursActionSheet
        visible={actionSheetOpen}
        onClose={() => setActionSheetOpen(false)}
        onNewRequest={() => setCreateOpen(true)}
        onEditRegularHours={() => setRegularHoursOpen(true)}
      />

      <FacultyOfficeHourCreateModal
        visible={createOpen}
        scope={scope}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void handleRefresh()}
      />

      <FacultyRegularOfficeHoursSheet
        visible={regularHoursOpen}
        scope={scope}
        initialSlots={regularHours}
        onClose={() => setRegularHoursOpen(false)}
        onSaved={(slots) => {
          setRegularHours(slots)
          void handleRefresh()
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1},
  sheetHost: { flex: 1 },
  content: { padding: NATIVE.pagePadding, gap: 14 },
  center: { flex: 1, justifyContent: "center", padding: 24},
  loadingBox: { paddingVertical: 48, alignItems: "center" },
  errorBox: {
    backgroundColor: SYSTEM.red.soft,
    borderRadius: NATIVE.sectionRadius,
    padding: 12,
  },
  errorText: { color: SYSTEM.red.color, fontSize: 14, lineHeight: 20 },
  requestList: { gap: 12 },
  scheduleList: { gap: 12 },
  editAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {},
  primaryText: { color: "#ffffff", fontWeight: "700" },
  secondaryBtn: { borderWidth: StyleSheet.hairlineWidth },
  secondaryText: { fontWeight: "600" },
  sheetTopicRow: { gap: 8 },
  sheetTopic: { fontSize: 16, fontWeight: "600" },
  prefItem: { fontSize: 14, fontWeight: "600" },
  sheetActions: { flexDirection: "row", gap: 8 },
})