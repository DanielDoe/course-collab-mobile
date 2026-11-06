import { StyleSheet, View } from "react-native"
import { useThemedNative } from "../../context/AppearanceProvider"
import { NATIVE } from "../../constants/faculty-native-theme"

export function QuerySkeleton({ rows = 5 }: { rows?: number }) {
  const native = useThemedNative()
  return (
    <View style={styles.list}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={[styles.row, { backgroundColor: native.secondaryGrouped }]}>
          <View style={[styles.thumb, { backgroundColor: native.fill }]} />
          <View style={styles.copy}>
            <View style={[styles.line, styles.title, { backgroundColor: native.fill }]} />
            <View style={[styles.line, styles.sub, { backgroundColor: native.fill }]} />
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
    paddingTop: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: NATIVE.sectionRadius,
  },
  thumb: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  copy: {
    flex: 1,
    gap: 8,
  },
  line: {
    height: 10,
    borderRadius: 5,
  },
  title: {
    width: "62%",
  },
  sub: {
    width: "40%",
  },
})
