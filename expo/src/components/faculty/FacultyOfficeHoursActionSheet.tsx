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

type Props = {
  visible: boolean
  onClose: () => void
  onNewRequest: () => void
  onEditRegularHours: () => void
}

export function FacultyOfficeHoursActionSheet({
  visible,
  onClose,
  onNewRequest,
  onEditRegularHours,
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
      accessibilityLabel="Close office hours actions"
      sheetHostStyle={styles.sheetHost}
    >
      <GlassSheetBackground style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <GlassSheetHandle />
        <Text style={[type.sheetTitle, styles.title, { color: chrome.label }]}>Office hours</Text>
        <Text style={[type.caption, styles.subtitle, { color: chrome.secondaryLabel }]}>
          Create a student request or set your weekly availability.
        </Text>
        <GlassMenuList>
          <GlassMenuRow
            icon="person-add-outline"
            label="New student request"
            detail="On behalf of a student"
            onPress={() => pick(onNewRequest)}
            showSeparator
          />
          <GlassMenuRow
            icon="calendar-outline"
            label="Edit regular hours"
            detail="Weekly availability"
            onPress={() => pick(onEditRegularHours)}
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
