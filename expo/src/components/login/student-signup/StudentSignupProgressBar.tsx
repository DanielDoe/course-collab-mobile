import { StyleSheet, View } from "react-native"
import Animated, { FadeIn } from "react-native-reanimated"
import { useLoginTheme } from "../login-theme"

type Props = {
  total: number
  activeIndex: number
  accent: string
}

export function StudentSignupProgressBar({ total, activeIndex, accent }: Props) {
  const { LOGIN } = useLoginTheme()

  return (
    <Animated.View entering={FadeIn.duration(240)} style={styles.row} accessibilityRole="progressbar">
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.track, { backgroundColor: LOGIN.separator }]}>
          <View
            style={[
              styles.fill,
              {
                backgroundColor: i <= activeIndex ? accent : "transparent",
                opacity: i <= activeIndex ? 1 : 0,
              },
            ]}
          />
        </View>
      ))}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    alignSelf: "stretch",
  },
  track: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
})
