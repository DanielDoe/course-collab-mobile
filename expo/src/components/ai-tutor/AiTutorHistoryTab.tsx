import { StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { ModuleListRow, ModuleScreen, ModuleSection } from "../modules/ModuleScreen"
import { CommSectionFooter } from "../faculty/faculty-communication-ui"
import { NATIVE, nativeType } from "../../constants/faculty-native-theme"
import { hexToRgba } from "../../constants/app-themes"
import { useThemedStudentNative } from "../../lib/themed-module-theme"
import { formatRelativeTime } from "../../lib/collaboration-api"
import { CORA_NAME } from "../../lib/cora-constants"
import {
  countExchanges,
  isThreadAtExchangeLimit,
  type AiTutorChatThread,
} from "../../lib/ai-tutor-chat-storage"

export function AiTutorHistoryTab({
  threads,
  activeThreadId,
  onOpenThread,
  onDeleteThread,
  onNewChat,
  maxExchanges,
  contentTopPadding,
}: {
  threads: AiTutorChatThread[]
  activeThreadId: string | null
  onOpenThread: (thread: AiTutorChatThread) => void
  onDeleteThread: (threadId: string) => void
  onNewChat: () => void
  maxExchanges: number
  /** When parent already clears floating header chrome, pass page padding only. */
  contentTopPadding?: number
}) {
  const SN = useThemedStudentNative()

  const confirmDelete = (thread: AiTutorChatThread) => {
    AppAlert.alert("Delete chat?", `"${thread.title}" will be removed from this device.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDeleteThread(thread.id) },
    ])
  }

  return (
    <ModuleScreen contentStyle={contentTopPadding != null ? { paddingTop: contentTopPadding } : undefined}>
      <ModuleSection title="Saved Chats">
        {threads.length === 0 ? (
          <View style={styles.emptyRow}>
            <View style={[styles.emptyIcon, { backgroundColor: SN.accentSoft }]}>
              <Ionicons name="chatbubbles-outline" size={22} color={SN.accent} />
            </View>
            <Text style={styles.emptyTitle}>No saved chats yet</Text>
            <Text style={styles.emptySubtitle}>
              Conversations are saved on this device when you chat in Workspace. Start one from there.
            </Text>
          </View>
        ) : (
          threads.map((thread, index) => {
            const isActive = thread.id === activeThreadId
            const messageCount = thread.messages.length
            const exchangeCount = countExchanges(thread.messages)
            const atLimit = isThreadAtExchangeLimit(thread.messages, maxExchanges)
            return (
              <ModuleListRow
                key={thread.id}
                title={thread.title}
                subtitle={thread.preview}
                meta={`${exchangeCount}/${maxExchanges} exchanges · ${messageCount} messages · ${formatRelativeTime(thread.updatedAt)}`}
                icon="chatbubble-ellipses-outline"
                iconBg={SN.accentSoft}
                iconColor={SN.accent}
                badge={
                  isActive ? (
                    <View style={[styles.activeBadge, { backgroundColor: SN.accentSoft }]}>
                      <Text style={[styles.activeBadgeText, { color: SN.accent }]}>Active</Text>
                    </View>
                  ) : atLimit ? (
                    <View style={[styles.activeBadge, { backgroundColor: hexToRgba(NATIVE.secondaryLabel, 0.12) }]}>
                      <Text style={[styles.activeBadgeText, { color: NATIVE.secondaryLabel }]}>Full</Text>
                    </View>
                  ) : undefined
                }
                trailing={<Ionicons name="trash-outline" size={18} color={NATIVE.tertiaryLabel} />}
                onPress={() => onOpenThread(thread)}
                onTrailingPress={() => confirmDelete(thread)}
                last={index === threads.length - 1}
              />
            )
          })
        )}
      </ModuleSection>

      <CommSectionFooter>
        {`Chats stay on this device after refresh. Each chat allows up to ${maxExchanges} exchanges before starting a new one in ${CORA_NAME} Workspace.`}
      </CommSectionFooter>

      <ModuleSection title="Actions">
        <ModuleListRow
          title="Start new chat"
          subtitle="Save the current conversation and begin fresh"
          icon="add-circle-outline"
          iconBg={SN.accentSoft}
          iconColor={SN.accent}
          last
          onPress={onNewChat}
        />
      </ModuleSection>
    </ModuleScreen>
  )
}

const styles = StyleSheet.create({
  emptyRow: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 8,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    ...nativeType.bodyEmphasis,
    fontSize: 17,
    textAlign: "center",
  },
  emptySubtitle: {
    ...nativeType.caption,
    textAlign: "center",
    color: NATIVE.secondaryLabel,
    lineHeight: 20,
  },
  activeBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 4,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
})
