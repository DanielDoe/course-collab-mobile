import { useMemo } from "react"
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { hexToRgba } from "../../constants/app-themes"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useThemedStudentNative } from "../../lib/themed-module-theme"
import {
  getGradableSubquestions,
  parseSubquestions,
  subquestionOptionLabels,
  type MultiPartSubQuestion,
} from "../../lib/lecture-sample-practice-utils"
import { isMultiSelectType } from "../../lib/practice-session"
import { useStudentSubmissionLayout } from "../../lib/circuit-submission-layout"
import { QuestionContentWebView } from "../rewards/QuestionContent"

export type MultiPartAnswerPayload = {
  version: 1
  parts: Record<string, string | string[]>
}

export function emptyMultiPartAnswer(subquestionsRaw: unknown): MultiPartAnswerPayload {
  const subs = getGradableSubquestions(subquestionsRaw)
  const parts: Record<string, string | string[]> = {}
  for (const sq of subs) {
    parts[sq.id] = isMultiSelectType(sq.type) ? [] : ""
  }
  return { version: 1, parts }
}

export function parseMultiPartAnswerJson(raw: string, subquestionsRaw: unknown): MultiPartAnswerPayload {
  const base = emptyMultiPartAnswer(subquestionsRaw)
  if (!raw.trim()) return base
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (parsed.version === 1 && parsed.parts && typeof parsed.parts === "object") {
      return {
        version: 1,
        parts: { ...base.parts, ...(parsed.parts as Record<string, string | string[]>) },
      }
    }
    if (typeof parsed === "object" && !parsed.parts) {
      return { version: 1, parts: { ...base.parts, ...(parsed as Record<string, string | string[]>) } }
    }
  } catch {
    /* ignore */
  }
  return base
}

export function serializeMultiPartAnswer(payload: MultiPartAnswerPayload): string {
  return JSON.stringify(payload)
}

export function multiPartAnswerReady(subquestionsRaw: unknown, payload: MultiPartAnswerPayload): boolean {
  const subs = getGradableSubquestions(subquestionsRaw)
  if (subs.length === 0) return false
  for (const sq of subs) {
    const val = payload.parts[sq.id]
    if (isMultiSelectType(sq.type)) {
      if (!Array.isArray(val) || val.length === 0) return false
      continue
    }
    const t = sq.type.toLowerCase()
    if (t === "fill_blank" || t === "fill_in_blank" || t === "short_answer" || t === "text") {
      if (!String(val ?? "").trim()) return false
      continue
    }
    if (!String(val ?? "").trim()) return false
  }
  return true
}

type Props = {
  subquestionsRaw: unknown
  value: string
  onChange: (nextJson: string) => void
  disabled?: boolean
  textFieldHeight?: number
  onReady?: (slot: string) => void
}

function isTextSubquestion(sq: MultiPartSubQuestion): boolean {
  const t = sq.type.toLowerCase()
  return t === "fill_blank" || t === "fill_in_blank" || t === "short_answer" || t === "text"
}

export function MultiPartAnswerPanel({
  subquestionsRaw,
  value,
  onChange,
  disabled,
  textFieldHeight: textFieldHeightProp,
  onReady,
}: Props) {
  const tokens = useAppThemeTokens()
  const SN = useThemedStudentNative()
  const { multipartTextHeight } = useStudentSubmissionLayout()
  const textFieldHeight = textFieldHeightProp ?? multipartTextHeight
  const subquestions = useMemo(() => parseSubquestions(subquestionsRaw), [subquestionsRaw])
  const gradable = useMemo(() => getGradableSubquestions(subquestionsRaw), [subquestionsRaw])
  const payload = useMemo(() => parseMultiPartAnswerJson(value, subquestionsRaw), [value, subquestionsRaw])

  const updatePart = (id: string, next: string | string[]) => {
    const nextPayload: MultiPartAnswerPayload = {
      version: 1,
      parts: { ...payload.parts, [id]: next },
    }
    onChange(serializeMultiPartAnswer(nextPayload))
  }

  if (gradable.length === 0) {
    return (
      <View style={[styles.emptyBox, { backgroundColor: hexToRgba(tokens.warning, 0.1), borderColor: hexToRgba(tokens.warning, 0.3) }]}>
        <Ionicons name="information-circle-outline" size={18} color={tokens.warning} />
        <Text style={[styles.emptyText, { color: SN.secondaryLabel }]}>
          This multi-part question has no gradable parts configured.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.wrap}>
      {gradable.map((sq, index) => {
        const options = subquestionOptionLabels(sq)
        const isMulti = isMultiSelectType(sq.type)
        const isText = isTextSubquestion(sq)
        const partVal = payload.parts[sq.id]
        const partLabel = subquestions.find((s) => s.id === sq.id)?.prompt
          ? `Part ${index + 1}`
          : `Part ${index + 1}`

        return (
          <View
            key={sq.id}
            style={[styles.partCard, { backgroundColor: tokens.background, borderColor: tokens.border }]}
          >
            <Text style={[styles.partLabel, { color: tokens.text }]}>{partLabel}</Text>
            {sq.prompt.trim() ? (
              <QuestionContentWebView
                text={sq.prompt}
                embedded
                compact
                onReady={() => onReady?.(`part-${sq.id}-prompt`)}
              />
            ) : null}

            {isText ? (
              <TextInput
                style={[
                  styles.textInput,
                  {
                    borderColor: tokens.border,
                    backgroundColor: tokens.surface,
                    color: tokens.text,
                    height: textFieldHeight,
                    minHeight: textFieldHeight,
                  },
                ]}
                value={String(partVal ?? "")}
                onChangeText={(text) => updatePart(sq.id, text)}
                placeholder="Type your answer"
                placeholderTextColor={SN.secondaryLabel}
                editable={!disabled}
                multiline
              />
            ) : options.length > 0 ? (
              <View style={styles.optionsStack}>
                {isMulti ? (
                  <Text style={[styles.selectAllHint, { color: SN.secondaryLabel }]}>
                    Select all that apply
                  </Text>
                ) : null}
                {options.map(({ letter, text }) => {
                  const selected = isMulti
                    ? Array.isArray(partVal) && partVal.includes(letter)
                    : String(partVal ?? "").toUpperCase() === letter.toUpperCase()
                  return (
                    <Pressable
                      key={letter}
                      testID={`practice-option-${letter}`}
                      accessibilityRole={isMulti ? "checkbox" : "radio"}
                      accessibilityState={{ selected, checked: isMulti ? selected : undefined }}
                      style={[
                        styles.option,
                        { borderColor: tokens.border, backgroundColor: tokens.surface },
                        selected && {
                          borderColor: tokens.accent,
                          backgroundColor: hexToRgba(tokens.accent, 0.06),
                        },
                      ]}
                      onPress={() => {
                        if (disabled) return
                        if (isMulti) {
                          const current = Array.isArray(partVal) ? partVal : []
                          updatePart(
                            sq.id,
                            current.includes(letter)
                              ? current.filter((l) => l !== letter)
                              : [...current, letter],
                          )
                        } else {
                          updatePart(sq.id, letter)
                        }
                      }}
                      disabled={disabled}
                    >
                      {isMulti ? (
                        <Ionicons
                          name={selected ? "checkbox" : "square-outline"}
                          size={24}
                          color={selected ? tokens.accent : SN.secondaryLabel}
                        />
                      ) : (
                        <View
                          style={[
                            styles.optionLetter,
                            { backgroundColor: tokens.background, borderColor: tokens.border },
                            selected && { backgroundColor: tokens.accent, borderColor: tokens.accent },
                          ]}
                        >
                          <Text
                            style={[
                              styles.optionLetterText,
                              { color: SN.secondaryLabel },
                              selected && styles.optionLetterTextSelected,
                            ]}
                          >
                            {letter}
                          </Text>
                        </View>
                      )}
                      <View style={styles.optionTextWrap}>
                        <QuestionContentWebView
                          text={text}
                          embedded
                          compact
                          onReady={() => onReady?.(`part-${sq.id}-option-${letter}`)}
                        />
                      </View>
                      {!isMulti && selected ? (
                        <Ionicons name="checkmark-circle" size={20} color={tokens.accent} />
                      ) : null}
                    </Pressable>
                  )
                })}
              </View>
            ) : (
              <TextInput
                style={[
                  styles.textInput,
                  {
                    borderColor: tokens.border,
                    backgroundColor: tokens.surface,
                    color: tokens.text,
                    height: textFieldHeight,
                    minHeight: textFieldHeight,
                  },
                ]}
                value={String(partVal ?? "")}
                onChangeText={(text) => updatePart(sq.id, text)}
                placeholder="Type your answer"
                placeholderTextColor={SN.secondaryLabel}
                editable={!disabled}
                multiline
              />
            )}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  partCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  partLabel: { fontSize: 13, fontWeight: "700" },
  optionsStack: { gap: 8 },
  selectAllHint: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  optionLetterText: { fontSize: 13, fontWeight: "600" },
  optionLetterTextSelected: { color: "#ffffff" },
  optionTextWrap: { flex: 1, minWidth: 0 },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 72,
    textAlignVertical: "top",
  },
  emptyBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyText: { flex: 1, fontSize: 13, lineHeight: 18 },
})
