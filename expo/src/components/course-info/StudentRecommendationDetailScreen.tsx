import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { AppAlert } from "../../lib/app-alert"
import { useSession } from "../../context/SessionProvider"
import { ApiError, studentApi, type StudentRecommendationDetail } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import {
  courseInfoApi,
  formatListDate,
  purposeLabel,
} from "../../lib/course-info-api"
import {
  buildRecommendationPdfSource,
  hasRecommendationLetterPdf,
  type RecommendationPdfSource,
} from "../../lib/recommendation-letter-url"
import { InfoSectionCard, StatusBadge, statusTone, useCourseInfoTheme } from "./course-info-shared"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { COURSE_INFO_ACTION } from "../../lib/course-info-color-theme"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { GuestLetterPdfSheet } from "../guest/GuestLetterPdfSheet"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function canWithdrawRequest(detail: StudentRecommendationDetail): boolean {
  const status = String(detail.request.status)
  const draftCount = detail.drafts?.length ?? detail.request.draft_count ?? 0
  return status === "requested" || status === "info_requested" || (status === "approved" && draftCount === 0)
}

export function StudentRecommendationDetailScreen({ requestId }: { requestId: number }) {
  const session = useStudentSession()
  const router = useRouter()
  const theme = useCourseInfoTheme()
  const native = useThemedNative()
  const type = useNativeType()
  const pad = useModuleScrollContentPadding()
  const [detail, setDetail] = useState<StudentRecommendationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [pdfSource, setPdfSource] = useState<RecommendationPdfSource | null>(null)
  const [pdfOpen, setPdfOpen] = useState(false)

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const next = await courseInfoApi.getRecommendationDetail(session, requestId)
      setDetail(next)
    } catch (err) {
      setDetail(null)
      setError(err instanceof ApiError ? err.message : "Request not found.")
    }
  }, [session, requestId])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load])

  const req = detail?.request
  const showPdf = Boolean(detail && hasRecommendationLetterPdf(detail.files, req))

  useEffect(() => {
    let cancelled = false
    if (!session || !showPdf) {
      setPdfSource(null)
      return
    }
    void buildRecommendationPdfSource(session, requestId)
      .then((source) => {
        if (!cancelled) setPdfSource(source)
      })
      .catch(() => {
        if (!cancelled) setPdfSource(null)
      })
    return () => {
      cancelled = true
    }
  }, [session, showPdf, requestId])

  const withdraw = () => {
    if (!session || !detail || !canWithdrawRequest(detail)) return
    AppAlert.alert("Withdraw request?", "Your instructor will no longer process this letter request.", [
      { text: "Keep request", style: "cancel" },
      {
        text: "Withdraw",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setBusy(true)
            try {
              await studentApi.withdrawRecommendation(session, requestId)
              router.back()
            } catch (err) {
              AppAlert.alert("Error", err instanceof ApiError ? err.message : "Could not withdraw.")
            } finally {
              setBusy(false)
            }
          })()
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </View>
    )
  }

  if (error || !req) {
    return (
      <View style={styles.center}>
        <Text style={type.secondary}>{error || "Request not found."}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: theme.primary }}>Go back</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: native.groupedBackground }}
        contentContainerStyle={[styles.content, pad]}
      >
        <Pressable onPress={() => router.back()}>
          <Text style={[type.caption, { color: theme.primary }]}>← Recommendation Letters</Text>
        </Pressable>

        <InfoSectionCard title={purposeLabel(req.purpose)} icon="document-text-outline">
          <View style={styles.head}>
            <Text style={type.bodyEmphasis}>{req.instructor_name ?? "Instructor"}</Text>
            <StatusBadge label={req.status.replace(/_/g, " ")} tone={statusTone(req.status)} />
          </View>
          {req.course_code ? (
            <Text style={type.caption}>{req.course_code}</Text>
          ) : null}
          <Text style={type.caption}>
            Deadline: {req.deadline ? formatListDate(req.deadline) : "None"}
          </Text>
          {req.student_request_description ? (
            <Text style={[type.secondary, styles.desc]}>{req.student_request_description}</Text>
          ) : null}
        </InfoSectionCard>

        {showPdf && pdfSource ? (
          <Pressable
            onPress={() => setPdfOpen(true)}
            style={[styles.cta, { backgroundColor: COURSE_INFO_ACTION.fill }]}
          >
            <Text style={[type.bodyEmphasis, { color: COURSE_INFO_ACTION.ink }]}>Preview letter PDF</Text>
          </Pressable>
        ) : null}

        {detail && canWithdrawRequest(detail) ? (
          <Pressable disabled={busy} onPress={withdraw} style={styles.withdraw}>
            <Text style={[type.bodyEmphasis, { color: theme.primary }]}>
              {busy ? "Withdrawing…" : "Withdraw request"}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {pdfSource ? (
        <GuestLetterPdfSheet
          visible={pdfOpen}
          pdfSource={pdfSource}
          onClose={() => setPdfOpen(false)}
        />
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  backBtn: { marginTop: 12 },
  content: { padding: 16, gap: 16 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  desc: { marginTop: 8, lineHeight: 20 },
  cta: { borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  withdraw: { alignItems: "center", paddingVertical: 8 },
})
