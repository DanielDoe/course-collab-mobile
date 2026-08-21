import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { FACULTY_CORA_COLOR } from "../../../lib/faculty-cora-theme"
import type { InstructorScope } from "../../../lib/instructor-content-api"
import type {
  CoraImportedProblem,
  CoraQuestionImportContainer,
  CoraQuestionImportItem,
  CoraQuestionImportSource,
} from "../../../lib/cora-api"
import {
  getFacultyCoraQuestionImportContainers,
  getFacultyCoraQuestionImportItems,
  getFacultyCoraQuestionImportSources,
  resolveFacultyCoraQuestionImport,
  type FacultyCoraImportHint,
} from "../../../lib/faculty-cora-question-import"

type Props = {
  visible: boolean
  scope: InstructorScope
  hint?: FacultyCoraImportHint | null
  onClose: () => void
  onImportProblem: (problem: CoraImportedProblem, label: string) => void
}

type Step = "sources" | "containers" | "questions"

function matchesHint(label: string, hint?: string): boolean {
  if (!hint?.trim()) return false
  return label.toLowerCase().includes(hint.trim().toLowerCase())
}

export function FacultyCoraImportCourseSheet({
  visible,
  scope,
  hint,
  onClose,
  onImportProblem,
}: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const accent = FACULTY_CORA_COLOR.link

  const [step, setStep] = useState<Step>("sources")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sources, setSources] = useState<CoraQuestionImportSource[]>([])
  const [containers, setContainers] = useState<CoraQuestionImportContainer[]>([])
  const [items, setItems] = useState<CoraQuestionImportItem[]>([])
  const [sourceKey, setSourceKey] = useState<string | null>(null)
  const [sourceLabel, setSourceLabel] = useState("")
  const [containerLabel, setContainerLabel] = useState("")
  const [importingRef, setImportingRef] = useState<string | null>(null)

  const filteredContainers = useMemo(() => {
    if (!hint?.containerHint?.trim()) return containers
    const matched = containers.filter((container) => matchesHint(container.label, hint.containerHint))
    return matched.length > 0 ? matched : containers
  }, [containers, hint?.containerHint])

  const filteredItems = useMemo(() => {
    if (!hint?.containerHint?.trim() || step !== "questions") return items
    const matched = items.filter(
      (item) =>
        matchesHint(item.label, hint.containerHint) ||
        matchesHint(item.preview, hint.containerHint) ||
        item.label.includes("12"),
    )
    return matched.length > 0 ? matched : items
  }, [hint?.containerHint, items, step])

  const importQuestion = async (item: CoraQuestionImportItem) => {
    setImportingRef(item.ref)
    setError(null)
    try {
      const problem = await resolveFacultyCoraQuestionImport(scope, item)
      onImportProblem(problem, item.label)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed")
    } finally {
      setImportingRef(null)
    }
  }

  const openContainer = async (container: CoraQuestionImportContainer, key: string) => {
    setLoading(true)
    setError(null)
    setContainerLabel(container.label)
    try {
      const res = await getFacultyCoraQuestionImportItems(scope, key, container.id)
      setItems(res.items ?? [])
      setStep("questions")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load questions")
    } finally {
      setLoading(false)
    }
  }

  const openSource = async (source: CoraQuestionImportSource) => {
    setLoading(true)
    setError(null)
    setSourceKey(source.key)
    setSourceLabel(source.label)
    try {
      const res = await getFacultyCoraQuestionImportContainers(scope, source.key)
      const nextContainers = res.containers ?? []
      setContainers(nextContainers)
      setStep("containers")

      const preferred = hint?.containerHint
        ? nextContainers.find((container) => matchesHint(container.label, hint.containerHint))
        : undefined
      if (preferred) {
        await openContainer(preferred, source.key)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load topics")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!visible) return
    if (scope.courseId == null) {
      setError("Select a course before importing questions.")
      setLoading(false)
      return
    }
    setStep("sources")
    setSourceKey(null)
    setSourceLabel("")
    setContainerLabel("")
    setError(null)
    setLoading(true)

    void getFacultyCoraQuestionImportSources(scope)
      .then(async (res) => {
        const nextSources = res.sources ?? []
        setSources(nextSources)
        const preferred = hint?.sourceKey
          ? nextSources.find((source) => source.key === hint.sourceKey)
          : undefined
        if (preferred) {
          await openSource(preferred)
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load sources"))
      .finally(() => setLoading(false))
  }, [visible, scope, hint?.sourceKey])

  const goBack = () => {
    setError(null)
    if (step === "questions") {
      setStep("containers")
      return
    }
    if (step === "containers") {
      setStep("sources")
      setSourceKey(null)
      return
    }
    onClose()
  }

  const title =
    step === "sources" ? "Import from course" : step === "containers" ? sourceLabel : containerLabel

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={styles.backdrop}
        onPress={onClose}
      >
        <Pressable
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[styles.sheet, { backgroundColor: native.secondaryGrouped }]}
          onPress={() => {}}
        >
          <View style={[styles.handle, { backgroundColor: native.separator }]} />
          <View style={styles.header}>
            <Pressable
              onPress={goBack}
              hitSlop={8}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel={step === "sources" ? "Close import sheet" : "Back"}
            >
              <Ionicons name={step === "sources" ? "close" : "chevron-back"} size={22} color={accent} />
            </Pressable>
            <Text style={[type.bodyEmphasis, styles.title]} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.backBtn} />
          </View>

          {hint?.improveGoal ? (
            <Text style={[type.caption, styles.hint, { color: native.secondaryLabel }]}>
              Pick the question you want Cora to improve.
            </Text>
          ) : (
            <Text style={[type.caption, styles.hint, { color: native.secondaryLabel }]}>
              Import from your question bank, quizzes, or homework in this course.
            </Text>
          )}

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={accent} />
            </View>
          ) : error ? (
            <Text style={[type.caption, styles.error, { color: tokens.danger }]}>{error}</Text>
          ) : step === "containers" ? (
            <FlatList
              data={filteredContainers}
              keyExtractor={(row) => row.id}
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={styles.listGap} />}
              keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
              renderItem={({ item: container }) => {
                const highlighted = matchesHint(container.label, hint?.containerHint)
                return (
                  <Pressable
                    testID={`faculty-cora-import-container-${container.id}`}
                    accessible
                    importantForAccessibility="yes"
                    accessibilityRole="button"
                    accessibilityLabel={container.label}
                    onPress={() => void openContainer(container, sourceKey ?? "")}
                    style={({ pressed }) => [
                      styles.row,
                      {
                        borderColor: highlighted ? accent : native.separator,
                        backgroundColor: highlighted ? `${accent}10` : undefined,
                        opacity: pressed ? NATIVE.pressedOpacity : 1,
                      },
                    ]}
                  >
                    <View style={styles.rowCopy} importantForAccessibility="no">
                      <Text style={[type.bodyEmphasis, styles.rowTitle]} importantForAccessibility="no">
                        {container.label}
                      </Text>
                      <Text
                        style={[type.caption, { color: native.secondaryLabel }]}
                        importantForAccessibility="no"
                      >
                        {container.subtitle}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={native.tertiaryLabel} />
                  </Pressable>
                )
              }}
            />
          ) : step === "questions" ? (
            <FlatList
              data={filteredItems}
              keyExtractor={(row) => row.ref}
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={styles.listGap} />}
              keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
              renderItem={({ item }) => (
                <Pressable
                  testID={`faculty-cora-import-question-${item.ref}`}
                  accessible
                  importantForAccessibility="yes"
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  onPress={() => void importQuestion(item)}
                  disabled={importingRef != null}
                  style={({ pressed }) => [
                    styles.row,
                    styles.questionRow,
                    {
                      borderColor: native.separator,
                      opacity: importingRef === item.ref ? 0.6 : pressed ? NATIVE.pressedOpacity : 1,
                    },
                  ]}
                >
                  <Text style={[type.bodyEmphasis, styles.rowTitle]} importantForAccessibility="no">
                    {item.label}
                  </Text>
                  <Text
                    style={[type.caption, styles.preview, { color: native.secondaryLabel }]}
                    numberOfLines={3}
                    importantForAccessibility="no"
                  >
                    {item.preview}
                  </Text>
                  {importingRef === item.ref ? (
                    <ActivityIndicator color={accent} style={styles.rowSpinner} />
                  ) : null}
                </Pressable>
              )}
            />
          ) : (
            <FlatList
              data={sources}
              keyExtractor={(row) => row.key}
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={styles.listGap} />}
              keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
              renderItem={({ item: source }) => (
                <Pressable
                  testID={`faculty-cora-import-source-${source.key}`}
                  accessible
                  importantForAccessibility="yes"
                  accessibilityRole="button"
                  accessibilityLabel={source.label}
                  onPress={() => void openSource(source)}
                  style={({ pressed }) => [
                    styles.row,
                    { borderColor: native.separator, opacity: pressed ? NATIVE.pressedOpacity : 1 },
                  ]}
                >
                  <View style={styles.rowCopy} importantForAccessibility="no">
                    <Text style={[type.bodyEmphasis, styles.rowTitle]} importantForAccessibility="no">
                      {source.label}
                    </Text>
                    <Text
                      style={[type.caption, { color: native.secondaryLabel }]}
                      importantForAccessibility="no"
                    >
                      {source.description}
                    </Text>
                  </View>
                  <Text
                    style={[type.caption, { color: native.tertiaryLabel }]}
                    importantForAccessibility="no"
                  >
                    {source.count}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 28,
    maxHeight: "78%",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
  },
  hint: {
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  loading: {
    paddingVertical: 40,
    alignItems: "center",
  },
  error: {
    paddingVertical: 24,
    textAlign: "center",
  },
  list: {
    paddingBottom: 8,
  },
  listGap: {
    height: 8,
  },
  row: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  questionRow: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15 },
  preview: { lineHeight: 18 },
  rowSpinner: { marginTop: 8 },
})
