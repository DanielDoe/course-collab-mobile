import { useMemo, useState } from "react"
import { Modal, Pressable, StyleSheet, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { AppAlert } from "../../lib/app-alert"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { NATIVE } from "../../constants/faculty-native-theme"
import { hasNavAccess } from "../../constants/student-nav"
import { CORA_NAME } from "../../lib/cora-constants"
import { studentCoraActionColors } from "../../lib/student-cora-theme"
import { useStudentShell } from "../../context/StudentShellContext"
import { useStudentCoraContext } from "../../hooks/useStudentCoraContext"
import { StudentCoraContextProvider } from "../../context/StudentCoraContextProvider"
import type { StudentSession } from "../../lib/session"
import { CoraImmersiveChat } from "../ai-tutor/CoraImmersiveChat"
import { useStudentLectureCoraChat } from "../../hooks/useStudentLectureCoraChat"
import type { ChatMessage } from "../../lib/ai-tutor-api"

type Props = {
  session: StudentSession
  lectureId: number
  week: number
  title: string
}

function LectureCoraChatModal({
  session,
  lectureId,
  week,
  title,
  visible,
  onClose,
}: Props & { visible: boolean; onClose: () => void }) {
  const { membershipTier, membershipTierLoaded } = useStudentShell()
  const { context: coraContext, capabilities } = useStudentCoraContext({
    session,
    enabled: visible,
  })

  const chat = useStudentLectureCoraChat({
    session,
    lectureId,
    week,
    lectureTitle: title,
    enabled: visible,
    membershipTier,
    membershipTierLoaded,
  })

  const noopThread = () => undefined

  return (
    <StudentCoraContextProvider context={coraContext} capabilities={capabilities}>
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
        <CoraImmersiveChat
          session={session}
          studentFirstName={chat.studentFirstName}
          chatHydrated={!chat.contextLoading}
          historyLoading={chat.contextLoading}
          messages={chat.messages}
          input={chat.input}
          setInput={chat.setInput}
          streaming={chat.streaming}
          streamingMessageId={chat.streamingMessageId}
          atExchangeLimit={chat.atExchangeLimit}
          nearExchangeLimit={chat.nearExchangeLimit}
          remainingExchanges={chat.remainingExchanges}
          exchangeCount={chat.exchangeCount}
          maxExchanges={chat.maxExchanges}
          conversationTitle={chat.conversationTitle}
          threadCreatedAt={null}
          threadUpdatedAt={null}
          credits={chat.credits}
          onSend={(text) => void chat.sendMessage(text)}
          onStop={chat.stopStreaming}
          onRegenerate={chat.regenerateLastResponse}
          onBranchChat={noopThread}
          onEditUserMessage={(message: ChatMessage) => chat.setInput(message.content)}
          onNavigateUserMessageVersion={noopThread}
          onBack={onClose}
          onNewFromChat={chat.clearChat}
          threads={[]}
          archivedThreads={[]}
          activeThreadId={null}
          onOpenThread={noopThread}
          onRenameThread={noopThread}
          onArchiveThread={noopThread}
          onRestoreThread={noopThread}
          onDeleteThread={noopThread}
        />
      </Modal>
    </StudentCoraContextProvider>
  )
}

/** Floating Cora chat affordance for the native lecture PDF viewer (students). */
export function StudentLectureCoraOverlay({ session, lectureId, week, title }: Props) {
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const router = useRouter()
  const { membershipTier, membershipTierLoaded } = useStudentShell()
  const [chatOpen, setChatOpen] = useState(false)

  const coraAction = useMemo(() => studentCoraActionColors(tokens), [tokens])

  function openChat() {
    if (!membershipTierLoaded) return
    if (!hasNavAccess(membershipTier, "Explorer")) {
      AppAlert.alert("Upgrade required", `${CORA_NAME} requires Explorer or Trailblazer membership.`, [
        { text: "Cancel", style: "cancel" },
        { text: "View plans", onPress: () => router.push("/membership" as never) },
      ])
      return
    }
    setChatOpen(true)
  }

  return (
    <>
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <Pressable
          onPress={openChat}
          style={[
            styles.fab,
            NATIVE.raisedShadow,
            {
              backgroundColor: coraAction.background,
              bottom: insets.bottom + 16,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Ask Cora about these slides"
        >
          <Ionicons name="chatbubbles-outline" size={24} color={coraAction.ink} />
        </Pressable>
      </View>

      <LectureCoraChatModal
        session={session}
        lectureId={lectureId}
        week={week}
        title={title}
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: NATIVE.pagePadding,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
})
