import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import {
  applyNoteFormat,
  editablePlainToNoteHtml,
  noteHtmlToEditablePlain,
  type NoteFormatAction,
} from "../../lib/digital-note-html-edit"
import { isNoteHtml } from "../../lib/digital-note-content"
import {
  isMarkdownNoteContent,
  noteBodyForEditor,
  noteBodyForSave,
  sanitizeMarkdownNoteBody,
} from "../../lib/markdown-note-content"
import {
  buildNoteImageInsertSnippet,
  insertSnippetAtSelection,
  pickNoteImage,
  promptNoteImageSource,
} from "../../lib/note-image-insert"
import type { StudentSession } from "../../lib/session"
import { CommGroupedList } from "../faculty/faculty-communication-ui"
import { DigitalNoteBodyView } from "./DigitalNoteBodyView"
import { MarkdownNotePreview } from "./MarkdownNotePreview"

export type DigitalNoteRichEditorHandle = {
  getHtmlForSave: () => string
}

type Props = {
  value: string
  onChange: (html: string) => void
  disabled?: boolean
  placeholder?: string
  noteKey?: string | number
  session?: StudentSession | null
  noteId?: number | null
}

type FormatGroupId = "style" | "headings" | "lists" | "blocks"

type FormatTool =
  | { kind: "format"; action: NoteFormatAction; label: string }
  | { kind: "photo"; label: string }

type FormatGroup = {
  id: FormatGroupId
  label: string
  icon: keyof typeof Ionicons.glyphMap
  tools: FormatTool[]
}

const FORMAT_GROUPS: FormatGroup[] = [
  {
    id: "style",
    label: "Text",
    icon: "text-outline",
    tools: [
      { kind: "format", action: "bold", label: "Bold" },
      { kind: "format", action: "italic", label: "Italic" },
      { kind: "format", action: "underline", label: "Underline" },
      { kind: "format", action: "strike", label: "Strikethrough" },
    ],
  },
  {
    id: "headings",
    label: "Headings",
    icon: "albums-outline",
    tools: [
      { kind: "format", action: "h1", label: "Heading 1" },
      { kind: "format", action: "h2", label: "Heading 2" },
      { kind: "format", action: "h3", label: "Heading 3" },
    ],
  },
  {
    id: "lists",
    label: "Lists",
    icon: "list-outline",
    tools: [
      { kind: "format", action: "bulletList", label: "Bullet list" },
      { kind: "format", action: "orderedList", label: "Numbered list" },
    ],
  },
  {
    id: "blocks",
    label: "Insert",
    icon: "add-circle-outline",
    tools: [
      { kind: "photo", label: "Photo" },
      { kind: "format", action: "blockquote", label: "Quote" },
      { kind: "format", action: "hr", label: "Divider" },
    ],
  },
]

function PreviewToggleButton({
  active,
  disabled,
  accent,
  native,
  onPress,
}: {
  active: boolean
  disabled?: boolean
  accent: string
  native: ReturnType<typeof useThemedNative>
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={active ? "Hide preview" : "Show preview"}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.iconBtn,
        {
          backgroundColor: active ? `${accent}18` : native.fill,
          opacity: pressed || disabled ? 0.5 : 1,
        },
      ]}
    >
      <Ionicons name={active ? "eye-off-outline" : "eye-outline"} size={18} color={active ? accent : native.label} />
    </Pressable>
  )
}

function FormatGroupChip({
  group,
  expanded,
  disabled,
  accent,
  native,
  type,
  onPress,
}: {
  group: FormatGroup
  expanded: boolean
  disabled?: boolean
  accent: string
  native: ReturnType<typeof useThemedNative>
  type: ReturnType<typeof useNativeType>
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={group.label}
      accessibilityState={{ expanded }}
      style={({ pressed }) => [
        styles.groupChip,
        {
          backgroundColor: expanded ? `${accent}18` : native.fill,
          opacity: pressed || disabled ? 0.5 : 1,
        },
      ]}
    >
      <Ionicons name={group.icon} size={16} color={expanded ? accent : native.label} />
      <Text
        style={[
          type.caption,
          styles.groupChipLabel,
          { color: expanded ? accent : native.label },
        ]}
      >
        {group.label}
      </Text>
      <Ionicons
        name={expanded ? "chevron-down" : "chevron-forward"}
        size={14}
        color={expanded ? accent : native.tertiaryLabel}
      />
    </Pressable>
  )
}

function FormatActionChip({
  label,
  disabled,
  accent,
  native,
  type,
  onPress,
  loading,
}: {
  label: string
  disabled?: boolean
  accent: string
  native: ReturnType<typeof useThemedNative>
  type: ReturnType<typeof useNativeType>
  onPress: () => void
  loading?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.actionChip,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: native.separator,
          opacity: pressed || disabled ? 0.5 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={accent} />
      ) : (
        <Text style={[type.caption, styles.actionChipLabel, { color: accent }]}>{label}</Text>
      )}
    </Pressable>
  )
}

export const DigitalNoteRichEditor = forwardRef<DigitalNoteRichEditorHandle, Props>(
  function DigitalNoteRichEditor(
    { value, onChange, disabled, placeholder, noteKey, session, noteId },
    ref,
  ) {
    const tokens = useAppThemeTokens()
    const native = useThemedNative()
    const type = useNativeType()
    const inputRef = useRef<TextInput>(null)
    const plainRef = useRef("")
    const originalRef = useRef(value)

    const [plain, setPlain] = useState(() => noteBodyForEditor(noteHtmlToEditablePlain(value)))
    const [selection, setSelection] = useState({ start: 0, end: 0 })
    const [showPreview, setShowPreview] = useState(false)
    const [previewHtml, setPreviewHtml] = useState("")
    const [expandedGroup, setExpandedGroup] = useState<FormatGroupId | null>(null)
    const [insertingPhoto, setInsertingPhoto] = useState(false)

    const isMarkdown = useMemo(
      () => isMarkdownNoteContent(value) || isMarkdownNoteContent(plain),
      [value, plain],
    )

    const activeGroup = useMemo(
      () => FORMAT_GROUPS.find((group) => group.id === expandedGroup) ?? null,
      [expandedGroup],
    )

    plainRef.current = plain
    originalRef.current = value

    useImperativeHandle(ref, () => ({
      getHtmlForSave: () => {
        const current = plainRef.current.trim()
        if (!current) return ""
        if (isMarkdownNoteContent(current) || isMarkdownNoteContent(originalRef.current)) {
          return noteBodyForSave(current, originalRef.current)
        }
        const html = editablePlainToNoteHtml(current)
        return html || current
      },
    }))

    useEffect(() => {
      const next = noteBodyForEditor(noteHtmlToEditablePlain(value))
      setPlain(next)
      plainRef.current = next
      originalRef.current = value
    }, [noteKey, value])

    useEffect(() => {
      if (disabled) return
      const timer = setTimeout(() => {
        const current = plainRef.current
        if (isMarkdownNoteContent(current) || isMarkdownNoteContent(originalRef.current)) {
          onChange(noteBodyForSave(current, originalRef.current))
          return
        }
        const html = editablePlainToNoteHtml(current)
        onChange(html || current)
      }, 350)
      return () => clearTimeout(timer)
    }, [plain, disabled, onChange])

    useEffect(() => {
      if (!showPreview || isMarkdown) return
      const timer = setTimeout(() => {
        const html = editablePlainToNoteHtml(plainRef.current)
        setPreviewHtml(html || value)
      }, 450)
      return () => clearTimeout(timer)
    }, [plain, showPreview, value, isMarkdown])

    useEffect(() => {
      if (showPreview) setExpandedGroup(null)
    }, [showPreview])

    const updatePlain = useCallback((nextPlain: string) => {
      plainRef.current = nextPlain
      setPlain(nextPlain)
    }, [])

    const runFormat = useCallback(
      (action: NoteFormatAction) => {
        const result = applyNoteFormat(plainRef.current, selection, action)
        updatePlain(result.text)
        setSelection(result.selection)
        inputRef.current?.focus()
      },
      [selection, updatePlain],
    )

    const toggleGroup = useCallback((groupId: FormatGroupId) => {
      setExpandedGroup((current) => (current === groupId ? null : groupId))
    }, [])

    const insertPhoto = useCallback(async () => {
      if (disabled || showPreview || insertingPhoto) return
      promptNoteImageSource((source) => {
        void (async () => {
          setInsertingPhoto(true)
          try {
            const file = await pickNoteImage(source)
            if (!file) return
            const snippet = await buildNoteImageInsertSnippet({
              file,
              session,
              noteId,
              bodyText: plainRef.current,
            })
            const result = insertSnippetAtSelection(plainRef.current, selection, snippet)
            updatePlain(result.text)
            setSelection(result.selection)
            inputRef.current?.focus()
          } catch (err) {
            AppAlert.alert(
              "Could not insert photo",
              err instanceof Error ? err.message : "Try again with a smaller image.",
            )
          } finally {
            setInsertingPhoto(false)
          }
        })()
      })
    }, [disabled, showPreview, insertingPhoto, session, noteId, selection, updatePlain])

    const handleFormatTool = useCallback(
      (tool: FormatTool) => {
        if (tool.kind === "photo") {
          void insertPhoto()
          return
        }
        runFormat(tool.action)
      },
      [insertPhoto, runFormat],
    )

    const htmlPreviewVisible =
      showPreview &&
      !isMarkdown &&
      Boolean(previewHtml.trim()) &&
      (isNoteHtml(previewHtml) || plain.includes("**") || plain.startsWith("#"))

    const previewMarkdown = sanitizeMarkdownNoteBody(plainRef.current || plain)

    return (
      <View style={styles.root}>
        {!disabled ? (
          <View style={styles.toolbox}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.primaryRow}>
              <PreviewToggleButton
                active={showPreview}
                accent={tokens.accent}
                native={native}
                onPress={() => setShowPreview((current) => !current)}
              />
              <View style={[styles.divider, { backgroundColor: native.separator }]} />
              {FORMAT_GROUPS.map((group) => (
                <FormatGroupChip
                  key={group.id}
                  group={group}
                  expanded={expandedGroup === group.id}
                  disabled={showPreview}
                  accent={tokens.accent}
                  native={native}
                  type={type}
                  onPress={() => toggleGroup(group.id)}
                />
              ))}
            </ScrollView>

            {activeGroup && !showPreview ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.expandedRow}>
                {activeGroup.tools.map((tool) => (
                  <FormatActionChip
                    key={tool.kind === "photo" ? "photo" : tool.action}
                    label={tool.label}
                    loading={tool.kind === "photo" && insertingPhoto}
                    accent={tokens.accent}
                    native={native}
                    type={type}
                    onPress={() => handleFormatTool(tool)}
                  />
                ))}
              </ScrollView>
            ) : null}
          </View>
        ) : null}

        {showPreview ? (
          <CommGroupedList>
            <View style={styles.previewWrap}>
              {isMarkdown ? (
                <MarkdownNotePreview markdown={previewMarkdown} paddingHorizontal={14} />
              ) : htmlPreviewVisible ? (
                <DigitalNoteBodyView content={previewHtml} accentColor={tokens.accent} paddingHorizontal={14} />
              ) : (
                <MarkdownNotePreview markdown={previewMarkdown} paddingHorizontal={14} />
              )}
            </View>
          </CommGroupedList>
        ) : (
          <CommGroupedList>
            {disabled ? (
              <View style={styles.insetField}>
                <DigitalNoteBodyView
                  content={plain || value}
                  accentColor={tokens.accent}
                  paddingHorizontal={14}
                />
              </View>
            ) : (
              <TextInput
                ref={inputRef}
                value={plain}
                onChangeText={updatePlain}
                onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
                placeholder={placeholder ?? "Start typing…"}
                placeholderTextColor={native.tertiaryLabel}
                multiline
                textAlignVertical="top"
                autoCorrect={false}
                autoCapitalize="sentences"
                style={[
                  styles.bodyInput,
                  type.body,
                  isMarkdown && styles.markdownInput,
                  { color: native.label },
                ]}
              />
            )}
          </CommGroupedList>
        )}
      </View>
    )
  },
)

const styles = StyleSheet.create({
  root: { gap: 10 },
  toolbox: { gap: 8 },
  primaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  expandedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    marginHorizontal: 2,
  },
  groupChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: NATIVE.sectionRadius,
    minHeight: 36,
  },
  groupChipLabel: {
    fontWeight: "600",
    fontSize: 13,
  },
  actionChip: {
    minWidth: 72,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionChipLabel: {
    fontWeight: "700",
    fontSize: 13,
  },
  previewWrap: { overflow: "hidden", paddingVertical: 4 },
  insetField: { paddingVertical: 6 },
  bodyInput: {
    minHeight: 200,
    paddingHorizontal: 14,
    paddingVertical: 14,
    lineHeight: 24,
  },
  markdownInput: {
    fontFamily: "Menlo",
    fontSize: 14,
    lineHeight: 22,
  },
})
