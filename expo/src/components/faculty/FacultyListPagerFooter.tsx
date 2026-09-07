import { StyleSheet, Text, View } from "react-native"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NotificationListPager } from "./faculty-notifications-ui"

type Pager = {
  page: number
  pageCount: number
  setPage: (next: number) => void
  label: string
  total: number
}

export function FacultyListPagerFooter({ pager }: { pager: Pager }) {
  const native = useThemedNative()
  const type = useNativeType()
  if (pager.total <= 0) return null

  return (
    <View style={[styles.wrap, { backgroundColor: native.groupedBackground }]}>
      <Text style={[type.caption, styles.meta, { color: native.secondaryLabel }]}>{pager.label}</Text>
      <NotificationListPager page={pager.page} pageCount={pager.pageCount} onPageChange={pager.setPage} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 16, gap: 8 },
  meta: { fontWeight: "600", textAlign: "center" },
})
