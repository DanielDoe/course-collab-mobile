import type { ReactNode } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import { FacultyStatusPill } from "../../faculty/faculty-shared"
import { AppButton } from "../../theme/AppButton"

type Props = {
  title?: string
  complete?: boolean
  children: ReactNode
}

export function SummerModuleBlockShell({ title, complete, children }: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <View
      style={[
        styles.shell,
        tokens.cardShadow,
        { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
      ]}
    >
      {title ? (
        <View style={styles.header}>
          <Text style={[type.bodyEmphasis, styles.title, { color: native.label }]}>{title}</Text>
          {complete ? <FacultyStatusPill label="Done" tone="success" /> : null}
        </View>
      ) : null}
      {children}
    </View>
  )
}

export function SummerModulePrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  tone = "primary",
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  tone?: "primary" | "secondary"
}) {
  return (
    <AppButton
      label={label}
      onPress={onPress}
      variant={tone === "primary" ? "primary" : "soft"}
      disabled={disabled}
      loading={loading}
    />
  )
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: { flex: 1, lineHeight: 22 },
})
