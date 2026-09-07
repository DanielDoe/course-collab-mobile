import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import {
  instructorApi,
  type RecommendationGuestAccountRequest,
} from "../../lib/instructor-api"
import {
  countPendingGuestAccountRequests,
  filterGuestAccountRequests,
  GUEST_ACCOUNT_SORT_OPTIONS,
  GUEST_ACCOUNT_STATUS_OPTIONS,
  type GuestAccountSortKey,
  type GuestAccountStatusFilter,
} from "../../lib/faculty-guest-account-requests-utils"
import type { useFacultyScope } from "../../hooks/useFacultyScope"
import { FacultyEmptyState } from "./faculty-shared"
import { useFacultyListPager } from "../../hooks/useFacultyListPager"
import { FacultyListPagerFooter } from "./FacultyListPagerFooter"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { FACULTY_RECOMMENDATIONS_COLOR } from "../../lib/faculty-recommendations-theme"
import { FacultyGuestRecommendationRequestCard } from "./FacultyRecommendationsListCards"
import { FacultyGuestRecommendationRequestActionSheet } from "./FacultyRecommendationsActionSheets"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import { GlassSheetBackground } from "../theme/GlassSurface"
import { GlassMenuList, GlassMenuRow, GlassSheetHandle } from "../theme/GlassActionSheetMenu"

type Scope = NonNullable<ReturnType<typeof useFacultyScope>["scope"]>

function GuestAccountFilterSheet({
  visible,
  onClose,
  statusFilter,
  sort,
  onStatusFilterChange,
  onSortChange,
}: {
  visible: boolean
  onClose: () => void
  statusFilter: GuestAccountStatusFilter
  sort: GuestAccountSortKey
  onStatusFilterChange: (value: GuestAccountStatusFilter) => void
  onSortChange: (value: GuestAccountSortKey) => void
}) {
  const insets = useSafeAreaInsets()
  const { native, type } = useModuleTheme()

  function pick(action: () => void) {
    action()
    onClose()
  }

  return (
    <GlassBottomSheetModal visible={visible} onClose={onClose} scrollable accessibilityLabel="Close filters">
      <GlassSheetBackground style={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 12) }}>
        <GlassSheetHandle />
        <Text style={[type.sheetTitle, { color: native.label, marginTop: 4, marginBottom: 8 }]}>
          Guest request filters
        </Text>
        <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700", marginBottom: 6 }]}>
          Status
        </Text>
        <GlassMenuList>
          {GUEST_ACCOUNT_STATUS_OPTIONS.map((opt, index) => (
            <GlassMenuRow
              key={opt.value}
              icon={statusFilter === opt.value ? "checkmark-circle" : "ellipse-outline"}
              label={opt.label}
              onPress={() => pick(() => onStatusFilterChange(opt.value))}
              showSeparator={index < GUEST_ACCOUNT_STATUS_OPTIONS.length - 1}
            />
          ))}
        </GlassMenuList>
        <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700", marginTop: 14, marginBottom: 6 }]}>
          Sort
        </Text>
        <GlassMenuList>
          {GUEST_ACCOUNT_SORT_OPTIONS.map((opt, index) => (
            <GlassMenuRow
              key={opt.value}
              icon={sort === opt.value ? "checkmark-circle" : "ellipse-outline"}
              label={opt.label}
              onPress={() => pick(() => onSortChange(opt.value))}
              showSeparator={index < GUEST_ACCOUNT_SORT_OPTIONS.length - 1}
            />
          ))}
        </GlassMenuList>
      </GlassSheetBackground>
    </GlassBottomSheetModal>
  )
}

type Props = {
  scope: Scope | null
  search: string
  statusFilter: GuestAccountStatusFilter
  sort: GuestAccountSortKey
  filterSheetOpen: boolean
  onFilterSheetOpenChange: (open: boolean) => void
  onStatusFilterChange: (value: GuestAccountStatusFilter) => void
  onSortChange: (value: GuestAccountSortKey) => void
  onOpenPendingLetters: () => void
  onPendingCountChange?: (count: number) => void
}

export function FacultyGuestAccountRequestsPanel({
  scope,
  search,
  statusFilter,
  sort,
  filterSheetOpen,
  onFilterSheetOpenChange,
  onStatusFilterChange,
  onSortChange,
  onOpenPendingLetters,
  onPendingCountChange,
}: Props) {
  const { styles: moduleStyles } = useModuleTheme()
  const [rows, setRows] = useState<RecommendationGuestAccountRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionBusy, setActionBusy] = useState<number | null>(null)
  const [selectedGuest, setSelectedGuest] = useState<RecommendationGuestAccountRequest | null>(null)

  const load = useCallback(async () => {
    if (!scope) return
    setError("")
    setRows(await instructorApi.getRecommendationGuestAccountRequests(scope))
  }, [scope])

  useEffect(() => {
    if (!scope) {
      setLoading(false)
      return
    }
    setLoading(true)
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load guest requests."))
      .finally(() => setLoading(false))
  }, [scope, load])

  useEffect(() => {
    onPendingCountChange?.(countPendingGuestAccountRequests(rows))
  }, [rows, onPendingCountChange])

  const filtered = useMemo(
    () => filterGuestAccountRequests(rows, search, statusFilter, sort),
    [rows, search, statusFilter, sort],
  )
  const pager = useFacultyListPager(filtered, `${search}:${statusFilter}:${sort}`, "guest requests")

  async function approve(id: number) {
    if (!scope) return
    setActionBusy(id)
    try {
      const res = await instructorApi.approveAccountRequest(scope, id)
      AppAlert.alert("Guest approved", res.message ?? "They can sign in with the guest page using their email and password.")
      setSelectedGuest(null)
      await load()
    } catch (err) {
      AppAlert.alert("Approve failed", err instanceof ApiError ? err.message : "Could not approve request.")
    } finally {
      setActionBusy(null)
    }
  }

  async function reject(id: number, reason?: string) {
    if (!scope) return
    setActionBusy(id)
    try {
      await instructorApi.rejectAccountRequest(scope, id, reason?.trim() || "No reason provided")
      setSelectedGuest(null)
      await load()
      AppAlert.alert("Request declined")
    } catch (err) {
      AppAlert.alert("Decline failed", err instanceof ApiError ? err.message : "Could not decline request.")
    } finally {
      setActionBusy(null)
    }
  }

  return (
    <>
      {error ? (
        <View style={moduleStyles.errorBox}>
          <Text style={moduleStyles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={FACULTY_RECOMMENDATIONS_COLOR.link} style={localStyles.loader} />
      ) : rows.length === 0 ? (
        <FacultyEmptyState
          icon="person-add-outline"
          title="No guest recommendation requests"
          body="When someone applies on the guest page and selects recommendation letter access, pending rows show up here."
        />
      ) : filtered.length === 0 ? (
        <FacultyEmptyState
          icon="search-outline"
          title="No matches"
          body='Try a different search term or set status to "All".'
        />
      ) : (
        <View style={localStyles.list}>
          {pager.items.map((row) => (
            <FacultyGuestRecommendationRequestCard
              key={row.id}
              row={row}
              onPress={() => setSelectedGuest(row)}
            />
          ))}
          <FacultyListPagerFooter pager={pager} />
        </View>
      )}

      <GuestAccountFilterSheet
        visible={filterSheetOpen}
        onClose={() => onFilterSheetOpenChange(false)}
        statusFilter={statusFilter}
        sort={sort}
        onStatusFilterChange={onStatusFilterChange}
        onSortChange={onSortChange}
      />

      <FacultyGuestRecommendationRequestActionSheet
        visible={selectedGuest != null}
        row={selectedGuest}
        acting={selectedGuest != null && actionBusy === selectedGuest.id}
        onClose={() => setSelectedGuest(null)}
        onApprove={() => selectedGuest && void approve(selectedGuest.id)}
        onReject={(reason) => selectedGuest && void reject(selectedGuest.id, reason)}
        onOpenPendingLetters={() => {
          setSelectedGuest(null)
          onOpenPendingLetters()
        }}
      />
    </>
  )
}

export function guestAccountRequestsFilterActive(
  statusFilter: GuestAccountStatusFilter,
  sort: GuestAccountSortKey,
): boolean {
  return statusFilter !== "all" || sort !== "submitted_desc"
}

const localStyles = StyleSheet.create({
  list: { gap: 12 },
  loader: { marginVertical: 32 },
})
