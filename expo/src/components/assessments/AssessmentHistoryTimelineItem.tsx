import { StyleSheet, View } from "react-native"
import type { AssessmentHistoryItem } from "../../lib/student-api"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { solidListThumb } from "../../lib/solid-list-thumb"
import { AssessmentItemCard } from "./AssessmentItemCard"
import { configForAssessmentType, formatAssessmentType } from "./assessment-config"

type Props = {
  item: AssessmentHistoryItem
  index: number
  last: boolean
  onPress: () => void
  bestScore: number | null
  completedAt?: string
  statusLabel: string
  statusTone: "success" | "neutral" | "live"
  showTypeSubtitle: boolean
  formatWhen: (value?: string) => string
}

export function AssessmentHistoryTimelineItem({
  item,
  index,
  last,
  onPress,
  bestScore,
  completedAt,
  statusLabel,
  statusTone,
  showTypeSubtitle,
  formatWhen,
}: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const typeConfig = configForAssessmentType(item.assessment_type, tokens)
  const dotColor = solidListThumb(index).label

  return (
    <View style={styles.timelineRow}>
      <View style={styles.rail}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        {!last ? <View style={[styles.line, { backgroundColor: native.separator }]} /> : null}
      </View>

      <View style={styles.cardWrap}>
        <AssessmentItemCard
          index={index}
          title={item.title}
          subtitle={showTypeSubtitle ? formatAssessmentType(item.assessment_type) : undefined}
          metaLabel={formatWhen(completedAt)}
          bestScore={bestScore}
          statusLabel={statusLabel}
          statusTone={statusTone}
          icon={typeConfig.icon}
          onPress={onPress}
        />
      </View>
    </View>
  )
}

const TIMELINE_RAIL = 28
const DOT_SIZE = 10

const styles = StyleSheet.create({
  timelineRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  rail: {
    width: TIMELINE_RAIL,
    alignItems: "center",
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginTop: 38,
    zIndex: 1,
  },
  line: {
    position: "absolute",
    top: 38 + DOT_SIZE / 2,
    bottom: -10,
    width: 2,
    borderRadius: 1,
  },
  cardWrap: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 10,
  },
})
