import { useMemo, useState } from "react"
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@/components/icons/AppIcon"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { hexToRgba } from "../../constants/app-themes"
import type { AiTutorCredits, ChatMessage } from "../../lib/ai-tutor-api"
import {
  buildConversationSummaryParts,
  conversationDepthLabel,
  estimateConversationTokens,
  formatConversationDate,
  formatCreditsLabel,
  searchConversationMessages,
  snippetAroundMatch,
} from "../../lib/cora-conversation-stats"
import { AiTutorMessageMarkdown } from "./AiTutorMessageMarkdown"
import { CoraBrand } from "../cora/CoraBrand"

type Props = {
  visible: boolean
  title: string
  messages: ChatMessage[]
  maxExchanges: number
  createdAt: string | null
  updatedAt: string | null
  credits: AiTutorCredits | null
  onClose: () => void
  onJumpToMessage: (messageId: string) => void
}

function StatRow({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: keyof typeof Ionicons.glyphMap
}) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()

  return (
    <View style={styles.statRow}>
      <View style={[styles.statIcon, { backgroundColor: hexToRgba(SN.accent, 0.1) }]}>
        <Ionicons name={icon} size={16} color={SN.accent} />
      </View>
      <View style={styles.statCopy}>
        <Text style={[type.caption, { color: SN.secondaryLabel }]}>{label}</Text>
        <Text style={[type.body, { color: native.label }]}>{value}</Text>
      </View>
    </View>
  )
}

export function CoraConversationDetailsSheet({
  visible,
  title,
  messages,
  maxExchanges,
  createdAt,
  updatedAt,
  credits,
  onClose,
  onJumpToMessage,
}: Props) {
  const native = useThemedNative()
  const SN = useThemedStudentNative()
  const type = useNativeType()
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const sheetMaxHeight = Math.min(windowHeight * 0.88, windowHeight - insets.top - 24)
  const [query, setQuery] = useState("")

  const summaryParts = useMemo(() => buildConversationSummaryParts(messages), [messages])
  const estimatedTokens = useMemo(() => estimateConversationTokens(messages), [messages])
  const matches = useMemo(() => searchConversationMessages(messages, query), [messages, query])

  const handleClose = () => {
    setQuery("")
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropFlex}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close conversation details"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: native.secondaryGrouped,
              height: sheetMaxHeight,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.sheetTop}>
            <View style={[styles.handle, { backgroundColor: native.separator }]} />
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={[type.bodyEmphasis, styles.title]} numberOfLines={2}>
                  {title}
                </Text>
                <Text style={[type.caption, { color: SN.secondaryLabel }]}>Conversation details</Text>
              </View>
              <Pressable onPress={handleClose} hitSlop={8}>
                <Ionicons name="close" size={22} color={SN.secondaryLabel} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            bounces
            alwaysBounceVertical
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={[styles.section, { backgroundColor: native.groupedBackground, borderColor: native.separator }]}>
              <Text style={[type.caption, styles.sectionLabel, { color: SN.secondaryLabel }]}>Summary</Text>
              {summaryParts.empty ? (
                <Text style={[type.body, styles.summary, { color: native.label }]}>
                  No messages yet. Ask Cora a question or import a course problem to begin.
                </Text>
              ) : (
                <View style={styles.summaryBlock}>
                  <Text style={[type.caption, styles.summaryLabel, { color: SN.secondaryLabel }]}>Started with</Text>
                  <AiTutorMessageMarkdown markdown={summaryParts.firstQuestion ?? ""} />
                  {summaryParts.waitingForReply ? (
                    <Text style={[type.body, styles.summary, { color: native.label }]}>
                      Waiting for Cora&apos;s first reply.
                    </Text>
                  ) : summaryParts.latestReply ? (
                    <>
                      <Text style={[type.caption, styles.summaryLabel, { color: SN.secondaryLabel }]}>Latest reply</Text>
                      <AiTutorMessageMarkdown markdown={summaryParts.latestReply} />
                    </>
                  ) : null}
                </View>
              )}
            </View>

            <View style={[styles.section, { backgroundColor: native.groupedBackground, borderColor: native.separator }]}>
              <Text style={[type.caption, styles.sectionLabel, { color: SN.secondaryLabel }]}>Activity</Text>
              <View style={styles.statList}>
                <StatRow label="Created" value={formatConversationDate(createdAt)} icon="calendar-outline" />
                <StatRow label="Last active" value={formatConversationDate(updatedAt)} icon="time-outline" />
                <StatRow label="Chat depth" value={conversationDepthLabel(messages, maxExchanges)} icon="layers-outline" />
                <StatRow
                  label="Estimated tokens in chat"
                  value={`~${estimatedTokens.toLocaleString()} tokens`}
                  icon="analytics-outline"
                />
                <StatRow label="Credits remaining" value={formatCreditsLabel(credits)} icon="sparkles-outline" />
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: native.groupedBackground, borderColor: native.separator }]}>
              <Text style={[type.caption, styles.sectionLabel, { color: SN.secondaryLabel }]}>Search in chat</Text>
              <View style={[styles.searchField, { borderColor: native.separator, backgroundColor: native.secondaryGrouped }]}>
                <Ionicons name="search-outline" size={18} color={SN.secondaryLabel} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search keywords…"
                  placeholderTextColor={SN.secondaryLabel}
                  style={[styles.searchInput, { color: native.label }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
              </View>

              {query.trim() ? (
                matches.length > 0 ? (
                  matches.map((message) => (
                    <Pressable
                      key={message.id}
                      onPress={() => {
                        onJumpToMessage(message.id)
                        handleClose()
                      }}
                      style={({ pressed }) => [
                        styles.resultRow,
                        { borderColor: native.separator, opacity: pressed ? NATIVE.pressedOpacity : 1 },
                      ]}
                    >
                      {message.role === "user" ? (
                        <Text style={[type.caption, styles.resultRole, { color: SN.accent }]}>You</Text>
                      ) : (
                        <CoraBrand size="xs" />
                      )}
                      <AiTutorMessageMarkdown markdown={snippetAroundMatch(message.content, query)} />
                    </Pressable>
                  ))
                ) : (
                  <Text style={[type.caption, styles.emptySearch, { color: SN.secondaryLabel }]}>
                    No messages match “{query.trim()}”.
                  </Text>
                )
              ) : (
                <Text style={[type.caption, styles.searchHint, { color: SN.secondaryLabel }]}>
                  Find any phrase from this conversation and jump to that message.
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  backdropFlex: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    width: "100%",
    overflow: "hidden",
  },
  sheetTop: {
    flexShrink: 0,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
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
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
  },
  content: {
    gap: 12,
    paddingBottom: 24,
  },
  section: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  sectionLabel: {
    fontWeight: "700",
  },
  summary: {
    lineHeight: 21,
  },
  summaryBlock: {
    gap: 8,
  },
  summaryLabel: {
    fontWeight: "600",
    marginTop: 2,
  },
  statList: {
    gap: 8,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statCopy: {
    flex: 1,
    gap: 2,
  },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  searchHint: {
    lineHeight: 18,
  },
  emptySearch: {
    lineHeight: 18,
  },
  resultRow: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  resultRole: {
    fontWeight: "700",
  },
})
