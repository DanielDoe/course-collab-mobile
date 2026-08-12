import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
import { ModuleScreen, ModuleSection } from "../modules/ModuleScreen"
import { useSession } from "../../context/SessionProvider"
import { useThemedNative } from "../../context/AppearanceProvider"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import {
  courseEvaluationApi,
  evaluationToSurvey,
  resolveProofUrl,
  type CourseEvaluation,
  type PendingProofFile,
} from "../../lib/course-evaluation-api"
import {
  AI_TUTOR_USAGE_OPTIONS,
  FAVORITE_FEATURE_OPTIONS,
  FEATURE_TO_IMPROVE_OPTIONS,
  INSTRUCTOR_CLARITY_LIKERT,
  LIKERT_5,
  PASS_EXPECTATION_GRADE_OPTIONS,
  PLATFORM_HELPFULNESS_LIKERT,
  SURVEY_OTHER_OPTION,
  WORKLOAD_OPTIONS,
  emptySurveyFormState,
  likertLabel,
  validateSurveyForm,
  type SurveyFormState,
} from "../../constants/course-evaluation-survey"
import { NATIVE, SYSTEM } from "../../constants/faculty-native-theme"
import { semanticSoft, useNativeType } from "../../lib/themed-module-theme"
import { StatusBadge, useCourseInfoTheme } from "./course-info-shared"
import { COURSE_INFO_ACTION, COURSE_INFO_EVALUATION } from "../../lib/course-info-color-theme"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { useAppThemeTokens } from "../../context/AppearanceProvider"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

function formatWhen(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function statusMeta(status: string, credits: number): {
  tone: "success" | "warning" | "danger" | "neutral"
  icon: keyof typeof Ionicons.glyphMap
  title: string
  body: string
} {
  const s = status.toLowerCase()
  if (s === "approved") {
    return {
      tone: "success",
      icon: "checkmark-circle",
      title: "Approved",
      body: `${credits} engagement credits earned`,
    }
  }
  if (s === "pending") {
    return {
      tone: "warning",
      icon: "time",
      title: "Awaiting acknowledgment",
      body: "Your instructor will review your Canvas proof",
    }
  }
  if (s === "rejected") {
    return {
      tone: "danger",
      icon: "refresh-circle",
      title: "Returned for revision",
      body: "Update your responses or proof, then resubmit",
    }
  }
  return {
    tone: "neutral",
    icon: "clipboard-outline",
    title: status,
    body: "Complete the steps below to earn engagement credits",
  }
}

function ChoiceRow({
  label,
  selected,
  onPress,
  last,
  multi,
}: {
  label: string
  selected: boolean
  onPress: () => void
  last?: boolean
  multi?: boolean
}) {
  const theme = useCourseInfoTheme()
  const native = useThemedNative()
  const type = useNativeType()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={multi ? "checkbox" : "radio"}
      accessibilityState={{ selected, checked: selected }}
      android_ripple={{ color: theme.soft }}
      style={({ pressed }) => [
        styles.choiceRow,
        { borderBottomColor: native.separator },
        last && styles.choiceRowLast,
        pressed && { opacity: NATIVE.pressedOpacity },
      ]}
    >
      <Ionicons
        name={
          multi
            ? selected
              ? "checkbox"
              : "square-outline"
            : selected
              ? "radio-button-on"
              : "radio-button-off"
        }
        size={20}
        color={selected ? theme.primary : native.tertiaryLabel}
      />
      <Text
        style={[
          type.body,
          styles.choiceLabel,
          { color: native.label },
          selected && { fontWeight: "600", color: theme.primary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function featureIcon(name: string): keyof typeof Ionicons.glyphMap {
  const key = name.toLowerCase()
  if (key.includes("ai tutor")) return "sparkles-outline"
  if (key.includes("practice")) return "fitness-outline"
  if (key.includes("codebench")) return "code-slash-outline"
  if (key.includes("playground")) return "game-controller-outline"
  if (key.includes("lecture")) return "easel-outline"
  if (key.includes("homework")) return "document-text-outline"
  if (key.includes("quiz")) return "help-circle-outline"
  if (key.includes("attendance")) return "checkmark-done-outline"
  if (key.includes("classroom") || key.includes("points")) return "trophy-outline"
  if (key.includes("trade")) return "swap-horizontal-outline"
  if (key.includes("announce")) return "megaphone-outline"
  if (key.includes("calendar")) return "calendar-outline"
  if (key.includes("grade")) return "stats-chart-outline"
  if (key.includes("team") || key.includes("project")) return "people-outline"
  if (key.includes("mobile")) return "phone-portrait-outline"
  if (key.includes("notif")) return "notifications-outline"
  if (key.includes("performance") || key.includes("speed")) return "speedometer-outline"
  if (key.includes("interface") || key.includes("ui")) return "color-palette-outline"
  if (key.includes("analytics")) return "analytics-outline"
  return "pricetag-outline"
}

function LikertDots({ value, max = 5 }: { value?: number | null; max?: number }) {
  const theme = useCourseInfoTheme()
  const native = useThemedNative()
  const filled = Math.max(0, Math.min(max, Number(value ?? 0)))
  return (
    <View style={styles.likertDots}>
      {Array.from({ length: max }, (_, i) => (
        <View
          key={i}
          style={[
            styles.likertDot,
            {
              backgroundColor: i < filled ? theme.primary : native.fill,
              borderColor: i < filled ? theme.primary : native.separator,
            },
          ]}
        />
      ))}
    </View>
  )
}

function ResponseRow({
  icon,
  label,
  value,
  last,
  accessory,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value?: string | null
  last?: boolean
  accessory?: ReactNode
}) {
  const theme = useCourseInfoTheme()
  const type = useNativeType()
  const native = useThemedNative()
  return (
    <View
      style={[
        styles.responseRow,
        { borderBottomColor: native.separator },
        last && styles.choiceRowLast,
      ]}
    >
      <View style={[styles.responseIcon, { backgroundColor: theme.soft }]}>
        <Ionicons name={icon} size={18} color={theme.primary} />
      </View>
      <View style={styles.responseCopy}>
        <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>{label}</Text>
        <Text style={[type.body, { color: native.label, lineHeight: 21 }]}>{value?.trim() || "—"}</Text>
        {accessory}
      </View>
    </View>
  )
}

function MetricTile({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  hint?: string
  accent: string
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const tokens = useAppThemeTokens()
  return (
    <View
      style={[
        styles.metricTile,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: native.separator,
        },
      ]}
    >
      <View style={[styles.metricIcon, { backgroundColor: semanticSoft(accent, tokens.isDark) }]}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <Text style={[type.footnote, { color: native.secondaryLabel, fontWeight: "600" }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.metricValue, { color: native.label }]} numberOfLines={1}>
        {value}
      </Text>
      {hint ? (
        <Text style={[type.footnote, { color: native.tertiaryLabel }]} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  )
}

function GradePills({
  value,
  onChange,
}: {
  value: string
  onChange: (grade: string) => void
}) {
  const theme = useCourseInfoTheme()
  const native = useThemedNative()
  const type = useNativeType()
  return (
    <View style={styles.gradeRow}>
      {PASS_EXPECTATION_GRADE_OPTIONS.map((grade) => {
        const selected = value === grade
        return (
          <Pressable
            key={grade}
            onPress={() => onChange(grade)}
            android_ripple={{ color: theme.soft }}
            style={({ pressed }) => [
              styles.gradePill,
              {
                borderColor: selected ? theme.primary : native.separator,
                backgroundColor: selected ? theme.soft : native.fill,
                opacity: pressed ? NATIVE.pressedOpacity : 1,
              },
            ]}
          >
            <Text
              style={[
                type.bodyEmphasis,
                { color: selected ? theme.primary : native.label },
              ]}
            >
              {grade}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function CourseEvaluationScreen() {
  const session = useStudentSession()
  const theme = useCourseInfoTheme()
  const native = useThemedNative()
  const type = useNativeType()
  const tokens = useAppThemeTokens()
  const isDark = tokens.isDark

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [evaluation, setEvaluation] = useState<CourseEvaluation | null>(null)
  const [engagementCredits, setEngagementCredits] = useState(50)
  const [survey, setSurvey] = useState<SurveyFormState>(emptySurveyFormState)
  const [selfAssessedGrade, setSelfAssessedGrade] = useState("")
  const [files, setFiles] = useState<PendingProofFile[]>([])
  const [showBonus, setShowBonus] = useState(false)

  const load = useCallback(async () => {
    if (!session) return
    setError("")
    try {
      const data = await courseEvaluationApi.get(session)
      setEngagementCredits(data.engagementCreditsOnApproval ?? 50)
      if (data.evaluation) {
        setEvaluation(data.evaluation)
        setSurvey(evaluationToSurvey(data.evaluation))
        setSelfAssessedGrade(data.evaluation.self_assessed_letter_grade || "")
      } else {
        setEvaluation(null)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load course evaluation.")
    }
  }, [session])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useNotificationModuleRefresh("course-evaluation", onRefresh)

  const locked =
    evaluation?.status === "approved" || evaluation?.status === "pending"
  const showSubmissionDetail =
    Boolean(evaluation) &&
    (evaluation?.status === "pending" ||
      evaluation?.status === "approved" ||
      evaluation?.status === "rejected")

  const existingProofs = evaluation?.proofs ?? []
  const totalProofCount = files.length + existingProofs.length

  const sectionLabel = useMemo(() => {
    if (!session?.section || session.section === "ALL") return null
    return `Section ${session.section}`
  }, [session?.section])

  const status = useMemo(() => {
    if (!evaluation?.status) {
      return {
        tone: "neutral" as const,
        icon: "clipboard-outline" as const,
        title: "Ready to submit",
        body: `Canvas evaluation + CourseCollab feedback · ${engagementCredits} credits when approved`,
      }
    }
    return statusMeta(evaluation.status, engagementCredits)
  }, [evaluation?.status, engagementCredits])

  // Theme-aligned chrome for approved/ready; keep semantic colors only for pending/rejected.
  // Use a stronger accent wash (not near-white theme.soft) so the hero card keeps contrast.
  const statusColor =
    status.tone === "warning"
      ? SYSTEM.orange.color
      : status.tone === "danger"
        ? NATIVE.destructive
        : theme.primary
  const statusSurface = semanticSoft(statusColor, isDark, isDark ? 0.28 : 0.16)
  const statusBorder = hexBorder(statusColor, isDark)

  const patchSurvey = <K extends keyof SurveyFormState>(key: K, value: SurveyFormState[K]) => {
    setSurvey((prev) => ({ ...prev, [key]: value }))
  }

  const toggleFavorite = (feature: string) => {
    setSurvey((prev) => {
      const has = prev.favoriteFeatures.includes(feature)
      const favoriteFeatures = has
        ? prev.favoriteFeatures.filter((f) => f !== feature)
        : [...prev.favoriteFeatures, feature]
      return {
        ...prev,
        favoriteFeatures,
        favoriteFeaturesOther: favoriteFeatures.includes(SURVEY_OTHER_OPTION)
          ? prev.favoriteFeaturesOther
          : "",
      }
    })
  }

  const appendFiles = (picked: PendingProofFile[]) => {
    if (picked.length === 0) return
    setFiles((prev) => [...prev, ...picked].slice(0, 10))
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
      type: ["application/pdf", "image/*"],
    })
    if (result.canceled || !result.assets?.length) return
    appendFiles(
      result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name ?? `proof-${Date.now()}.pdf`,
        mime: asset.mimeType ?? "application/pdf",
      })),
    )
  }

  async function pickPhoto(fromCamera: boolean) {
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) {
        AppAlert.alert("Camera access", "Allow camera access to photograph your Canvas evaluation proof.")
        return
      }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        AppAlert.alert("Photos access", "Allow photo library access to upload proof images.")
        return
      }
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: false })
      : await ImagePicker.launchImageLibraryAsync({
          quality: 0.85,
          allowsEditing: false,
          mediaTypes: ["images"],
          allowsMultipleSelection: true,
          selectionLimit: 10,
        })

    if (result.canceled || !result.assets?.length) return
    appendFiles(
      result.assets.map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName ?? `proof-${Date.now()}-${index}.jpg`,
        mime: asset.mimeType ?? "image/jpeg",
      })),
    )
  }

  async function submit() {
    if (!session || locked) return
    const validationError = validateSurveyForm(survey, selfAssessedGrade, totalProofCount)
    if (validationError) {
      setError(validationError)
      return
    }
    setSubmitting(true)
    setError("")
    setMessage("")
    try {
      const result = await courseEvaluationApi.submit(session, {
        survey,
        selfAssessedGrade,
        files,
      })
      setFiles([])
      setEvaluation(result.evaluation)
      setSurvey(evaluationToSurvey(result.evaluation))
      setSelfAssessedGrade(result.evaluation.self_assessed_letter_grade || selfAssessedGrade)
      setMessage("Submitted for review. Your instructor will acknowledge your Canvas proof.")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit evaluation.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!session) {
    return (
      <View style={[styles.center, { backgroundColor: native.groupedBackground }]}>
        <Text style={[type.caption, { color: native.secondaryLabel }]}>Student session required.</Text>
      </View>
    )
  }

  return (
    <ModuleScreen
      loading={loading}
      error={error}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Status hero — theme soft/accent for approved; semantic only for pending/rejected */}
      <View
        style={[
          styles.statusCard,
          {
            backgroundColor: statusSurface,
            borderColor: statusBorder,
          },
        ]}
      >
        <View style={styles.statusTop}>
          <View
            style={[
              styles.statusIcon,
              { backgroundColor: semanticSoft(statusColor, isDark, isDark ? 0.35 : 0.22) },
            ]}
          >
            <Ionicons name={status.icon} size={24} color={statusColor} />
          </View>
          <View style={styles.statusCopy}>
            <View style={styles.statusTitleRow}>
              <Text style={[type.bodyEmphasis, { color: native.label, flex: 1, fontSize: 17 }]}>
                {status.title}
              </Text>
              {evaluation?.status ? (
                status.tone === "warning" || status.tone === "danger" ? (
                  <StatusBadge label={evaluation.status} tone={status.tone} />
                ) : (
                  <View
                    style={[
                      styles.themeBadge,
                      {
                        backgroundColor: native.secondaryGrouped,
                        borderColor: statusBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.themeBadgeText, { color: theme.primary }]}>
                      {evaluation.status}
                    </Text>
                  </View>
                )
              ) : null}
            </View>
            <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>
              {status.body}
            </Text>
          </View>
        </View>
        <View style={styles.statusMetaRow}>
          <View style={[styles.ecPill, { backgroundColor: native.secondaryGrouped }]}>
            <Ionicons name="flash" size={14} color={COURSE_INFO_EVALUATION.ecFlash} />
            <Text style={[type.caption, { color: native.label, fontWeight: "700" }]}>
              {engagementCredits} EC
            </Text>
            <Text style={[type.footnote, { color: native.secondaryLabel }]}>
              {evaluation?.status === "approved" ? "earned" : "on approval"}
            </Text>
          </View>
          {sectionLabel ? (
            <View style={[styles.sectionPill, { backgroundColor: native.secondaryGrouped }]}>
              <Ionicons name="school-outline" size={13} color={theme.primary} />
              <Text style={[type.footnote, { color: theme.primary, fontWeight: "700" }]}>
                {sectionLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {evaluation?.status === "rejected" && evaluation.instructor_note ? (
        <View
          style={[
            styles.noteCard,
            {
              backgroundColor: semanticSoft(NATIVE.destructive, isDark),
              borderColor: hexBorder(NATIVE.destructive, isDark),
            },
          ]}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={NATIVE.destructive} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[type.caption, { color: NATIVE.destructive, fontWeight: "700" }]}>
              Instructor note
            </Text>
            <Text style={[type.secondary, { color: native.label, lineHeight: 20 }]}>
              {evaluation.instructor_note}
            </Text>
          </View>
        </View>
      ) : null}

      {message ? (
        <View
          style={[
            styles.noteCard,
            {
              backgroundColor: semanticSoft(theme.primary, isDark, isDark ? 0.28 : 0.16),
              borderColor: hexBorder(theme.primary, isDark),
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
          <Text style={[type.caption, { color: native.label, flex: 1, lineHeight: 18 }]}>{message}</Text>
        </View>
      ) : null}

      {showSubmissionDetail && evaluation ? (
        <>
          <View style={styles.metricsRow}>
            <MetricTile
              icon="star"
              label="Overall"
              value={likertLabel(LIKERT_5, evaluation.course_rating)}
              hint={
                evaluation.course_rating != null && evaluation.course_rating > 0
                  ? `${evaluation.course_rating}/5`
                  : undefined
              }
              accent={COURSE_INFO_EVALUATION.overall}
            />
            <MetricTile
              icon="heart"
              label="Recommend"
              value={evaluation.nps_score != null ? `${evaluation.nps_score}` : "—"}
              hint={evaluation.nps_score != null ? "NPS / 10" : "Not rated"}
              accent={COURSE_INFO_EVALUATION.recommend}
            />
            <MetricTile
              icon="ribbon-outline"
              label="Pass Goal"
              value={evaluation.self_assessed_letter_grade || "—"}
              hint="Your target"
              accent={COURSE_INFO_EVALUATION.passGoal}
            />
          </View>

          {evaluation.nps_score != null ? (
            <View
              style={[
                styles.npsCard,
                {
                  backgroundColor: native.secondaryGrouped,
                  borderColor: native.separator,
                },
              ]}
            >
              <View style={styles.npsCardHead}>
                <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700" }]}>
                  Recommendation Score
                </Text>
                <Text style={[type.bodyEmphasis, { color: COURSE_INFO_EVALUATION.npsBar }]}>
                  {evaluation.nps_score}/10
                </Text>
              </View>
              <View style={[styles.npsTrack, { backgroundColor: native.fill }]}>
                <View
                  style={[
                    styles.npsFill,
                    {
                      width: `${Math.min(100, Math.max(0, evaluation.nps_score) * 10)}%`,
                      backgroundColor: COURSE_INFO_EVALUATION.npsBar,
                    },
                  ]}
                />
              </View>
              <Text style={[type.footnote, { color: native.tertiaryLabel }]}>
                How likely you are to recommend CourseCollab
              </Text>
            </View>
          ) : null}

          <ModuleSection title="Ratings">
            <ResponseRow
              icon="school-outline"
              label="Overall course experience"
              value={likertLabel(LIKERT_5, evaluation.course_rating)}
              accessory={<LikertDots value={evaluation.course_rating} />}
            />
            <ResponseRow
              icon="rocket-outline"
              label="CourseCollab improved learning"
              value={likertLabel(PLATFORM_HELPFULNESS_LIKERT, evaluation.platform_helpfulness)}
              accessory={<LikertDots value={evaluation.platform_helpfulness} />}
              last={
                !(
                  (evaluation.instructor_clarity != null && evaluation.instructor_clarity > 0) ||
                  evaluation.workload ||
                  evaluation.ai_tutor_usage
                )
              }
            />
            {evaluation.instructor_clarity != null && evaluation.instructor_clarity > 0 ? (
              <ResponseRow
                icon="chatbubbles-outline"
                label="Instructor explained clearly"
                value={likertLabel(INSTRUCTOR_CLARITY_LIKERT, evaluation.instructor_clarity)}
                accessory={<LikertDots value={evaluation.instructor_clarity} />}
                last={!evaluation.workload && !evaluation.ai_tutor_usage}
              />
            ) : null}
            {evaluation.workload ? (
              <ResponseRow
                icon="barbell-outline"
                label="Workload"
                value={evaluation.workload}
                last={!evaluation.ai_tutor_usage}
              />
            ) : null}
            {evaluation.ai_tutor_usage ? (
              <ResponseRow
                icon="sparkles-outline"
                label="AI Tutor usage"
                value={evaluation.ai_tutor_usage}
                last
              />
            ) : null}
          </ModuleSection>

          <ModuleSection title="Features">
            <View style={styles.featureBlock}>
              <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700" }]}>
                Favorites
              </Text>
              <View style={styles.tagWrap}>
                {(evaluation.favorite_features ?? []).length === 0 ? (
                  <Text style={[type.body, { color: native.label }]}>—</Text>
                ) : (
                  (evaluation.favorite_features ?? []).map((f) => {
                    const label =
                      f === SURVEY_OTHER_OPTION && evaluation.favorite_features_other?.trim()
                        ? `Other — ${evaluation.favorite_features_other.trim()}`
                        : f
                    return (
                      <View
                        key={f}
                        style={[
                          styles.featureChip,
                          { backgroundColor: theme.soft, borderColor: theme.softBorder ?? theme.soft },
                        ]}
                      >
                        <Ionicons name={featureIcon(f)} size={13} color={theme.primary} />
                        <Text style={[type.caption, { color: theme.primary, fontWeight: "700" }]}>
                          {label}
                        </Text>
                      </View>
                    )
                  })
                )}
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: native.separator }]} />
            <ResponseRow
              icon="construct-outline"
              label="Improve first"
              value={
                evaluation.feature_to_improve === SURVEY_OTHER_OPTION &&
                evaluation.feature_to_improve_other?.trim()
                  ? `Other — ${evaluation.feature_to_improve_other.trim()}`
                  : evaluation.feature_to_improve || "—"
              }
              last={!evaluation.missing_features?.trim()}
            />
            {evaluation.missing_features?.trim() ? (
              <ResponseRow
                icon="add-circle-outline"
                label="Missing features"
                value={evaluation.missing_features}
                last
              />
            ) : null}
          </ModuleSection>

          {evaluation.improvement_suggestions?.trim() ? (
            <ModuleSection title="Your Feedback">
              <View style={styles.quoteBlock}>
                <View style={[styles.quoteMark, { backgroundColor: theme.soft }]}>
                  <Ionicons name="chatbox-ellipses" size={18} color={theme.primary} />
                </View>
                <Text style={[type.body, styles.quoteText, { color: native.label }]}>
                  {evaluation.improvement_suggestions}
                </Text>
              </View>
            </ModuleSection>
          ) : null}

          <ModuleSection
            title="Canvas Proof"
            footer={
              [
                formatWhen(evaluation.submitted_at)
                  ? `Submitted ${formatWhen(evaluation.submitted_at)}`
                  : null,
                formatWhen(evaluation.reviewed_at)
                  ? `Reviewed ${formatWhen(evaluation.reviewed_at)}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ") || undefined
            }
          >
            {existingProofs.length === 0 ? (
              <View style={styles.emptyProof}>
                <View style={[styles.emptyProofIcon, { backgroundColor: theme.soft }]}>
                  <Ionicons name="images-outline" size={22} color={theme.primary} />
                </View>
                <Text style={[type.secondary, { color: native.secondaryLabel, textAlign: "center" }]}>
                  No proof files on record.
                </Text>
              </View>
            ) : (
              existingProofs.map((proof, index) => {
                const uri = resolveProofUrl(proof.url)
                const isImage = (proof.mime ?? "").startsWith("image/")
                return (
                  <Pressable
                    key={proof.id}
                    onPress={() => void Linking.openURL(uri)}
                    android_ripple={{ color: theme.soft }}
                    style={({ pressed }) => [
                      styles.fileRow,
                      { borderBottomColor: native.separator },
                      index === existingProofs.length - 1 && styles.choiceRowLast,
                      pressed && { opacity: NATIVE.pressedOpacity },
                    ]}
                  >
                    {isImage ? (
                      <Image source={{ uri }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.fileIcon, { backgroundColor: theme.soft }]}>
                        <Ionicons name="document-text-outline" size={18} color={theme.primary} />
                      </View>
                    )}
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[type.body, { color: native.label }]} numberOfLines={1}>
                        {proof.file_name || "Proof file"}
                      </Text>
                      <Text style={[type.footnote, { color: native.secondaryLabel }]}>Tap to open</Text>
                    </View>
                    <Ionicons name="open-outline" size={16} color={native.tertiaryLabel} />
                  </Pressable>
                )
              })
            )}
          </ModuleSection>
        </>
      ) : null}

      {!locked ? (
        <>
          <ModuleSection
            title="1. Ratings"
            footer="Required — how the course and CourseCollab felt overall."
          >
            <Text style={[type.caption, styles.questionTitle, { color: native.secondaryLabel }]}>
              Overall course experience
            </Text>
            {LIKERT_5.map((opt, i) => (
              <ChoiceRow
                key={opt.value}
                label={opt.label}
                selected={survey.overallExperience === opt.value}
                onPress={() => patchSurvey("overallExperience", opt.value)}
                last={i === LIKERT_5.length - 1}
              />
            ))}
            <View style={[styles.divider, { backgroundColor: native.separator }]} />
            <Text style={[type.caption, styles.questionTitle, { color: native.secondaryLabel }]}>
              CourseCollab improved learning
            </Text>
            {PLATFORM_HELPFULNESS_LIKERT.map((opt, i) => (
              <ChoiceRow
                key={opt.value}
                label={opt.label}
                selected={survey.platformHelpfulness === opt.value}
                onPress={() => patchSurvey("platformHelpfulness", opt.value)}
                last={i === PLATFORM_HELPFULNESS_LIKERT.length - 1}
              />
            ))}
          </ModuleSection>

          <ModuleSection
            title="2. Features"
            footer="Pick favorites and what we should improve first."
          >
            <Text style={[type.caption, styles.questionTitle, { color: native.secondaryLabel }]}>
              Favorite features
            </Text>
            {FAVORITE_FEATURE_OPTIONS.map((opt, i) => (
              <ChoiceRow
                key={opt}
                label={opt}
                multi
                selected={survey.favoriteFeatures.includes(opt)}
                onPress={() => toggleFavorite(opt)}
                last={
                  i === FAVORITE_FEATURE_OPTIONS.length - 1 &&
                  !survey.favoriteFeatures.includes(SURVEY_OTHER_OPTION)
                }
              />
            ))}
            {survey.favoriteFeatures.includes(SURVEY_OTHER_OPTION) ? (
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: native.separator,
                    color: native.label,
                    backgroundColor: native.fill,
                  },
                ]}
                placeholder="Describe other favorite feature"
                placeholderTextColor={native.tertiaryLabel}
                value={survey.favoriteFeaturesOther}
                onChangeText={(v) => patchSurvey("favoriteFeaturesOther", v)}
              />
            ) : null}

            <View style={[styles.divider, { backgroundColor: native.separator }]} />
            <Text style={[type.caption, styles.questionTitle, { color: native.secondaryLabel }]}>
              Improve first
            </Text>
            {FEATURE_TO_IMPROVE_OPTIONS.map((opt, i) => (
              <ChoiceRow
                key={opt}
                label={opt}
                selected={survey.featureToImprove === opt}
                onPress={() =>
                  setSurvey((prev) => ({
                    ...prev,
                    featureToImprove: opt,
                    featureToImproveOther:
                      opt === SURVEY_OTHER_OPTION ? prev.featureToImproveOther : "",
                  }))
                }
                last={
                  i === FEATURE_TO_IMPROVE_OPTIONS.length - 1 &&
                  survey.featureToImprove !== SURVEY_OTHER_OPTION
                }
              />
            ))}
            {survey.featureToImprove === SURVEY_OTHER_OPTION ? (
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: native.separator,
                    color: native.label,
                    backgroundColor: native.fill,
                  },
                ]}
                placeholder="Describe what to improve"
                placeholderTextColor={native.tertiaryLabel}
                value={survey.featureToImproveOther}
                onChangeText={(v) => patchSurvey("featureToImproveOther", v)}
              />
            ) : null}
          </ModuleSection>

          <ModuleSection title="3. Feedback" footer="Open feedback needs at least 10 characters.">
            <View style={styles.paddedBlock}>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    borderColor: native.separator,
                    color: native.label,
                    backgroundColor: native.fill,
                  },
                ]}
                placeholder="What worked well? What should we improve?"
                placeholderTextColor={native.tertiaryLabel}
                value={survey.openFeedback}
                onChangeText={(v) => patchSurvey("openFeedback", v)}
                multiline
                textAlignVertical="top"
              />
              <Text style={[type.caption, styles.questionTitle, { color: native.secondaryLabel }]}>
                Pass expectation grade
              </Text>
              <GradePills value={selfAssessedGrade} onChange={setSelfAssessedGrade} />
            </View>
          </ModuleSection>

          <ModuleSection
            title="4. Canvas Proof"
            footer={
              existingProofs.length > 0
                ? `${existingProofs.length} file(s) already on record — add new ones only if needed.`
                : "Upload a screenshot or PDF of your completed Canvas course evaluation."
            }
          >
            <View style={styles.proofActions}>
              <Pressable
                style={[styles.proofAction, { backgroundColor: theme.soft }]}
                onPress={() => void pickDocument()}
                disabled={files.length >= 10}
              >
                <Ionicons name="document-attach-outline" size={18} color={theme.primary} />
                <Text style={[type.caption, { color: theme.primary, fontWeight: "700" }]}>PDF / File</Text>
              </Pressable>
              <Pressable
                style={[styles.proofAction, { backgroundColor: theme.soft }]}
                onPress={() => void pickPhoto(true)}
                disabled={files.length >= 10}
              >
                <Ionicons name="camera-outline" size={18} color={theme.primary} />
                <Text style={[type.caption, { color: theme.primary, fontWeight: "700" }]}>Camera</Text>
              </Pressable>
              <Pressable
                style={[styles.proofAction, { backgroundColor: theme.soft }]}
                onPress={() => void pickPhoto(false)}
                disabled={files.length >= 10}
              >
                <Ionicons name="images-outline" size={18} color={theme.primary} />
                <Text style={[type.caption, { color: theme.primary, fontWeight: "700" }]}>Photos</Text>
              </Pressable>
            </View>
            {files.map((file, index) => (
              <View
                key={`${file.uri}-${index}`}
                style={[
                  styles.fileRow,
                  { borderBottomColor: native.separator },
                  index === files.length - 1 && styles.choiceRowLast,
                ]}
              >
                {file.mime.startsWith("image/") ? (
                  <Image source={{ uri: file.uri }} style={styles.thumb} />
                ) : (
                  <View style={[styles.fileIcon, { backgroundColor: theme.soft }]}>
                    <Ionicons name="document-text-outline" size={18} color={theme.primary} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[type.body, { color: native.label }]} numberOfLines={1}>
                    {file.name}
                  </Text>
                  <Text style={[type.footnote, { color: native.secondaryLabel }]}>Ready to upload</Text>
                </View>
                <Pressable onPress={() => setFiles((prev) => prev.filter((_, i) => i !== index))} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={NATIVE.destructive} />
                </Pressable>
              </View>
            ))}
          </ModuleSection>

          <ModuleSection title="Optional Questions">
            <Pressable
              onPress={() => setShowBonus((v) => !v)}
              android_ripple={{ color: theme.soft }}
              style={({ pressed }) => [
                styles.bonusToggle,
                pressed && { opacity: NATIVE.pressedOpacity },
              ]}
            >
              <View style={[styles.bonusIcon, { backgroundColor: theme.soft }]}>
                <Ionicons name="add-circle-outline" size={16} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.bodyEmphasis, { color: native.label }]}>
                  {showBonus ? "Hide optional questions" : "Add optional questions"}
                </Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>
                  Workload, clarity, NPS, missing features
                </Text>
              </View>
              <Ionicons
                name={showBonus ? "chevron-up" : "chevron-down"}
                size={18}
                color={native.tertiaryLabel}
              />
            </Pressable>

            {showBonus ? (
              <>
                <View style={[styles.divider, { backgroundColor: native.separator }]} />
                <Text style={[type.caption, styles.questionTitle, { color: native.secondaryLabel }]}>
                  Instructor explained clearly
                </Text>
                {INSTRUCTOR_CLARITY_LIKERT.map((opt, i) => (
                  <ChoiceRow
                    key={opt.value}
                    label={opt.label}
                    selected={survey.instructorClarity === opt.value}
                    onPress={() => patchSurvey("instructorClarity", opt.value)}
                    last={i === INSTRUCTOR_CLARITY_LIKERT.length - 1}
                  />
                ))}
                <View style={[styles.divider, { backgroundColor: native.separator }]} />
                <Text style={[type.caption, styles.questionTitle, { color: native.secondaryLabel }]}>
                  Workload
                </Text>
                {WORKLOAD_OPTIONS.map((opt, i) => (
                  <ChoiceRow
                    key={opt}
                    label={opt}
                    selected={survey.workload === opt}
                    onPress={() => patchSurvey("workload", opt)}
                    last={i === WORKLOAD_OPTIONS.length - 1}
                  />
                ))}
                <View style={[styles.divider, { backgroundColor: native.separator }]} />
                <Text style={[type.caption, styles.questionTitle, { color: native.secondaryLabel }]}>
                  AI Tutor usage
                </Text>
                {AI_TUTOR_USAGE_OPTIONS.map((opt, i) => (
                  <ChoiceRow
                    key={opt}
                    label={opt}
                    selected={survey.aiTutorUsage === opt}
                    onPress={() => patchSurvey("aiTutorUsage", opt)}
                    last={i === AI_TUTOR_USAGE_OPTIONS.length - 1}
                  />
                ))}
                <View style={[styles.divider, { backgroundColor: native.separator }]} />
                <Text style={[type.caption, styles.questionTitle, { color: native.secondaryLabel }]}>
                  Recommend CourseCollab (0–10)
                </Text>
                <View style={styles.npsRow}>
                  {Array.from({ length: 11 }, (_, n) => n).map((n) => {
                    const selected = survey.npsScore === n
                    return (
                      <Pressable
                        key={n}
                        onPress={() => patchSurvey("npsScore", n)}
                        style={[
                          styles.npsPill,
                          {
                            borderColor: selected ? theme.primary : native.separator,
                            backgroundColor: selected ? theme.soft : native.fill,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            type.caption,
                            {
                              fontWeight: "700",
                              color: selected ? theme.primary : native.label,
                            },
                          ]}
                        >
                          {n}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
                <View style={styles.paddedBlock}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.textArea,
                      {
                        borderColor: native.separator,
                        color: native.label,
                        backgroundColor: native.fill,
                      },
                    ]}
                    placeholder="Anything you wish CourseCollab had?"
                    placeholderTextColor={native.tertiaryLabel}
                    value={survey.missingFeatures}
                    onChangeText={(v) => patchSurvey("missingFeatures", v)}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </>
            ) : null}
          </ModuleSection>

          <Pressable
            style={[
              styles.submitBtn,
              { backgroundColor: COURSE_INFO_ACTION.fill },
              submitting && styles.submitBtnDisabled,
            ]}
            onPress={() => void submit()}
            disabled={submitting}
            android_ripple={{ color: "rgba(255,255,255,0.2)" }}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Ionicons name="paper-plane-outline" size={16} color="#ffffff" />
            )}
            <Text style={styles.submitText}>
              {submitting
                ? "Submitting…"
                : evaluation?.status === "rejected"
                  ? "Resubmit for review"
                  : "Submit for review"}
            </Text>
          </Pressable>
        </>
      ) : null}
    </ModuleScreen>
  )
}

function hexBorder(color: string, isDark: boolean): string {
  return semanticSoft(color, isDark, isDark ? 0.35 : 0.25)
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  statusCard: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  statusTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCopy: { flex: 1, gap: 2 },
  statusTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  statusMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  themeBadge: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  themeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "lowercase",
  },
  ecPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sectionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  metricTile: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 4,
    minHeight: 108,
  },
  metricIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  npsCard: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
    marginBottom: 12,
  },
  npsCardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  npsTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  npsFill: {
    height: "100%",
    borderRadius: 999,
  },
  responseRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  responseIcon: {
    width: NATIVE.iconTileSize,
    height: NATIVE.iconTileSize,
    borderRadius: NATIVE.iconTileRadius,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  responseCopy: { flex: 1, gap: 4 },
  likertDots: { flexDirection: "row", gap: 5, marginTop: 4 },
  likertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  featureBlock: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, gap: 8 },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  featureChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quoteBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
  },
  quoteMark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quoteText: {
    flex: 1,
    lineHeight: 22,
    fontStyle: "italic",
  },
  emptyProof: {
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  emptyProofIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: NATIVE.rowMinHeight,
  },
  thumb: { width: 40, height: 40, borderRadius: 8 },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: NATIVE.rowMinHeight,
  },
  choiceRowLast: { borderBottomWidth: 0 },
  choiceLabel: { flex: 1 },
  questionTitle: {
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  divider: { height: StyleSheet.hairlineWidth, marginTop: 4 },
  paddedBlock: { padding: 14, gap: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    marginHorizontal: 14,
    marginBottom: 10,
  },
  textArea: { minHeight: 100, textAlignVertical: "top", marginHorizontal: 0, marginBottom: 0 },
  gradeRow: { flexDirection: "row", gap: 8 },
  gradePill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
  },
  proofActions: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  proofAction: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bonusToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: NATIVE.rowMinHeight,
  },
  bonusIcon: {
    width: NATIVE.iconTileSize,
    height: NATIVE.iconTileSize,
    borderRadius: NATIVE.iconTileRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  npsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  npsPill: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
})
