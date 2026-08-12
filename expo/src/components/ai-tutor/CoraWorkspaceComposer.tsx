import { useState } from "react"
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { NATIVE, nativeTextA11yProps } from "../../constants/faculty-native-theme"
import { hexToRgba } from "../../constants/app-themes"
import { CORA_NAME } from "../../lib/cora-constants"
import type { CoraImportedProblem } from "../../lib/ai-tutor-api"
import type { CoraComposerAttachment } from "../../lib/cora-composer-attachments"
import { CoraImportedQuestionPreview } from "./CoraImportedQuestionPreview"
import { ComposerSendButton } from "../theme/ComposerSendButton"
import {
  CORA_LEARNING_GOALS,
  type CoraLearningGoal,
  type CoraLearningGoalId,
} from "../../lib/cora-workspace-config"

type Props = {
  value: string
  onChangeText: (text: string) => void
  onSend: () => void
  /** Called while `streaming` to cancel the in-flight request. */
  onStop?: () => void
  canSend: boolean
  streaming: boolean
  disabled: boolean
  hasMessages: boolean
  selectedGoalId?: CoraLearningGoalId
  onSelectGoal?: (goal: CoraLearningGoal) => void
  onOpenAttachMenu: () => void
  onToggleVoice: () => void
  listening?: boolean
  attachments?: CoraComposerAttachment[]
  onRemoveAttachment?: (id: string) => void
  importedQuestion?: CoraImportedProblem | null
  importedQuestionLabel?: string | null
  onClearImportedQuestion?: () => void
  /** Hide student learning-goal pill (faculty Cora). */
  hideLearningGoals?: boolean
  /** Faculty / AI mode pill beside the attach button. */
  modePill?: {
    label: string
    hint?: string
    onPress?: () => void
  }
  placeholder?: string
  attachAccessibilityLabel?: string
}

export function CoraWorkspaceComposer({
  value,
  onChangeText,
  onSend,
  onStop,
  canSend,
  streaming,
  disabled,
  hasMessages,
  selectedGoalId,
  onSelectGoal,
  onOpenAttachMenu,
  onToggleVoice,
  listening = false,
  attachments = [],
  onRemoveAttachment,
  importedQuestion = null,
  importedQuestionLabel = null,
  onClearImportedQuestion,
  hideLearningGoals = false,
  modePill,
  placeholder,
  attachAccessibilityLabel,
}: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const [goalSheetOpen, setGoalSheetOpen] = useState(false)

  const selectedGoal =
    CORA_LEARNING_GOALS.find((g) => g.id === selectedGoalId) ?? CORA_LEARNING_GOALS[1]
  const shellBg = tokens.isDark ? native.secondaryGrouped : "#ffffff"
  const sendActive = canSend && !streaming
  const showStop = streaming && !!onStop
  const accent = tokens.accent
  const resolvedPlaceholder =
    placeholder ??
    (hasMessages
      ? "Ask a follow-up…"
      : importedQuestion
        ? "Ask about this problem…"
        : `Ask ${CORA_NAME}`)

  return (
    <>
      {importedQuestion ? (
        <View
          style={[
            styles.importStack,
            {
              backgroundColor: hexToRgba(SN.accent, 0.05),
              borderColor: hexToRgba(SN.accent, 0.14),
            },
          ]}
        >
          <CoraImportedQuestionPreview
            label={importedQuestionLabel ?? undefined}
            problem={importedQuestion}
            compact
            chatTurn
            onClear={onClearImportedQuestion}
          />
        </View>
      ) : null}

      {attachments.length > 0 ? (
        <View style={styles.attachmentRow}>
          {attachments.map((attachment) => (
            <View
              key={attachment.id}
              style={[
                styles.attachmentChip,
                { backgroundColor: native.groupedBackground, borderColor: native.separator },
              ]}
            >
              <Ionicons
                name={attachment.kind === "image" ? "image-outline" : "document-text-outline"}
                size={14}
                color={SN.secondaryLabel}
              />
              <Text style={[type.caption, styles.attachmentName, { color: native.label }]} numberOfLines={1}>
                {attachment.name}
              </Text>
              {onRemoveAttachment ? (
                <Pressable onPress={() => onRemoveAttachment(attachment.id)} hitSlop={6}>
                  <Ionicons name="close" size={14} color={SN.secondaryLabel} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <View
        style={[
          styles.shell,
          modePill ? styles.shellStacked : null,
          {
            backgroundColor: shellBg,
            borderColor: tokens.isDark ? native.separator : hexToRgba("#000000", 0.08),
            shadowColor: native.label,
          },
        ]}
      >
        {modePill ? (
          <>
            <TextInput
              {...nativeTextA11yProps}
              style={[styles.input, styles.inputStacked, { color: native.label }]}
              value={value}
              onChangeText={onChangeText}
              placeholder={resolvedPlaceholder}
              placeholderTextColor={SN.secondaryLabel}
              multiline
              maxLength={2000}
              editable={!streaming && !disabled}
            />

            <View style={styles.toolbar}>
              <Pressable
                onPress={onOpenAttachMenu}
                disabled={disabled}
                style={({ pressed }) => [
                  styles.attachBtn,
                  { opacity: pressed ? NATIVE.pressedOpacity : disabled ? 0.45 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  attachAccessibilityLabel ?? "Add files, course questions, and learning tools"
                }
              >
                <Ionicons name="add" size={22} color={SN.secondaryLabel} />
              </Pressable>

              <Pressable
                onPress={modePill.onPress}
                disabled={disabled || !modePill.onPress}
                style={({ pressed }) => [
                  styles.modePill,
                  {
                    backgroundColor: hexToRgba(SN.accent, 0.1),
                    borderColor: hexToRgba(SN.accent, 0.18),
                    opacity: pressed ? NATIVE.pressedOpacity : disabled ? 0.5 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${modePill.label}${modePill.hint ? `, ${modePill.hint}` : ""}`}
              >
                <Text style={[type.caption, styles.modeLabel, { color: SN.accent }]} numberOfLines={1}>
                  {modePill.label}
                </Text>
                {modePill.onPress ? <Ionicons name="chevron-down" size={12} color={SN.accent} /> : null}
              </Pressable>

              <View style={styles.toolbarSpacer} />

              <View style={styles.trailingBtns}>
                <Pressable
                  onPress={onToggleVoice}
                  disabled={disabled || streaming}
                  style={({ pressed }) => [
                    styles.micBtn,
                    {
                      backgroundColor: listening ? hexToRgba(accent, 0.12) : "transparent",
                      opacity: pressed ? NATIVE.pressedOpacity : disabled || streaming ? 0.45 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={listening ? "Stop dictation" : "Voice dictation"}
                >
                  <Ionicons
                    name={listening ? "mic" : "mic-outline"}
                    size={20}
                    color={listening ? accent : SN.secondaryLabel}
                  />
                </Pressable>

                <ComposerSendButton
                  active={sendActive}
                  onPress={showStop ? onStop! : onSend}
                  disabled={showStop ? false : !sendActive}
                  stop={showStop}
                  size={40}
                  testID={showStop ? "cora-composer-stop" : "cora-composer-send"}
                />
              </View>
            </View>
          </>
        ) : (
          <>
        <Pressable
          onPress={onOpenAttachMenu}
          disabled={disabled}
          style={({ pressed }) => [
            styles.attachBtn,
            { opacity: pressed ? NATIVE.pressedOpacity : disabled ? 0.45 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={attachAccessibilityLabel ?? "Add files, course questions, and learning tools"}
        >
          <Ionicons name="add" size={22} color={SN.secondaryLabel} />
        </Pressable>

        <View style={styles.inputColumn}>
          <TextInput
            {...nativeTextA11yProps}
            style={[styles.input, { color: native.label }]}
            value={value}
            onChangeText={onChangeText}
            placeholder={resolvedPlaceholder}
            placeholderTextColor={SN.secondaryLabel}
            multiline
            maxLength={2000}
            editable={!streaming && !disabled}
          />

          <View style={styles.toolbar}>
            {!hideLearningGoals && onSelectGoal ? (
              <Pressable
                onPress={() => setGoalSheetOpen(true)}
                disabled={disabled}
                style={({ pressed }) => [
                  styles.goalPill,
                  {
                    backgroundColor: hexToRgba(SN.accent, 0.1),
                    borderColor: hexToRgba(SN.accent, 0.18),
                    opacity: pressed ? NATIVE.pressedOpacity : disabled ? 0.5 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Learning goal"
              >
                <Text style={styles.goalEmoji}>{selectedGoal.emoji}</Text>
                <Text style={[type.caption, styles.goalLabel, { color: SN.accent }]}>
                  {selectedGoal.shortLabel}
                </Text>
                <Ionicons name="chevron-down" size={14} color={SN.accent} />
              </Pressable>
            ) : (
              <View style={styles.toolbarSpacer} />
            )}

            <View style={styles.trailingBtns}>
              <Pressable
                onPress={onToggleVoice}
                disabled={disabled || streaming}
                style={({ pressed }) => [
                  styles.micBtn,
                  {
                    backgroundColor: listening ? hexToRgba(accent, 0.12) : "transparent",
                    opacity: pressed ? NATIVE.pressedOpacity : disabled || streaming ? 0.45 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={listening ? "Stop dictation" : "Voice dictation"}
              >
                <Ionicons
                  name={listening ? "mic" : "mic-outline"}
                  size={20}
                  color={listening ? accent : SN.secondaryLabel}
                />
              </Pressable>

              <ComposerSendButton
                active={sendActive}
                onPress={showStop ? onStop! : onSend}
                disabled={showStop ? false : !sendActive}
                stop={showStop}
                size={40}
                testID={showStop ? "cora-composer-stop" : "cora-composer-send"}
              />
            </View>
          </View>
        </View>
          </>
        )}
      </View>

      {!hideLearningGoals && onSelectGoal ? (
        <Modal visible={goalSheetOpen} animationType="slide" transparent onRequestClose={() => setGoalSheetOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setGoalSheetOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: native.secondaryGrouped }]} onPress={() => {}}>
            <View style={[styles.sheetHandle, { backgroundColor: native.separator }]} />
            <Text style={[type.bodyEmphasis, styles.sheetTitle]}>Learning goal</Text>
            <Text style={[type.caption, styles.sheetHint, { color: SN.secondaryLabel }]}>
              Choose how {CORA_NAME} should help with this conversation.
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {CORA_LEARNING_GOALS.map((goal) => {
                const active = goal.id === selectedGoalId
                return (
                  <Pressable
                    key={goal.id}
                    onPress={() => {
                      onSelectGoal(goal)
                      setGoalSheetOpen(false)
                    }}
                    style={({ pressed }) => [
                      styles.goalRow,
                      {
                        backgroundColor: active ? SN.accentSoft : "transparent",
                        borderColor: active ? hexToRgba(SN.accent, 0.35) : native.separator,
                        opacity: pressed ? NATIVE.pressedOpacity : 1,
                      },
                    ]}
                  >
                    <Text style={styles.goalRowEmoji}>{goal.emoji}</Text>
                    <View style={styles.goalRowCopy}>
                      <Text style={[type.bodyEmphasis, styles.goalRowTitle]}>{goal.label}</Text>
                      <Text style={[type.caption, { color: SN.secondaryLabel }]}>{goal.tagline}</Text>
                    </View>
                    {active ? <Ionicons name="checkmark-circle" size={20} color={SN.accent} /> : null}
                  </Pressable>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
        </Modal>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 6,
    paddingRight: 10,
    paddingVertical: 8,
    minHeight: 56,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  shellStacked: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 8,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 15,
  },
  inputStacked: {
    width: "100%",
    paddingHorizontal: 0,
    minHeight: 32,
  },
  inputColumn: {
    flex: 1,
    gap: 6,
  },
  input: {
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 120,
    minHeight: 28,
    paddingTop: Platform.OS === "ios" ? 2 : 0,
    paddingBottom: 0,
    paddingHorizontal: 2,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  toolbarSpacer: {
    flex: 1,
  },
  goalPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexShrink: 1,
  },
  goalEmoji: { fontSize: 14 },
  goalLabel: { fontWeight: "600" },
  trailingBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 28,
    maxHeight: "70%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 17,
    marginBottom: 4,
  },
  sheetHint: {
    marginBottom: 12,
    lineHeight: 18,
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  goalRowEmoji: { fontSize: 20 },
  goalRowCopy: { flex: 1, gap: 2 },
  goalRowTitle: { fontSize: 15 },
  attachmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  importStack: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
    marginBottom: 6,
  },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "100%",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  attachmentName: {
    maxWidth: 160,
    fontWeight: "600",
  },
})
