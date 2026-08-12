import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import type { MessageRecipient } from "../../lib/messages-api"
import type { PresenceStatus } from "../../lib/presence/types"
import { GlassChromeBar, useGlassChromeActive } from "../theme/GlassSurface"
import { PresenceStatusPicker } from "../presence/PresenceStatusPicker"
import { formatParticipantSubtitleLine } from "../../lib/presence/format-presence-activity"
import { MessageAvatar } from "./messages-ui"

export const MESSAGES_THREAD_HEADER_BODY = 52
/** Extra space below the floating header before the first message. */
export const MESSAGES_THREAD_HEADER_SCROLL_GAP = 20

export function messagesThreadHeaderHeight(topInset: number): number {
  return topInset + MESSAGES_THREAD_HEADER_BODY + MESSAGES_THREAD_HEADER_SCROLL_GAP
}

type Props = {
  participant: MessageRecipient | null
  participantPresence?: PresenceStatus
  participantLastSeenAt?: string | null
  onBack: () => void
  onOpenProfile: () => void
}

/** Floating Liquid Glass header for immersive message threads. */
export function MessagesThreadHeader({
  participant,
  participantPresence,
  participantLastSeenAt,
  onBack,
  onOpenProfile,
}: Props) {
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const glassActive = useGlassChromeActive()
  const title = participant?.displayName ?? "Messages"
  const subtitleLine = participant
    ? formatParticipantSubtitleLine(participant.subtitle, participantPresence, participantLastSeenAt)
    : null

  return (
    <View style={styles.host} pointerEvents="box-none">
      <GlassChromeBar
        style={[
          { paddingTop: insets.top },
          glassActive ? { borderBottomWidth: 0 } : null,
        ]}
        borderBottomColor={glassActive ? "transparent" : native.separator}
      >
        <View style={styles.row}>
          <Pressable
            style={styles.sideBtn}
            onPress={onBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back to messages"
          >
            <Ionicons name="chevron-back" size={24} color={tokens.accent} />
          </Pressable>

          <Pressable
            style={styles.center}
            onPress={participant ? onOpenProfile : undefined}
            disabled={!participant}
            accessibilityRole="button"
            accessibilityLabel={participant ? `View ${title} profile` : title}
          >
            {participant ? (
              <MessageAvatar name={participant.displayName} size={36} presenceStatus={participantPresence} />
            ) : null}
            <View style={styles.centerCopy}>
              <View style={styles.nameRow}>
                <Text
                  style={[type.bodyEmphasis, styles.titleText, { color: native.label }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {title}
                </Text>
                {participant ? (
                  <Ionicons name="chevron-forward" size={14} color={native.tertiaryLabel} style={styles.nameChevron} />
                ) : null}
              </View>
              {subtitleLine ? (
                <Text
                  style={[type.caption, styles.subtitleText, { color: native.secondaryLabel }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {subtitleLine}
                </Text>
              ) : null}
            </View>
          </Pressable>

          <View style={styles.statusSlot}>
            <PresenceStatusPicker compact />
          </View>
        </View>
      </GlassChromeBar>
    </View>
  )
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingBottom: 8,
    minHeight: MESSAGES_THREAD_HEADER_BODY,
  },
  sideBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    paddingVertical: 2,
  },
  centerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    gap: 2,
  },
  titleText: {
    flexShrink: 1,
    minWidth: 0,
  },
  nameChevron: {
    flexShrink: 0,
    marginTop: 1,
  },
  subtitleText: {
    lineHeight: 16,
  },
  statusSlot: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
})
