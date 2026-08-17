import { useEffect, useState } from "react"
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
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import {
  getCoraQuestionImportContainers,
  getCoraQuestionImportItems,
  getCoraQuestionImportSources,
  resolveCoraQuestionImport,
  type CoraImportedProblem,
  type CoraQuestionImportContainer,
  type CoraQuestionImportItem,
  type CoraQuestionImportSource,
} from "../../lib/cora-api"
import type { StudentSession } from "../../lib/session"

type Props = {
  visible: boolean
  session: StudentSession
  onClose: () => void
  onImportProblem: (problem: CoraImportedProblem, label: string) => void
  /**
   * `messages` unlocks graded assessments for peer/professor discussion sharing.
   * Default `cora` keeps tutoring integrity locks.
   */
  purpose?: "cora" | "messages"
}

type Step = "sources" | "containers" | "questions"
type ImportListRow = CoraQuestionImportSource | CoraQuestionImportContainer | CoraQuestionImportItem

export function CoraImportCourseSheet({
  visible,
  session,
  onClose,
  onImportProblem,
  purpose = "cora",
}: Props) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const forMessages = purpose === "messages"
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

  const importQuestion = async (item: CoraQuestionImportItem) => {
    setImportingRef(item.ref)
    setError(null)
    try {
      const problem = await resolveCoraQuestionImport(session, item, purpose)
      onImportProblem(problem, item.label)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed")
    } finally {
      setImportingRef(null)
    }
  }

  useEffect(() => {
    if (!visible) return
    setStep("sources")
    setSourceKey(null)
    setSourceLabel("")
    setContainerLabel("")
    setError(null)
    setLoading(true)
    void getCoraQuestionImportSources(session, purpose)
      .then((res) => setSources(res.sources ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load sources"))
      .finally(() => setLoading(false))
  }, [visible, session, purpose])

  const openSource = async (source: CoraQuestionImportSource) => {
    setLoading(true)
    setError(null)
    setSourceKey(source.key)
    setSourceLabel(source.label)
    try {
      const res = await getCoraQuestionImportContainers(session, source.key, purpose)
      setContainers(res.containers ?? [])
      setStep("containers")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load topics")
    } finally {
      setLoading(false)
    }
  }

  const openContainer = async (container: CoraQuestionImportContainer) => {
    if (!sourceKey) return
    if (container.locked && !forMessages) {
      setError(
        container.lockReason ||
          "Attempt this assessment first. Cora can help with its questions only after you submit.",
      )
      return
    }
    setLoading(true)
    setError(null)
    setContainerLabel(container.label)
    try {
      const res = await getCoraQuestionImportItems(session, sourceKey, container.id, purpose)
      setItems(res.items ?? [])
      setStep("questions")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load questions")
    } finally {
      setLoading(false)
    }
  }

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
    step === "sources"
      ? forMessages
        ? "Share from course"
        : "Import from course"
      : step === "containers"
        ? sourceLabel
        : containerLabel

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
              testID="cora-import-sheet-close"
              accessibilityRole="button"
              accessibilityLabel={step === "sources" ? "Close import sheet" : "Back"}
              style={styles.backBtn}
            >
              <Ionicons name={step === "sources" ? "close" : "chevron-back"} size={22} color={SN.accent} />
            </Pressable>
            <Text style={[type.bodyEmphasis, styles.title]} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.backBtn} />
          </View>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={SN.accent} />
            </View>
          ) : (
            <>
              {step === "containers" &&
              !forMessages &&
              ["quizzes", "homework", "mid_semester", "final_exam"].includes(sourceKey ?? "") ? (
                <Text style={[type.caption, styles.lockHint, { color: "#b45309" }]}>
                  Pending assessments are locked until you attempt and submit them.
                </Text>
              ) : null}
              {step === "sources" && forMessages ? (
                <Text style={[type.caption, styles.lockHint, { color: SN.secondaryLabel }]}>
                  Pick a question to share in this conversation. Answer keys are not included.
                </Text>
              ) : null}
              {error ? (
                <Text style={[type.caption, styles.error, { color: "#dc2626" }]}>{error}</Text>
              ) : null}
              <FlatList<ImportListRow>
              testID="cora-import-sheet-list"
              data={
                (step === "sources"
                  ? sources
                  : step === "containers"
                    ? containers
                    : items) as ImportListRow[]
              }
              keyExtractor={(row) =>
                step === "sources"
                  ? (row as CoraQuestionImportSource).key
                  : step === "containers"
                    ? (row as CoraQuestionImportContainer).id
                    : (row as CoraQuestionImportItem).ref
              }
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={styles.listGap} />}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={200}
              maxToRenderPerBatch={200}
              windowSize={31}
              removeClippedSubviews={false}
              renderItem={({ item: row }) => {
                if (step === "sources") {
                  const source = row as CoraQuestionImportSource
                  return (
                    <Pressable
                      testID={`cora-import-source-${source.key}`}
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
                      <View style={styles.rowCopy}>
                        <Text style={[type.bodyEmphasis, styles.rowTitle]} importantForAccessibility="no">
                          {source.label}
                        </Text>
                        <Text style={[type.caption, { color: SN.secondaryLabel }]} importantForAccessibility="no">
                          {source.description}
                        </Text>
                      </View>
                      <Text style={[type.caption, { color: native.tertiaryLabel }]} importantForAccessibility="no">
                        {source.count}
                      </Text>
                    </Pressable>
                  )
                }

                if (step === "containers") {
                  const container = row as CoraQuestionImportContainer
                  const isLocked = Boolean(container.locked) && !forMessages
                  return (
                    <Pressable
                      testID={`cora-import-container-${container.id}`}
                      accessible
                      importantForAccessibility="yes"
                      accessibilityRole="button"
                      accessibilityLabel={
                        isLocked ? `${container.label}, locked` : container.label
                      }
                      accessibilityState={{ disabled: isLocked }}
                      onPress={() => void openContainer(container)}
                      style={({ pressed }) => [
                        styles.row,
                        {
                          borderColor: isLocked ? "#f59e0b" : native.separator,
                          backgroundColor: isLocked ? "rgba(245,158,11,0.08)" : undefined,
                          opacity: pressed && !isLocked ? NATIVE.pressedOpacity : 1,
                        },
                      ]}
                    >
                      {isLocked ? (
                        <Ionicons name="lock-closed" size={16} color="#b45309" />
                      ) : null}
                      <View style={styles.rowCopy}>
                        <Text
                          style={[
                            type.bodyEmphasis,
                            styles.rowTitle,
                            isLocked ? { color: "#92400e" } : null,
                          ]}
                          importantForAccessibility="no"
                        >
                          {container.label}
                        </Text>
                        <Text
                          style={[
                            type.caption,
                            { color: isLocked ? "#b45309" : SN.secondaryLabel },
                          ]}
                          importantForAccessibility="no"
                        >
                          {container.subtitle}
                        </Text>
                      </View>
                      {isLocked ? null : (
                        <Ionicons name="chevron-forward" size={18} color={native.tertiaryLabel} />
                      )}
                    </Pressable>
                  )
                }

                const item = row as CoraQuestionImportItem
                return (
                  <Pressable
                    testID={`cora-import-question-${item.ref}`}
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
                      style={[type.caption, styles.preview, { color: SN.secondaryLabel }]}
                      numberOfLines={3}
                      importantForAccessibility="no"
                    >
                      {item.preview}
                    </Text>
                    {importingRef === item.ref ? (
                      <ActivityIndicator color={SN.accent} style={styles.rowSpinner} />
                    ) : null}
                  </Pressable>
                )
              }}
            />
            </>
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
  loading: {
    paddingVertical: 40,
    alignItems: "center",
  },
  error: {
    paddingVertical: 12,
    textAlign: "center",
  },
  lockHint: {
    paddingHorizontal: 4,
    paddingBottom: 10,
    lineHeight: 18,
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
