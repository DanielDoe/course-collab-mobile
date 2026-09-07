import { useMemo } from "react"
import { useWindowDimensions, type ViewStyle } from "react-native"
import {
  messagesAvatarSize,
  messagesBubbleMaxWidthPercent,
  messagesComposerHorizontalInset,
  messagesCourseImportBubbleMaxWidthPercent,
  messagesThreadRowMinHeight,
} from "../lib/messages-layout"
import { modulePageCardPadding, modulePageHorizontalPadding } from "../lib/module-page-layout"
import { COMPACT_PHONE_MAX_WIDTH, TABLET_MIN_WIDTH, useModuleContentStyle } from "../lib/responsive-layout"

export type MessagesLayout = {
  width: number
  height: number
  contentStyle: ViewStyle
  horizontalPadding: number
  cardPadding: number
  bubbleMaxWidth: `${number}%`
  courseImportBubbleMaxWidth: `${number}%`
  avatarSize: number
  threadRowMinHeight: number
  composerHorizontalInset: number
  isCompactPhone: boolean
  isTablet: boolean
}

export function useMessagesLayout(): MessagesLayout {
  const { width, height } = useWindowDimensions()
  const contentStyle = useModuleContentStyle()

  return useMemo(
    () => ({
      width,
      height,
      contentStyle,
      horizontalPadding: modulePageHorizontalPadding(width),
      cardPadding: modulePageCardPadding(width),
      bubbleMaxWidth: messagesBubbleMaxWidthPercent(width),
      courseImportBubbleMaxWidth: messagesCourseImportBubbleMaxWidthPercent(width),
      avatarSize: messagesAvatarSize(width),
      threadRowMinHeight: messagesThreadRowMinHeight(width),
      composerHorizontalInset: messagesComposerHorizontalInset(width),
      isCompactPhone: width < COMPACT_PHONE_MAX_WIDTH,
      isTablet: width >= TABLET_MIN_WIDTH,
    }),
    [contentStyle, height, width],
  )
}
