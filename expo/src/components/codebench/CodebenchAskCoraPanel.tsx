import { useMemo, useState } from "react"
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ViewStyle } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated"
import { LinearGradient } from "expo-linear-gradient"
import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
import { readAsStringAsync } from "expo-file-system/legacy"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAuthFlowContentStyle } from "../../lib/responsive-layout"
import { chatKeyboardAvoidingBehavior } from "../../lib/motion"
import { hexToRgba } from "../../constants/app-themes"
import {
  formatAttachmentsForMessage,
  isLikelyTextFile,
  type CoraComposerAttachment,
} from "../../lib/cora-composer-attachments"
import type { CoraImportedProblem } from "../../lib/cora-api"
import type { StudentSession } from "../../lib/session"
import { AiTutorMessageMarkdown } from "../ai-tutor/AiTutorMessageMarkdown"
import { CoraImportCourseSheet } from "../ai-tutor/CoraImportCourseSheet"
import { CoraThinkingIndicator } from "../ai-tutor/CoraThinkingIndicator"
import { CoraBrand } from "../cora/CoraBrand"
import {
  getAssistantMessageColors,
  getUserPromptBubbleColors,
  getUserPromptBubbleRadius,
  getUserPromptBubbleShadow,
} from "../ai-tutor/cora-chat-bubble-theme"
import { CodebenchCoraAttachMenu, type CodebenchCoraAttachAction } from "./CodebenchCoraAttachMenu"
import { ComposerSendButton } from "../theme/ComposerSendButton"
import { IosEdgeBackSwipe } from "../navigation/IosEdgeBackSwipe"

export type CodebenchTutorMessage = { role: "user" | "assistant"; content: string }

type Props = {
  session: StudentSession
  studentFirstName: string
  messages: CodebenchTutorMessage[]
  input: string
  onChangeInput: (value: string) => void
  busy: boolean
  expanded: boolean
  fullscreen?: boolean
  onCollapse?: () => void
  onClose?: () => void
  onSend: (payload: {
    message: string
    attachments: CoraComposerAttachment[]
    importedProblem: CoraImportedProblem | null
    importedLabel: string | null
  }) => void | Promise<void>
}

function AskCoraComposer({
  value,
  onChangeText,
  onSend,
  onOpenAttach,
  canSend,
  busy,
  docked,
  onFocus,
  onBlur,
  heroContentStyle,
}: {
  value: string
  onChangeText: (text: string) => void
  onSend: () => void
  onOpenAttach: () => void
  canSend: boolean
  busy: boolean
  docked: boolean
  onFocus: () => void
  onBlur: () => void
  heroContentStyle?: ViewStyle
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const shellBg = tokens.isDark ? hexToRgba("#FFFFFF", 0.08) : "#FFFFFF"

  return (
    <View
      style={[
        styles.composerShell,
        docked ? styles.composerShellDocked : [styles.composerShellHero, heroContentStyle],
        {
          backgroundColor: shellBg,
          borderColor: tokens.isDark ? hexToRgba("#FFFFFF", 0.12) : hexToRgba("#000000", 0.08),
          shadowColor: native.label,
        },
      ]}
    >
      <Pressable
        onPress={onOpenAttach}
        disabled={busy}
        style={({ pressed }) => [
          styles.attachBtn,
          { opacity: pressed ? NATIVE.pressedOpacity : busy ? 0.45 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Add photos, files, or course questions"
      >
        <Ionicons name="add" size={22} color={SN.secondaryLabel} />
      </Pressable>

      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Ask Cora"
          placeholderTextColor={SN.secondaryLabel}
          style={[styles.composerInput, { color: native.label }]}
          editable={!busy}
          multiline
          maxLength={2000}
          onFocus={onFocus}
          onBlur={onBlur}
          scrollEnabled={value.includes("\n")}
          textAlignVertical="center"
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={() => {
            if (canSend) onSend()
          }}
        />
      </View>

      <ComposerSendButton active={canSend} onPress={onSend} size={42} iconSize={18} />
    </View>
  )
}

export function CodebenchAskCoraPanel({
  session,
  studentFirstName,
  messages,
  input,
  onChangeInput,
  busy,
  expanded,
  fullscreen = false,
  onCollapse,
  onClose,
  onSend,
}: Props) {
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const userBubbleColors = getUserPromptBubbleColors(tokens.isDark, native)
  const assistantColors = getAssistantMessageColors(tokens.isDark, native)
  const panelContentStyle = useAuthFlowContentStyle()

  const [focused, setFocused] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [attachments, setAttachments] = useState<CoraComposerAttachment[]>([])
  const [importedProblem, setImportedProblem] = useState<CoraImportedProblem | null>(null)
  const [importedLabel, setImportedLabel] = useState<string | null>(null)

  const hasConversation = messages.length > 0
  const isDocked = hasConversation || input.trim().length > 0 || focused || attachments.length > 0 || !!importedProblem
  const canSend = Boolean(input.trim() || attachments.length > 0 || importedProblem) && !busy

  const ambientColors = useMemo(
    () =>
      tokens.isDark
        ? (["#0B1020", "#101828", "#162033"] as const)
        : (["#F8FBFF", "#EAF3FF", "#DCEBFF"] as const),
    [tokens.isDark],
  )

  const handleSend = () => {
    if (!canSend) return
    const attachmentExtra = formatAttachmentsForMessage(attachments)
    const message = `${input.trim()}${attachmentExtra}`.trim()
    if (!message && !importedProblem) return
    void onSend({
      message: message || "Help me with this imported question.",
      attachments,
      importedProblem,
      importedLabel,
    })
    setAttachments([])
    setImportedProblem(null)
    setImportedLabel(null)
  }

  const handleAttachAction = async (action: CodebenchCoraAttachAction) => {
    switch (action) {
      case "photos": {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!perm.granted) {
          AppAlert.alert("Photos access needed", "Allow photo access to attach images.")
          return
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.85,
          allowsEditing: false,
          mediaTypes: ["images"],
        })
        if (result.canceled) return
        const asset = result.assets[0]
        setAttachments((prev) => [
          ...prev,
          {
            id: asset.uri,
            name: asset.fileName ?? "photo.jpg",
            mimeType: asset.mimeType ?? "image/jpeg",
            kind: "image",
            size: asset.fileSize,
          },
        ])
        return
      }
      case "camera": {
        const perm = await ImagePicker.requestCameraPermissionsAsync()
        if (!perm.granted) {
          AppAlert.alert("Camera access needed", "Allow camera access to take a photo.")
          return
        }
        const result = await ImagePicker.launchCameraAsync({
          quality: 0.85,
          allowsEditing: false,
        })
        if (result.canceled) return
        const asset = result.assets[0]
        setAttachments((prev) => [
          ...prev,
          {
            id: asset.uri,
            name: asset.fileName ?? "photo.jpg",
            mimeType: asset.mimeType ?? "image/jpeg",
            kind: "image",
            size: asset.fileSize,
          },
        ])
        return
      }
      case "file": {
        const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true })
        if (result.canceled) return
        const next: CoraComposerAttachment[] = []
        for (const asset of result.assets) {
          const mimeType = asset.mimeType ?? "application/octet-stream"
          if (mimeType.startsWith("image/")) {
            next.push({
              id: asset.uri,
              name: asset.name,
              mimeType,
              kind: "image",
              size: asset.size,
            })
            continue
          }
          if (isLikelyTextFile(asset.name, mimeType)) {
            try {
              const text = (await readAsStringAsync(asset.uri)).slice(0, 50_000)
              next.push({
                id: asset.uri,
                name: asset.name,
                mimeType,
                kind: "text",
                text,
                size: asset.size,
              })
            } catch {
              AppAlert.alert("Could not read file", `Unable to read ${asset.name}.`)
            }
            continue
          }
          AppAlert.alert("Unsupported file", `${asset.name} is not a supported text or image file yet.`)
        }
        if (next.length > 0) setAttachments((prev) => [...prev, ...next])
        return
      }
      case "import-course":
        setImportOpen(true)
        return
    }
  }

  const attachmentChips = (
    <>
      {attachments.map((attachment) => (
        <View
          key={attachment.id}
          style={[styles.attachmentChip, { backgroundColor: hexToRgba(tokens.accent, 0.08), borderColor: hexToRgba(tokens.accent, 0.18) }]}
        >
          <Ionicons
            name={attachment.kind === "image" ? "image-outline" : "document-text-outline"}
            size={14}
            color={tokens.accent}
          />
          <Text style={[type.caption, { color: native.label, flex: 1 }]} numberOfLines={1}>
            {attachment.name}
          </Text>
          <Pressable
            hitSlop={6}
            onPress={() => setAttachments((prev) => prev.filter((item) => item.id !== attachment.id))}
          >
            <Ionicons name="close" size={14} color={native.secondaryLabel} />
          </Pressable>
        </View>
      ))}
      {importedProblem ? (
        <View
          style={[styles.attachmentChip, { backgroundColor: hexToRgba(tokens.accent, 0.08), borderColor: hexToRgba(tokens.accent, 0.18) }]}
        >
          <Ionicons name="book-outline" size={14} color={tokens.accent} />
          <Text style={[type.caption, { color: native.label, flex: 1 }]} numberOfLines={1}>
            {importedLabel ?? importedProblem.title ?? "Imported question"}
          </Text>
          <Pressable
            hitSlop={6}
            onPress={() => {
              setImportedProblem(null)
              setImportedLabel(null)
            }}
          >
            <Ionicons name="close" size={14} color={native.secondaryLabel} />
          </Pressable>
        </View>
      ) : null}
    </>
  )

  const composer = (docked: boolean) => (
    <AskCoraComposer
      value={input}
      onChangeText={onChangeInput}
      onSend={handleSend}
      onOpenAttach={() => setAttachOpen(true)}
      canSend={canSend}
      busy={busy}
      docked={docked}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      heroContentStyle={panelContentStyle}
    />
  )

  const header = fullscreen ? (
    <View style={styles.head}>
      <View style={styles.headTitleBlock}>
        <CoraBrand size="sm" />
        {busy ? (
          <Text style={[type.caption, { color: native.secondaryLabel }]}>is thinking…</Text>
        ) : null}
      </View>
      <View style={styles.headActions}>
        <Pressable
          onPress={onCollapse}
          hitSlop={8}
          style={[styles.headBtn, { backgroundColor: hexToRgba(tokens.accent, 0.1) }]}
          accessibilityLabel="Collapse Ask Cora"
        >
          <Ionicons name="contract-outline" size={18} color={native.label} />
        </Pressable>
        <Pressable onPress={onClose} hitSlop={8} style={styles.headBtn} accessibilityLabel="Close Ask Cora">
          <Ionicons name="close" size={18} color={native.secondaryLabel} />
        </Pressable>
      </View>
    </View>
  ) : null

  const body = (
    <>
      {isDocked ? (
        <>
          {hasConversation ? (
            <Animated.View entering={FadeIn.duration(220)} style={styles.messagesHost}>
              <ScrollView
                style={styles.messagesScroll}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
                keyboardDismissMode="interactive"
              >
                {messages.map((m, i) => {
                  const isUser = m.role === "user"
                  return (
                    <View
                      key={`${m.role}-${i}`}
                      style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAssistant]}
                    >
                      {isUser ? (
                        <View
                          style={[
                            styles.userBubble,
                            getUserPromptBubbleShadow(tokens.isDark),
                            {
                              backgroundColor: userBubbleColors.background,
                              borderRadius: getUserPromptBubbleRadius(),
                            },
                          ]}
                        >
                          <Text style={[type.body, styles.messageText, { color: userBubbleColors.text }]}>
                            {m.content}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.assistantBubble}>
                          {/[*_`#[\]]/.test(m.content) ? (
                            <AiTutorMessageMarkdown markdown={m.content} />
                          ) : (
                            <Text style={[type.body, styles.messageText, { color: assistantColors.text }]}>
                              {m.content}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  )
                })}
                {busy ? (
                  <View style={[styles.messageRow, styles.messageRowAssistant]}>
                    <View style={styles.thinkingBubble}>
                      <CoraThinkingIndicator context="codebench" hideBrand />
                    </View>
                  </View>
                ) : null}
              </ScrollView>
            </Animated.View>
          ) : (
            <View style={styles.messagesSpacer} />
          )}

          {(attachments.length > 0 || importedProblem) && (
            <View style={styles.attachmentStrip}>{attachmentChips}</View>
          )}

          <Animated.View
            layout={LinearTransition.springify().damping(20).stiffness(180)}
            style={[styles.composerHost, { paddingBottom: Math.max(insets.bottom, 8) }]}
          >
            {composer(true)}
          </Animated.View>
        </>
      ) : (
        <Animated.View exiting={FadeOut.duration(180)} style={styles.heroHost}>
          <CoraBrand size="md" style={styles.heroBrand} />
          <Text style={[styles.heroGreeting, { color: native.label }]}>
            Hi {studentFirstName}, what&apos;s the move?
          </Text>
          {(attachments.length > 0 || importedProblem) && (
            <View style={[styles.attachmentStrip, styles.attachmentStripHero]}>{attachmentChips}</View>
          )}
          <Animated.View
            layout={LinearTransition.springify().damping(20).stiffness(180)}
            style={[styles.heroComposerWrap, panelContentStyle, { paddingBottom: Math.max(insets.bottom, 8) }]}
          >
            {composer(false)}
          </Animated.View>
        </Animated.View>
      )}

      <CodebenchCoraAttachMenu
        visible={attachOpen}
        onClose={() => setAttachOpen(false)}
        onAction={(action) => void handleAttachAction(action)}
      />
      <CoraImportCourseSheet
        visible={importOpen}
        session={session}
        onClose={() => setImportOpen(false)}
        onImportProblem={(problem, label) => {
          setImportedProblem(problem)
          setImportedLabel(label)
          setImportOpen(false)
        }}
      />
    </>
  )

  if (fullscreen) {
    return (
      <Modal visible animationType="fade" statusBarTranslucent presentationStyle="fullScreen">
        <KeyboardAvoidingView
          style={styles.fullscreenHost}
          behavior={chatKeyboardAvoidingBehavior}
        >
          <LinearGradient colors={[...ambientColors]} style={StyleSheet.absoluteFill} />
          <IosEdgeBackSwipe onBack={onCollapse ?? onClose ?? (() => {})} topInset={insets.top} />
          <View style={[styles.fullscreenFrame, { paddingTop: insets.top }]}>
            {header}
            <View style={[styles.root, styles.rootExpanded]}>{body}</View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, expanded && styles.rootExpanded]}
      behavior={chatKeyboardAvoidingBehavior}
    >
      <LinearGradient colors={[...ambientColors]} style={StyleSheet.absoluteFill} />
      {body}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  fullscreenHost: {
    flex: 1,
  },
  fullscreenFrame: {
    flex: 1,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headTitleBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  headIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headTitle: {
    flex: 1,
    fontSize: 17,
  },
  headActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  root: {
    flex: 1,
    minHeight: 180,
    overflow: "hidden",
  },
  rootExpanded: {
    flex: 1,
  },
  heroHost: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 18,
  },
  heroBrand: {
    marginBottom: -4,
  },
  heroComposerWrap: {
    width: "100%",
    paddingHorizontal: 0,
  },
  attachmentStripHero: {
    width: "100%",
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  heroGreeting: {
    textAlign: "center",
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
    fontWeight: "400",
  },
  messagesHost: {
    flex: 1,
    minHeight: 0,
  },
  messagesSpacer: {
    flex: 1,
  },
  messagesScroll: {
    flex: 1,
    paddingHorizontal: 14,
  },
  messagesContent: {
    gap: 14,
    paddingTop: 8,
    paddingBottom: 12,
  },
  messageRow: { width: "100%" },
  messageRowUser: { alignItems: "flex-end" },
  messageRowAssistant: { alignItems: "flex-start" },
  messageText: { fontSize: 16, lineHeight: 24 },
  userBubble: {
    maxWidth: "88%",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  assistantBubble: { alignSelf: "stretch", width: "100%" },
  thinkingBubble: { paddingVertical: 2 },
  attachmentStrip: {
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  composerHost: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  composerShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 6,
    paddingRight: 8,
    paddingVertical: 6,
    minHeight: 52,
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  composerShellHero: {
    width: "100%",
    alignSelf: "center",
  },
  composerShellDocked: {
    width: "100%",
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    flex: 1,
    minHeight: 40,
    justifyContent: "center",
  },
  composerInput: {
    width: "100%",
    fontSize: 16,
    lineHeight: 20,
    maxHeight: 120,
    paddingTop: 0,
    paddingBottom: 0,
    margin: 0,
    ...(Platform.OS === "android" ? { includeFontPadding: false, textAlignVertical: "center" as const } : {}),
  },
})
