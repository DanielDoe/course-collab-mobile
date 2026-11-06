import type { ReactNode } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { IoniconName } from "@/components/icons/AppIcon"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { useSuppressModuleSearchDock } from "../../context/ModuleSearchDockContext"
import { GlassBottomSheetModal } from "../theme/GlassBottomSheetModal"
import { GlassSheetBackground } from "../theme/GlassSurface"
import {
  GlassMenuList,
  GlassMenuRow,
  GlassSheetHandle,
} from "../theme/GlassActionSheetMenu"

export type CollabSheetOption = {
  label: string
  icon?: IoniconName
  destructive?: boolean
  detail?: string
  onPress: () => void
}

export function CollabActionSheet({
  visible,
  onClose,
  title,
  message,
  options,
  children,
}: {
  visible: boolean
  onClose: () => void
  title: string
  message?: string
  options?: CollabSheetOption[]
  children?: ReactNode
}) {
  useSuppressModuleSearchDock(visible)
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const type = useNativeType()

  return (
    <GlassBottomSheetModal
      visible={visible}
      onClose={onClose}
      scrollable
      maxHeight="78%"
      keyboardAvoiding={Boolean(children)}
      accessibilityLabel={`Close ${title}`}
      sheetHostStyle={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <GlassSheetBackground style={styles.sheet} menuSheet>
        <GlassSheetHandle />
        <Text style={[type.sheetTitle, styles.title, { color: native.label }]}>{title}</Text>
        {message ? (
          <Text style={[type.caption, styles.message, { color: native.secondaryLabel }]}>{message}</Text>
        ) : null}
        {children}
        {options && options.length > 0 ? (
          <GlassMenuList>
            {options.map((option, index) => (
              <GlassMenuRow
                key={`${option.label}-${index}`}
                icon={option.icon}
                label={option.label}
                detail={option.detail}
                destructive={option.destructive}
                showSeparator={index < options.length - 1}
                onPress={() => {
                  onClose()
                  option.onPress()
                }}
              />
            ))}
          </GlassMenuList>
        ) : null}
        <View style={styles.cancelWrap}>
          <GlassMenuList>
            <GlassMenuRow label="Cancel" onPress={onClose} />
          </GlassMenuList>
        </View>
      </GlassSheetBackground>
    </GlassBottomSheetModal>
  )
}

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, gap: 10 },
  title: { textAlign: "center" },
  message: { textAlign: "center", paddingHorizontal: 12 },
  cancelWrap: { marginTop: 8 },
})
