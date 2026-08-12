import { Pressable, StyleSheet, Text, View } from "react-native"
import { useThemedStudentNative, useNativeType } from "../../lib/themed-module-theme"

export {
  StudentFilterSheet,
  StudentGroupedFilterSheet,
  StudentSearchToolbar,
} from "../student/student-search-toolbar"
export type { StudentFilterGroup } from "../student/student-search-toolbar"

export function matchesSummerSearch(query: string, ...parts: Array<string | undefined | null>): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return parts.some((part) => (part ?? "").toLowerCase().includes(q))
}

export function SummerSearchResultsBar({
  visible,
  shown,
  total,
  query,
  onClear,
}: {
  visible: boolean
  shown: number
  total: number
  query: string
  onClear: () => void
}) {
  const SN = useThemedStudentNative()
  const type = useNativeType()
  if (!visible) return null

  const trimmed = query.trim()

  return (
    <View style={styles.resultsBar}>
      <Text style={[type.caption, styles.resultsText, { color: SN.secondaryLabel }]}>
        {shown} of {total} result{total === 1 ? "" : "s"}
        {trimmed ? ` matching “${trimmed}”` : ""}
      </Text>
      <Pressable onPress={onClear} hitSlop={8}>
        <Text style={[styles.clearBtn, { color: SN.uiAccent }]}>Clear</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  resultsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 2,
  },
  resultsText: { flex: 1, lineHeight: 18 },
  clearBtn: { fontSize: 13, fontWeight: "600" },
})
