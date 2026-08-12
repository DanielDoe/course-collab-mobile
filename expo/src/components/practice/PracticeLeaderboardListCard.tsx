import { StyleSheet, Text, View } from "react-native"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import type { LeaderboardEntry } from "../../lib/practice-api"
import {
  isLeaderboardPeerBlurred,
  leaderboardDisplayName,
  leaderboardMetaLabel,
  leaderboardScoreLabel,
  leaderboardScorePct,
  leaderboardSolidThumb,
  type PracticeLeaderboardViewOptions,
} from "./practice-leaderboard-utils"

type Props = {
  entry: LeaderboardEntry
  index: number
  viewOptions: PracticeLeaderboardViewOptions
}

export function PracticeLeaderboardListCard({ entry, index, viewOptions }: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const solidThumb = leaderboardSolidThumb(index, Boolean(entry.is_current_user), entry.rank)
  const score = leaderboardScorePct(entry)
  const name = leaderboardDisplayName(entry, viewOptions)
  const meta = leaderboardMetaLabel(entry, viewOptions)
  const scoreLabel = leaderboardScoreLabel(entry, viewOptions)
  const blurred = isLeaderboardPeerBlurred(entry, viewOptions.blurPeerNames)

  return (
    <View
      style={[
        styles.card,
        tokens.cardShadow,
        {
          backgroundColor: entry.is_current_user ? tokens.accentSoft : native.secondaryGrouped,
          borderColor: entry.is_current_user ? tokens.accentBorder : tokens.border,
        },
      ]}
      accessibilityLabel={
        blurred
          ? `Rank ${entry.rank}, classmate`
          : `Rank ${entry.rank}, ${name}, ${score} percent average`
      }
    >
      <SolidListThumbTile thumb={solidThumb}>
        <Text style={[styles.rankGlyph, { color: solidThumb.icon }]}>{entry.rank}</Text>
      </SolidListThumbTile>

      <View style={styles.copy}>
        <Text style={[type.bodyEmphasis, styles.name, { color: native.label }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
          {meta}
        </Text>
      </View>

      {scoreLabel ? (
        <Text style={[type.bodyEmphasis, styles.score, { color: solidThumb.label }]}>{scoreLabel}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 72,
  },
  rankGlyph: {
    fontSize: 15,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    lineHeight: 20,
  },
  score: {
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 0,
  },
})
