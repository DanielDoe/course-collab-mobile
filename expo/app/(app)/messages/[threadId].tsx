import { MessagesErrorBoundary } from "../../../src/components/messages/MessagesErrorBoundary"
import { MessagesThreadScreen } from "../../../src/components/messages/MessagesThreadScreen"

export default function MessagesThreadRoute() {
  return (
    <MessagesErrorBoundary feature="Conversation">
      <MessagesThreadScreen />
    </MessagesErrorBoundary>
  )
}
