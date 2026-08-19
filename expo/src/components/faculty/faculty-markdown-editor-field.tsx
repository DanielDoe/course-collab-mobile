import { useState } from "react"
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { QuestionContentWebView } from "../rewards/QuestionContent"
import { FacultySheetTextInput, FACULTY_SHEET_CHIP_RADIUS, useCollabSheetStyles } from "./faculty-collab-sheet-ui"

type EditorMode = "formatted" | "raw"

type Props = {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  large?: boolean
  accessibilityLabel?: string
}

export function FacultyMarkdownEditorField({
  value,
  onChangeText,
  placeholder,
  large,
  accessibilityLabel,
}: Props) {
  const { native, tokens, type } = useModuleTheme()
  const collabSheetStyles = useCollabSheetStyles()
  const [mode, setMode] = useState<EditorMode>(() => (value.trim() ? "formatted" : "raw"))

  return (
    <View style={styles.wrap}>
      <View style={styles.toggleRow}>
        <ModeChip
          label="Formatted"
          active={mode === "formatted"}
          onPress={() => setMode("formatted")}
        />
        <ModeChip
          label="Raw"
          active={mode === "raw"}
          onPress={() => setMode("raw")}
        />
      </View>

      {mode === "formatted" ? (
        <View
          style={[
            styles.previewBox,
            { borderColor: native.separator, backgroundColor: native.secondaryGrouped },
          ]}
        >
          {value.trim() ? (
            <QuestionContentWebView text={value} embedded />
          ) : (
            <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>
              Nothing to preview yet. Switch to Raw to type markdown.
            </Text>
          )}
        </View>
      ) : (
        <FacultySheetTextInput
          style={large ? collabSheetStyles.textAreaLg : collabSheetStyles.textArea}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          accessibilityLabel={accessibilityLabel}
          multiline
          textAlignVertical="top"
        />
      )}
    </View>
  )
}

function ModeChip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  const { native, tokens, type } = useModuleTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label} ${active ? "selected" : ""}`.trim()}
      style={[
        styles.chip,
        {
          backgroundColor: active ? tokens.accent : native.fill,
          borderColor: active ? tokens.accent : native.separator,
        },
      ]}
    >
      <Text
        style={[
          type.caption,
          styles.chipLabel,
          { color: active ? "#ffffff" : native.secondaryLabel } as StyleProp<TextStyle>,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  toggleRow: { flexDirection: "row", gap: 8 },
  chip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    paddingVertical: 8,
    borderRadius: FACULTY_SHEET_CHIP_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipLabel: { fontWeight: "700" },
  previewBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: NATIVE.sectionRadius,
    padding: 12,
    minHeight: 80,
  },
})
