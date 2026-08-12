import { useEffect, useState } from "react"
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { hexToRgba } from "../../constants/app-themes"
import {
  CORA_COMPOSER_MORE_ACTIONS,
  type CoraComposerActionId,
} from "../../lib/cora-composer-actions"

type SheetShellProps = {
  visible: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}

function SheetShell({ visible, title, onClose, children, footer }: SheetShellProps) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: native.secondaryGrouped }]} onPress={() => {}}>
          <View style={[styles.handle, { backgroundColor: native.separator }]} />
          <View style={styles.header}>
            <Text style={[type.bodyEmphasis, styles.title]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={SN.secondaryLabel} />
            </Pressable>
          </View>
          {children}
          {footer}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export function CoraConceptSheet({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean
  onClose: () => void
  onSubmit: (concept: string) => void
}) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const [concept, setConcept] = useState("")

  useEffect(() => {
    if (visible) setConcept("")
  }, [visible])

  return (
    <SheetShell
      visible={visible}
      title="Explain a concept"
      onClose={onClose}
      footer={
        <Pressable
          onPress={() => {
            const trimmed = concept.trim()
            if (!trimmed) return
            onSubmit(trimmed)
            onClose()
          }}
          disabled={!concept.trim()}
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              backgroundColor: concept.trim() ? SN.accent : native.fill,
              opacity: pressed && concept.trim() ? NATIVE.pressedOpacity : 1,
            },
          ]}
        >
          <Text style={[type.bodyEmphasis, { color: concept.trim() ? "#ffffff" : SN.secondaryLabel }]}>
            Add to chat
          </Text>
        </Pressable>
      }
    >
      <Text style={[type.caption, styles.hint, { color: SN.secondaryLabel }]}>
        Which concept from your course should Cora explain?
      </Text>
      <TextInput
        style={[styles.input, { color: native.label, borderColor: native.separator, backgroundColor: native.groupedBackground }]}
        value={concept}
        onChangeText={setConcept}
        placeholder="e.g. nodal analysis, pointers, recursion…"
        placeholderTextColor={SN.secondaryLabel}
        autoFocus
      />
    </SheetShell>
  )
}

export function CoraMicroLessonSheet({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean
  onClose: () => void
  onSubmit: (payload: { topic: string; difficulty: string; includeExamples: boolean; autoQuiz: boolean }) => void
}) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const [topic, setTopic] = useState("")
  const [difficulty, setDifficulty] = useState("intermediate")
  const [includeExamples, setIncludeExamples] = useState(true)
  const [autoQuiz, setAutoQuiz] = useState(true)

  useEffect(() => {
    if (visible) {
      setTopic("")
      setDifficulty("intermediate")
      setIncludeExamples(true)
      setAutoQuiz(true)
    }
  }, [visible])

  const difficulties = ["beginner", "intermediate", "advanced"]

  return (
    <SheetShell
      visible={visible}
      title="Micro-lesson"
      onClose={onClose}
      footer={
        <Pressable
          onPress={() => {
            onSubmit({ topic: topic.trim() || "programming fundamentals", difficulty, includeExamples, autoQuiz })
            onClose()
          }}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: SN.accent, opacity: pressed ? NATIVE.pressedOpacity : 1 },
          ]}
        >
          <Text style={[type.bodyEmphasis, { color: "#ffffff" }]}>Generate lesson</Text>
        </Pressable>
      }
    >
      <Text style={[type.caption, styles.hint, { color: SN.secondaryLabel }]}>Topic</Text>
      <TextInput
        style={[styles.input, { color: native.label, borderColor: native.separator, backgroundColor: native.groupedBackground }]}
        value={topic}
        onChangeText={setTopic}
        placeholder="What should the lesson cover?"
        placeholderTextColor={SN.secondaryLabel}
      />
      <Text style={[type.caption, styles.sectionLabel, { color: SN.secondaryLabel }]}>Difficulty</Text>
      <View style={styles.chips}>
        {difficulties.map((level) => {
          const active = difficulty === level
          return (
            <Pressable
              key={level}
              onPress={() => setDifficulty(level)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? hexToRgba(SN.accent, 0.12) : native.groupedBackground,
                  borderColor: active ? hexToRgba(SN.accent, 0.35) : native.separator,
                },
              ]}
            >
              <Text style={[type.caption, { color: active ? SN.accent : native.label, fontWeight: "600" }]}>
                {level[0].toUpperCase() + level.slice(1)}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <ToggleRow label="Include code examples" value={includeExamples} onChange={setIncludeExamples} />
      <ToggleRow label="Add quiz questions at the end" value={autoQuiz} onChange={setAutoQuiz} />
    </SheetShell>
  )
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (next: boolean) => void
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const SN = useThemedStudentNative()
  return (
    <View style={[styles.toggleRow, { borderColor: native.separator }]}>
      <Text style={[type.body, { color: native.label, flex: 1 }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: SN.accent, false: native.fill }} />
    </View>
  )
}

export function CoraCodeToolSheet({
  visible,
  title,
  hint,
  buttonLabel = "Use in chat",
  onClose,
  onSubmit,
}: {
  visible: boolean
  title: string
  hint?: string
  buttonLabel?: string
  onClose: () => void
  onSubmit: (code: string) => void
}) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const [code, setCode] = useState("")

  useEffect(() => {
    if (visible) setCode("")
  }, [visible])

  return (
    <SheetShell
      visible={visible}
      title={title}
      onClose={onClose}
      footer={
        <Pressable
          onPress={() => {
            const trimmed = code.trim()
            if (!trimmed) return
            onSubmit(trimmed)
            onClose()
          }}
          disabled={!code.trim()}
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              backgroundColor: code.trim() ? SN.accent : native.fill,
              opacity: pressed && code.trim() ? NATIVE.pressedOpacity : 1,
            },
          ]}
        >
          <Text style={[type.bodyEmphasis, { color: code.trim() ? "#ffffff" : SN.secondaryLabel }]}>
            {buttonLabel}
          </Text>
        </Pressable>
      }
    >
      {hint ? <Text style={[type.caption, styles.hint, { color: SN.secondaryLabel }]}>{hint}</Text> : null}
      <TextInput
        style={[
          styles.codeInput,
          { color: native.label, borderColor: native.separator, backgroundColor: native.groupedBackground },
        ]}
        value={code}
        onChangeText={setCode}
        placeholder="Paste your C++ code here…"
        placeholderTextColor={SN.secondaryLabel}
        multiline
        autoFocus
        textAlignVertical="top"
      />
    </SheetShell>
  )
}

const CODE_OPTIONAL_TOOLS = new Set<CoraComposerActionId>([
  "complexity-analysis",
  "explain-thinking",
  "code-translator",
])

export function CoraMoreToolsSheet({
  visible,
  initialTool = null,
  onClose,
  onSelectTool,
}: {
  visible: boolean
  initialTool?: CoraComposerActionId | null
  onClose: () => void
  onSelectTool: (toolId: CoraComposerActionId, code?: string, targetLanguage?: string) => void
}) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const [activeTool, setActiveTool] = useState<CoraComposerActionId | null>(null)
  const [code, setCode] = useState("")
  const [targetLanguage, setTargetLanguage] = useState("python")

  useEffect(() => {
    if (visible) {
      setActiveTool(initialTool && CODE_OPTIONAL_TOOLS.has(initialTool) ? initialTool : null)
      setCode("")
      setTargetLanguage("python")
    }
  }, [visible, initialTool])

  const activeLabel = CORA_COMPOSER_MORE_ACTIONS.find((item) => item.id === activeTool)?.label

  return (
    <SheetShell visible={visible} title={activeTool ? (activeLabel ?? "More tools") : "More tools"} onClose={onClose}>
      {!activeTool ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {CORA_COMPOSER_MORE_ACTIONS.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                if (CODE_OPTIONAL_TOOLS.has(item.id)) {
                  setActiveTool(item.id)
                  return
                }
                onSelectTool(item.id)
                onClose()
              }}
              style={({ pressed }) => [
                styles.toolRow,
                { borderColor: native.separator, opacity: pressed ? NATIVE.pressedOpacity : 1 },
              ]}
            >
              <Text style={[type.body, { color: native.label, flex: 1 }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={native.tertiaryLabel} />
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <>
          <Pressable onPress={() => setActiveTool(null)} style={styles.backLink}>
            <Ionicons name="chevron-back" size={18} color={SN.accent} />
            <Text style={[type.body, { color: SN.accent }]}>Back</Text>
          </Pressable>
          {activeTool === "code-translator" ? (
            <>
              <Text style={[type.caption, styles.hint, { color: SN.secondaryLabel }]}>Source code (C++)</Text>
              <TextInput
                style={[
                  styles.codeInput,
                  { color: native.label, borderColor: native.separator, backgroundColor: native.groupedBackground },
                ]}
                value={code}
                onChangeText={setCode}
                placeholder="Paste C++ code to translate…"
                placeholderTextColor={SN.secondaryLabel}
                multiline
                textAlignVertical="top"
              />
              <Text style={[type.caption, styles.sectionLabel, { color: SN.secondaryLabel }]}>Target language</Text>
              <View style={styles.chips}>
                {["python", "javascript", "java"].map((lang) => {
                  const active = targetLanguage === lang
                  return (
                    <Pressable
                      key={lang}
                      onPress={() => setTargetLanguage(lang)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? hexToRgba(SN.accent, 0.12) : native.groupedBackground,
                          borderColor: active ? hexToRgba(SN.accent, 0.35) : native.separator,
                        },
                      ]}
                    >
                      <Text style={[type.caption, { color: active ? SN.accent : native.label, fontWeight: "600" }]}>
                        {lang}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </>
          ) : (
            <>
              <Text style={[type.caption, styles.hint, { color: SN.secondaryLabel }]}>
                Paste code (optional). Cora can still help without code for general guidance.
              </Text>
              <TextInput
                style={[
                  styles.codeInput,
                  { color: native.label, borderColor: native.separator, backgroundColor: native.groupedBackground },
                ]}
                value={code}
                onChangeText={setCode}
                placeholder="Paste code here…"
                placeholderTextColor={SN.secondaryLabel}
                multiline
                textAlignVertical="top"
              />
            </>
          )}
          <Pressable
            onPress={() => {
              onSelectTool(activeTool, code.trim() || undefined, targetLanguage)
              onClose()
            }}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: SN.accent, opacity: pressed ? NATIVE.pressedOpacity : 1, marginTop: 12 },
            ]}
          >
            <Text style={[type.bodyEmphasis, { color: "#ffffff" }]}>Use tool</Text>
          </Pressable>
        </>
      )}
    </SheetShell>
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
    maxHeight: "82%",
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
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 17 },
  hint: { marginBottom: 10, lineHeight: 18 },
  sectionLabel: { marginTop: 8, marginBottom: 8, fontWeight: "600" },
  input: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  codeInput: {
    minHeight: 160,
    maxHeight: 280,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  primaryBtn: {
    marginTop: 8,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 8,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
})
