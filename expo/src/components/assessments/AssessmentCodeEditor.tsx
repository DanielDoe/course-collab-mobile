import { useMemo } from "react"
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import { hexToRgba } from "../../constants/app-themes"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useThemedStudentNative } from "../../lib/themed-module-theme"
import {
  assessmentCodePlaceholder,
  countCodeLines,
  type AssessmentCodeLanguage,
} from "../../lib/assessment-code-editor"

const LINE_HEIGHT = 20
const FONT_SIZE = 13

type Props = {
  value: string
  onChange: (next: string) => void
  language: AssessmentCodeLanguage
  disabled?: boolean
  blockPaste?: boolean
  height: number
  onFocus?: () => void
  onBlur?: () => void
}

export function AssessmentCodeEditor({
  value,
  onChange,
  language,
  disabled,
  blockPaste,
  height,
  onFocus,
  onBlur,
}: Props) {
  const tokens = useAppThemeTokens()
  const SN = useThemedStudentNative()
  const lineCount = Math.max(1, countCodeLines(value))
  const gutterWidth = lineCount >= 100 ? 36 : 28
  const lineLabels = useMemo(
    () => Array.from({ length: lineCount }, (_, index) => String(index + 1)),
    [lineCount],
  )

  return (
    <View
      style={[
        styles.frame,
        {
          height,
          borderColor: tokens.border,
          backgroundColor: tokens.background,
        },
      ]}
    >
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator
      >
        <View style={[styles.row, { minHeight: height }]}>
          <View
            style={[
              styles.gutter,
              {
                width: gutterWidth,
                backgroundColor: hexToRgba(tokens.border, tokens.isDark ? 0.22 : 0.12),
              },
            ]}
            pointerEvents="none"
          >
            {lineLabels.map((label) => (
              <Text
                key={label}
                style={[styles.gutterText, { color: SN.secondaryLabel }]}
              >
                {label}
              </Text>
            ))}
          </View>
          <TextInput
            style={[
              styles.input,
              {
                color: tokens.text,
                minHeight: Math.max(height, lineCount * LINE_HEIGHT + 16),
              },
            ]}
            value={value}
            onChangeText={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={assessmentCodePlaceholder(language)}
            placeholderTextColor={SN.secondaryLabel}
            multiline
            scrollEnabled={false}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
            textContentType="none"
            textAlignVertical="top"
            editable={!disabled}
            contextMenuHidden={blockPaste}
            accessibilityLabel="Code input"
            accessibilityHint="Type your solution. Line numbers update as you write."
          />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: "hidden",
  },
  scroll: { flex: 1 },
  row: { flexDirection: "row", alignItems: "stretch" },
  gutter: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  gutterText: {
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    fontFamily: "Menlo",
    textAlign: "right",
    paddingRight: 6,
  },
  input: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 10,
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    fontFamily: "Menlo",
  },
})
