import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import {
  CORA_CHAT_ASSISTANT_TAIL_INSET,
  CORA_CHAT_EDGE_PADDING,
  CORA_CHAT_USER_TAIL_INSET,
} from "./cora-chat-bubble-theme"

export type CoraTranscriptSide = "user" | "assistant"

/** Screen-edge + speaker tail gutters — matches CoraChatBubble transcript layout. */
export function CoraTranscriptGutter({
  side,
  children,
}: {
  side: CoraTranscriptSide
  children: ReactNode
}) {
  return (
    <View
      style={[
        styles.gutter,
        side === "user" ? styles.gutterUser : styles.gutterAssistant,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  gutter: {
    width: "100%",
  },
  gutterUser: {
    paddingLeft: CORA_CHAT_EDGE_PADDING + CORA_CHAT_USER_TAIL_INSET,
    paddingRight: CORA_CHAT_EDGE_PADDING,
  },
  gutterAssistant: {
    paddingLeft: CORA_CHAT_EDGE_PADDING,
    paddingRight: CORA_CHAT_EDGE_PADDING + CORA_CHAT_ASSISTANT_TAIL_INSET,
  },
})
