import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import {
  findBrowseTraining,
  findFirstCurriculumModule,
  findNextIncompleteModule,
  isCurriculumComplete,
  summerCampApi,
  type SummerBrowseCamp,
  type SummerBrowseTraining,
  type SummerModuleProgress,
  type SummerTrainingDetailResponse,
  type SummerTrainingEnrollment,
  type SummerTrainingProjectPreview,
} from "../../lib/summer-camp-api"
import { ApiError } from "../../lib/api"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, semanticSoft } from "../../lib/themed-module-theme"
import { FacultyEmptyState, FacultyStatusPill } from "../faculty/faculty-shared"
import { ModuleScreen, ModuleSection } from "../modules/ModuleScreen"
import { ProgressBar } from "../rewards/rewards-shared"
import { useSummerStudentId } from "./summer-module-hooks"
import { summerModuleRoute } from "./summer-training-routes"

function formatStatus(training: SummerBrowseTraining, enrolled: boolean): string {
  if (enrolled || training.enrolled) return "Enrolled"
  if (training.available) return "Available"
  return training.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function statusTone(training: SummerBrowseTraining, enrolled: boolean): "success" | "live" | "neutral" {
  if (enrolled || training.enrolled) return "success"
  if (training.available) return "live"
  return "neutral"
}

function formatFacultyRole(role?: string): string {
  if (!role) return "Faculty"
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function ModuleProgressRow({
  module,
  last,
  onPress,
}: {
  module: SummerModuleProgress
  last?: boolean
  onPress?: () => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const iconColor = module.is_complete ? tokens.success : native.tertiaryLabel
  const iconBg = module.is_complete ? `${tokens.success}18` : native.fill

  return (
    <Pressable
      style={({ pressed }) => [
        styles.moduleRow,
        { borderBottomColor: native.separator },
        last && styles.moduleRowLast,
        pressed && onPress && { opacity: NATIVE.pressedOpacity },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.moduleIcon, { backgroundColor: iconBg }]}>
        <Ionicons
          name={module.is_complete ? "checkmark-circle-outline" : "ellipse-outline"}
          size={16}
          color={iconColor}
        />
      </View>
      <Text style={[type.body, styles.moduleTitle, { color: native.label }]} numberOfLines={2}>
        {module.title}
      </Text>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} /> : null}
    </Pressable>
  )
}

function ProjectPreviewRow({
  project,
  last,
  locked,
  onPress,
}: {
  project: SummerTrainingProjectPreview
  last?: boolean
  locked?: boolean
  onPress?: () => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <Pressable
      style={({ pressed }) => [
        styles.moduleRow,
        { borderBottomColor: native.separator, opacity: locked ? 0.72 : 1 },
        last && styles.moduleRowLast,
        pressed && onPress && !locked && { opacity: NATIVE.pressedOpacity },
      ]}
      onPress={onPress}
      disabled={!onPress || locked}
    >
      <View style={[styles.moduleIcon, { backgroundColor: tokens.accentSoft }]}>
        <Ionicons name={locked ? "lock-closed-outline" : "folder-open-outline"} size={16} color={tokens.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.body, { color: native.label }]} numberOfLines={2}>
          {project.title}
        </Text>
        {project.xp_reward ? (
          <Text style={[type.caption, { color: native.secondaryLabel }]}>{project.xp_reward} XP reward</Text>
        ) : null}
      </View>
      {!locked && onPress ? <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} /> : null}
    </Pressable>
  )
}

export function SummerTrainingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const trainingId = Number(id)
  const router = useRouter()
  const studentId = useSummerStudentId()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  const [browseCamp, setBrowseCamp] = useState<SummerBrowseCamp | null>(null)
  const [training, setTraining] = useState<SummerBrowseTraining | null>(null)
  const [trainingDetail, setTrainingDetail] = useState<SummerTrainingDetailResponse | null>(null)
  const [enrollment, setEnrollment] = useState<SummerTrainingEnrollment | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!studentId || !Number.isFinite(trainingId)) return
    setError("")
    try {
      const [browse, myTrainings, detail] = await Promise.all([
        summerCampApi.getBrowseTrainings(studentId),
        summerCampApi.getMyTrainings(studentId),
        summerCampApi.getTrainingDetail(studentId, trainingId),
      ])
      const match = findBrowseTraining(browse.camps, trainingId)
      if (!match) {
        setBrowseCamp(null)
        setTraining(null)
        setTrainingDetail(null)
        setEnrollment(null)
        setError("Training not found.")
        return
      }
      setBrowseCamp(match.camp)
      setTraining(match.training)
      setTrainingDetail(detail)
      setEnrollment(myTrainings.trainings.find((item) => item.training_id === trainingId) ?? null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load training.")
    }
  }, [studentId, trainingId])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load])

  const isEnrolled = Boolean(enrollment) || training?.enrolled === true || trainingDetail?.enrolled === true
  const overview =
    trainingDetail?.overview ||
    training?.meta.overview ||
    training?.meta.summary ||
    training?.description

  const curriculumModules = trainingDetail?.modules ?? []
  const capstoneProjects = trainingDetail?.projects ?? []
  const curriculumComplete = isCurriculumComplete(curriculumModules)
  const firstModule = useMemo(() => findFirstCurriculumModule(curriculumModules), [curriculumModules])
  const nextModule = useMemo(() => findNextIncompleteModule(curriculumModules), [curriculumModules])
  const completedCurriculum = curriculumModules.filter((module) => module.is_complete).length
  const totalCurriculum = curriculumModules.length
  const percent =
    totalCurriculum > 0 ? Math.round((completedCurriculum / totalCurriculum) * 100) : enrollment?.percent ?? 0
  const hasStarted = curriculumModules.some((module) => module.is_complete)
  const resumeModule = nextModule ?? firstModule

  async function handleEnroll() {
    if (!studentId || !training || enrolling || isEnrolled) return
    setEnrolling(true)
    setError("")
    try {
      await summerCampApi.enrollInTraining(studentId, training.id)
      const detail = await summerCampApi.getTrainingDetail(studentId, trainingId)
      await load()
      const resume =
        findNextIncompleteModule(detail.modules) ?? findFirstCurriculumModule(detail.modules)
      if (resume) {
        openModule(resume)
        return
      }
      AppAlert.alert("Enrolled", `You joined ${training.title}. Tap Start training to begin Module 0.`)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not enroll in this training."
      AppAlert.alert("Enrollment failed", message)
    } finally {
      setEnrolling(false)
    }
  }

  function openModule(module: SummerModuleProgress) {
    router.push(summerModuleRoute(trainingId, module.id) as never)
  }

  function handlePrimaryAction() {
    if (!isEnrolled) {
      void handleEnroll()
      return
    }
    if (curriculumComplete) {
      router.push("/module/projects" as never)
      return
    }
    if (resumeModule) {
      openModule(resumeModule)
    }
  }

  const primaryLabel = !isEnrolled
    ? "Enroll in this training"
    : curriculumComplete
      ? "View capstone projects"
      : hasStarted && nextModule
        ? "Continue training"
        : "Start training"

  if (!Number.isFinite(trainingId)) {
    return (
      <ModuleScreen error="Invalid training link.">
        <View />
      </ModuleScreen>
    )
  }

  if (!loading && !training) {
    return (
      <ModuleScreen loading={false} error={error || undefined}>
        <FacultyEmptyState icon="school-outline" title="Training not found" body="This camp track may have been removed or unpublished." />
      </ModuleScreen>
    )
  }

  return (
    <ModuleScreen
      loading={loading}
      error={error && training ? error : undefined}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true)
        void load().finally(() => setRefreshing(false))
      }}
    >
      {training && browseCamp ? (
        <>
          <View style={[styles.hero, tokens.cardShadow, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
            <View style={styles.heroTop}>
              <View style={[styles.heroIcon, { backgroundColor: tokens.accentSoft }]}>
                <Ionicons name="school-outline" size={22} color={tokens.accent} />
              </View>
              <View style={styles.heroCopy}>
                <Text style={[type.bodyEmphasis, styles.heroTitle, { color: native.label }]}>{training.title}</Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={2}>
                  {browseCamp.title}
                  {training.meta.duration ? ` · ${training.meta.duration}` : ""}
                </Text>
              </View>
              <FacultyStatusPill label={formatStatus(training, isEnrolled)} tone={statusTone(training, isEnrolled)} />
            </View>

            {isEnrolled ? (
              <View style={styles.progressBlock}>
                <View style={styles.progressMeta}>
                  <Text style={[type.caption, { color: native.secondaryLabel }]}>
                    {completedCurriculum}/{totalCurriculum} core modules complete
                  </Text>
                  <Text style={[type.bodyEmphasis, { color: tokens.accent }]}>{percent}%</Text>
                </View>
                <ProgressBar pct={percent} height={6} />
              </View>
            ) : null}
          </View>

          {isEnrolled && resumeModule ? (
            <Pressable
              style={({ pressed }) => [
                styles.startBanner,
                tokens.cardShadow,
                { backgroundColor: tokens.accent, opacity: pressed ? 0.92 : 1 },
              ]}
              onPress={handlePrimaryAction}
              disabled={!isEnrolled && (!training.available || enrolling)}
            >
              <Ionicons name={curriculumComplete ? "folder-open-outline" : "play-circle-outline"} size={22} color="#ffffff" />
              <View style={{ flex: 1 }}>
                <Text style={[type.bodyEmphasis, { color: "#ffffff" }]}>{primaryLabel}</Text>
                <Text style={[type.caption, { color: "rgba(255,255,255,0.88)" }]} numberOfLines={1}>
                  {curriculumComplete
                    ? "Capstone projects unlock after core training"
                    : resumeModule.title}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ffffff" />
            </Pressable>
          ) : null}

          {overview ? (
            <ModuleSection title="Overview">
              <View style={[styles.copyCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
                <Text style={[type.body, styles.copyText, { color: native.label }]}>{overview}</Text>
              </View>
            </ModuleSection>
          ) : null}

          <ModuleSection title="Details">
            <View style={[styles.metricsCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
              {training.meta.difficulty ? <MetricRow label="Difficulty" value={training.meta.difficulty} /> : null}
              {training.meta.audience ? (
                <MetricRow label="Audience" value={training.meta.audience} last={!training.meta.format && !training.meta.tags.length} />
              ) : null}
              {training.meta.format ? (
                <MetricRow label="Format" value={training.meta.format} last={!training.meta.tags.length} />
              ) : null}
              {training.meta.tags.length ? <MetricRow label="Tags" value={training.meta.tags.join(", ")} last /> : null}
            </View>
          </ModuleSection>

          {training.meta.outcomes.length ? (
            <ModuleSection title="Learning outcomes">
              <View style={[styles.copyCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
                {training.meta.outcomes.map((outcome) => (
                  <View key={outcome} style={styles.outcomeRow}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={tokens.success} />
                    <Text style={[type.body, styles.outcomeText, { color: native.label }]}>{outcome}</Text>
                  </View>
                ))}
              </View>
            </ModuleSection>
          ) : null}

          {(trainingDetail?.faculty.length ? trainingDetail.faculty : training.faculty).length ? (
            <ModuleSection title="Faculty team">
              <View style={[styles.metricsCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
                {(trainingDetail?.faculty.length ? trainingDetail.faculty : training.faculty).map((member, index, arr) => (
                  <MetricRow
                    key={member.id}
                    label={formatFacultyRole(member.role)}
                    value={[member.name, member.job_title].filter(Boolean).join(" · ")}
                    last={index === arr.length - 1}
                  />
                ))}
              </View>
            </ModuleSection>
          ) : null}

          {isEnrolled && curriculumModules.length ? (
            <ModuleSection title="Core modules">
              <View style={[styles.modulesCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
                {curriculumModules.map((module, index) => (
                  <ModuleProgressRow
                    key={module.id}
                    module={module}
                    last={index === curriculumModules.length - 1}
                    onPress={() => openModule(module)}
                  />
                ))}
              </View>
            </ModuleSection>
          ) : null}

          {isEnrolled && capstoneProjects.length ? (
            <ModuleSection title="Capstone projects">
              {!curriculumComplete ? (
                <View style={[styles.lockBanner, { backgroundColor: semanticSoft(tokens.warning, tokens.isDark) }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={tokens.warning} />
                  <Text style={[type.caption, { color: native.label, flex: 1, lineHeight: 20 }]}>
                    Complete all core modules to unlock capstone projects.
                  </Text>
                </View>
              ) : null}
              <View style={[styles.modulesCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
                {capstoneProjects.map((project, index) => (
                  <ProjectPreviewRow
                    key={project.id}
                    project={project}
                    last={index === capstoneProjects.length - 1}
                    locked={!curriculumComplete}
                    onPress={
                      project.primary_module_id
                        ? () => router.push(summerModuleRoute(trainingId, project.primary_module_id!) as never)
                        : () => router.push("/module/projects" as never)
                    }
                  />
                ))}
              </View>
            </ModuleSection>
          ) : null}

          {isEnrolled ? (
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: tokens.accent },
                  !resumeModule && curriculumComplete === false && styles.btnDisabled,
                  pressed && { opacity: 0.92 },
                ]}
                onPress={handlePrimaryAction}
                disabled={!resumeModule && !curriculumComplete}
              >
                <Ionicons
                  name={curriculumComplete ? "folder-open-outline" : "play-circle-outline"}
                  size={18}
                  color="#ffffff"
                />
                <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: tokens.accent },
                  (!training.available || enrolling) && styles.btnDisabled,
                  pressed && { opacity: 0.92 },
                ]}
                onPress={handlePrimaryAction}
                disabled={!training.available || enrolling}
              >
                {enrolling ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
                    <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </>
      ) : null}
    </ModuleScreen>
  )
}

function MetricRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const native = useThemedNative()
  const type = useNativeType()
  return (
    <View style={[styles.metricRow, !last && { borderBottomColor: native.separator, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[type.caption, styles.metricLabel, { color: native.secondaryLabel }]}>{label}</Text>
      <Text style={[type.body, styles.metricValue, { color: native.label }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 14,
  },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  heroCopy: { flex: 1, minWidth: 0, gap: 4 },
  heroTitle: { fontSize: 20, lineHeight: 26 },
  progressBlock: { gap: 8 },
  progressMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  startBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: NATIVE.sectionRadius,
    padding: 14,
  },
  copyCard: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  copyText: { lineHeight: 23 },
  metricsCard: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  metricRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  metricLabel: { textTransform: "uppercase", letterSpacing: 0.4 },
  metricValue: { lineHeight: 22 },
  outcomeRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  outcomeText: { flex: 1, lineHeight: 22 },
  modulesCard: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  lockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: NATIVE.sectionRadius,
    marginBottom: 8,
  },
  moduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  moduleRowLast: { borderBottomWidth: 0 },
  moduleIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  moduleTitle: { flex: 1, lineHeight: 21 },
  actions: { paddingTop: 8, paddingBottom: 8 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: NATIVE.sectionRadius,
    paddingVertical: 14,
  },
  primaryBtnText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  btnDisabled: { opacity: 0.55 },
})
