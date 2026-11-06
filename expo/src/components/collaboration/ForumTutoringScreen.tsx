import { useCallback, useEffect, useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { AppAlert } from "../../lib/app-alert"
import { useSession } from "../../context/SessionProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { COMM_SYSTEM } from "../../constants/faculty-communication-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useThemedStudentNative } from "../../lib/themed-module-theme"
import { collaborationApi, formatRelativeTime, stripHtml, type TutoringOffer } from "../../lib/collaboration-api"
import { CommEmptyState, CommSectionFooter } from "../faculty/faculty-communication-ui"
import { ModuleShowMoreRow } from "../modules/ModuleScreen"
import { SignatureListCard } from "../theme/SignatureListCard"
import { signatureListStyles } from "../theme/TabbedModuleLayout"
import { StudentSearchToolbar } from "../student/student-search-toolbar"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { useModuleListPageSize } from "../../hooks/useModuleListPageSize"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { CollabFlowHeader } from "./collab-nav"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function TutoringListCard({ offer, index }: { offer: TutoringOffer; index: number }) {
  return (
    <SignatureListCard
      index={index}
      title={offer.subject}
      subtitle={offer.tutor_name ?? "Student"}
      meta={formatRelativeTime(offer.created_at)}
      statusLabel="Tutoring offer"
      icon="school-outline"
      accent={COMM_SYSTEM.blue.color}
      showChevron={false}
    />
  )
}

export function ForumTutoringScreen() {
  const session = useStudentSession()
  const SN = useThemedStudentNative()
  const native = useThemedNative()
  const scrollPad = useModuleScrollContentPadding(24)
  const [offers, setOffers] = useState<TutoringOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showTutorForm, setShowTutorForm] = useState(false)
  const [tutorSubject, setTutorSubject] = useState("")
  const listPageSize = useModuleListPageSize({ preset: "standard" })
  const [visibleCount, setVisibleCount] = useState(listPageSize)

  const load = useCallback(async () => {
    if (!session) return
    try {
      const res = await collaborationApi.getTutoringOffers(session)
      setOffers(res.offers ?? [])
    } catch (err) {
      AppAlert.alert("Failed", err instanceof ApiError ? err.message : "Could not load tutoring offers.")
      setOffers([])
    }
  }, [session])

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load, session])

  useNotificationModuleRefresh("forum", () => void load())

  useEffect(() => {
    setVisibleCount(listPageSize)
  }, [search, listPageSize])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return offers
    return offers.filter(
      (offer) =>
        offer.subject.toLowerCase().includes(q) ||
        (offer.tutor_name ?? "").toLowerCase().includes(q) ||
        stripHtml(offer.description ?? "").toLowerCase().includes(q),
    )
  }, [offers, search])

  const submitTutoringOffer = async () => {
    if (!session || !tutorSubject.trim()) return
    try {
      await collaborationApi.createTutoringOffer(session, {
        offerType: "can_tutor",
        subject: tutorSubject.trim(),
      })
      setTutorSubject("")
      setShowTutorForm(false)
      await load()
    } catch (err) {
      AppAlert.alert("Failed", err instanceof ApiError ? err.message : "Could not post offer.")
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: SN.groupedBackground }]}>
      <CollabFlowHeader
        title="Tutoring"
        subtitle="Offer or find help from classmates"
        fallbackHref="/module/forum"
      />
      <StudentSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search tutoring offers…"
        trailingAction={{
          onPress: () => setShowTutorForm(true),
          accessibilityLabel: "Offer tutoring",
          icon: "add",
        }}
      />
      <ScrollView
        contentContainerStyle={[styles.content, scrollPad]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {loading ? null : filtered.length === 0 && !showTutorForm ? (
          <CommEmptyState
            icon="school-outline"
            title="No offers yet"
            body="Share a subject you can help with."
          />
        ) : (
          <View style={signatureListStyles.list}>
            {filtered.slice(0, visibleCount).map((offer, index) => (
              <TutoringListCard key={offer.id} offer={offer} index={index} />
            ))}
            <ModuleShowMoreRow
              variant="card"
              remaining={filtered.length - visibleCount}
              onPress={() => setVisibleCount((prev) => prev + listPageSize)}
            />
          </View>
        )}
        {showTutorForm ? (
          <View style={styles.tutorForm}>
            <TextInput
              style={[styles.tutorInput, { backgroundColor: native.secondaryGrouped, color: native.label }]}
              value={tutorSubject}
              onChangeText={setTutorSubject}
              placeholder="Subject you can tutor"
              placeholderTextColor={native.tertiaryLabel}
            />
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: SN.accent },
                pressed && { opacity: NATIVE.pressedOpacity },
              ]}
              onPress={() => void submitTutoringOffer()}
            >
              <Text style={styles.primaryBtnText}>Post offer</Text>
            </Pressable>
          </View>
        ) : null}
        <CommSectionFooter>Offers are visible to classmates in this section.</CommSectionFooter>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 12 },
  tutorForm: { gap: 10 },
  tutorInput: {
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  primaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: NATIVE.sectionRadius,
  },
  primaryBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
})
