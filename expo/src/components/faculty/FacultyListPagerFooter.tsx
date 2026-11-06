import { StyleSheet, Text, View } from "react-native"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NotificationListPager } from "./faculty-notifications-ui"

type Pager = {
  page: number
  pageCount: number
  setPage: (next: number) => void
  stepPage?: (delta: number) => void
  label: string
  total: number
}

export function FacultyListPagerFooter({
  pager,
  variant = "inline",
}: {
  pager: Pager
  /** `dock` — pinned above the module search bar with tighter vertical padding. */
  variant?: "inline" | "dock"
}) {
  const native = useThemedNative()
  const type = useNativeType()
  if (pager.total <= 0) return null

  return (
    <View
      style={[
        styles.wrap,
        variant === "dock" && styles.wrapDock,
        { backgroundColor: native.groupedBackground },
      ]}
    >
      <Text style={[type.caption, styles.meta, { color: native.secondaryLabel }]}>{pager.label}</Text>
      <NotificationListPager
        page={pager.page}
        pageCount={pager.pageCount}
        onPageChange={pager.setPage}
        stepPage={pager.stepPage}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 16, gap: 8 },
  wrapDock: { paddingTop: 8, paddingBottom: 4 },
  meta: { fontWeight: "600", textAlign: "center" },
})
