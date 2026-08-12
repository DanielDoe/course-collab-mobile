import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { PlaygroundLeaderboardEntry } from "../../lib/collaboration-api"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { playgroundListThumb } from "../../lib/playground-list-theme"
import { podiumRankColor, podiumRankSolidThumb } from "../../lib/leaderboard-podium-theme"
import { SignatureListCard } from "../theme/SignatureListCard"

type Props = {
  entry: PlaygroundLeaderboardEntry
  index: number
}

export function PlaygroundLeaderboardListCard({ entry, index }: Props) {
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const isTop = entry.rank != null && entry.rank <= 3
  const thumb = isTop ? podiumRankSolidThumb(entry.rank as 1 | 2 | 3) : playgroundListThumb(index)
  const scoreColor = isTop ? podiumRankColor(entry.rank, tokens.isDark) : thumb.label
  const meta =
    entry.correctAnswers != null
      ? `${entry.correctAnswers} correct`
      : entry.isCurrentUser
        ? "Your score"
        : "Session score"

  return (
    <SignatureListCard
      index={index}
      title={entry.displayName}
      meta={meta}
      metaIcon="game-controller-outline"
      trailingValue={`${entry.score} pts`}
      trailingValueColor={scoreColor}
      icon="flash-outline"
      accent={thumb.label}
      showChevron={false}
      badge={
        entry.isCurrentUser ? (
          <View style={[styles.youPill, { backgroundColor: tokens.accentSoft }]}>
            <Text style={[type.footnote, styles.youText, { color: tokens.accent }]}>You</Text>
          </View>
        ) : undefined
      }
    />
  )
}

const styles = StyleSheet.create({
  youPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  youText: { fontWeight: "700" },
})
