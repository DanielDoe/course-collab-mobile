import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { instructorApi,
  type SummerCampCamper,
  type SummerCampProgram,
  type SummerCampRequest,
  type SummerCampTraining} from "../../lib/instructor-api"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useFacultyModuleStyles } from "../../lib/faculty-themed-ui"
import { useNativeType, semanticSoft } from "../../lib/themed-module-theme"
import { FACULTY_SUMMER_CAMP_COLOR } from "../../lib/faculty-summer-camp-theme"
import { APP_BUTTON_RADIUS } from "../../constants/app-button"
import { FacultyEmptyState } from "./faculty-shared"
import { useFacultyStickyHeaderScrollLayout,
  FacultyModuleStickyHeader,
  FacultyModuleTabBar,
  FacultySearchToolbar} from "./faculty-module-shell"
import { FacultyStudentDetailModal } from "./FacultyStudentDetailModal"
import {
  FacultySummerCampProgramActionSheet,
  FacultySummerCampTrainingActionSheet} from "./FacultySummerCampActionSheets"
import { FacultySheetChrome, FacultySheetContainer } from "./faculty-collab-sheet-ui"
import { FacultyAddCamperModal } from "./FacultyAddCamperModal"
import {
  FacultySummerCampCamperCard,
  FacultySummerCampProgramCard,
  FacultySummerCampRequestCard,
  FacultySummerCampTrackCard,
} from "./FacultySummerCampListCards"

export type SummerCampTab = "programs" | "tracks" | "campers" | "requests"

type Props = {
  initialTab?: SummerCampTab
}

function camperToProfileStudent(camper: SummerCampCamper) {
  const enrollments = camper.enrollments ?? 0
  return {
    id: camper.id,
    student_id: camper.student_id,
    full_name: camper.full_name,
    email: camper.email,
    section: "Summer camp",
    session_description: `${enrollments} enrollment${enrollments === 1 ? "" : "s"}`}
}

const SUMMER_CAMP_TABS: Array<{
  id: SummerCampTab
  label: string
  icon: keyof typeof Ionicons.glyphMap
}> = [
  { id: "programs", label: "Programs", icon: "sunny-outline" },
  { id: "tracks", label: "Tracks", icon: "git-branch-outline" },
  { id: "campers", label: "Campers", icon: "people-outline" },
  { id: "requests", label: "Requests", icon: "mail-outline" },
]

export function FacultySummerCampScreen({ initialTab = "programs" }: Props) {
  const insets = useSafeAreaInsets()
  const { listScrollPad } = useFacultyStickyHeaderScrollLayout()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const styles = useFacultyModuleStyles()
  const type = useNativeType()
  const { scope, ready } = useFacultyScope()

  const [tab, setTab] = useState<SummerCampTab>(initialTab)
  const [camps, setCamps] = useState<SummerCampProgram[]>([])
  const [trainings, setTrainings] = useState<SummerCampTraining[]>([])
  const [campers, setCampers] = useState<SummerCampCamper[]>([])
  const [requests, setRequests] = useState<SummerCampRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  const [selectedCamp, setSelectedCamp] = useState<SummerCampProgram | null>(null)
  const [selectedTraining, setSelectedTraining] = useState<SummerCampTraining | null>(null)
  const [selectedCamper, setSelectedCamper] = useState<SummerCampCamper | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [addCamperOpen, setAddCamperOpen] = useState(false)
  const [formKind, setFormKind] = useState<"camp" | "training">("camp")
  const [formCampId, setFormCampId] = useState<number | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!scope) return
    const [campRows, trainingRows, camperRes, requestRes] = await Promise.all([
      instructorApi.getSummerCamps(scope),
      instructorApi.getSummerCampTrainings(scope),
      instructorApi.getSummerCampers(scope, "campers"),
      instructorApi.getSummerCampers(scope, "requests"),
    ])
    setCamps(campRows)
    setTrainings(trainingRows)
    setCampers(camperRes.campers ?? [])
    setRequests(requestRes.requests ?? [])
  }, [scope])

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load summer camp data."))
      .finally(() => setLoading(false))
  }, [ready, load])

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === "pending" || r.status === "requested").length,
    [requests],
  )

  const draftPrograms = useMemo(() => camps.filter((c) => c.status === "draft").length, [camps])
  const draftTracks = useMemo(() => trainings.filter((t) => t.status === "draft").length, [trainings])

  const campTrainings = useMemo(() => {
    if (!selectedCamp) return []
    return trainings.filter((t) => t.camp_id === selectedCamp.id)
  }, [trainings, selectedCamp])

  const ownedCamps = useMemo(() => camps.filter((c) => c.is_owner !== false), [camps])

  const q = search.trim().toLowerCase()

  const filteredCamps = useMemo(() => {
    if (!q) return camps
    return camps.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q),
    )
  }, [camps, q])

  const filteredTrainings = useMemo(() => {
    if (!q) return trainings
    return trainings.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.camp_title ?? "").toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q),
    )
  }, [trainings, q])

  const filteredCampers = useMemo(() => {
    if (!q) return campers
    return campers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.student_id.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q),
    )
  }, [campers, q])

  const filteredRequests = useMemo(() => {
    if (!q) return requests
    return requests.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.student_id.toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q),
    )
  }, [requests, q])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  function openCreate(kind: "camp" | "training", campId?: number) {
    setFormKind(kind)
    setFormCampId(campId ?? null)
    setTitle("")
    setDescription("")
    setStartDate("")
    setEndDate("")
    setFormOpen(true)
  }

  async function submitCreate() {
    if (!scope || !title.trim()) {
      setError("Title is required.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      if (formKind === "camp") {
        await instructorApi.createSummerCamp(scope, {
          title: title.trim(),
          description: description.trim() || undefined,
          start_date: startDate.trim() || undefined,
          end_date: endDate.trim() || undefined})
      } else {
        const campId = formCampId ?? selectedCamp?.id ?? ownedCamps[0]?.id
        if (!campId) {
          setError("Create a program first, then add a training track.")
          return
        }
        await instructorApi.createSummerCampTraining(scope, {
          camp_id: campId,
          title: title.trim(),
          description: description.trim() || undefined})
      }
      setFormOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create item.")
    } finally {
      setSubmitting(false)
    }
  }

  async function refreshAndReselect() {
    if (!scope) return
    setActing(true)
    try {
      const [campRows, trainingRows] = await Promise.all([
        instructorApi.getSummerCamps(scope),
        instructorApi.getSummerCampTrainings(scope),
      ])
      setCamps(campRows)
      setTrainings(trainingRows)
      if (selectedCamp) {
        setSelectedCamp(campRows.find((c) => c.id === selectedCamp.id) ?? null)
      }
      if (selectedTraining) {
        setSelectedTraining(trainingRows.find((t) => t.id === selectedTraining.id) ?? null)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not refresh.")
    } finally {
      setActing(false)
    }
  }

  async function runAction(action: () => Promise<unknown>) {
    setActing(true)
    setError("")
    try {
      await action()
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.")
    } finally {
      setActing(false)
    }
  }

  async function quickPublishCamp(camp: SummerCampProgram) {
    if (!scope) return
    await runAction(() => instructorApi.updateSummerCamp(scope, { camp_id: camp.id, status: "published" }))
  }

  async function quickPublishTraining(training: SummerCampTraining) {
    if (!scope) return
    await runAction(() =>
      instructorApi.updateSummerCampTraining(scope, { training_id: training.id, status: "published" }),
    )
  }

  const searchPlaceholder =
    tab === "programs"
      ? "Search programs…"
      : tab === "tracks"
        ? "Search training tracks…"
        : tab === "campers"
          ? "Search campers…"
          : "Search requests…"

  const canCreate =
    tab === "programs" || (tab === "tracks" && ownedCamps.length > 0) || tab === "campers"

  const createAction =
    tab === "programs"
      ? { label: "Create program", a11y: "Create summer program" }
      : tab === "tracks"
        ? { label: "Add track", a11y: "Create training track" }
        : { label: "Add camper", a11y: "Add summer camper" }

  const sectionMeta = useMemo(() => {
    if (tab === "programs") {
      const parts = [`${filteredCamps.length} program${filteredCamps.length === 1 ? "" : "s"}`]
      if (draftPrograms > 0) parts.push(`${draftPrograms} draft${draftPrograms === 1 ? "" : "s"}`)
      return parts.join(" · ")
    }
    if (tab === "tracks") {
      const parts = [`${filteredTrainings.length} track${filteredTrainings.length === 1 ? "" : "s"}`]
      if (draftTracks > 0) parts.push(`${draftTracks} draft${draftTracks === 1 ? "" : "s"}`)
      return parts.join(" · ")
    }
    if (tab === "campers") {
      return `${filteredCampers.length} camper${filteredCampers.length === 1 ? "" : "s"}`
    }
    const pending = filteredRequests.filter((r) => r.status === "pending" || r.status === "requested").length
    return `${filteredRequests.length} request${filteredRequests.length === 1 ? "" : "s"}${pending > 0 ? ` · ${pending} pending` : ""}`
  }, [tab, filteredCamps.length, filteredTrainings.length, filteredCampers.length, filteredRequests, draftPrograms, draftTracks])

  const showCreateInEmpty =
    canCreate &&
    !loading &&
    ((tab === "programs" && camps.length === 0) || (tab === "tracks" && trainings.length === 0))

  const tabItems = useMemo(
    () =>
      SUMMER_CAMP_TABS.map((item) => ({
        ...item,
        count: item.id === "requests" ? pendingRequests : undefined})),
    [pendingRequests],
  )

  if (!ready) {
    return (
      <FacultyEmptyState
        icon="sunny-outline"
        title="Select a course"
        body="Summer camp management requires an active course."
      />
    )
  }

  return (
    <View style={styles.root}>
      <FacultyModuleStickyHeader>
        <FacultyModuleTabBar tabs={tabItems} tab={tab} onChange={setTab} scrollable />

        <FacultySearchToolbar
          value={search}
          onChange={setSearch}
          placeholder={searchPlaceholder}
          showFilter={false}
          trailingAction={
            canCreate
              ? {
                  onPress: () => {
                    if (tab === "campers") setAddCamperOpen(true)
                    else openCreate(tab === "programs" ? "camp" : "training")
                  },
                  accessibilityLabel: createAction.a11y}
              : undefined
          }
        />

        {tab === "tracks" && ownedCamps.length === 0 ? (
          <Pressable
            style={[
              localStyles.nudgeBanner,
              {
                backgroundColor: semanticSoft(tokens.warning, tokens.isDark),
                borderColor: `${tokens.warning}33`},
            ]}
            onPress={() => setTab("programs")}
          >
            <Ionicons name="information-circle-outline" size={18} color={tokens.warning} />
            <Text style={[type.caption, localStyles.nudgeText, { color: tokens.warning }]}>
              Create a program before adding training tracks
            </Text>
            <Ionicons name="chevron-forward" size={16} color={tokens.warning} />
          </Pressable>
        ) : null}

        {pendingRequests > 0 && tab !== "requests" ? (
          <Pressable
            style={[
              localStyles.nudgeBanner,
              {
                backgroundColor: semanticSoft(tokens.warning, tokens.isDark),
                borderColor: `${tokens.warning}33`},
            ]}
            onPress={() => setTab("requests")}
          >
            <Ionicons name="mail-outline" size={18} color={tokens.warning} />
            <Text style={[type.caption, localStyles.nudgeText, { color: tokens.warning }]}>
              {pendingRequests} camper request{pendingRequests === 1 ? "" : "s"} awaiting review
            </Text>
            <Ionicons name="chevron-forward" size={16} color={tokens.warning} />
          </Pressable>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={tokens.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </FacultyModuleStickyHeader>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[localStyles.scrollContent, listScrollPad]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={FACULTY_SUMMER_CAMP_COLOR.action} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <ActivityIndicator color={FACULTY_SUMMER_CAMP_COLOR.action} style={localStyles.loader} />
        ) : (
          <>
            {!showCreateInEmpty &&
            ((tab === "programs" && filteredCamps.length > 0) ||
              (tab === "tracks" && filteredTrainings.length > 0) ||
              (tab === "campers" && filteredCampers.length > 0) ||
              (tab === "requests" && filteredRequests.length > 0)) ? (
              <ListSectionHeader label={sectionMeta} />
            ) : null}

            {tab === "programs" ? (
              filteredCamps.length === 0 ? (
                <TabEmptyPanel
                  icon="sunny-outline"
                  title={camps.length === 0 ? "No summer programs" : "No matches"}
                  body={
                    camps.length === 0
                      ? "Create a program to group training tracks campers can enroll in."
                      : "Try a different search term."
                  }
                  actionLabel={showCreateInEmpty ? createAction.label : undefined}
                  onAction={showCreateInEmpty ? () => openCreate("camp") : undefined}
                />
              ) : (
                <View style={localStyles.list}>
                  {filteredCamps.map((camp) => (
                    <FacultySummerCampProgramCard
                      key={camp.id}
                      camp={camp}
                      acting={acting}
                      onPress={() => setSelectedCamp(camp)}
                      onPublish={() => void quickPublishCamp(camp)}
                    />
                  ))}
                </View>
              )
            ) : tab === "tracks" ? (
              filteredTrainings.length === 0 ? (
                <TabEmptyPanel
                  icon="school-outline"
                  title={trainings.length === 0 ? "No training tracks" : "No matches"}
                  body={
                    trainings.length === 0
                      ? "Add tracks under a summer program for camper enrollment."
                      : "Try a different search term."
                  }
                  actionLabel={showCreateInEmpty ? createAction.label : undefined}
                  onAction={showCreateInEmpty ? () => openCreate("training") : undefined}
                />
              ) : (
                <View style={localStyles.list}>
                  {filteredTrainings.map((training) => (
                    <FacultySummerCampTrackCard
                      key={training.id}
                      training={training}
                      acting={acting}
                      onPress={() => setSelectedTraining(training)}
                      onPublish={() => void quickPublishTraining(training)}
                    />
                  ))}
                </View>
              )
            ) : tab === "campers" ? (
              filteredCampers.length === 0 ? (
                <TabEmptyPanel
                  icon="people-outline"
                  title={campers.length === 0 ? "No campers yet" : "No matches"}
                  body={
                    campers.length === 0
                      ? "Enrolled summer campers will appear here."
                      : "Try a different search term."
                  }
                />
              ) : (
                <View style={localStyles.list}>
                  {filteredCampers.map((camper) => (
                    <FacultySummerCampCamperCard
                      key={camper.id}
                      camper={camper}
                      onPress={() => setSelectedCamper(camper)}
                    />
                  ))}
                </View>
              )
            ) : filteredRequests.length === 0 ? (
              <TabEmptyPanel
                icon="mail-outline"
                title="No camper requests"
                body="Registration and password reset requests will appear here."
              />
            ) : (
              <View style={localStyles.list}>
                {pendingRequests > 0 ? (
                  <Pressable
                    style={[localStyles.approveAllBtn, { backgroundColor: FACULTY_SUMMER_CAMP_COLOR.action }]}
                    disabled={acting}
                    onPress={() =>
                      void runAction(() => instructorApi.approveAllSummerCampRequests(scope!))
                    }
                  >
                    <Ionicons name="checkmark-done-outline" size={18} color={FACULTY_SUMMER_CAMP_COLOR.actionInk} />
                    <Text style={[localStyles.approveAllText, { color: FACULTY_SUMMER_CAMP_COLOR.actionInk }]}>
                      Approve all pending ({pendingRequests})
                    </Text>
                  </Pressable>
                ) : null}
                {filteredRequests.map((request) => (
                  <FacultySummerCampRequestCard
                    key={request.id}
                    request={request}
                    acting={acting}
                    onApprove={() =>
                      void runAction(() => instructorApi.approveSummerCampRequest(scope!, request.id))
                    }
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <FacultySummerCampProgramActionSheet
        visible={selectedCamp != null}
        camp={selectedCamp}
        trainings={campTrainings}
        acting={acting}
        onClose={() => setSelectedCamp(null)}
        onUpdated={() => void refreshAndReselect()}
        onAddTraining={(camp) => {
          setSelectedCamp(null)
          openCreate("training", camp.id)
        }}
        onOpenTraining={(training) => {
          setSelectedCamp(null)
          setSelectedTraining(training)
        }}
      />

      <FacultySummerCampTrainingActionSheet
        visible={selectedTraining != null}
        training={selectedTraining}
        acting={acting}
        onClose={() => setSelectedTraining(null)}
        onUpdated={() => void refreshAndReselect()}
      />

      <FacultyStudentDetailModal
        student={selectedCamper ? camperToProfileStudent(selectedCamper) : null}
        scope={scope}
        profileEyebrow="Camper profile"
        onClose={() => setSelectedCamper(null)}
      />

      <FacultyAddCamperModal
        visible={addCamperOpen}
        onClose={() => setAddCamperOpen(false)}
        onCreated={() => void handleRefresh()}
      />

      <Modal visible={formOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFormOpen(false)}>
        <FacultySheetContainer>
          <FacultySheetChrome
            topInset={insets.top}
            title={formKind === "camp" ? "New program" : "New training track"}
            onClose={() => setFormOpen(false)}
          />
          <ScrollView contentContainerStyle={localStyles.sheetBody} keyboardShouldPersistTaps="handled">
            {formKind === "training" ? (
              <>
                <Text style={[type.caption, localStyles.fieldLabel]}>Program</Text>
                <View style={[localStyles.programPicker, { backgroundColor: native.fill }]}>
                  {(formCampId ? ownedCamps.filter((c) => c.id === formCampId) : ownedCamps).map((camp) => (
                    <Text key={camp.id} style={[type.bodyEmphasis, localStyles.programPickerValue]}>
                      {camp.title}
                    </Text>
                  ))}
                </View>
              </>
            ) : null}
            <Text style={[type.caption, localStyles.fieldLabel]}>Title</Text>
            <TextInput
              style={[localStyles.input, { color: native.label, backgroundColor: native.fill }]}
              value={title}
              onChangeText={setTitle}
              placeholder={formKind === "camp" ? "Summer Camp 2026" : "AI & Edge Computing"}
              placeholderTextColor={native.tertiaryLabel}
            />
            <Text style={[type.caption, localStyles.fieldLabel]}>Description</Text>
            <TextInput
              style={[localStyles.input, localStyles.textArea, { color: native.label, backgroundColor: native.fill }]}
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Optional overview for campers and staff"
              placeholderTextColor={native.tertiaryLabel}
            />
            {formKind === "camp" ? (
              <>
                <Text style={[type.caption, localStyles.fieldLabel]}>Start date</Text>
                <TextInput
                  style={[localStyles.input, { color: native.label, backgroundColor: native.fill }]}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={native.tertiaryLabel}
                  autoCapitalize="none"
                />
                <Text style={[type.caption, localStyles.fieldLabel]}>End date</Text>
                <TextInput
                  style={[localStyles.input, { color: native.label, backgroundColor: native.fill }]}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={native.tertiaryLabel}
                  autoCapitalize="none"
                />
              </>
            ) : null}
            <Pressable
              style={[localStyles.primaryBtn, { backgroundColor: FACULTY_SUMMER_CAMP_COLOR.action }]}
              disabled={submitting}
              onPress={() => void submitCreate()}
            >
              {submitting ? (
                <ActivityIndicator color={FACULTY_SUMMER_CAMP_COLOR.actionInk} />
              ) : (
                <Text style={[localStyles.primaryBtnText, { color: FACULTY_SUMMER_CAMP_COLOR.actionInk }]}>Create</Text>
              )}
            </Pressable>
          </ScrollView>
        </FacultySheetContainer>
      </Modal>
    </View>
  )
}

function ListSectionHeader({ label }: { label: string }) {
  const type = useNativeType()
  return (
    <View style={localStyles.sectionHeader}>
      <Text style={[type.footnote, localStyles.sectionTitle]}>{label}</Text>
    </View>
  )
}

function TabEmptyPanel({
  icon,
  title,
  body,
  actionLabel,
  onAction}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
}) {
  const native = useThemedNative()
  const moduleStyles = useFacultyModuleStyles()
  const type = useNativeType()

  return (
    <View style={[moduleStyles.card, localStyles.emptyPanel]}>
      <Ionicons name={icon} size={32} color={native.secondaryLabel} />
      <Text style={[type.bodyEmphasis, localStyles.emptyTitle]}>{title}</Text>
      <Text style={[type.caption, localStyles.emptyBody]}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable
          style={[localStyles.emptyAction, { backgroundColor: FACULTY_SUMMER_CAMP_COLOR.action }]}
          onPress={onAction}
        >
          <Ionicons name="add" size={18} color={FACULTY_SUMMER_CAMP_COLOR.actionInk} />
          <Text style={[localStyles.emptyActionText, { color: FACULTY_SUMMER_CAMP_COLOR.actionInk }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const localStyles = StyleSheet.create({
  headerZone: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth},
  scrollContent: { paddingHorizontal: 16, gap: 10 },
  loader: { marginTop: 32 },
  sectionHeader: { paddingHorizontal: 2, paddingBottom: 2 },
  sectionTitle: { letterSpacing: 0.4 },
  emptyPanel: { alignItems: "center", paddingVertical: 36, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, textAlign: "center" },
  emptyBody: { lineHeight: 21, textAlign: "center", maxWidth: 280 },
  emptyAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12},
  emptyActionText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  nudgeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1},
  nudgeText: { flex: 1, fontSize: 14, fontWeight: "700" },
  list: { gap: 10 },
  approveAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 12},
  approveAllText: { fontWeight: "700", fontSize: 14 },
  sheetRoot: { flex: 1 },
  sheetBody: { padding: 16, gap: 10, paddingBottom: 32 },
  fieldLabel: { fontWeight: "700" },
  programPicker: { borderRadius: 999, padding: 12 },
  programPickerValue: { fontSize: 15 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16},
  textArea: { minHeight: 96, textAlignVertical: "top" },
  primaryBtn: {
    marginTop: 8,
    borderRadius: APP_BUTTON_RADIUS,
    paddingVertical: 14,
    alignItems: "center"},
  primaryBtnText: { fontWeight: "700", fontSize: 16 }})

