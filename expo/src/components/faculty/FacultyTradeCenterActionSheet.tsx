import { StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useShellChrome } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { GlassSheetBackground } from "../theme/GlassSurface"
import {
  GlassMenuList,
  GlassMenuRow,
  GlassMenuSectionGap,
  GlassSheetHandle,
} from "../theme/GlassActionSheetMenu"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import type { TradeCenterMenuTab } from "../../lib/faculty-trade-center-utils"

type Props = {
  visible: boolean
  onClose: () => void
  pendingDonations: number
  onRefresh: () => void
  onJump: (tab: TradeCenterMenuTab) => void
}

export function FacultyTradeCenterActionSheet({
  visible,
  onClose,
  pendingDonations,
  onRefresh,
  onJump,
}: Props) {
  const insets = useSafeAreaInsets()
  const chrome = useShellChrome()
  const type = useNativeType()

  function pick(action: () => void) {
    onClose()
    requestAnimationFrame(action)
  }

  return (
    <GlassBottomSheetModal
      visible={visible}
      onClose={onClose}
      scrollable={false}
      accessibilityLabel="Close trade center actions"
      sheetHostStyle={styles.sheetHost}
    >
      <GlassSheetBackground style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <GlassSheetHandle />
        <Text style={[type.sheetTitle, styles.title, { color: chrome.label }]}>Trade Center</Text>
        <Text style={[type.caption, styles.subtitle, { color: chrome.secondaryLabel }]}>
          Refresh data or jump to a management section.
        </Text>
        <GlassMenuList>
          <GlassMenuRow
            icon="refresh-outline"
            label="Refresh all data"
            detail="Reload analytics, requests, and logs"
            onPress={() => pick(onRefresh)}
            showSeparator
          />
          <GlassMenuRow
            icon="gift-outline"
            label="Review donations"
            detail={
              pendingDonations > 0
                ? `${pendingDonations} pending request${pendingDonations === 1 ? "" : "s"}`
                : "Pending donation & point requests"
            }
            onPress={() => pick(() => onJump("donations"))}
            showSeparator
          />
          <GlassMenuRow
            icon="options-outline"
            label="Conversion rules"
            detail="EC caps, weights, and trading toggles"
            onPress={() => pick(() => onJump("config"))}
            showSeparator
          />
          <GlassMenuRow
            icon="toggle-outline"
            label="Activity settings"
            detail="Practice, playground, and reading"
            onPress={() => pick(() => onJump("activity-settings"))}
          />
        </GlassMenuList>
        <GlassMenuSectionGap />
      </GlassSheetBackground>
    </GlassBottomSheetModal>
  )
}

const styles = StyleSheet.create({
  sheetHost: { alignSelf: "stretch" },
  sheet: { paddingHorizontal: 16, paddingTop: 4 },
  title: { marginTop: 4, marginBottom: 4 },
  subtitle: { marginBottom: 8, lineHeight: 18 },
})
