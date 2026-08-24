import { Modal } from "react-native"
import type { CoraImportedProblem } from "../../lib/cora-api"
import type { StudentSession } from "../../lib/session"
import { useStudentShell } from "../../context/StudentShellContext"
import { StudentCoraContextProvider } from "../../context/StudentCoraContextProvider"
import { useStudentCoraContext } from "../../hooks/useStudentCoraContext"
import { useStudentSamplePracticeCoraChat } from "../../hooks/useStudentSamplePracticeCoraChat"
import { CoraImmersiveChat } from "../ai-tutor/CoraImmersiveChat"
import type { ChatMessage } from "../../lib/ai-tutor-api"

type Props = {
  visible: boolean
  session: StudentSession
  importedProblem: CoraImportedProblem
  conversationTitle: string
  onClose: () => void
}

function SamplePracticeCoraChatBody({
  session,
  importedProblem,
  conversationTitle,
  visible,
  onClose,
}: Props) {
  const { membershipTier, membershipTierLoaded } = useStudentShell()
  const { context: coraContext, capabilities } = useStudentCoraContext({
    session,
    enabled: visible,
  })
  const chat = useStudentSamplePracticeCoraChat({
    session,
    importedProblem,
    conversationTitle,
    enabled: visible,
    membershipTier,
    membershipTierLoaded,
  })

  const noopThread = () => undefined

  return (
    <StudentCoraContextProvider context={coraContext} capabilities={capabilities}>
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
        onSend={(text, meta) => void chat.sendMessage(text, meta)}
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
        seedImportedQuestion={importedProblem}
        seedImportedQuestionLabel={importedProblem.title ?? conversationTitle}
      />
    </StudentCoraContextProvider>
  )
}

export function StudentSamplePracticeCoraChatModal(props: Props) {
  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={props.onClose}
    >
      {props.visible ? <SamplePracticeCoraChatBody {...props} /> : null}
    </Modal>
  )
}
