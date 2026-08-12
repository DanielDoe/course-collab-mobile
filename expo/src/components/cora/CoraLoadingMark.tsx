import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { CoraBrand } from "./CoraBrand"

export const CORA_LOADING_GAP = 16

type Props = {
  color?: string
  style?: StyleProp<ViewStyle>
}

/** Centered Cora wordmark + spinner while Cora hub context loads. */
export function CoraLoadingMark({ color, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <CoraBrand size="lg" />
      <ActivityIndicator size="large" color={color} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: CORA_LOADING_GAP,
  },
})
