import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { ModuleScreen } from "../../modules/ModuleScreen"
import { useSession } from "../../../context/SessionProvider"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { hexToRgba } from "../../../constants/app-themes"
import { useNativeType, semanticSoft } from "../../../lib/themed-module-theme"
import { ApiError } from "../../../lib/api"
import {
  guestCareerApi,
  type ApplicationStatus,
  type ApplicationWorkspace,
  type CareerApplicationDetailResponse,
} from "../../../lib/guest-career-api"
import type { GuestSession } from "../../../lib/session"
import { CAREER_ACCENT, formatCareerDate, matchBandColor, matchBandLabel } from "./career-ui"

const STATUS_OPTIONS: ApplicationStatus[] = [
  "SAVED",
  "PREPARING",
  "READY",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
]

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  SAVED: "Saved",
  PREPARING: "Preparing",
  READY: "Ready",
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
}

function statusColor(status: ApplicationStatus, isDark: boolean): string {
  switch (status) {
    case "OFFER":
      return isDark ? "#4ade80" : "#16a34a"
    case "INTERVIEW":
    case "APPLIED":
      return isDark ? "#a78bfa" : CAREER_ACCENT
    case "READY":
      return isDark ? "#60a5fa" : "#1d4ed8"
    case "REJECTED":
    case "WITHDRAWN":
      return isDark ? "#f87171" : "#dc2626"
    default:
      return isDark ? "#fbbf24" : "#b45309"
  }
}

export function GuestApplicationsScreen() {
  const { session } = useSession()
  const guestSession = session?.portal === "guest" ? (session as GuestSession) : null
  const native = useThemedNative()

  const [applications, setApplications] = useState<ApplicationWorkspace[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!guestSession) return
    setLoadError("")
    try {
      const payload = await guestCareerApi.listApplications(guestSession)
      setApplications(payload.applications ?? [])
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not load applications.")
    }
  }, [guestSession])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  if (!guestSession) return null

  return (
    <View style={[styles.screenRoot, { backgroundColor: native.groupedBackground }]}>
      <View style={styles.body}>
        <ModuleScreen
          loading={loading}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          error={loadError || undefined}
          errorFeature="applications"
          onRetryError={handleRefresh}
          empty={!loading && applications.length === 0}
          emptyTitle="No applications yet"
          emptyBody="Run a résumé match or generate a cover letter — Cora tracks each opportunity here automatically."
          emptyIcon="briefcase-outline"
          disableTopInsetAdjustment
          stackedHeader
        >
          {applications.map((application) => (
            <ApplicationCard
              key={application.id}
              session={guestSession}
              application={application}
              expanded={expandedId === application.id}
              onToggle={() =>
                setExpandedId((current) => (current === application.id ? null : application.id))
              }
              onStatusChanged={(updated) =>
                setApplications((current) =>
                  current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
                )
              }
            />
          ))}
        </ModuleScreen>
      </View>
    </View>
  )
}

function ApplicationCard({
  session,
  application,
  expanded,
  onToggle,
  onStatusChanged,
}: {
  session: GuestSession
  application: ApplicationWorkspace
  expanded: boolean
  onToggle: () => void
  onStatusChanged: (application: ApplicationWorkspace) => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  const [detail, setDetail] = useState<CareerApplicationDetailResponse | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState("")
  const [savingStatus, setSavingStatus] = useState<ApplicationStatus | null>(null)
  const [statusNotice, setStatusNotice] = useState("")

  useEffect(() => {
    if (!expanded || detail || loadingDetail) return
    setLoadingDetail(true)
    setDetailError("")
    guestCareerApi
      .getApplicationDetail(session, application.id)
      .then(setDetail)
      .catch((err) => {
        setDetailError(err instanceof ApiError ? err.message : "Could not load details.")
      })
      .finally(() => setLoadingDetail(false))
  }, [expanded, detail, loadingDetail, session, application.id])

  const handleStatusChange = useCallback(
    async (status: ApplicationStatus) => {
      if (savingStatus || status === application.status) return
      setSavingStatus(status)
      setStatusNotice("")
      try {
        const payload = await guestCareerApi.updateApplicationStatus(session, application.id, status)
        onStatusChanged(payload.application ?? { ...application, status })
      } catch (err) {
        // The web API does not expose status updates yet — degrade gracefully.
        if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
          setStatusNotice("Status updates aren't available yet — coming soon.")
        } else {
          setStatusNotice(err instanceof ApiError ? err.message : "Could not update status.")
        }
      } finally {
        setSavingStatus(null)
      }
    },
    [savingStatus, application, session, onStatusChanged],
  )

  const opportunity = application.opportunity
  const title = opportunity?.title || "Opportunity"
  const company = opportunity?.organization || ""
  const pillColor = statusColor(application.status, tokens.isDark)
  const scoreColor =
    application.matchScore != null ? matchBandColor(application.matchBand, tokens.isDark) : native.tertiaryLabel

  const analysis = detail?.analysis ?? null
  const descriptionExcerpt = opportunity?.description
    ? opportunity.description.slice(0, 240) + (opportunity.description.length > 240 ? "…" : "")
    : ""
  const hasCoverLetter = application.coverLetterStatus !== "NOT_STARTED"

  return (
    <View
      style={[
        styles.card,
        tokens.cardShadow,
        { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
      ]}
    >
      <Pressable
        style={styles.cardHeader}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${title} application`}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={1}>
            {title}
          </Text>
          {company ? (
            <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
              {company}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <View style={[styles.statusPill, { backgroundColor: semanticSoft(pillColor, tokens.isDark, 0.16) }]}>
              <Text style={[type.footnote, { color: pillColor, fontWeight: "700" }]}>
                {STATUS_LABELS[application.status] ?? application.status}
              </Text>
            </View>
            {application.matchScore != null ? (
              <Text style={[type.footnote, { color: scoreColor, fontWeight: "700" }]}>
                {Math.round(application.matchScore)}/100
              </Text>
            ) : null}
            <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
              {formatCareerDate(application.updatedAt)}
            </Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={native.tertiaryLabel}
          style={{ marginTop: 4 }}
        />
      </Pressable>

      {expanded ? (
        <View style={[styles.detail, { borderTopColor: native.separator }]}>
          {loadingDetail ? (
            <ActivityIndicator size="small" color={native.tint} style={{ alignSelf: "flex-start" }} />
          ) : detailError ? (
            <Text style={[type.caption, { color: tokens.isDark ? "#f87171" : "#dc2626" }]}>{detailError}</Text>
          ) : (
            <>
              {descriptionExcerpt ? (
                <View style={{ gap: 4 }}>
                  <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700" }]}>Opportunity</Text>
                  <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>
                    {descriptionExcerpt}
                  </Text>
                </View>
              ) : null}

              <View style={styles.factRow}>
                <View style={styles.fact}>
                  <Text style={[type.footnote, { color: native.tertiaryLabel }]}>Latest analysis</Text>
                  <Text style={[type.body, { color: native.label, fontWeight: "700" }]}>
                    {analysis
                      ? `${Math.round(analysis.overallScore)}/100`
                      : application.matchScore != null
                        ? `${Math.round(application.matchScore)}/100`
                        : "—"}
                  </Text>
                  <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
                    {analysis
                      ? matchBandLabel(analysis.matchBand, analysis.overallScore)
                      : matchBandLabel(application.matchBand, application.matchScore)}
                  </Text>
                </View>
                <View style={[styles.factDivider, { backgroundColor: native.separator }]} />
                <View style={styles.fact}>
                  <Text style={[type.footnote, { color: native.tertiaryLabel }]}>Cover letter</Text>
                  <Ionicons
                    name={hasCoverLetter ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={hasCoverLetter ? tokens.success : native.tertiaryLabel}
                  />
                  <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
                    {hasCoverLetter ? (application.coverLetterStatus === "READY" ? "Ready" : "Draft") : "Not started"}
                  </Text>
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700" }]}>Status</Text>
                <View style={styles.statusGrid}>
                  {STATUS_OPTIONS.map((option) => {
                    const selected = option === application.status
                    const optionColor = statusColor(option, tokens.isDark)
                    return (
                      <Pressable
                        key={option}
                        style={[
                          styles.statusOption,
                          {
                            backgroundColor: selected
                              ? semanticSoft(optionColor, tokens.isDark, 0.18)
                              : native.fill,
                            borderColor: selected
                              ? hexToRgba(optionColor, tokens.isDark ? 0.44 : 0.3)
                              : native.separator,
                          },
                        ]}
                        onPress={() => void handleStatusChange(option)}
                        disabled={savingStatus !== null}
                        accessibilityRole="button"
                        accessibilityLabel={`Set status ${STATUS_LABELS[option]}`}
                      >
                        {savingStatus === option ? (
                          <ActivityIndicator size="small" color={optionColor} />
                        ) : (
                          <Text
                            style={[
                              type.footnote,
                              { color: selected ? optionColor : native.secondaryLabel, fontWeight: "700" },
                            ]}
                          >
                            {STATUS_LABELS[option]}
                          </Text>
                        )}
                      </Pressable>
                    )
                  })}
                </View>
                {statusNotice ? (
                  <Text style={[type.footnote, { color: native.tertiaryLabel }]}>{statusNotice}</Text>
                ) : null}
              </View>
            </>
          )}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  body: { flex: 1 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    flexWrap: "wrap",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  detail: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 14,
  },
  factRow: { flexDirection: "row", alignItems: "stretch" },
  fact: { flex: 1, alignItems: "center", gap: 3 },
  factDivider: { width: StyleSheet.hairlineWidth, marginHorizontal: 10 },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusOption: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 76,
    alignItems: "center",
  },
})
