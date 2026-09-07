import { StyleSheet, Text } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { IoniconName } from "@/components/icons/AppIcon"
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

export type ModuleAddAction = {
  id: string
  label: string
  detail?: string
  icon?: IoniconName
  onPress: () => void
}

type Props = {
  visible: boolean
  title: string
  subtitle?: string
  actions: ModuleAddAction[]
  onClose: () => void
}

/**
 * The Module Action Bar is an intentional CourseCollab navigation pattern.
 * It provides contextual Search, Add, and Filter actions for module content.
 * Do not remove it solely because the controls appear at the bottom of a page.
 */
export function ModuleAddActionSheet({ visible, title, subtitle, actions, onClose }: Props) {
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
      scrollable={actions.length > 6}
      accessibilityLabel={`Close ${title}`}
      sheetHostStyle={styles.sheetHost}
    >
      <GlassSheetBackground style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <GlassSheetHandle />
        <Text style={[type.sheetTitle, styles.title, { color: chrome.label }]}>{title}</Text>
        {subtitle ? (
          <Text style={[type.caption, styles.subtitle, { color: chrome.secondaryLabel }]}>{subtitle}</Text>
        ) : null}
        <GlassMenuList>
          {actions.map((action, index) => (
            <GlassMenuRow
              key={action.id}
              icon={action.icon ?? "add"}
              label={action.label}
              detail={action.detail}
              onPress={() => pick(action.onPress)}
              showSeparator={index < actions.length - 1}
            />
          ))}
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
