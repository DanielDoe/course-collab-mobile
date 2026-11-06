import type { ReactNode } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useShellChrome } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { GlassSheetBackground } from "../theme/GlassSurface"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import { GlassSheetHandle } from "../theme/GlassActionSheetMenu"

type Props = {
  visible: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  scrollable?: boolean
}

/** Shared filter / sort bottom sheet — Student, Faculty, and Career Member. */
export function ModuleFilterBottomSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  scrollable = true,
}: Props) {
  const insets = useSafeAreaInsets()
  const chrome = useShellChrome()
  const type = useNativeType()

  return (
    <GlassBottomSheetModal
      visible={visible}
      onClose={onClose}
      // Keep scrolling inside this sheet so the modal host stays content-sized
      // (an outer ScrollView was eating backdrop taps above short filter menus).
      scrollable={false}
      accessibilityLabel={`Close ${title}`}
      sheetHostStyle={styles.sheetHost}
    >
      <GlassSheetBackground style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <GlassSheetHandle />
        <Text style={[type.sheetTitle, styles.title, { color: chrome.label }]}>{title}</Text>
        {subtitle ? (
          <Text style={[type.caption, styles.subtitle, { color: chrome.secondaryLabel }]}>{subtitle}</Text>
        ) : null}
        {scrollable ? (
          <ScrollView
            style={styles.optionsScroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={styles.body}>{children}</View>
        )}
      </GlassSheetBackground>
    </GlassBottomSheetModal>
  )
}

const styles = StyleSheet.create({
  sheetHost: { alignSelf: "stretch" },
  sheet: { paddingHorizontal: 16, paddingTop: 4 },
  title: { marginTop: 4, marginBottom: 4 },
  subtitle: { marginBottom: 8, lineHeight: 18 },
  optionsScroll: { maxHeight: 420 },
  scrollContent: { gap: 8, paddingBottom: 8 },
  body: { gap: 8 },
})
