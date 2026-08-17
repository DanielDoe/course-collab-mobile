import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { ModuleListRow, ModuleScreen, ModuleSection } from "../modules/ModuleScreen"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { useSession } from "../../context/SessionProvider"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { coraCreditsApi } from "../../lib/cora/credits/api"
import type { CoraActivityRow } from "../../lib/cora/credits/types"
import { publicCoraActivityLabel } from "../../lib/cora/models"
import type { FacultySession, StudentSession } from "../../lib/session"
import { NATIVE } from "../../constants/faculty-native-theme"

const PAGE_SIZE = 15
const EXPORT_PAGE_SIZE = 50
const EXPORT_MAX_ROWS = 500

function fmt(n: number) {
  return Math.round(n).toLocaleString()
}

function activityLabel(row: CoraActivityRow): string {
  if (row.title?.trim()) return row.title
  if (row.toolName) return row.toolName.replace(/_/g, " ")
  if (row.operation && !["agent_turn", "runCoraAgent"].includes(row.operation)) {
    return row.operation.replace(/_/g, " ")
  }
  return row.feature
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function rowsToCsv(rows: CoraActivityRow[]): string {
  const header = [
    "id",
    "title",
    "feature",
    "module",
    "operation",
    "tool",
    "model",
    "credits",
    "tokens_total",
    "tokens_input",
    "tokens_output",
    "created_at",
  ]
  const lines = rows.map((row) =>
    [
      String(row.id),
      activityLabel(row),
      row.feature ?? "",
      row.module ?? "",
      row.operation ?? "",
      row.toolName ?? "",
      row.model ?? "",
      String(row.creditsCharged ?? 0),
      String(row.tokens?.total ?? 0),
      String(row.tokens?.input ?? 0),
      String(row.tokens?.output ?? 0),
      row.createdAt ?? "",
    ]
      .map((cell) => csvEscape(String(cell)))
      .join(","),
  )
  return [header.join(","), ...lines].join("\n")
}

/**
 * Full Cora usage history — search, retrieve, and page through detailed logs.
 * Linked from Settings and the compact membership usage panel.
 */
export function CoraUsageHistoryScreen() {
  const { session } = useSession()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const SN = useThemedStudentNative()
  const type = useNativeType()

  const role = session?.portal === "faculty" ? "instructor" : "student"
  const [query, setQuery] = useState("")
  const [committedQuery, setCommittedQuery] = useState("")
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<CoraActivityRow[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(
    async (nextPage: number, q: string, limit: number) => {
      if (!session) {
        return { activity: [] as CoraActivityRow[], page: 1, totalPages: 1, total: 0 }
      }
      return role === "instructor"
        ? coraCreditsApi.getInstructorActivity(session as FacultySession, {
            limit,
            page: nextPage,
            query: q || undefined,
          })
        : coraCreditsApi.getStudentActivity(session as StudentSession, {
            limit,
            page: nextPage,
            query: q || undefined,
          })
    },
    [session, role],
  )

  const load = useCallback(
    async (nextPage: number, q: string) => {
      if (!session) return
      setLoading(true)
      setError(null)
      try {
        const result = await fetchPage(nextPage, q, PAGE_SIZE)
        setRows(result.activity)
        setPage(result.page)
        setTotal(result.total)
        setTotalPages(result.totalPages)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load history")
        setRows([])
      } finally {
        setLoading(false)
      }
    },
    [session, fetchPage],
  )

  useEffect(() => {
    if (!session) return
    void load(1, committedQuery)
  }, [session, committedQuery, load])

  const canPrev = page > 1
  const canNext = page < totalPages
  const subtitle = useMemo(() => {
    if (total === 0) return "No matching events"
    return `${fmt(total)} event${total === 1 ? "" : "s"}`
  }, [total])

  const handleDownload = useCallback(async () => {
    if (!session || exporting) return
    setExporting(true)
    try {
      const collected: CoraActivityRow[] = []
      let nextPage = 1
      let pages = 1
      do {
        const result = await fetchPage(nextPage, committedQuery, EXPORT_PAGE_SIZE)
        collected.push(...result.activity)
        pages = result.totalPages
        nextPage += 1
      } while (nextPage <= pages && collected.length < EXPORT_MAX_ROWS)

      if (collected.length === 0) {
        Alert.alert("Nothing to download", "No matching Cora history events to export.")
        return
      }

      const csv = rowsToCsv(collected.slice(0, EXPORT_MAX_ROWS))
      const stamp = new Date().toISOString().slice(0, 10)
      const filename = `cora-usage-history-${stamp}.csv`
      const { cacheDirectory, writeAsStringAsync, EncodingType } = await import("expo-file-system/legacy")
      if (!cacheDirectory) throw new Error("Could not access file cache on this device.")
      const uri = `${cacheDirectory}${filename}`
      await writeAsStringAsync(uri, csv, { encoding: EncodingType.UTF8 })
      await Share.share({
        url: uri,
        title: "Cora usage history",
        message: Platform.OS === "android" ? csv.slice(0, 4000) : undefined,
      })
    } catch (e) {
      Alert.alert("Download failed", e instanceof Error ? e.message : "Could not export history.")
    } finally {
      setExporting(false)
    }
  }, [session, exporting, fetchPage, committedQuery])

  const header = (
    <NotetakerScreenHeader
      title="Cora history"
      fallbackHref="/settings"
      rightSlot={
        <Pressable
          onPress={() => void handleDownload()}
          disabled={exporting || loading}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Download Cora history"
          style={{ opacity: exporting || loading ? 0.45 : 1 }}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={tokens.accent} />
          ) : (
            <Ionicons name="download-outline" size={22} color={tokens.accent} />
          )}
        </Pressable>
      }
    />
  )

  if (!session || (session.portal !== "faculty" && session.portal !== "student")) {
    return (
      <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
        {header}
        <ModuleScreen disableTopInsetAdjustment contentStyle={styles.contentPad}>
          <Text style={[type.body, { color: SN.secondaryLabel }]}>
            Cora usage history is available for student and instructor accounts.
          </Text>
        </ModuleScreen>
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      {header}
      <ModuleScreen disableTopInsetAdjustment contentStyle={styles.contentPad}>
        <Text style={[type.caption, styles.intro, { color: SN.secondaryLabel }]}>
          Search and review detailed Cora usage logs. Credits and tokens for each event stay available for
          audit and retrieval.
        </Text>

        <View
          style={[
            styles.searchRow,
            { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={SN.secondaryLabel} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search tool, module, model…"
            placeholderTextColor={SN.tertiaryLabel}
            style={[type.body, styles.searchInput, { color: native.label }]}
            returnKeyType="search"
            onSubmitEditing={() => {
              setPage(1)
              setCommittedQuery(query.trim())
            }}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          <Pressable
            onPress={() => {
              setPage(1)
              setCommittedQuery(query.trim())
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Search history"
          >
            <Text style={[type.caption, { color: SN.accent, fontWeight: "700" }]}>Search</Text>
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          <Text style={[type.caption, { color: SN.secondaryLabel }]}>{subtitle}</Text>
          {committedQuery ? (
            <Pressable
              onPress={() => {
                setQuery("")
                setCommittedQuery("")
                setPage(1)
              }}
              hitSlop={8}
            >
              <Text style={[type.caption, { color: SN.accent }]}>Clear filter</Text>
            </Pressable>
          ) : null}
        </View>

        {error ? <Text style={[type.caption, { color: "#DC2626", marginBottom: 8 }]}>{error}</Text> : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={SN.accent} />
          </View>
        ) : rows.length === 0 ? (
          <Text style={[type.caption, { color: SN.secondaryLabel }]}>No matching activity.</Text>
        ) : (
          <ModuleSection>
            {rows.map((row, index) => (
              <ModuleListRow
                key={row.id}
                title={activityLabel(row)}
                subtitle={[
                  row.module || null,
                  publicCoraActivityLabel({ model: row.model, profile: row.profile }),
                  formatWhen(row.createdAt),
                ]
                  .filter(Boolean)
                  .join(" · ")}
                meta={`${row.creditsCharged} cr · ${fmt(row.tokens.total)} tok`}
                icon="document-text-outline"
                last={index === rows.length - 1}
              />
            ))}
          </ModuleSection>
        )}

        {total > 0 ? (
          <View style={styles.pager}>
            <Pressable
              onPress={() => void load(page - 1, committedQuery)}
              disabled={!canPrev || loading}
              style={[
                styles.pagerChip,
                {
                  borderColor: native.separator,
                  backgroundColor: native.secondaryGrouped,
                  opacity: canPrev ? 1 : 0.4,
                },
              ]}
            >
              <Ionicons name="chevron-back" size={16} color={SN.accent} />
              <Text style={[type.caption, { color: SN.accent, fontWeight: "600" }]}>Previous</Text>
            </Pressable>
            <Text style={[type.caption, { color: SN.secondaryLabel }]}>
              Page {page} of {totalPages}
            </Text>
            <Pressable
              onPress={() => void load(page + 1, committedQuery)}
              disabled={!canNext || loading}
              style={[
                styles.pagerChip,
                {
                  borderColor: native.separator,
                  backgroundColor: native.secondaryGrouped,
                  opacity: canNext ? 1 : 0.4,
                },
              ]}
            >
              <Text style={[type.caption, { color: SN.accent, fontWeight: "600" }]}>Next</Text>
              <Ionicons name="chevron-forward" size={16} color={SN.accent} />
            </Pressable>
          </View>
        ) : null}
      </ModuleScreen>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  contentPad: {
    paddingTop: 12,
  },
  intro: {
    marginBottom: 12,
    lineHeight: 18,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: { flex: 1, padding: 0, margin: 0 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  center: { paddingVertical: 28, alignItems: "center" },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 14,
    marginBottom: 24,
  },
  pagerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
})
