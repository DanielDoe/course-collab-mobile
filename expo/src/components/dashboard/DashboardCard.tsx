import type { ReactNode } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"

type Props = {
  title: string
  subtitle?: string
  children: ReactNode
  action?: ReactNode
}

export function DashboardCard({ title, subtitle, children, action }: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <View style={[styles.card, tokens.cardShadow, { backgroundColor: native.secondaryGrouped }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[type.bodyEmphasis, styles.title]}>{title}</Text>
          {subtitle ? <Text style={type.caption}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  headerText: { flex: 1, gap: 2 },
  title: {},
})
