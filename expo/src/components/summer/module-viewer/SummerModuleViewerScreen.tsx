import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { ApiError } from "../../../lib/api"
import {
  summerCampApi,
  type SummerModuleDetailResponse,
} from "../../../lib/summer-camp-api"
import {
  countModuleProgress,
  isSummerModuleComplete,
  mergeProgressRecord,
} from "../../../lib/summer-module-viewer-utils"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import { FacultyEmptyState } from "../../faculty/faculty-shared"
import { useSummerStudentId } from "../summer-module-hooks"
import { summerModuleRoute, summerTrainingDetailRoute } from "../summer-training-routes"
import { SummerModuleBlockRenderer } from "./SummerModuleBlockRenderer"

function ImmersiveModuleChrome({
  onBack,
  percent,
  completed,
  total,
  moduleComplete,
}: {
  onBack: () => void
  percent: number
  completed: number
  total: number
  moduleComplete: boolean
}) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <View style={styles.chrome} pointerEvents="box-none">
      <View
        style={[
          styles.chromeProgressTrack,
          { top: insets.top, backgroundColor: native.fill },
        ]}
      >
        <View
          style={[
            styles.chromeProgressFill,
            { width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: tokens.accent },
          ]}
        />
      </View>

      <View
        style={[styles.chromeRow, { top: insets.top + 10, paddingHorizontal: NATIVE.pagePadding }]}
        pointerEvents="box-none"
      >
        <Pressable
          style={({ pressed }) => [
            styles.chromeBtn,
            tokens.cardShadow,
            { backgroundColor: native.secondaryGrouped, opacity: pressed ? 0.88 : 1 },
          ]}
          onPress={onBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to training"
        >
          <Ionicons name="chevron-back" size={22} color={tokens.accent} />
        </Pressable>

        {total > 0 ? (
          <View
            style={[
              styles.chromePill,
              tokens.cardShadow,
              { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
            ]}
          >
            <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
              {moduleComplete ? "Complete" : `${completed}/${total}`}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

export function SummerModuleViewerScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const studentId = useSummerStudentId()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const { id: trainingIdParam, moduleId: moduleIdParam } = useLocalSearchParams<{
    id?: string
    moduleId?: string
  }>()
  const trainingId = Number(trainingIdParam)
  const moduleId = Number(moduleIdParam)

  const [detail, setDetail] = useState<SummerModuleDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savingBlockId, setSavingBlockId] = useState<number | null>(null)
  const [error, setError] = useState("")
  const autoCompletedRef = useRef<Set<number>>(new Set())

  const load = useCallback(async () => {
    if (!studentId || !Number.isFinite(moduleId)) return
    setError("")
    try {
      const next = await summerCampApi.getModuleDetail(studentId, moduleId)
      setDetail(next)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load module.")
      setDetail(null)
    }
  }, [moduleId, studentId])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load])

  const progressSummary = useMemo(() => {
    if (!detail) return { completed: 0, total: 0, percent: 0, moduleComplete: false }
    const { completed, total } = countModuleProgress(detail.blocks, detail.progress, detail.submissions)
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
    return {
      completed,
      total,
      percent,
      moduleComplete: isSummerModuleComplete(detail.progress),
    }
  }, [detail])

  const submitCheckpoint = useCallback(
    async (blockId: number, file: { uri: string; name: string; mime: string }) => {
      if (!studentId || !detail) return
      setSavingBlockId(blockId)
      setError("")
      try {
        const result = await summerCampApi.submitCheckpoint(studentId, {
          moduleId: detail.module.id,
          blockId,
          uri: file.uri,
          name: file.name,
          mime: file.mime,
        })
        setDetail((current) => {
          if (!current) return current
          const filtered = current.submissions.filter((item) => item.block_id !== blockId)
          return {
            ...current,
            submissions: [...filtered, result.submission],
            totalXp: result.totalXp ?? current.totalXp,
          }
        })
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not upload checkpoint.")
      } finally {
        setSavingBlockId(null)
      }
    },
    [detail, studentId],
  )

  const saveProgress = useCallback(
    async (blockId: number, progressType: string, metadata?: Record<string, unknown>) => {
      if (!studentId || !detail) return
      setSavingBlockId(blockId)
      setError("")
      try {
        const completionBlock =
          progressType === "module_complete"
            ? detail.blocks.find((block) => block.block_type === "module_completion")
            : null
        const rewards =
          completionBlock?.content?.rewards && typeof completionBlock.content.rewards === "object"
            ? (completionBlock.content.rewards as Record<string, unknown>)
            : null
        const xpReward = typeof rewards?.xp === "number" ? rewards.xp : undefined

        const result = await summerCampApi.saveModuleProgress(studentId, {
          moduleId: detail.module.id,
          blockId: progressType === "module_complete" ? undefined : blockId,
          progressType,
          metadata,
        })
        setDetail((current) => {
          if (!current) return current
          return {
            ...current,
            progress: mergeProgressRecord(current.progress, result.progress),
            totalXp: result.totalXp ?? current.totalXp,
          }
        })
        if (progressType === "module_complete") {
          await load()
          const earnedXp = xpReward
          const totalXp = result.totalXp
          AppAlert.alert(
            "Module complete!",
            [
              earnedXp != null ? `+${earnedXp} XP earned` : "Progress saved.",
              totalXp != null ? `Total camp XP: ${totalXp}` : null,
              detail.nextLesson ? `Next up: ${detail.nextLesson.title}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
          )
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not save progress.")
      } finally {
        setSavingBlockId(null)
      }
    },
    [detail, load, studentId],
  )

  const handleAutoComplete = useCallback(
    (blockId: number) => {
      if (!detail || autoCompletedRef.current.has(blockId)) return
      autoCompletedRef.current.add(blockId)
      void saveProgress(blockId, "step_complete", {})
    },
    [detail, saveProgress],
  )

  const handleBack = useCallback(() => {
    if (Number.isFinite(trainingId)) {
      router.replace(summerTrainingDetailRoute(trainingId) as never)
    } else {
      router.back()
    }
  }, [router, trainingId])

  if (!Number.isFinite(moduleId)) {
    return (
      <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
        <FacultyEmptyState icon="alert-circle-outline" title="Invalid module link" body="Return to your training and try again." />
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      {!loading && detail && !detail.curriculumLocked ? (
        <ImmersiveModuleChrome
          onBack={handleBack}
          percent={progressSummary.percent}
          completed={progressSummary.completed}
          total={progressSummary.total}
          moduleComplete={progressSummary.moduleComplete}
        />
      ) : null}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={native.tint} />
        </View>
      ) : detail?.curriculumLocked ? (
        <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
          <Pressable
            style={({ pressed }) => [
              styles.chromeBtn,
              { alignSelf: "flex-start", opacity: pressed ? 0.88 : 1, backgroundColor: native.secondaryGrouped },
            ]}
            onPress={handleBack}
          >
            <Ionicons name="chevron-back" size={22} color={tokens.accent} />
          </Pressable>
          <FacultyEmptyState
            icon="lock-closed-outline"
            title="Module locked"
            body={detail.curriculumMessage ?? "Complete earlier curriculum modules before opening advanced projects."}
          />
          {Number.isFinite(trainingId) ? (
            <Pressable
              style={[styles.footerBtn, { backgroundColor: tokens.accent }]}
              onPress={() => router.replace(summerTrainingDetailRoute(trainingId) as never)}
            >
              <Text style={styles.footerBtnText}>Back to training</Text>
            </Pressable>
          ) : null}
        </View>
      ) : !detail ? (
        <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
          <Pressable
            style={({ pressed }) => [
              styles.chromeBtn,
              { alignSelf: "flex-start", opacity: pressed ? 0.88 : 1, backgroundColor: native.secondaryGrouped },
            ]}
            onPress={handleBack}
          >
            <Ionicons name="chevron-back" size={22} color={tokens.accent} />
          </Pressable>
          <FacultyEmptyState icon="alert-circle-outline" title="Could not load module" body={error || "Try again in a moment."} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
        >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                void load().finally(() => setRefreshing(false))
              }}
              tintColor={native.tint}
              progressViewOffset={insets.top + 48}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: `${tokens.danger}18` }]}>
              <Ionicons name="alert-circle-outline" size={16} color={tokens.danger} />
              <Text style={[type.caption, { color: tokens.danger, flex: 1 }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.blocks}>
            {detail.blocks.map((block) => (
              <SummerModuleBlockRenderer
                key={block.id}
                block={block}
                progress={detail.progress}
                submissions={detail.submissions}
                saving={savingBlockId === block.id}
                onSaveProgress={(progressType, metadata) => saveProgress(block.id, progressType, metadata)}
                onSubmitCheckpoint={(file) => submitCheckpoint(block.id, file)}
                onAutoComplete={() => handleAutoComplete(block.id)}
              />
            ))}
          </View>

          {progressSummary.moduleComplete && detail.nextLesson ? (
            <Pressable
              style={[styles.footerBtn, { backgroundColor: tokens.accent }]}
              onPress={() =>
                router.replace(
                  summerModuleRoute(detail.module.training_id || trainingId, detail.nextLesson!.id) as never,
                )
              }
            >
              <Ionicons name="arrow-forward-circle-outline" size={18} color="#ffffff" />
              <Text style={styles.footerBtnText}>Continue to {detail.nextLesson.title}</Text>
            </Pressable>
          ) : progressSummary.moduleComplete ? (
            <Pressable
              style={[styles.footerBtn, { backgroundColor: tokens.accent }]}
              onPress={() => {
                if (Number.isFinite(trainingId)) {
                  router.replace(summerTrainingDetailRoute(trainingId) as never)
                } else {
                  router.back()
                }
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
              <Text style={styles.footerBtnText}>Back to training overview</Text>
            </Pressable>
          ) : null}
        </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  chrome: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  chromeProgressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
  },
  chromeProgressFill: {
    height: "100%",
  },
  chromeRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chromeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  chromePill: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: NATIVE.pagePadding, gap: 12 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 12,
  },
  blocks: { gap: 12 },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: NATIVE.sectionRadius,
    paddingVertical: 14,
    marginTop: 4,
  },
  footerBtnText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
})
