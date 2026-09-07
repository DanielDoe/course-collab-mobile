import { MessagesInboxScreen } from "../messages/MessagesInboxScreen"
import { MessagesErrorBoundary } from "../messages/MessagesErrorBoundary"

/** Faculty Communication → Messages (Canvas-style direct messaging). */
export function FacultyMessagesScreen() {
  return (
    <MessagesErrorBoundary feature="Messages">
      <MessagesInboxScreen />
    </MessagesErrorBoundary>
  )
}
